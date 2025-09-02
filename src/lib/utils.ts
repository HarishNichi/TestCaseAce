import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type TestCase = {
  'Test Case ID': string;
  'Preconditions': string;
  'Steps to Reproduce': string;
  'Expected Results': string;
};

export function testCasesToText(testCases: TestCase[]): string {
  if (!testCases || testCases.length === 0) {
    return "No test cases generated.";
  }

  return testCases.map(tc => {
    return `**Test Case ID:** ${tc['Test Case ID']}\n` +
           `**Preconditions:** ${tc.Preconditions}\n` +
           `**Steps to Reproduce:**\n${tc['Steps to Reproduce']}\n` +
           `**Expected Results:** ${tc['Expected Results']}`
  }).join('\n\n');
}

export function downloadAsExcel(filename: string, testCases: TestCase[]) {
  if (!testCases || testCases.length === 0) {
    console.error("No test cases provided to downloadAsExcel.");
    const emptyWs = XLSX.utils.json_to_sheet([], {
      header: ["Test Case ID", "Preconditions", "Steps to Reproduce", "Expected Results"]
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, emptyWs, "Test Cases");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(testCases, {
    header: ["Test Case ID", "Preconditions", "Steps to Reproduce", "Expected Results"]
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");

  // Adjust column widths for better readability
  const columnWidths = [
    { wch: 15 }, // Test Case ID
    { wch: 40 }, // Preconditions
    { wch: 60 }, // Steps to Reproduce
    { wch: 60 }, // Expected Results
  ];
  worksheet["!cols"] = columnWidths;

  // Apply text wrapping to all cells
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = {c:C, r:R};
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      if (worksheet[cell_ref]) {
        if (!worksheet[cell_ref].s) worksheet[cell_ref].s = {};
        worksheet[cell_ref].s.alignment = { wrapText: true, vertical: 'top' };
      }
    }
  }


  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
