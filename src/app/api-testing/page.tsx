'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateApiTestCases, type GenerateApiTestCasesOutput, type TestCaseSchema as TestCase } from '@/ai/flows/generate-api-test-cases';
import { executeApiTests, type ExecuteApiTestsInput } from '@/ai/flows/execute-api-tests';
import { generatePdfReport } from '@/ai/flows/generate-pdf-report';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clipboard, TestTube2, FileText } from 'lucide-react';
import { downloadAsExcel } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const formSchema = z.object({
  apiEndpoint: z.string().url({ message: 'Please enter a valid URL.' }),
  apiMethod: z.string().min(1, { message: 'Please select an API method.' }),
  payload: z.string().min(2, { message: 'Payload must be at least 2 characters (e.g., {}).' }),
});

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<GenerateApiTestCasesOutput | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
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
    setPdfUrl(null);
    try {
      const testExecutionInput: ExecuteApiTestsInput = {
        apiEndpoint: form.getValues('apiEndpoint'),
        apiMethod: form.getValues('apiMethod'),
        testCases: results.englishTestCases,
      };

      const testReport = await executeApiTests(testExecutionInput);
      const pdfOutput = await generatePdfReport(testReport);
      
      setPdfUrl(pdfOutput.pdfDataUri);

      const link = document.createElement('a');
      link.href = pdfOutput.pdfDataUri;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      link.download = `api-test-report-${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Test Report Generated',
        description: 'The PDF report has been downloaded.',
        action: <Button variant="ghost" onClick={() => setIsPdfModalOpen(true)}><FileText className="mr-2" />View Report</Button>
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

      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>API Test Report</DialogTitle>
          </DialogHeader>
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="API Test Report PDF" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Loading PDF...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
