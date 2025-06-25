// main.go - func getCourses and relevant struct
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
	"github.com/xuri/excelize/v2"
)

var db *sql.DB

// init function to connect to the database on startup.
func init() {
	// Load environment variables from .env file, if present.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, assuming environment variables are set.")
	}

	// Read database credentials from environment variables.
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	if dbUser == "" || dbPassword == "" || dbHost == "" || dbPort == "" || dbName == "" {
		log.Fatal("Database environment variables not set. Please check your .env file or environment.")
	}

	// Construct the Data Source Name (DSN).
	dataSourceName := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPassword, dbHost, dbPort, dbName)

	var err error
	db, err = sql.Open("mysql", dataSourceName)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	// Ping the database to verify the connection.
	err = db.Ping()
	if err != nil {
		log.Fatalf("Error connecting to the database: %v", err)
	}

	fmt.Println("Successfully connected to MySQL database!")
}

// Course struct defines the data model for a course.
type Course struct {
	ID           int       `json:"id"`
	Dept         string    `json:"dept"`
	Semester     string    `json:"semester"`
	CourseType   string    `json:"coursetype"`
	CourseCode   string    `json:"coursecode"`
	CourseName   string    `json:"coursename"`
	CourseNature string    `json:"coursenature"`
	FacultyID    string    `json:"facultyid"`
	Regulation   string    `json:"regulation"`
	Degree       string    `json:"degree"`
	AcademicYear string    `json:"academicyear"`
	HodApproval  string    `json:"hodapproval"`  
}

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
                id -- Use id as a tie-breaker for stable sorting
        ) as rn
    FROM
        courses
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

func syncCourseDetails(tx *sql.Tx) error {
	_, err := tx.Exec("DELETE FROM course_details")
	if err != nil {
		return err
	}
	_, err = tx.Exec(syncCourseDetailsQuery)
	return err
}

