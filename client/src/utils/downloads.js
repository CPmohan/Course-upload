import * as XLSX from "xlsx";

const handleExeclDownload = (title,data) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, title);
  XLSX.writeFile(workbook, `${title}.xlsx`, { compression: true });
};

export { handleExeclDownload };
