// main.go

package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var db *sql.DB

// init function connects to the database using environment variables.
func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, assuming environment variables are set.")
	}
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	if dbUser == "" || dbPassword == "" || dbHost == "" || dbPort == "" || dbName == "" {
		log.Fatal("Database environment variables not set.")
	}
	dataSourceName := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPassword, dbHost, dbPort, dbName)
	var err error
	db, err = sql.Open("mysql", dataSourceName)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
	err = db.Ping()
	if err != nil {
		log.Fatalf("Error connecting to the database: %v", err)
	}
	fmt.Println("Successfully connected to MySQL database!")
}

// Course struct defines the data structure for a course with JSON tags for binding.
type Course struct {
	ID           int    `json:"id"`
	Dept         string `json:"dept"`
	Semester     string `json:"semester"`
	CourseType   string `json:"coursetype"`
	CourseCode   string `json:"coursecode"`
	CourseName   string `json:"coursename"`
	CourseNature string `json:"coursenature"`
	FacultyID    string `json:"facultyid"`
	Regulation   string `json:"regulation"`
	Degree       string `json:"degree"`
	AcademicYear string `json:"academicyear"`
	HodApproval  string `json:"hodapproval"`
	Status       int    `json:"status"`
}

// syncCourseDetailsQuery defines the logic for populating the course_details table.
const syncCourseDetailsQuery = `
INSERT INTO course_details (id, dept, semester, coursetype, coursecode, coursename, coursenature, regulation, degree, academicyear)
WITH RankedCourses AS (
    SELECT
        id, dept, semester, coursetype, coursecode, coursename, coursenature, regulation, degree, academicyear,
        ROW_NUMBER() OVER(
            PARTITION BY coursecode, semester, regulation, degree, academicyear
            ORDER BY
                CASE
                    WHEN LOWER(coursenature) IN ('theory & lab', 'theory with lab') THEN 1
                    WHEN LOWER(coursenature) = 'theory' THEN 2
                    WHEN LOWER(coursenature) = 'lab' THEN 3
                    ELSE 4
                END,
                id
        ) as rn
    FROM
        courses
    WHERE status = 1
)
SELECT
    id, dept, semester, coursetype, coursecode, coursename, coursenature, regulation, degree, academicyear
FROM
    RankedCourses
WHERE
    rn = 1
ON DUPLICATE KEY UPDATE
    id = VALUES(id),
    dept = VALUES(dept),
    semester = VALUES(semester),
    coursetype = VALUES(coursetype),
    coursename = VALUES(coursename),
    coursenature = VALUES(coursenature),
    regulation = VALUES(regulation),
    degree = VALUES(degree),
    academicyear = VALUES(academicyear);
`

// syncCourseDetails executes the synchronization logic within a transaction.
func syncCourseDetails(tx *sql.Tx) error {
	_, err := tx.Exec("DELETE FROM course_details")
	if err != nil {
		return err
	}
	_, err = tx.Exec(syncCourseDetailsQuery)
	return err
}

// uploadCoursesJSON handles inserting a batch of courses from a JSON payload.
func uploadCoursesJSON(c *gin.Context) {
	var courses []Course
	if err := c.ShouldBindJSON(&courses); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid JSON data provided", "error": err.Error()})
		return
	}

	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to start database transaction", "error": err.Error()})
		return
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO courses (
			dept, semester, coursetype, coursecode, coursename,
			coursenature, facultyid, regulation, degree, academicyear, hodapproval, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			dept = VALUES(dept),
			coursename = VALUES(coursename),
			facultyid = VALUES(facultyid),
            hodapproval = VALUES(hodapproval),
			status = VALUES(status)
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to prepare SQL statement", "error": err.Error()})
		return
	}
	defer stmt.Close()

	for _, course := range courses {
		// Set status to 1 (active) for all uploaded courses.
		_, err := stmt.Exec(
			course.Dept, course.Semester, course.CourseType, course.CourseCode,
			course.CourseName, course.CourseNature, course.FacultyID, course.Regulation,
			course.Degree, course.AcademicYear, course.HodApproval, 1, // status = 1
		)
		if err != nil {
			log.Printf("Error processing course %s: %v", course.CourseCode, err)
			// Depending on requirements, you could choose to abort the transaction here.
		}
	}

	if err := syncCourseDetails(tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to synchronize course details", "error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to commit database transaction", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Courses uploaded successfully."})
}

