import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseTestCases(text: string) {
  const testCases: { [key: string]: string }[] = [];
  const caseBlocks = text.split('**Test Case ID:**').slice(1);

  caseBlocks.forEach(block => {
    const testCase: { [key: string]: string } = {};
    
    const fullBlock = `**Test Case ID:**${block}`;

    const idMatch = fullBlock.match(/\*\*Test Case ID:\*\*\s*(.*?)(?=\*\*Preconditions:\*\*|$)/);
    if (idMatch) {
      testCase['Test Case ID'] = idMatch[1].trim();
    }
    
    const preconditionsMatch = fullBlock.match(/\*\*Preconditions:\*\*\s*([\s\S]*?)(?=\*\*Steps to Reproduce:\*\*|$)/);
    if (preconditionsMatch) {
      testCase['Preconditions'] = preconditionsMatch[1].trim();
    }

    const stepsMatch = fullBlock.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\*\*Expected Results:\*\*|$)/);
    if (stepsMatch) {
      testCase['Steps to Reproduce'] = stepsMatch[1].trim();
    }

    const resultsMatch = fullBlock.match(/\*\*Expected Results:\*\*\s*([\s\S]*)/);
    if (resultsMatch) {
      // This will capture everything until the next Test Case ID or end of string.
      const rawResult = resultsMatch[1];
      const nextTestCaseIndex = rawResult.indexOf('**Test Case ID:**');
      testCase['Expected Results'] = (nextTestCaseIndex !== -1 ? rawResult.substring(0, nextTestCaseIndex) : rawResult).trim();
    }
    
    if (Object.keys(testCase).length > 0 && testCase['Test Case ID']) {
        testCases.push(testCase);
    }
  });

  return testCases;
}

export function downloadAsExcel(filename: string, text: string) {
  const testCases = parseTestCases(text);

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
