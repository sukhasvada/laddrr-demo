'use server';
/**
 * @fileOverview An AI flow for analyzing and scoring a mock interview for the Interviewer Lab.
 *
 * - analyzeInterview - A function that takes a transcript and returns a full evaluation.
 */

import { ai } from '@/ai/genkit';
import { InterviewerConversationInputSchema, InterviewerAnalysisOutputSchema, type InterviewerConversationInput, type InterviewerAnalysisOutput } from '@/ai/schemas/interviewer-lab-schemas';

export async function analyzeInterview(input: InterviewerConversationInput): Promise<InterviewerAnalysisOutput> {
  return analyzeInterviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInterviewPrompt',
  input: { schema: InterviewerConversationInputSchema },
  output: { schema: InterviewerAnalysisOutputSchema },
  prompt: `You are an expert interview coach and hiring manager at a top tech company. Your task is to analyze the transcript of a mock interview and provide a detailed, structured evaluation based on a specific rubric.

**Interview Transcript:**
---
{{{transcript}}}
---

**Your Task:**

Based on the full transcript, generate a complete JSON scorecard. You must score the interviewer (NOT the candidate) on a scale of 0.0 to 10.0 for each of the following six categories. Then, calculate a weighted "overallScore" from 0 to 100.

**Rubric & Scoring Guide:**

1.  **structureAndFlow** (Weight: 20%):
    *   10: Flawless structure. Clear intro, well-paced questions, smooth transitions, and a strong close, all within the time limit.
    *   5: Had a basic structure but was disorganized. Pacing was off, or transitions were abrupt.
    *   1: No clear structure. Seemed to ask random questions.

2.  **starProbing** (Weight: 30%):
    *   10: Expertly used the STAR method (Situation, Task, Action, Result) to probe for details. Consistently drilled down on "Action" and "Result".
    *   5: Asked for an example but didn't follow up effectively to get all parts of the STAR method.
    *   1: Did not ask behavioral questions or probe for specific examples.

3.  **activeListening** (Weight: 15%):
    *   10: Clearly listened to answers and used them to ask relevant, unscripted follow-up questions.
    *   5: Mostly stuck to a script. Acknowledged answers but didn't build upon them.
    *   1: Interrupted the candidate or asked questions that were already answered.

4.  **biasAwareness** (Weight: 15%):
    *   10: Language was consistently objective and focused on skills and behaviors. No leading or biased questions.
    *   5: Used some slightly leading questions or subjective language (e.g., "Are you a good team player?").
    *   1: Asked questions that showed clear bias (e.g., related to age, gender, personal life).

5.  **legalCompliance** (Weight: 10%):
    *   10: All questions were legally sound and job-related.
    *   5: Strayed into a gray area with questions that were not directly job-related.
    *   1: Asked a clearly illegal or inappropriate question.

6.  **confidenceAndDemeanor** (Weight: 10%):
    *   10: Projected confidence and professionalism. Created a positive and respectful environment.
    *   5: Seemed nervous or unsure. Demeanor was inconsistent.
    *   1: Was unprofessional, overly casual, or intimidating.

**JSON Output Generation:**

1.  **scores**: Populate all six fields in the rubric with a score from 0.0 to 10.0.
2.  **overallScore**: Calculate the weighted average of the six scores and scale it to 100.
    *Formula: \`((structureAndFlow * 0.20) + (starProbing * 0.30) + (activeListening * 0.15) + (biasAwareness * 0.15) + (legalCompliance * 0.10) + (confidenceAndDemeanor * 0.10)) * 10\`*
3.  **strengths**: Provide a bulleted list of 2-3 specific things the interviewer did well, with examples.
4.  **gaps**: Provide a bulleted list of 2-3 specific areas for improvement, with examples.
5.  **coachingSummary**: Write a concise paragraph summarizing the most important coaching advice for the interviewer based on this single session.

Generate the complete JSON scorecard now.`,
});

const analyzeInterviewFlow = ai.defineFlow(
  {
    name: 'analyzeInterviewFlow',
    inputSchema: InterviewerConversationInputSchema,
    outputSchema: InterviewerAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI analysis failed to produce a scorecard.");
    }
    return output;
  }
);
