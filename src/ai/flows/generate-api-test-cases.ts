'use server';

/**
 * @fileOverview Generates API test cases in both English and Japanese given an API endpoint and payload.
 *
 * - generateApiTestCases - A function that handles the generation of API test cases.
 * - GenerateApiTestCasesInput - The input type for the generateApiTestCases function.
 * - GenerateApiTestCasesOutput - The return type for the generateApiTestCases function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateApiTestCasesInputSchema = z.object({
  apiEndpoint: z.string().describe('The API endpoint to test.'),
  apiMethod: z.string().describe('The HTTP method for the API endpoint (e.g., GET, POST, PUT).'),
  payload: z.string().describe('The sample payload for the API endpoint.'),
});
export type GenerateApiTestCasesInput = z.infer<typeof GenerateApiTestCasesInputSchema>;

const GenerateApiTestCasesOutputSchema = z.object({
  englishTestCases: z.string().describe('The generated API test cases in English, formatted with preconditions, steps, and expected results.'),
  japaneseTestCases: z.string().describe('The generated API test cases in Japanese, formatted with preconditions, steps, and expected results.'),
});
export type GenerateApiTestCasesOutput = z.infer<typeof GenerateApiTestCasesOutputSchema>;

export async function generateApiTestCases(input: GenerateApiTestCasesInput): Promise<GenerateApiTestCasesOutput> {
  return generateApiTestCasesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateApiTestCasesPrompt',
  input: {schema: GenerateApiTestCasesInputSchema},
  output: {schema: GenerateApiTestCasesOutputSchema},
  prompt: `You are an expert test case generator. Given an API endpoint, its HTTP method, and a sample payload, you will generate a comprehensive set of test cases, including normal cases, edge cases, and boundary conditions. The test cases should be detailed and cover all aspects of the API functionality. Generate the test cases in both English and Japanese.

Please provide the output in a structured format for each language. For each test case, include:
- Test Case ID
- Preconditions
- Steps to Reproduce
- Expected Results

When generating the Japanese test cases, keep the English keywords for the structure (e.g., "**Test Case ID:**", "**Preconditions:**", etc.) and only translate the content.

API Endpoint: {{{apiEndpoint}}}
API Method: {{{apiMethod}}}
Payload: {{{payload}}}

Here is an example of the desired format for one test case:

**Test Case ID:** TC-001
**Preconditions:** The user is authenticated.
**Steps to Reproduce:**
1. Send a {{{apiMethod}}} request to {{{apiEndpoint}}} with a valid payload.
**Expected Results:** The API should return a 200 OK status code and the created resource.
`,
});

const generateApiTestCasesFlow = ai.defineFlow(
  {
    name: 'generateApiTestCasesFlow',
    inputSchema: GenerateApiTestCasesInputSchema,
    outputSchema: GenerateApiTestCasesOutputSchema,
    retries: 3,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
