'use server';
/**
 * @fileOverview Generates UI test scenarios based on an image and description.
 *
 * - generateUITestScenarios - A function that generates UI test scenarios.
 * - GenerateUITestScenariosInput - The input type for the generateUITestScenarios function.
 * - GenerateUITestScenariosOutput - The return type for the generateUITestScenarios function.
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
  englishTestScenarios: z.string().describe('UI test scenarios in English.'),
  japaneseTestScenarios: z.string().describe('UI test scenarios in Japanese.'),
});
export type GenerateUITestScenariosOutput = z.infer<typeof GenerateUITestScenariosOutputSchema>;

export async function generateUITestScenarios(input: GenerateUITestScenariosInput): Promise<GenerateUITestScenariosOutput> {
  return generateUITestScenariosFlow(input);
}

const generateUITestScenariosPrompt = ai.definePrompt({
  name: 'generateUITestScenariosPrompt',
  input: {schema: GenerateUITestScenariosInputSchema},
  output: {schema: GenerateUITestScenariosOutputSchema},
  prompt: `You are an expert UI test case generator. Given a screenshot of a UI and a description of the UI, you will generate comprehensive UI test scenarios in both English and Japanese.

Description: {{{description}}}
Photo: {{media url=photoDataUri}}

English Test Scenarios:
{{englishTestScenarios}}

Japanese Test Scenarios:
{{japaneseTestScenarios}}`,
});

const translateToJapanesePrompt = ai.definePrompt({
  name: 'translateToJapanesePrompt',
  input: {schema: z.object({text: z.string()})},
  output: {schema: z.object({translatedText: z.string()})},
  prompt: `Translate the following English text to Japanese:

{{{text}}}

Japanese Translation:
{{translatedText}}`,
});

const generateUITestScenariosFlow = ai.defineFlow(
  {
    name: 'generateUITestScenariosFlow',
    inputSchema: GenerateUITestScenariosInputSchema,
    outputSchema: GenerateUITestScenariosOutputSchema,
  },
  async input => {
    const {output: englishOutput} = await generateUITestScenariosPrompt({
      ...input,
      englishTestScenarios: '',
      japaneseTestScenarios: '',
    });

    const {output: japaneseOutput} = await translateToJapanesePrompt({
      text: englishOutput?.englishTestScenarios || '',
    });

    return {
      englishTestScenarios: englishOutput?.englishTestScenarios || '',
      japaneseTestScenarios: japaneseOutput?.translatedText || '',
    };
  }
);
