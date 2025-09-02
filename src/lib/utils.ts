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

  const csvContent = header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
