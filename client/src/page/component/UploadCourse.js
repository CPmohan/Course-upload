import React, { useState } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';
import CustomDialog from "../../compounds/dialogy"; // Adjust path as per your project structure
import CustomButton from "../../compounds/button";   // Adjust path as per your project structure
import CourseSampleFile from "../../assets/img/files/sample_file.xlsx"; // Adjust path to your sample file

// Assuming you have an InputBox component, if not, you can replace with a standard <input type="file" />
// import InputBox from "./InputBox";

function UploadCourse({ open, handleClose, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [notUpdated, setNotUpdated] = useState([]);

  const readExcel = (file) => {
    setSelectedFile(file);
    setErrMsg("");
    setNotUpdated([]);

    if (!file) {
      setErrMsg("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      console.log("Parsed Excel data:", json);
      // You can add further validation or processing of the Excel data here
    };
    reader.onerror = (error) => {
      setErrMsg("Error reading file.");
      console.error("Error reading file:", error);
    };
    reader.readAsArrayBuffer(file);
  };

  const insertData = () => {
    if (!selectedFile) {
      setErrMsg("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    axios.post("http://localhost:8080/api/upload-courses", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((res) => {
      console.log("File uploaded successfully:", res.data);
      handleClose(); // Close dialog on success
      if (res.data.notUpdated && res.data.notUpdated.length > 0) {
        setNotUpdated(res.data.notUpdated);
      }
      onUploadSuccess(); // Callback to trigger data refresh in mainpage
    })
    .catch((err) => {
      console.error("Failed to upload file:", err);
      setErrMsg("File upload failed. Please try again.");
      if (err.response && err.response.data && err.response.data.notUpdated) {
        setNotUpdated(err.response.data.notUpdated);
      }
    });
  };

  const handleDownload = () => {
    if (notUpdated.length > 0) {
      const ws = XLSX.utils.json_to_sheet(notUpdated);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "NotUpdatedCourses");
      XLSX.writeFile(wb, "not_updated_courses.xlsx");
    } else {
      alert("No data to download for not updated courses.");
    }
  };

  return (
    <CustomDialog
      open={open}
      handleClose={() => {
        handleClose();
        setErrMsg("");
        setNotUpdated([]);
        setSelectedFile(null);
      }}
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
          {/* Using a standard HTML input for file upload */}
          <div className="flex flex-col">
            <label style={{ fontSize: 14 }}>Choose File</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => readExcel(e.target.files[0])}
              className="mt-1 p-2 border border-gray-300 rounded"
            />
          </div>

          {errMsg !== "" && (
            <h3 className="text-red-500 font-normal text-md p-1 rounded mt-1">
              {errMsg}
            </h3>
          )}
          {notUpdated.length !== 0 && (
            <>
              <h2 className="mt-5 text-md text-red-500 font-medium">
                The Attached list Members are not updated, Kindly
                download and Re-Upload to them alone.
              </h2>
              <div
                onClick={handleDownload}
                className="flex gap-3 bg-primary w-max p-2 px-6 mt-2 text-white rounded-3xl cursor-pointer"
              >
                <i className="bx bx-download bx-sm"></i>
                <h3>Download</h3>
              </div>
            </>
          )}
          {notUpdated.length === 0 && (
            <CustomButton
              label="Submit"
              margin={3}
              onClick={insertData}
              others={!selectedFile ? "opacity-50 cursor-not-allowed" : ""}
              disabled={!selectedFile}
            />
          )}
        </>
      }
    />
  );
}

export default UploadCourse;