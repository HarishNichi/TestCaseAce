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
  payload: z.string().describe('The sample payload for the API endpoint.'),
});
export type GenerateApiTestCasesInput = z.infer<typeof GenerateApiTestCasesInputSchema>;

const GenerateApiTestCasesOutputSchema = z.object({
  englishTestCases: z.string().describe('The generated API test cases in English as a numbered list.'),
  japaneseTestCases: z.string().describe('The generated API test cases in Japanese as a numbered list.'),
});
export type GenerateApiTestCasesOutput = z.infer<typeof GenerateApiTestCasesOutputSchema>;

export async function generateApiTestCases(input: GenerateApiTestCasesInput): Promise<GenerateApiTestCasesOutput> {
  return generateApiTestCasesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateApiTestCasesPrompt',
  input: {schema: GenerateApiTestCasesInputSchema},
  output: {schema: GenerateApiTestCasesOutputSchema},
  prompt: `You are an expert test case generator. Given an API endpoint and a sample payload, you will generate a comprehensive set of test cases, including normal cases, edge cases, and boundary conditions. The test cases should be detailed and cover all aspects of the API functionality. Generate the test cases in both English and Japanese.

Please provide the output as a numbered list for each language.

API Endpoint: {{{apiEndpoint}}}
Payload: {{{payload}}}

English Test Cases:

Japanese Test Cases:
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
