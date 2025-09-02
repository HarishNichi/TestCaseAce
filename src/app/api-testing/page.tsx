'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { generateApiTestCases, type GenerateApiTestCasesOutput } from '@/ai/flows/generate-api-test-cases';
import { executeApiTests, type TestReport } from '@/ai/flows/execute-api-tests';
import type { TestCase } from '@/ai/schemas/test-case';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clipboard, TestTube2, FileText, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const formSchema = z.object({
  apiEndpoint: z.string().url({ message: 'Please enter a valid URL.' }),
  apiMethod: z.string().min(1, { message: 'Please select an API method.' }),
  payload: z.string().min(2, { message: 'Payload must be at least 2 characters (e.g., {}).' }),
});

const ExecuteApiTestsInputSchema = z.object({
  apiEndpoint: z.string(),
  apiMethod: z.string(),
  testCases: z.array(z.object({
    "Test Case ID": z.string(),
    "Preconditions": z.string(),
    "Steps to Reproduce": z.string(),
    "Expected Results": z.string(),
  })),
});
export type ExecuteApiTestsInput = z.infer<typeof ExecuteApiTestsInputSchema>;

function downloadAsExcel(filename: string, testCases: TestCase[]) {
  if (!testCases || testCases.length === 0) {
    console.error("No test cases provided to downloadAsExcel.");
    // Even for an empty case, create a file with headers so the user knows it's an intentional empty result.
    const emptyWs = XLSX.utils.json_to_sheet([], {
      header: ["Test Case ID", "Preconditions", "Steps to Reproduce", "Expected Results"]
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, emptyWs, "Test Cases");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(testCases);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");

  // Define column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Test Case ID
    { wch: 40 }, // Preconditions
    { wch: 60 }, // Steps to Reproduce
    { wch: 60 }, // Expected Results
  ];

  // Apply text wrapping and vertical alignment to all cells
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      const cell = worksheet[cell_ref];

      if (cell) {
        if (!cell.s) cell.s = {};
        if (!cell.s.alignment) cell.s.alignment = {};
        cell.s.alignment.wrapText = true;
        cell.s.alignment.vertical = 'top';
      }
    }
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function downloadReportAsExcel(filename: string, report: TestReport) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["API Endpoint", report.apiEndpoint],
    ["API Method", report.apiMethod],
    ["Generated At", new Date(report.generatedAt).toLocaleString()],
    [],
    ["Total Tests", report.summary.totalTests],
    ["Passed", report.summary.passed],
    ["Failed", report.summary.failed],
    ["Errors", report.summary.errors],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 15 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // Results Sheet
  const resultsData = report.results.map(r => ({
    "Test Case ID": r.testCase["Test Case ID"],
    "Status": r.status,
    "Reasoning": r.reasoning,
    "Preconditions": r.testCase.Preconditions,
    "Steps to Reproduce": r.testCase["Steps to Reproduce"],
    "Expected Results": r.testCase["Expected Results"],
    "Actual Response": r.actualResponse,
  }));
  const resultsWs = XLSX.utils.json_to_sheet(resultsData);
  resultsWs['!cols'] = [
    { wch: 15 }, // Test Case ID
    { wch: 10 }, // Status
    { wch: 50 }, // Reasoning
    { wch: 40 }, // Preconditions
    { wch: 60 }, // Steps
    { wch: 60 }, // Expected
    { wch: 80 }, // Actual
  ];
  // Apply text wrapping and vertical alignment to all cells
  const range = XLSX.utils.decode_range(resultsWs['!ref']!);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      const cell = resultsWs[cell_ref];

      if (cell) {
        if (!cell.s) cell.s = {};
        if (!cell.s.alignment) cell.s.alignment = {};
        cell.s.alignment.wrapText = true;
        cell.s.alignment.vertical = 'top';
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, resultsWs, "Detailed Results");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<GenerateApiTestCasesOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiEndpoint: '',
      apiMethod: 'POST',
      payload: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResults(null);
    try {
      const result = await generateApiTestCases(values);
      setResults(result);
      if (result) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

        downloadAsExcel(`api-test-cases-en-${timestamp}`, result.englishTestCases);
        downloadAsExcel(`api-test-cases-jp-${timestamp}`, result.japaneseTestCases);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Failed to generate test cases. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleRunTests = async () => {
    if (!results || !results.englishTestCases.length) {
      toast({
        variant: 'destructive',
        title: 'No test cases to run',
        description: 'Please generate test cases first.',
      });
      return;
    }

    setTesting(true);
    try {
      const testExecutionInput: ExecuteApiTestsInput = {
        apiEndpoint: form.getValues('apiEndpoint'),
        apiMethod: form.getValues('apiMethod'),
        testCases: results.englishTestCases,
      };

      const testReport = await executeApiTests(testExecutionInput);
      
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      downloadReportAsExcel(`api-test-report-${timestamp}`, testReport);

      toast({
        title: 'Test Report Generated',
        description: 'The Excel report has been downloaded.',
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred during testing',
        description: 'Failed to execute tests or generate report. Please check the console for details.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyToClipboard = (cases: TestCase[]) => {
    if (!cases || cases.length === 0) return;
    const text = cases.map(tc => {
      return `**Test Case ID:** ${tc['Test Case ID']}\n` +
             `**Preconditions:** ${tc.Preconditions}\n` +
             `**Steps to Reproduce:**\n${tc['Steps to Reproduce']}\n` +
             `**Expected Results:** ${tc['Expected Results']}`
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  return (
    <>
      <div className="container mx-auto max-w-5xl">
        <div className="space-y-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">API Test Case Generator</h1>
          <p className="text-muted-foreground">
            Provide an API endpoint, method, and a sample payload. Our AI will generate a comprehensive set of test cases for you. The Excel files will be downloaded automatically.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="apiEndpoint"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>API Endpoint</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com/v1/users" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apiMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="payload"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Payload</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`{\n  "name": "John Doe",\n  "email": "john.doe@example.com"\n}`}
                          className="font-code min-h-[200px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a sample JSON payload for the request body. For GET requests, you can leave this empty or describe query parameters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={loading || testing} className="w-full sm:w-auto">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4"/>}
                    Generate Test Cases
                  </Button>
                  <Button type="button" onClick={handleRunTests} disabled={!results || testing} className="w-full sm:w-auto">
                    {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                    Run Tests & Generate Report
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {(loading || testing) && (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary"/>
              <p className="text-muted-foreground font-medium">
                {loading ? "Generating test cases..." : "Running tests and generating report..."} this may take a moment.
              </p>
          </div>
        )}

        {results && !loading && !testing && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Generated Test Cases</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>English Cases</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(results.englishTestCases)}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 h-96 overflow-y-auto">
                    {results.englishTestCases.map((tc, index) => (
                      <div key={index} className="text-sm font-code whitespace-pre-wrap p-2 rounded-md bg-muted/50">
                        <p><strong>Test Case ID:</strong> {tc['Test Case ID']}</p>
                        <p><strong>Preconditions:</strong> {tc.Preconditions}</p>
                        <p><strong>Steps to Reproduce:</strong></p>
                        <p>{tc['Steps to Reproduce']}</p>
                        <p><strong>Expected Results:</strong> {tc['Expected Results']}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Japanese Cases</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(results.japaneseTestCases)}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 h-96 overflow-y-auto">
                    {results.japaneseTestCases.map((tc, index) => (
                      <div key={index} className="text-sm font-code whitespace-pre-wrap p-2 rounded-md bg-muted/50">
                        <p><strong>Test Case ID:</strong> {tc['Test Case ID']}</p>
                        <p><strong>Preconditions:</strong> {tc.Preconditions}</p>
                        <p><strong>Steps to Reproduce:</strong></p>
                        <p>{tc['Steps to Reproduce']}</p>
                        <p><strong>Expected Results:</strong> {tc['Expected Results']}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
