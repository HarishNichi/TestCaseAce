import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadAsCsv(filename: string, englishText: string, japaneseText: string) {
  const englishLines = englishText.split('\n').filter(line => line.trim() !== '');
  const japaneseLines = japaneseText.split('\n').filter(line => line.trim() !== '');

  const header = ['English Scenarios', 'Japanese Scenarios'];
  
  const maxLength = Math.max(englishLines.length, japaneseLines.length);
  const rows = [];

  for (let i = 0; i < maxLength; i++) {
    // Wrap each cell in quotes and escape double quotes within the cell
    const englishCell = englishLines[i] ? `"${englishLines[i].replace(/"/g, '""')}"` : '""';
    const japaneseCell = japaneseLines[i] ? `"${japaneseLines[i].replace(/"/g, '""')}"` : '""';
    rows.push([englishCell, japaneseCell]);
  }

  let csvContent = "data:text/csv;charset=utf-8," 
    + header.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
