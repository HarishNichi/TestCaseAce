'use server';

/**
 * @fileOverview Executes API test cases and generates a report.
 *
 * - executeApiTests - A function that runs API tests.
 * - ExecuteApiTestsInput - The input type for the executeApiTests function.
 * - TestReport - The return type for the executeApiTests function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TestCaseSchema } from './generate-api-test-cases';

export const ExecuteApiTestsInputSchema = z.object({
  apiEndpoint: z.string().describe('The API endpoint to test.'),
  apiMethod: z.string().describe('The HTTP method for the API endpoint (e.g., GET, POST, PUT).'),
  testCases: z.array(TestCaseSchema).describe('The test cases to execute.'),
});
export type ExecuteApiTestsInput = z.infer<typeof ExecuteApiTestsInputSchema>;

const TestResultSchema = z.object({
  testCase: TestCaseSchema,
  status: z.enum(['PASSED', 'FAILED', 'ERROR']).describe('The result of the test.'),
  actualResponse: z.string().describe('The actual response from the API.'),
  reasoning: z.string().describe('The reasoning for why the test passed or failed.'),
});

export const TestReportSchema = z.object({
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
export type TestReport = z.infer<typeof TestReportSchema>;

const verificationPrompt = ai.definePrompt({
    name: 'verifyTestResultPrompt',
    input: { schema: z.object({
        testCase: TestCaseSchema,
        response: z.string(),
    })},
    output: { schema: z.object({
        passed: z.boolean().describe('Whether the test case passed based on the response.'),
        reasoning: z.string().describe('A brief explanation for why the test passed or failed.'),
    })},
    prompt: `You are a test result verification agent.
Given a test case with expected results and the actual JSON response from an API, determine if the test case passed or failed.

Test Case:
- ID: {{{testCase.Test Case ID}}}
- Steps: {{{testCase.Steps to Reproduce}}}
- Expected Results: {{{testCase.Expected Results}}}

Actual API Response:
\`\`\`json
{{{response}}}
\`\`\`

Did the test pass? Provide your reasoning. Your output must be a JSON object.`,
});


export const executeApiTests = ai.defineFlow(
  {
    name: 'executeApiTestsFlow',
    inputSchema: ExecuteApiTestsInputSchema,
    outputSchema: TestReportSchema,
  },
  async (input) => {
    const results: z.infer<typeof TestResultSchema>[] = [];
    let passedCount = 0;
    let failedCount = 0;
    let errorCount = 0;

    for (const testCase of input.testCases) {
      try {
        // NOTE: This uses fetch() to call the user's API. This will only work for publicly accessible endpoints.
        // It also assumes the payload for POST/PUT is in the "Steps to Reproduce" and is valid JSON.
        let body;
        if (['POST', 'PUT', 'PATCH'].includes(input.apiMethod)) {
            try {
                // A bit of a hack: try to find a JSON blob in the steps.
                const jsonMatch = testCase['Steps to Reproduce'].match(/({.*})/s);
                if (jsonMatch && jsonMatch[1]) {
                    body = jsonMatch[1];
                }
            } catch {
                // Ignore if we can't parse a body, we'll send without it.
            }
        }

        const response = await fetch(input.apiEndpoint, {
            method: input.apiMethod,
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });

        const responseText = await response.text();
        const responseData = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText,
        };

        const actualResponseString = JSON.stringify(responseData, null, 2);

        const { output } = await verificationPrompt({
            testCase: testCase,
            response: actualResponseString,
        });

        if (output) {
             if (output.passed) {
                passedCount++;
                results.push({
                    testCase,
                    status: 'PASSED',
                    actualResponse: actualResponseString,
                    reasoning: output.reasoning,
                });
            } else {
                failedCount++;
                results.push({
                    testCase,
                    status: 'FAILED',
                    actualResponse: actualResponseString,
                    reasoning: output.reasoning,
                });
            }
        } else {
             throw new Error("Verification prompt failed to return output.");
        }

      } catch (error: any) {
        console.error(`Error executing test case ${testCase['Test Case ID']}:`, error);
        errorCount++;
        results.push({
          testCase,
          status: 'ERROR',
          actualResponse: `Failed to execute test. Error: ${error.message}`,
          reasoning: 'An exception occurred while trying to run this test case, so it could not be completed.',
        });
      }
    }

    return {
      apiEndpoint: input.apiEndpoint,
      apiMethod: input.apiMethod,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: input.testCases.length,
        passed: passedCount,
        failed: failedCount,
        errors: errorCount,
      },
      results,
    };
  }
);
