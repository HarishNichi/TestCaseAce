import { config } from 'dotenv';
config();

import '@/ai/flows/generate-ui-test-scenarios.ts';
import '@/ai/flows/generate-api-test-cases.ts';
import '@/ai/flows/execute-api-tests.ts';
import '@/ai/flows/generate-pdf-report.ts';
