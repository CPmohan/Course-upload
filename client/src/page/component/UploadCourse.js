import React, { useState } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';
import CustomDialog from "../../compounds/dialogy";
import CustomButton from "../../compounds/button";
import CourseSampleFile from "../../assets/img/files/sample_file.xlsx";

function UploadCourse({ open, handleClose, onUploadSuccess }) {
  const [jsonData, setJsonData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const handleFileSelect = (file) => {
    if (!file) {
      setErrMsg("No file selected.");
      setJsonData([]);
      setFileName("");
      return;
    }
    
    setFileName(file.name);
    setErrMsg("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedJson = XLSX.utils.sheet_to_json(worksheet);

        if (parsedJson.length === 0) {
            setErrMsg("The selected file is empty or has no data rows.");
            return;
        }
        
        const normalizeHeader = (header) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

        const headerMap = {
            dept: 'dept',
            department: 'dept',
            semester: 'semester',
            coursetype: 'coursetype',
            coursecode: 'coursecode',
            coursename: 'coursename',
            coursenature: 'coursenature',
            facultyid: 'facultyid',
            regulation: 'regulation',
            degree: 'degree',
            academicyear: 'academicyear',
            hodapproval: 'hodapproval',
        };

        const transformedData = parsedJson.map(row => {
            const newRow = {};
            for (const originalHeader in row) {
                if (row.hasOwnProperty(originalHeader)) {
                    const normalized = normalizeHeader(originalHeader);
                    const backendKey = headerMap[normalized];
                    if (backendKey) {
                        // **FIX: Ensure all values are converted to strings**
                        // This prevents type mismatches for fields like regulation, 
                        // academicyear, facultyid etc., which might be numbers in Excel.
                        const value = row[originalHeader];
                        newRow[backendKey] = value !== null && value !== undefined ? String(value) : "";
                    }
                }
            }
            
            // Provide a default empty string for the optional hodapproval field if it was missing
            if (newRow.hodapproval === undefined) newRow.hodapproval = "";

            return newRow;
        });

        if (!transformedData[0] || !transformedData[0].coursecode || !transformedData[0].coursename) {
            setErrMsg("Upload failed. The Excel file must contain readable 'Course Code' and 'Course Name' columns.");
            setJsonData([]);
            return;
        }

        setJsonData(transformedData);

      } catch (error) {
        setErrMsg("Error reading or parsing the Excel file.");
        console.error("File parsing error:", error);
        setJsonData([]);
      }
    };
    reader.onerror = (error) => {
      setErrMsg("Error reading file.");
      console.error("File reading error:", error);
      setJsonData([]);
    };
    reader.readAsArrayBuffer(file);
  };

  const insertData = () => {
    if (jsonData.length === 0) {
      setErrMsg("Please select a valid file with data to upload.");
      return;
    }

    axios.post("http://localhost:8080/api/upload-courses-json", jsonData, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      console.log("JSON data uploaded successfully:", res.data);
      handleCloseDialog();
      onUploadSuccess(); 
    })
    .catch((err) => {
      console.error("Failed to upload JSON data:", err);
      // More descriptive error message using the server's response
      const serverError = err.response?.data?.error || "An unknown error occurred.";
      const serverMsg = err.response?.data?.message || "Please try again.";
      setErrMsg(`File upload failed: ${serverMsg}. Details: ${serverError}`);
    });
  };

  const handleCloseDialog = () => {
    handleClose();
    setErrMsg("");
    setJsonData([]);
    setFileName("");
  };

  return (
    <CustomDialog
      open={open}
      handleClose={handleCloseDialog}
      title={"Upload Course Data"}
      body={
        <>
          <br />
          <a
            href={CourseSampleFile}
            className="flex gap-3 bg-primary w-max p-2 px-6 mt-2 text-white rounded-3xl cursor-pointer"
            download="sample_course_upload.xlsx"
          >
            <i className="bx bx-download bx-sm"></i>
            <h3>Download Sample File</h3>
          </a>
          <br />
          <div className="flex flex-col">
            <label style={{ fontSize: 14 }}>Choose File</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="mt-1 p-2 border border-gray-300 rounded"
            />
             {fileName && <p className="text-sm text-gray-600 mt-1">Selected: {fileName}</p>}
          </div>

          {errMsg && (
            <h3 className="text-red-500 font-normal text-md p-1 rounded mt-1">
              {errMsg}
            </h3>
          )}
          
          <CustomButton
            label="Submit"
            margin={3}
            onClick={insertData}
            others={jsonData.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
            disabled={jsonData.length === 0}
          />
        </>
      }
    />
  );
}

export default UploadCourse;