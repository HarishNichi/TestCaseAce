import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
