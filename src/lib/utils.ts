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
    const testCase: { [key: string]: string } = {};

    const lines = block.split('\n').filter(line => line.trim());
    let currentKey = '';
    let content: string[] = [];

    lines.forEach(line => {
      const match = line.match(/^\*\*(.*?):\*\*\s*(.*)/);
      if (match) {
        if (currentKey) {
          testCase[currentKey] = content.join('\n').trim();
        }
        currentKey = match[1];
        content = [match[2]];
      } else if (currentKey) {
        content.push(line);
      }
    });

    if (currentKey) {
      testCase[currentKey] = content.join('\n').trim();
    }
    
    if (Object.keys(testCase).length > 0 && testCase['Test Case ID']) {
      testCases.push({
        'Test Case ID': testCase['Test Case ID'] || '',
        'Preconditions': testCase['Preconditions'] || '',
        'Steps to Reproduce': testCase['Steps to Reproduce'] || '',
        'Expected Results': testCase['Expected Results'] || '',
      });
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
