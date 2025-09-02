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
    // Optionally, you could download an empty file with headers
    // to make it clear there was an issue.
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

  // Adjust column widths
  const columnWidths = [
    { wch: 15 }, // Test Case ID
    { wch: 40 }, // Preconditions
    { wch: 60 }, // Steps to Reproduce
    { wch: 60 }, // Expected Results
  ];
  worksheet["!cols"] = columnWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
