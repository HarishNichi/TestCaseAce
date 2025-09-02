import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadAsCsv(filename: string, text: string) {
  const lines = text.split('\n').filter(line => line.trim() !== '');

  // Determine header based on filename
  const header = [filename.includes('-en') ? 'English Scenarios' : 'Japanese Scenarios'];
  
  const rows = lines.map(line => `"${line.replace(/"/g, '""')}"`);

  const csvContent = header.join(",") + "\n" + rows.join("\n");
  
  // Use a Blob to ensure UTF-8 encoding is handled correctly, especially for Japanese characters
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
