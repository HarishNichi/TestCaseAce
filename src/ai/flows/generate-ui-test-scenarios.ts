'use server';
/**
 * @fileOverview Generates UI test scenarios based on an image and description.
 *
 * - generateUITestScenarios - A function that generates UI test scenarios.
 * - GenerateUITestScenariosInput - The input type for the generateUITestScenarios function.
 * - GenerateUITestScenariosOutput - The return type for the generateUITestScenariosOutput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateUITestScenariosInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the UI, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The description of the UI screen.'),
});
export type GenerateUITestScenariosInput = z.infer<typeof GenerateUITestScenariosInputSchema>;

const GenerateUITestScenariosOutputSchema = z.object({
  englishTestScenarios: z.string().describe('UI test scenarios in English, formatted with preconditions, steps, and expected results.'),
  japaneseTestScenarios: z.string().describe('UI test scenarios in Japanese, formatted with preconditions, steps, and expected results.'),
});
export type GenerateUITestScenariosOutput = z.infer<typeof GenerateUITestScenariosOutputSchema>;

export async function generateUITestScenarios(input: GenerateUITestScenariosInput): Promise<GenerateUITestScenariosOutput> {
  return generateUITestScenariosFlow(input);
}

const generateUITestScenariosPrompt = ai.definePrompt({
  name: 'generateUITestScenariosPrompt',
  input: {schema: GenerateUITestScenariosInputSchema},
  output: {schema: z.object({ englishTestScenarios: z.string().describe('UI test scenarios in English, formatted with preconditions, steps, and expected results.') })},
  prompt: `You are an expert UI test case generator. Given a screenshot of a UI and a description of the UI, you will generate comprehensive UI test scenarios in English.

Please provide the output in a structured format. For each test scenario, include:
- **Test Case ID:**
- **Preconditions:**
- **Steps to Reproduce:**
- **Expected Results:**

Description: {{{description}}}
Photo: {{media url=photoDataUri}}

Here is an example of the desired format for one test case:

**Test Case ID:** TC-UI-001
**Preconditions:** The user is on the login page.
**Steps to Reproduce:**
1. Enter a valid email address in the email field.
2. Enter a valid password in the password field.
3. Click the "Sign In" button.
**Expected Results:** The user should be successfully logged in and redirected to the dashboard.
`,
});

const translateToJapanesePrompt = ai.definePrompt({
  name: 'translateToJapanesePrompt',
  input: {schema: z.object({text: z.string()})},
  output: {schema: z.object({translatedText: z.string()})},
  prompt: `Translate the following English test scenarios to Japanese.
  
IMPORTANT: Maintain the same structured format and do not translate the keywords (e.g., "**Test Case ID:**", "**Preconditions:**", "**Steps to Reproduce:**", "**Expected Results:**"). Only translate the content for each section.

{{{text}}}
`,
});

const generateUITestScenariosFlow = ai.defineFlow(
  {
    name: 'generateUITestScenariosFlow',
    inputSchema: GenerateUITestScenariosInputSchema,
    outputSchema: GenerateUITestScenariosOutputSchema,
    config: {
      retries: 3
    }
  },
  async input => {
    let englishOutput;
    try {
      const {output} = await generateUITestScenariosPrompt(input);
      englishOutput = output;
    } catch (e) {
      const {output} = await ai.generate({
        prompt: generateUITestScenariosPrompt.prompt,
        model: 'googleai/gemini-pro',
        input,
        output: {schema: generateUITestScenariosPrompt.output.schema}
      });
      englishOutput = output as z.infer<typeof generateUITestScenariosPrompt.output.schema>;
    }

    let japaneseOutput;
    try {
      const {output} = await translateToJapanesePrompt({
        text: englishOutput?.englishTestScenarios || '',
      });
      japaneseOutput = output;
    } catch(e) {
      const {output} = await ai.generate({
        prompt: translateToJapanesePrompt.prompt,
        model: 'googleai/gemini-pro',
        input: {
          text: englishOutput?.englishTestScenarios || '',
        },
        output: {schema: (translateToJapanesePrompt.input.schema as z.AnyZodObject).deepPartial().extend({}).parse({}).output}
      });
      japaneseOutput = output as z.infer<typeof translateToJapanesePrompt.output.schema>;
    }

    return {
      englishTestScenarios: englishOutput?.englishTestScenarios || '',
      japaneseTestScenarios: japaneseOutput?.translatedText || '',
    };
  }
);
