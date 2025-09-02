import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseTestCases(text: string) {
  if (!text) return [];

  const testCases: { [key: string]: string }[] = [];
  const caseBlocks = text.split(/(?=\*\*Test Case ID:\*\*)/).filter(block => block.trim());

  caseBlocks.forEach(block => {
    const testCase: { [key: string]: string } = {
      'Test Case ID': '',
      'Preconditions': '',
      'Steps to Reproduce': '',
      'Expected Results': '',
    };
    
    const idMatch = block.match(/\*\*Test Case ID:\*\*\s*([\s\S]*?)(?=\*\*Preconditions:\*\*)/);
    if (idMatch) testCase['Test Case ID'] = idMatch[1].trim();

    const preconditionsMatch = block.match(/\*\*Preconditions:\*\*\s*([\s\S]*?)(?=\*\*Steps to Reproduce:\*\*)/);
    if (preconditionsMatch) testCase['Preconditions'] = preconditionsMatch[1].trim();
    
    const stepsMatch = block.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\*\*Expected Results:\*\*)/);
    if (stepsMatch) testCase['Steps to Reproduce'] = stepsMatch[1].trim();

    const resultsMatch = block.match(/\*\*Expected Results:\*\*\s*([\s\S]*)/);
    if (resultsMatch) testCase['Expected Results'] = resultsMatch[1].trim();

    if (testCase['Test Case ID']) {
        testCases.push(testCase);
    }
  });

  return testCases;
}


export function downloadAsExcel(filename: string, text: string) {
  const testCases = parseTestCases(text);
  
  if (testCases.length === 0) {
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
