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

const EnglishTestCasesSchema = z.object({ englishTestScenarios: z.array(TestCaseSchema).describe('UI test scenarios in English.') });
const JapaneseTestCasesSchema = z.object({japaneseTestScenarios: z.array(TestCaseSchema).describe("The translated test scenarios in Japanese. IMPORTANT: Keep the 'Test Case ID' the same, and translate the values for 'Preconditions', 'Steps to Reproduce', and 'Expected Results'.")});

const generateUITestScenariosPrompt = ai.definePrompt({
  name: 'generateUITestScenariosPrompt',
  input: {schema: GenerateUITestScenariosInputSchema},
  output: {schema: EnglishTestCasesSchema},
  prompt: `You are an expert UI test case generator. Given a screenshot of a UI and a description of the UI, you will generate comprehensive UI test scenarios in English.

Your output must be a JSON object with a single key: "englishTestScenarios". This key should contain an array of test case objects. Each test case object must have the following keys: "**Test Case ID**", "**Preconditions**", "**Steps to Reproduce**", and "**Expected Results**".

Description: {{{description}}}
Photo: {{media url=photoDataUri}}
`,
});

const translateToJapanesePrompt = ai.definePrompt({
  name: 'translateToJapanesePrompt',
  input: {schema: z.object({englishTestScenarios: z.array(TestCaseSchema)})},
  output: {schema: JapaneseTestCasesSchema},
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
  },
  async input => {
    let englishOutput;
    try {
      const {output} = await generateUITestScenariosPrompt(input);
      englishOutput = output;
    } catch (e) {
      console.error("Fallback for generateUITestScenariosPrompt (English)", e);
      const fallbackPrompt = `You are an expert UI test case generator. Given a screenshot of a UI and a description of the UI, you will generate comprehensive UI test scenarios in English.

Your output must be a JSON object with a single key: "englishTestScenarios". This key should contain an array of test case objects. Each test case object must have the following keys: "**Test Case ID**", "**Preconditions**", "**Steps to Reproduce**", and "**Expected Results**".

Description: ${input.description}
`;

      const {output} = await ai.generate({
        prompt: [
          {text: fallbackPrompt},
          {media: {url: input.photoDataUri}}
        ],
        model: 'googleai/gemini-2.5-flash',
        output: {schema: EnglishTestCasesSchema}
      });
      englishOutput = output as z.infer<typeof EnglishTestCasesSchema>;
    }

    let japaneseOutput;
    try {
      const {output} = await translateToJapanesePrompt({
        englishTestScenarios: englishOutput?.englishTestScenarios || [],
      });
      japaneseOutput = output;
    } catch(e) {
      console.error("Fallback for translateToJapanesePrompt (Japanese)", e);
      const scenariosToTranslate = englishOutput?.englishTestScenarios || [];
      const fallbackPrompt = `Translate the following English test scenarios to Japanese.
  
IMPORTANT: Your output must be a JSON object with a single key "japaneseTestScenarios", which contains an array of translated test case objects. Each object must have the keys "Test Case ID", "Preconditions", "Steps to Reproduce", and "Expected Results". Keep the "Test Case ID" the same.

${JSON.stringify(scenariosToTranslate)}
`;
      const {output} = await ai.generate({
        prompt: fallbackPrompt,
        model: 'googleai/gemini-2.5-flash',
        output: {schema: JapaneseTestCasesSchema}
      });
      japaneseOutput = output as z.infer<typeof JapaneseTestCasesSchema>;
    }

    return {
      englishTestScenarios: englishOutput?.englishTestScenarios || [],
      japaneseTestScenarios: japaneseOutput?.japaneseTestScenarios || [],
    };
  }
);