// uploadCourses handles the logic for uploading and processing an Excel file.
func uploadCourses(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No file uploaded", "error": err.Error()})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to open uploaded file", "error": err.Error()})
		return
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse Excel file", "error": err.Error()})
		return
	}

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to read rows from Excel sheet", "error": err.Error()})
		return
	}

	if len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Excel file is empty or has no data rows"})
		return
	}

	header := rows[0]
	dataRows := rows[1:]

	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to start database transaction", "error": err.Error()})
		return
	}
	defer tx.Rollback()

	
	stmt, err := tx.Prepare(`
		INSERT INTO courses (
			dept, semester, coursetype, coursecode, coursename,
			coursenature, facultyid, regulation, degree, academicyear, hodapproval
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			dept = VALUES(dept),
			coursename = VALUES(coursename),
			facultyid = VALUES(facultyid)
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to prepare SQL statement", "error": err.Error()})
		return
	}
	defer stmt.Close()

	var processingErrors []map[string]string
	for i, row := range dataRows {
        // Adjust column count based on your Excel file structure for hodapproval.
        // Assuming hodapproval is not in the Excel for upload, it will get the default ''.
        // If hodapproval is the 11th column in your Excel (index 10), adjust this check.
		if len(row) < 10 { // Changed from 10 to 11 if hodapproval is in Excel
			log.Printf("Skipping row %d due to insufficient columns: %v", i+2, row)
			rowMap := make(map[string]string)
			for idx, h := range header {
				if idx < len(row) {
					rowMap[h] = row[idx]
				} else {
					rowMap[h] = ""
				}
			}
			processingErrors = append(processingErrors, rowMap)
			continue
		}

		course := Course{
			Dept:         row[0],
			Semester:     row[1],
			CourseType:   row[2],
			CourseCode:   row[3],
			CourseName:   row[4],
			CourseNature: row[5],
			FacultyID:    row[6],
			Regulation:   row[7],
			Degree:       row[8],
			AcademicYear: row[9],
            HodApproval:  "", // Default to empty string for upload if not in Excel.
                            // If hodapproval is in Excel at row[10], then use row[10] here.
		}
        // If hodapproval is at index 10 in your Excel file
        if len(row) > 10 {
            course.HodApproval = row[10]
        }


		_, err := stmt.Exec(
			course.Dept, course.Semester, course.CourseType, course.CourseCode,
			course.CourseName, course.CourseNature, course.FacultyID, course.Regulation,
			course.Degree, course.AcademicYear, course.HodApproval, // Add HodApproval to Exec parameters
		)
		if err != nil {
			log.Printf("Error processing course %s (row %d): %v", course.CourseCode, i+2, err)
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

	c.JSON(http.StatusOK, gin.H{"message": "Courses uploaded successfully. Details table has been synchronized.", "errors": processingErrors})
}

// getCourses retrieves all courses from the database.
func getCourses(c *gin.Context) {
   
	rows, err := db.Query("SELECT id, dept, semester, coursetype, coursecode, coursename, coursenature, facultyid, regulation, degree, academicyear, hodapproval FROM courses")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch course data", "error": err.Error()})
		return
	}
	defer rows.Close()

	var courses []Course
	for rows.Next() {
		var course Course
        // Add &course.HodApproval, &course.UploadedAt, &course.UpdatedAt to the Scan function
		err := rows.Scan(
			&course.ID, &course.Dept, &course.Semester, &course.CourseType,
			&course.CourseCode, &course.CourseName, &course.CourseNature,
			&course.FacultyID, &course.Regulation, &course.Degree, &course.AcademicYear, &course.HodApproval,
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

// updateCourse handles updating all related course entries (e.g., theory and lab)
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

	// 1. Get the identifying details of the course group using the ID of the row being edited.
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

	// 2. Update ALL rows that belong to this course group for shared fields.
	// This now correctly includes coursecode, coursename, and dept for group update.
	stmt, err := tx.Prepare(`
        UPDATE courses SET
            coursecode = ?,
            coursename = ?,
			dept = ?
        WHERE
            coursecode = ? AND
            semester = ? AND
            regulation = ? AND
            degree = ? AND
            academicyear = ?
    `)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare group update statement: " + err.Error()})
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(
		updatedCourseData.CourseCode,
		updatedCourseData.CourseName,
		updatedCourseData.Dept,
		groupIdentifier.CourseCode,
		groupIdentifier.Semester,
		groupIdentifier.Regulation,
		groupIdentifier.Degree,
		groupIdentifier.AcademicYear,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute group update: " + err.Error()})
		return
	}

	// 3. Update the single row's specific data (fields that are not shared across the group).
	// This includes semester, coursetype, coursenature, facultyid, hodapproval, regulation, degree, and academicyear.
	singleUpdateStmt, err := tx.Prepare(`
		UPDATE courses SET
			coursenature = ?,
			facultyid = ?,
			hodapproval = ?,
			coursetype = ?,
            semester = ?,
            regulation = ?,
            degree = ?,
            academicyear = ?
		WHERE id = ?
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare single row update statement: " + err.Error()})
		return
	}
	defer singleUpdateStmt.Close()

	_, err = singleUpdateStmt.Exec(
		updatedCourseData.CourseNature,
		updatedCourseData.FacultyID,
		updatedCourseData.HodApproval,
		updatedCourseData.CourseType,
		updatedCourseData.Semester,
		updatedCourseData.Regulation,
		updatedCourseData.Degree,
		updatedCourseData.AcademicYear,
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute single row update: " + err.Error()})
		return
	}

	// 4. Re-synchronize the course_details table.
	if err := syncCourseDetails(tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to re-synchronize course details", "error": err.Error()})
		return
	}

	// 5. Commit the transaction.
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Course group and individual course details updated successfully"})
}

// deleteCourse handles deleting a course and ensuring details are updated.
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

	stmt, err := tx.Prepare("DELETE FROM courses WHERE id = ?")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare delete statement: " + err.Error()})
		return
	}
	defer stmt.Close()

	res, err := stmt.Exec(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute delete: " + err.Error()})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No course found with the given ID"})
		return
	}

	if err := syncCourseDetails(tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to re-synchronize course details after deletion", "error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Course deleted successfully"})
}

// main function sets up the Gin router and starts the server.
func main() {
	r := gin.Default()

	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP,
			param.TimeStamp.Format("2006-01-02 15:04:05"),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	}))
	r.Use(gin.Recovery())

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
		api.POST("/upload-courses", uploadCourses)
		api.GET("/courses", getCourses)
		api.PUT("/courses/:id", updateCourse)
		api.DELETE("/courses/:id", deleteCourse)
	}

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}