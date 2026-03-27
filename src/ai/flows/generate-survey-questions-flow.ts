'use server';
/**
 * @fileOverview An AI flow for generating survey questions based on an objective.
 *
 * - generateSurveyQuestions - A function that takes an objective and returns a list of suggested questions with reasoning.
 */

import { ai } from '@/ai/genkit';
import { GenerateSurveyQuestionsInputSchema, GenerateSurveyQuestionsOutputSchema, type GenerateSurveyQuestionsInput, type GenerateSurveyQuestionsOutput } from '@/ai/schemas/survey-schemas';

export async function generateSurveyQuestions(input: GenerateSurveyQuestionsInput): Promise<GenerateSurveyQuestionsOutput> {
  return generateSurveyQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSurveyQuestionsPrompt',
  input: { schema: GenerateSurveyQuestionsInputSchema },
  output: { schema: GenerateSurveyQuestionsOutputSchema },
  prompt: `You are an expert in organizational psychology and survey design. An HR Head wants to create an anonymized survey to check the health of the organization.

**Survey Objective:**
"{{objective}}"

**Your Task:**
Generate a list of 5-7 relevant, insightful, and neutrally-worded survey questions that will help measure the stated objective. The questions should be suitable for a general employee audience. For each question, you MUST provide clear reasoning for why it is being asked and how it helps measure the objective.

- The 'questionText' should be the exact question to be shown to the employee.
- The 'reasoning' should explain the purpose of the question to the HR Head.

Generate the JSON output with the 'questions' array now.`,
});

const generateSurveyQuestionsFlow = ai.defineFlow(
  {
    name: 'generateSurveyQuestionsFlow',
    inputSchema: GenerateSurveyQuestionsInputSchema,
    outputSchema: GenerateSurveyQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate survey questions.");
    }
    return output;
  }
);
