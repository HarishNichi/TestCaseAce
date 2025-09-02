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

const TestCaseSchema = z.object({
  "Test Case ID": z.string(),
  "Preconditions": z.string(),
  "Steps to Reproduce": z.string(),
  "Expected Results": z.string(),
});

const GenerateUITestScenariosOutputSchema = z.object({
  englishTestScenarios: z.array(TestCaseSchema).describe('UI test scenarios in English.'),
  japaneseTestScenarios: z.array(TestCaseSchema).describe('UI test scenarios in Japanese.'),
});
export type GenerateUITestScenariosOutput = z.infer<typeof GenerateUITestScenariosOutputSchema>;

export async function generateUITestScenarios(input: GenerateUITestScenariosInput): Promise<GenerateUITestScenariosOutput> {
  return generateUITestScenariosFlow(input);
}

const generateUITestScenariosPrompt = ai.definePrompt({
  name: 'generateUITestScenariosPrompt',
  input: {schema: GenerateUITestScenariosInputSchema},
  output: {schema: z.object({ englishTestScenarios: z.array(TestCaseSchema).describe('UI test scenarios in English.') })},
  prompt: `You are an expert UI test case generator. Given a screenshot of a UI and a description of the UI, you will generate comprehensive UI test scenarios in English.

Please provide the output as a JSON object with a single key: "englishTestScenarios". This key should contain an array of test case objects. Each test case object should have the following keys: "Test Case ID", "Preconditions", "Steps to Reproduce", and "Expected Results".

Description: {{{description}}}
Photo: {{media url=photoDataUri}}
`,
});

const translateToJapanesePrompt = ai.definePrompt({
  name: 'translateToJapanesePrompt',
  input: {schema: z.object({englishTestScenarios: z.array(TestCaseSchema)})},
  output: {schema: z.object({japaneseTestScenarios: z.array(TestCaseSchema).describe("The translated test scenarios in Japanese. IMPORTANT: Keep the 'Test Case ID' the same, and translate the values for 'Preconditions', 'Steps to Reproduce', and 'Expected Results'.")})},
  prompt: `Translate the following English test scenarios to Japanese.
  
IMPORTANT: Your output must be a JSON object with a single key "japaneseTestScenarios", which contains an array of translated test case objects. Each object must have the keys "Test Case ID", "Preconditions", "Steps to Reproduce", and "Expected Results". Keep the "Test Case ID" the same.

{{jsonStringify englishTestScenarios}}
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
        englishTestScenarios: englishOutput?.englishTestScenarios || [],
      });
      japaneseOutput = output;
    } catch(e) {
      const {output} = await ai.generate({
        prompt: translateToJapanesePrompt.prompt,
        model: 'googleai/gemini-pro',
        input: {
          englishTestScenarios: englishOutput?.englishTestScenarios || [],
        },
        output: {schema: translateToJapanesePrompt.output.schema}
      });
      japaneseOutput = output as z.infer<typeof translateToJapanesePrompt.output.schema>;
    }

    return {
      englishTestScenarios: englishOutput?.englishTestScenarios || [],
      japaneseTestScenarios: japaneseOutput?.japaneseTestScenarios || [],
    };
  }
);
