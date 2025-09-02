'use server';

import { z } from 'genkit';

export const TestCaseSchema = z.object({
  "Test Case ID": z.string(),
  "Preconditions": z.string(),
  "Steps to Reproduce": z.string(),
  "Expected Results": z.string(),
});
