import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseTestCases(text: string) {
  const testCases: { [key: string]: string }[] = [];
  const caseBlocks = text.split('**Test Case ID:**').slice(1);

  caseBlocks.forEach(block => {
    const testCase: { [key: string]: string } = {};
    const idMatch = block.match(/^(.*?)(\n|$)/);
    if (idMatch) {
      testCase['Test Case ID'] = idMatch[1].trim();
    }
    
    const preconditionsMatch = block.match(/\*\*Preconditions:\*\*\s*([\s\S]*?)(?=\*\*Steps to Reproduce:\*\*|$)/);
    if (preconditionsMatch) {
      testCase['Preconditions'] = preconditionsMatch[1].trim();
    }

    const stepsMatch = block.match(/\*\*Steps to Reproduce:\*\*\s*([\s\S]*?)(?=\*\*Expected Results:\*\*|$)/);
    if (stepsMatch) {
      testCase['Steps to Reproduce'] = stepsMatch[1].trim();
    }

    const resultsMatch = block.match(/\*\*Expected Results:\*\*\s*([\s\S]*)/);
    if (resultsMatch) {
      testCase['Expected Results'] = resultsMatch[1].trim();
    }
    
    testCases.push(testCase);
  });

  return testCases;
}


function convertToCsv(data: { [key: string]: string }[]): string {
    if (data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const escapeCsvCell = (cell: string) => `"${(cell || '').replace(/"/g, '""')}"`;
    
    const headerRow = headers.map(escapeCsvCell).join(',');
    const bodyRows = data.map(row => headers.map(header => escapeCsvCell(row[header])).join(','));
    
    return [headerRow, ...bodyRows].join('\n');
}


export function downloadAsCsv(filename: string, text: string) {
  const testCases = parseTestCases(text);
  const csvContent = convertToCsv(testCases);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
