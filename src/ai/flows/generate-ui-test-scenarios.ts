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
  englishTestScenarios: z.string().describe('UI test scenarios in English as a numbered list.'),
  japaneseTestScenarios: z.string().describe('UI test scenarios in Japanese as a numbered list.'),
});
export type GenerateUITestScenariosOutput = z.infer<typeof GenerateUITestScenariosOutputSchema>;

export async function generateUITestScenarios(input: GenerateUITestScenariosInput): Promise<GenerateUITestScenariosOutput> {
  return generateUITestScenariosFlow(input);
}

const generateUITestScenariosPrompt = ai.definePrompt({
  name: 'generateUITestScenariosPrompt',
  input: {schema: GenerateUITestScenariosInputSchema},
  output: {schema: z.object({ englishTestScenarios: z.string().describe('UI test scenarios in English as a numbered list.') })},
  prompt: `You are an expert UI test case generator. Given a screenshot of a UI and a description of the UI, you will generate comprehensive UI test scenarios in English. Please provide the output as a numbered list.

Description: {{{description}}}
Photo: {{media url=photoDataUri}}

English Test Scenarios:
`,
});

const translateToJapanesePrompt = ai.definePrompt({
  name: 'translateToJapanesePrompt',
  input: {schema: z.object({text: z.string()})},
  output: {schema: z.object({translatedText: z.string()})},
  prompt: `Translate the following English numbered list of test scenarios to a Japanese numbered list:

{{{text}}}

Japanese Translation:
`,
});

const generateUITestScenariosFlow = ai.defineFlow(
  {
    name: 'generateUITestScenariosFlow',
    inputSchema: GenerateUITestScenariosInputSchema,
    outputSchema: GenerateUITestScenariosOutputSchema,
    retries: 3,
  },
  async input => {
    const {output: englishOutput} = await generateUITestScenariosPrompt(input);

    const {output: japaneseOutput} = await translateToJapanesePrompt({
      text: englishOutput?.englishTestScenarios || '',
    });

    return {
      englishTestScenarios: englishOutput?.englishTestScenarios || '',
      japaneseTestScenarios: japaneseOutput?.translatedText || '',
    };
  }
);
