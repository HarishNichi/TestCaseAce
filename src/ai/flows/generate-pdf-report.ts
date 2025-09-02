'use server';

/**
 * @fileOverview Generates a PDF report from test execution results.
 *
 * - generatePdfReport - A function that creates a PDF from an HTML report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import puppeteer from 'puppeteer';
import type { TestCase } from '@/ai/schemas/test-case';

const TestResultSchema = z.object({
  testCase: z.object({
    "Test Case ID": z.string(),
    "Preconditions": z.string(),
    "Steps to Reproduce": z.string(),
    "Expected Results": z.string(),
  }),
  status: z.enum(['PASSED', 'FAILED', 'ERROR']).describe('The result of the test.'),
  actualResponse: z.string().describe('The actual response from the API.'),
  reasoning: z.string().describe('The reasoning for why the test passed or failed.'),
});

const TestReportSchema = z.object({
  apiEndpoint: z.string(),
  apiMethod: z.string(),
  generatedAt: z.string().describe('The ISO 8601 timestamp when the report was generated.'),
  summary: z.object({
    totalTests: z.number(),
    passed: z.number(),
    failed: z.number(),
    errors: z.number(),
  }),
  results: z.array(TestResultSchema),
});
type TestReport = z.infer<typeof TestReportSchema>;

const GeneratePdfOutputSchema = z.object({
  pdfDataUri: z.string().describe("The generated PDF file as a data URI."),
});
type GeneratePdfOutput = z.infer<typeof GeneratePdfOutputSchema>;

function generateHtml(report: TestReport): string {
  const getStatusChip = (status: 'PASSED' | 'FAILED' | 'ERROR') => {
    const colors = {
      PASSED: 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;',
      FAILED: 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;',
      ERROR: 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047;',
    };
    return `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${colors[status]}">${status}</span>`;
  };

  const resultsHtml = report.results.map(result => `
    <div class="test-case">
      <div class="test-case-header">
        <h3>Test Case ID: ${result.testCase['Test Case ID']}</h3>
        ${getStatusChip(result.status)}
      </div>
      <div class="details">
        <p><strong>Preconditions:</strong> ${result.testCase.Preconditions}</p>
        <p><strong>Steps to Reproduce:</strong></p>
        <pre>${result.testCase['Steps to Reproduce']}</pre>
        <p><strong>Expected Results:</strong></p>
        <pre>${result.testCase['Expected Results']}</pre>
      </div>
      <div class="divider"></div>
      <div class="results">
        <h4>Execution Details</h4>
        <p><strong>Status:</strong> ${result.status}</p>
        <p><strong>Reasoning:</strong> ${result.reasoning}</p>
        <p><strong>Actual Response:</strong></p>
        <pre>${result.actualResponse}</pre>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>API Test Report</title>      
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 40px; color: #333; }
        .report-header { text-align: center; margin-bottom: 40px; }
        .report-header h1 { font-size: 28px; margin-bottom: 8px; }
        .report-header p { font-size: 14px; color: #666; margin: 0; }
        .summary { display: flex; justify-content: space-around; padding: 20px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
        .summary-item { text-align: center; }
        .summary-item .value { font-size: 24px; font-weight: 600; }
        .summary-item .label { font-size: 14px; color: #666; }
        .test-case { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
        .test-case-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .test-case-header h3 { margin: 0; font-size: 16px; }
        .details, .results { padding: 16px; }
        h4 { font-size: 15px; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .divider { height: 1px; background-color: #e5e7eb; margin: 0 16px; }
        p { font-size: 14px; line-height: 1.6; }
        pre { background-color: #f3f4f6; padding: 12px; border-radius: 6px; white-space: pre-wrap; word-wrap: break-word; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>API Test Execution Report</h1>
        <p><strong>API Endpoint:</strong> ${report.apiEndpoint} (${report.apiMethod})</p>
        <p>Generated on: ${new Date(report.generatedAt).toLocaleString()}</p>
      </div>
      <div class="summary">
        <div class="summary-item"><div class="value">${report.summary.totalTests}</div><div class="label">Total Tests</div></div>
        <div class="summary-item" style="color: #16a34a;"><div class="value">${report.summary.passed}</div><div class="label">Passed</div></div>
        <div class="summary-item" style="color: #dc2626;"><div class="value">${report.summary.failed}</div><div class="label">Failed</div></div>
        <div class="summary-item" style="color: #d97706;"><div class="value">${report.summary.errors}</div><div class="label">Errors</div></div>
      </div>
      ${resultsHtml}
    </body>
    </html>
  `;
}


export const generatePdfReport = ai.defineFlow(
  {
    name: 'generatePdfReportFlow',
    inputSchema: TestReportSchema,
    outputSchema: GeneratePdfOutputSchema,
  },
  async (report) => {
    const htmlContent = generateHtml(report);
    
    // Note: Puppeteer can be resource-intensive.
    const browser = await puppeteer.launch({ 
      headless: "new",
      // The args are important for running in a sandboxed environment like Cloud Functions/Run
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        right: '40px',
        bottom: '40px',
        left: '40px',
      },
    });
    
    await browser.close();
    
    const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    
    return {
      pdfDataUri,
    };
  }
);
