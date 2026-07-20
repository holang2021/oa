import * as XLSX from 'xlsx';

/**
 * Export data to Excel buffer
 */
export function exportToExcel(data: any[], sheetName: string = 'Sheet1'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Parse Excel file to JSON
 */
export function parseExcelFile(filePath: string): any[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}

/**
 * Generate Excel and save to file
 */
export function generateExcelFile(data: any[], filePath: string, sheetName: string = 'Sheet1'): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filePath);
}