// getCourses fetches all active courses from the database.
func getCourses(c *gin.Context) {
	rows, err := db.Query("SELECT id, dept, semester, coursetype, coursecode, coursename, coursenature, facultyid, regulation, degree, academicyear, hodapproval, status FROM courses WHERE status = 1")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch course data", "error": err.Error()})
		return
	}
	defer rows.Close()
	var courses []Course
	for rows.Next() {
		var course Course
		err := rows.Scan(
			&course.ID, &course.Dept, &course.Semester, &course.CourseType,
			&course.CourseCode, &course.CourseName, &course.CourseNature,
			&course.FacultyID, &course.Regulation, &course.Degree, &course.AcademicYear, &course.HodApproval, &course.Status,
		)
		if err != nil {
			log.Printf("Error scanning course row: %v", err)
			continue
		}
		courses = append(courses, course)
	}
	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error iterating through course data", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, courses)
}

// updateCourse handles updating course details.
func updateCourse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID format: " + err.Error()})
		return
	}

	var updatedCourseData Course
	if err := c.ShouldBindJSON(&updatedCourseData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data provided: " + err.Error()})
		return
	}

	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction: " + err.Error()})
		return
	}
	defer tx.Rollback()

	var groupIdentifier Course
	err = tx.QueryRow(`
		SELECT coursecode, semester, regulation, degree, academicyear
		FROM courses WHERE id = ?`, id).Scan(
		&groupIdentifier.CourseCode, &groupIdentifier.Semester, &groupIdentifier.Regulation,
		&groupIdentifier.Degree, &groupIdentifier.AcademicYear,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "No course found with the given ID"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find original course group: " + err.Error()})
		return
	}

	stmt, err := tx.Prepare(`
        UPDATE courses SET
            coursecode = ?, coursename = ?, dept = ?
        WHERE
            coursecode = ? AND semester = ? AND regulation = ? AND
            degree = ? AND academicyear = ?
    `)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare group update statement: " + err.Error()})
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(
		updatedCourseData.CourseCode, updatedCourseData.CourseName, updatedCourseData.Dept,
		groupIdentifier.CourseCode, groupIdentifier.Semester, groupIdentifier.Regulation,
		groupIdentifier.Degree, groupIdentifier.AcademicYear,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute group update: " + err.Error()})
		return
	}

	singleUpdateStmt, err := tx.Prepare(`
		UPDATE courses SET
			coursenature = ?, facultyid = ?, hodapproval = ?, coursetype = ?,
            semester = ?, regulation = ?, degree = ?, academicyear = ?
		WHERE id = ?
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare single row update statement: " + err.Error()})
		return
	}
	defer singleUpdateStmt.Close()

	_, err = singleUpdateStmt.Exec(
		updatedCourseData.CourseNature, updatedCourseData.FacultyID, updatedCourseData.HodApproval,
		updatedCourseData.CourseType, updatedCourseData.Semester, updatedCourseData.Regulation,
		updatedCourseData.Degree, updatedCourseData.AcademicYear, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute single row update: " + err.Error()})
		return
	}

	if err := syncCourseDetails(tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to re-synchronize course details", "error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Course group and individual course details updated successfully"})
}

// deleteCourse performs a soft delete by setting the course status to 0.
func deleteCourse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID format"})
		return
	}
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction: " + err.Error()})
		return
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare("UPDATE courses SET status = 0 WHERE id = ?")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare update statement for soft delete: " + err.Error()})
		return
	}
	defer stmt.Close()
	res, err := stmt.Exec(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute soft delete: " + err.Error()})
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No course found with the given ID"})
		return
	}
	if err := syncCourseDetails(tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to re-synchronize course details after soft deletion", "error": err.Error()})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Course soft-deleted successfully"})
}


// main function sets up the Gin router, middleware, and API routes.
func main() {
	r := gin.Default()

	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP, param.TimeStamp.Format("2006-01-02 15:04:05"),
			param.Method, param.Path, param.Request.Proto,
			param.StatusCode, param.Latency, param.Request.UserAgent(), param.ErrorMessage)
	}))
	r.Use(gin.Recovery())

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		// Use the new JSON upload endpoint.
		api.POST("/upload-courses-json", uploadCoursesJSON)
		api.GET("/courses", getCourses)
		api.PUT("/courses/:id", updateCourse)
		api.DELETE("/courses/:id", deleteCourse)
	}

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}