import React, { useState } from "react";
import CustomButton from "../button";
import InputBox from "../input";
import "./style.css";
import * as XLSX from "xlsx";

function DataTable(props) {
  const [isFilter, setIsFilter] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 added
  const [sortConfig, setSortConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const data = Array.isArray(props.data) ? props.data : [];

  const truncateHTML = (html, length) => {
    if (typeof html !== "string") return html;
    const tempElement = document.createElement("div");
    tempElement.innerHTML = html;
    const textContent = tempElement.textContent || tempElement.innerText || "";
    return textContent.length > length
      ? textContent.substring(0, length) + "..."
      : textContent;
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e, column) => {
    const value = e.target.value;
    setFilters((prevFilters) => ({ ...prevFilters, [column]: value }));
  };

  const handleSort = (column) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === column &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key: column, direction });
  };

  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, props.title || "Data");
    XLSX.writeFile(workbook, `${props.title || "data"}.xlsx`, {
      compression: true,
    });
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // 🔍 Combine search + filter
  const filteredData = data.filter((row) => {
    const matchesSearch = searchTerm
      ? Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : true;

    const matchesFilters = Object.keys(filters).every((column) => {
      return String(row[column] ?? "")
        .toLowerCase()
        .includes((filters[column] ?? "").toLowerCase());
    });

    return matchesSearch && matchesFilters;
  });

  const sortedData = filteredData.sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === "ascending" ? -1 : 1;
    if (a[key] > b[key]) return direction === "ascending" ? 1 : -1;
    return 0;
  });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentData = sortedData.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div
      style={{
        border: props.hideHeader ? "" : "1px solid rgb(203 211 232)",
        borderRadius: 8,
      }}
      className="bg-white rounded-md overflow-auto"
    >
      {!props.hideHeader && (
        <div
          className="bg-background p-5 flex items-center justify-start flex-col lg:flex-row lg:justify-between"
          style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
        >
          <div className="w-full">
            <h3 className="font-medium text-xl">{props.title}</h3>
            <p>{props.description}</p>
          </div>
          <div className="flex gap-2 w-full mt-4 flex-col lg:w-96 lg:mt-0 sm:flex-row">
            {props.addButton && (
              <CustomButton
                label={props.addBtnLabel}
                onClick={props.addButton}
              />
            )}
            {props.secButton && (
              <CustomButton
                label={props.secBtnLabel }
                onClick={props.secButton}
              />
            )}
            {props.allow_download && (
              <CustomButton label="Download Courses" onClick={handleDownload} />
            )}
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex w-110 items-center gap-3">
            <InputBox
              margin={0}
              width={"w-80"}
              placeholder="Search..."
              onChange={handleSearchChange} // ✅ FIXED
            />
            <i
              onClick={() => setIsFilter(!isFilter)}
              className="bg-background rounded bx bx-filter-alt bx-sm cursor-pointer"
              style={{ padding: 11, color: "#575656" }}
            ></i>
            <div className="ml-auto flex flex-col gap-4 w-full">
              {props.tabletopElement}
            </div>
          </div>

    
        </div>

        <div
          style={{
            border: "1px solid rgb(227 231 242)",
            overflow: "auto",
            marginTop: 20,
            borderRadius: 8,
          }}
        >
          <table className="data-table w-full overflow-auto">
            <thead>
              <tr>
                <th style={{ textAlign: props.align }}>S. No</th>
                {props.headers.map((column, i) => (
                  <th style={{ textAlign: props.align }} key={column}>
                    <div
                      style={{ justifyContent: props.align }}
                      className="flex gap-1"
                    >
                      <span>{column}</span>
                      {column !== "S. No" && (
                        <button onClick={() => handleSort(props.fields[i])}>
                          <i
                            style={{ color: "rgb(74 74 74)" }}
                            className="bx bx-sort"
                          ></i>
                        </button>
                      )}
                    </div>
                    {isFilter && (
                      <input
                        type="text"
                        placeholder={`Filter ${column}`}
                        value={filters[props.fields[i]] || ""}
                        onChange={(e) =>
                          handleFilterChange(e, props.fields[i])
                        }
                        className="w-full mt-2 text-sm outline-none p-2 mb-1 rounded font-medium"
                      />
                    )}
                  </th>
                ))}
                {props.actions && <th style={{ textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr
                  key={index}
                  onClick={
                    props.onAction && !props.actions
                      ? () => props.onAction(row)
                      : undefined
                  }
                  className={!props.actions ? "cursor-pointer" : ""}
                >
                  <td style={{ textAlign: props.align }}>
                    {indexOfFirstRow + index + 1}
                  </td>
                  {props.fields.map((field, i) => {
                    const customRenderer =
                      props.customRender && props.customRender[field];
                    return (
                      <td
                        style={{ textAlign: props.align }}
                        className="w-max"
                        key={`${index}-${i}`}
                      >
                        {customRenderer ? (
                          customRenderer(row)
                        ) : (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: truncateHTML(row[field], 80),
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                  {props.actions && (
                    <td style={{ textAlign: "center" }}>
                      <div onClick={(e) => e.stopPropagation()}>
                        {props.actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                  <td colSpan={props.headers.length + (props.actions ? 2 : 1)}>
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <span>
            Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
          </span>
          <div className="flex gap-2 items-start">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="bx bx-chevron-left bx-sm"></i>
            </button>
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="bx bx-chevron-right bx-sm"></i>
            </button>
            <div>
              <label htmlFor="rowsPerPage">Rows per page:</label>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
              >
                {[5, 10, 15, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
