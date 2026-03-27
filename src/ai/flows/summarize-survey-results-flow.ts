
'use server';
/**
 * @fileOverview An AI flow for summarizing the results of an anonymous survey.
 *
 * - summarizeSurveyResults - A function that takes survey responses and returns a thematic summary.
 */

import { ai } from '@/ai/genkit';
import { SummarizeSurveyResultsInputSchema, SummarizeSurveyResultsOutputSchema, type SummarizeSurveyResultsInput, type SummarizeSurveyResultsOutput } from '@/ai/schemas/survey-schemas';

export async function summarizeSurveyResults(input: SummarizeSurveyResultsInput): Promise<SummarizeSurveyResultsOutput> {
  return summarizeSurveyResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSurveyResultsPrompt',
  input: { schema: SummarizeSurveyResultsInputSchema },
  output: { schema: SummarizeSurveyResultsOutputSchema },
  prompt: `You are an expert HR analyst specializing in sentiment analysis and organizational health. You have received a set of anonymous employee responses from a survey.

**Survey Objective:**
"{{surveyObjective}}"

**Anonymous Responses:**
---
{{#each anonymousResponses}}
- "{{this}}"
{{/each}}
---

**Your Task:**
Analyze the raw, anonymous feedback and generate a structured JSON report that synthesizes the results for the HR Head.

1.  **overallSentiment**: Provide a high-level summary of the overall mood. Is it positive, negative, mixed? What's the general feeling?
2.  **keyThemes**: Identify the top 3-4 recurring themes. For each theme, provide a 'theme' name (e.g., 'Work-Life Balance') and a 'summary' of what employees are saying about it.
3.  **recommendations**: Based on the themes, provide a bulleted list of 2-3 concrete, actionable recommendations for the HR Head to consider.

Generate the summary report now.`,
});

const summarizeSurveyResultsFlow = ai.defineFlow(
  {
    name: 'summarizeSurveyResultsFlow',
    inputSchema: SummarizeSurveyResultsInputSchema,
    outputSchema: SummarizeSurveyResultsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a survey summary.");
    }
    return output;
  }
);
