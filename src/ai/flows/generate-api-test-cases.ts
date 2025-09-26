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
import { TestCaseSchema } from '../schemas/test-case';

const GenerateApiTestCasesInputSchema = z.object({
  apiEndpoint: z.string().describe('The API endpoint to test.'),
  apiMethod: z.string().describe('The HTTP method for the API endpoint (e.g., GET, POST, PUT).'),
  payload: z.string().describe('The sample payload for the API endpoint.'),
});
export type GenerateApiTestCasesInput = z.infer<typeof GenerateApiTestCasesInputSchema>;

const GenerateApiTestCasesOutputSchema = z.object({
  englishTestCases: z.array(TestCaseSchema).describe('The generated API test cases in English.'),
  japaneseTestCases: z.array(TestCaseSchema).describe('The generated API test cases in Japanese.'),
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

Your output must be a JSON object with two keys: "englishTestCases" and "japaneseTestCases". Each key should contain an array of test case objects. Each test case object must have the following keys: "**Test Case ID**", "**Preconditions**", "**Steps to Reproduce**", and "**Expected Results**".

API Endpoint: {{{apiEndpoint}}}
API Method: {{{apiMethod}}}
Payload: {{{payload}}}
`,
});

const generateApiTestCasesFlow = ai.defineFlow(
  {
    name: 'generateApiTestCasesFlow',
    inputSchema: GenerateApiTestCasesInputSchema,
    outputSchema: GenerateApiTestCasesOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (e) {
      console.error("Fallback for generateApiTestCasesFlow", e);
      // If the default model fails, try with a fallback.
      const fallbackPrompt = `You are an expert test case generator. Given an API endpoint, its HTTP method, and a sample payload, you will generate a comprehensive set of test cases, including normal cases, edge cases, and boundary conditions. The test cases should be detailed and cover all aspects of the API functionality. Generate the test cases in both English and Japanese.

Your output must be a JSON object with two keys: "englishTestCases" and "japaneseTestCases". Each key should contain an array of test case objects. Each test case object must have the following keys: "**Test Case ID**", "**Preconditions**", "**Steps to Reproduce**", and "**Expected Results**".

API Endpoint: ${input.apiEndpoint}
API Method: ${input.apiMethod}
Payload: ${input.payload}
`;

      const {output} = await ai.generate({
        prompt: fallbackPrompt,
        output: {schema: GenerateApiTestCasesOutputSchema}
      });
      return output!;
    }
  }
);
