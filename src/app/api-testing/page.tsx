'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateApiTestCases, type GenerateApiTestCasesOutput } from '@/ai/flows/generate-api-test-cases';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Clipboard } from 'lucide-react';
import { downloadAsCsv } from '@/lib/utils';

const formSchema = z.object({
  apiEndpoint: z.string().url({ message: 'Please enter a valid URL.' }),
  payload: z.string().min(2, { message: 'Payload must be at least 2 characters (e.g., {}).' }),
});

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GenerateApiTestCasesOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiEndpoint: '',
      payload: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResults(null);
    try {
      const result = await generateApiTestCases(values);
      setResults(result);
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

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  return (
    <div className="container mx-auto max-w-5xl">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">API Test Case Generator</h1>
        <p className="text-muted-foreground">
          Provide an API endpoint and a sample payload. Our AI will generate a comprehensive set of test cases for you.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="apiEndpoint"
                render={({ field }) => (
                  <FormItem>
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
                      Provide a sample JSON payload for the request body.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Test Cases
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            <p className="text-muted-foreground font-medium">Generating test cases... this may take a moment.</p>
        </div>
      )}

      {results && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Generated Test Cases</h2>
            <Button variant="outline" onClick={() => downloadAsCsv('api-test-cases', results.englishTestCases, results.japaneseTestCases)}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>English Cases</CardTitle>
                <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => handleCopyToClipboard(results.englishTestCases)}>
                  <Clipboard className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-code text-sm bg-muted p-4 rounded-md">{results.englishTestCases}</pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Japanese Cases</CardTitle>
                <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => handleCopyToClipboard(results.japaneseTestCases)}>
                  <Clipboard className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-code text-sm bg-muted p-4 rounded-md">{results.japaneseTestCases}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
