import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseTestCases(text: string) {
  if (!text) return [];

  const testCases: { [key: string]: string }[] = [];
  // Split the entire text block into individual test cases.
  // The (?=...) is a positive lookahead to ensure we split *before* the next ID, without consuming it.
  const caseBlocks = text.split(/\s*(?=\*\*Test Case ID:\*\*)/).filter(block => block.trim());

  caseBlocks.forEach(block => {
    const testCase: { [key: string]: string } = {};

    const idMatch = block.match(/\*\*Test Case ID:\*\*\s*([\s\S]*?)(?=\*\*Preconditions:\*\*|$)/);
    testCase['Test Case ID'] = idMatch ? idMatch[1].trim() : '';

    const preconditionsMatch = block.match(/\*\*Preconditions:\*\*\s*([\s\S]*?)(?=\*\*Steps to Reproduce:\*\*|$)/);
    testCase['Preconditions'] = preconditionsMatch ? preconditionsMatch[1].trim() : '';
    
    const stepsMatch = block.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\*\*Expected Results:\*\*|$)/);
    testCase['Steps to Reproduce'] = stepsMatch ? stepsMatch[1].trim() : '';

    const resultsMatch = block.match(/\*\*Expected Results:\*\*\s*([\s\S]*)/);
    testCase['Expected Results'] = resultsMatch ? resultsMatch[1].trim() : '';

    // Only add the test case if it has a valid ID.
    if (testCase['Test Case ID']) {
        testCases.push(testCase);
    }
  });

  return testCases;
}


export function downloadAsExcel(filename: string, text: string) {
  const testCases = parseTestCases(text);
  
  if (testCases.length === 0) {
    // If parsing fails or text is empty, download an empty file with headers
    // to make it clear there was an issue with the content.
    console.error("No test cases parsed from text.");
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
