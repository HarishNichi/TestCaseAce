'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateUITestScenarios, type GenerateUITestScenariosOutput } from '@/ai/flows/generate-ui-test-scenarios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clipboard, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { downloadAsExcel, testCasesToText } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  photoDataUri: z.string().min(1, { message: 'Please upload an image.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
});

export default function UITestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GenerateUITestScenariosOutput | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      photoDataUri: '',
      description: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 4MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        form.setValue('photoDataUri', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setFilePreview(null);
    form.setValue('photoDataUri', '');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResults(null);
    try {
      const result = await generateUITestScenarios(values);
      setResults(result);
      if (result) {
        downloadAsExcel('ui-test-scenarios-en', result.englishTestScenarios);
        downloadAsExcel('ui-test-scenarios-jp', result.japaneseTestScenarios);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Failed to generate test scenarios. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };
  
  const englishText = results ? testCasesToText(results.englishTestScenarios) : '';
  const japaneseText = results ? testCasesToText(results.japaneseTestScenarios) : '';

  return (
    <div className="container mx-auto max-w-5xl">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">UI Test Scenario Generator</h1>
        <p className="text-muted-foreground">
          Upload a screenshot of your UI and provide a brief description. Our AI will generate comprehensive test scenarios and the Excel files will be downloaded automatically.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="photoDataUri"
                  render={() => (
                    <FormItem>
                      <FormLabel>UI Screenshot</FormLabel>
                      <FormControl>
                        <div className="relative flex justify-center items-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                          <Input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                          <label htmlFor="file-upload" className="w-full h-full">
                            {filePreview ? (
                              <>
                                <Image src={filePreview} alt="UI Preview" layout="fill" objectFit="contain" className="rounded-lg p-2"/>
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 z-10" onClick={clearFile}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Upload className="w-8 h-8 mb-2" />
                                <span className="font-semibold">Click to upload or drag and drop</span>
                                <span className="text-sm">PNG, JPG, or WEBP (MAX. 4MB)</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UI Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., This is a login screen with email and password fields, a 'Sign In' button, and a 'Forgot Password' link."
                          className="resize-none h-64"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe the components and functionality of the UI screen.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Scenarios
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            <p className="text-muted-foreground font-medium">Generating test scenarios... this may take a moment.</p>
        </div>
      )}

      {results && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Generated Scenarios</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>English Scenarios</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(englishText)}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm">{englishText}</pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Japanese Scenarios</CardTitle>
                 <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(japaneseText)}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm">{japaneseText}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
