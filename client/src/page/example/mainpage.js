// mainpage.js

import { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'boxicons/css/boxicons.min.css';
import UploadCourseDialog from "../component/UploadCourse";
import CustomButton from "../../compounds/button";
import DataTable from "../../compounds/tables/data-table";
import '../../index.css';

const EditInput = ({ value, onChange, name }) => (
  <input
    type="text"
    name={name}
    value={value || ''}
    onChange={onChange}
    className="border rounded px-2 py-1 w-full shadow-sm border-gray-300"
  />
);

const EditSelect = ({ value, onChange, name, options }) => (
  <select
    name={name}
    value={value || ''}
    onChange={onChange}
    className="border rounded px-2 py-1 w-full shadow-sm border-gray-300 bg-white"
  >
    <option value="" disabled>Select...</option>
    {options.map(option => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>
);

function BasicExample() {
  const [courseData, setCourseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editedCourse, setEditedCourse] = useState({});

  useEffect(() => {
    fetchCourseData();
  }, []);

  const fetchCourseData = () => {
    setLoading(true);
    axios.get("http://localhost:8080/api/courses")
      .then((res) => {
        setCourseData(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch group counts:", err);
        toast.error("Failed to fetch course data.");
        setLoading(false);
      });
  };

  const handleOpenUploadDialog = () => setShowUploadDialog(true);
  const handleCloseUploadDialog = () => setShowUploadDialog(false);

  const handleEditClick = (course) => {
    setEditingId(course.id);
    setEditedCourse({ ...course });
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditedCourse({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedCourse(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateClick = (id) => {
    const courseToSave = { ...editedCourse };
    delete courseToSave.isManualCourseNature; // Remove this transient state before sending

    // These lines are still necessary to ensure these fields are NOT sent in the PUT payload
    // as they are backend-managed (ON UPDATE CURRENT_TIMESTAMP, etc.)
    delete courseToSave.uploaded_at; 
    delete courseToSave.updated_at;

    axios.put(`http://localhost:8080/api/courses/${id}`, courseToSave)
      .then(() => {
        toast.success("Course updated successfully!");
        setEditingId(null);
        fetchCourseData();
      })
      .catch(err => {
        console.error("Failed to update course:", err);
        if (err.response) {
          toast.error(`Failed to update course: ${err.response.data.message || err.response.statusText || 'Server error'}`);
        } else if (err.request) {
          toast.error("Failed to update course: No response from server.");
        } else {
          toast.error(`Failed to update course: ${err.message}`);
        }
      });
  };

  const handleDeleteClick = (id, courseName) => {
    if (window.confirm(`Are you sure you want to delete the course: ${courseName}?`)) {
      axios.delete(`http://localhost:8080/api/courses/${id}`)
        .then(() => {
          toast.info("Course deleted successfully!");
          fetchCourseData();
        })
        .catch(err => {
          console.error("Failed to delete course:", err);
          toast.error("Failed to delete course.");
        });
    }
  };

  // REMOVED "Uploaded At" and "Updated At" from headers
  const headers = [
    "Dept", "Semester", "Course Type", "Course Code", "Course Name",
    "Course Nature", "Faculty ID", "Regulation", "Degree", "Academic Year",
    "Hod Approval" 
  ];

  // REMOVED "uploaded_at" and "updated_at" from fields
  const fields = [
    "dept", "semester", "coursetype", "coursecode", "coursename",
    "coursenature", "facultyid", "regulation", "degree", "academicyear",
    "hodapproval"
  ];

  const dropdownFields = ["dept", "semester", "coursenature", "regulation", "degree", "hodapproval"];

  const dropdownOptions = {
    dept: ["CSE", "ECE", "MECH", "CIVIL"],
    semester: ["1", "2", "3", "4", "5", "6", "7", "8"],
    coursenature: ["Theory", "Lab", "Theory & Lab", "Enter manually"],
    regulation: ["R18", "R20", "R22"],
    degree: ["UG", "PG"],
    hodapproval: [
      "Studentwise", "Facultywise", "HODAERO", "HODAIDS", "HODAGRI", "HODAIML",
      "HODAUTO", "HODBME", "HODBT", "HODCHEM", "HODCIVIL", "HODCSBS", "HODCSD",
      "HODCSE", "HODCT", "HODECE", "HODEEE", "HODEIE", "HODFD", "HODFT",
      "HODHUMAN", "HODISE", "HODIT", "HODMATHS", "HODMECH", "HODMTRS", "HODPH",
      "HODTXT"
    ]
  };

  const customRenderers = fields.reduce((acc, field) => {
    acc[field] = (course) => {
      if (editingId === course.id) {
        if (field === "coursenature") {
          if (editedCourse.isManualCourseNature) {
            return (
              <EditInput
                name="coursenature"
                value={editedCourse["coursenature"]}
                onChange={handleEditChange}
              />
            );
          }
          return (
            <EditSelect
              name="coursenature"
              value={editedCourse["coursenature"]}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "Enter manually") {
                  setEditedCourse(prev => ({
                    ...prev,
                    coursenature: "",
                    isManualCourseNature: true
                  }));
                } else {
                  setEditedCourse(prev => ({
                    ...prev,
                    coursenature: value,
                    isManualCourseNature: false
                  }));
                }
              }}
              options={dropdownOptions["coursenature"]}
            />
          );
        }

        if (dropdownFields.includes(field)) {
          return (
            <EditSelect
              name={field}
              value={editedCourse[field]}
              onChange={handleEditChange}
              options={dropdownOptions[field] || []}
            />
          );
        }
        // Removed custom rendering for uploaded_at and updated_at in editing mode
        // as these fields are no longer in `fields` array that `reduce` iterates over.

        return (
          <EditInput
            name={field}
            value={editedCourse[field]}
            onChange={handleEditChange}
          />
        );
      }

      
      return course[field];
    };
    return acc;
  }, {});

  const actionsRenderer = (course) => {
    return editingId === course.id ? (
      <div className="flex items-center gap-2 justify-center">
        <CustomButton label="Update" onClick={() => handleUpdateClick(course.id)} others="bg-green-500 hover:bg-gray-600 px-3 py-1 text-white rounded-md shadow-sm" />
        <CustomButton label="Cancel" onClick={handleCancelClick} others="bg-gray-500 hover:bg-gray-600 px-3 py-1 text-white rounded-md shadow-sm" />
      </div>
    ) : (
      <div className="flex justify-center items-center gap-2">
        <button
          className="flex-1 text-blue-500 hover:text-blue-700"
          onClick={() => handleEditClick(course)}
        >
          <i className="bx bx-edit bx-sm bx-tada-hover"></i>
        </button>
        <div className="h-10 w-[1.5px] bg-gray-400"></div>
        <button
          className="flex-1 text-red-500 hover:text-red-700"
          style={{ color: "red" }}
          onClick={() => handleDeleteClick(course.id, course.coursename)}
        >
          <i className="bx bx-trash bx-sm bx-tada-hover"></i>
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: "1rem" }} className="font-inter">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={true} />
      {loading ? (
        <div className="flex justify-center items-center h-48 text-lg text-gray-700">Loading courses...</div>
      ) : (
        <>
          <DataTable
            title="All Courses"
            data={courseData}
            headers={headers}
            fields={fields}
            allow_download={true}
            addButton={handleOpenUploadDialog}
            addBtnLabel="Upload Courses"
            customRender={customRenderers}
            actions={actionsRenderer}
          />
          <UploadCourseDialog
            open={showUploadDialog}
            handleClose={handleCloseUploadDialog}
            onUploadSuccess={fetchCourseData}
          />
        </>
      )}
    </div>
  );
}

export default BasicExample;