'use server';
/**
 * @fileOverview An AI flow for providing coaching feedback on a user's custom development goal.
 *
 * - getGoalFeedback - A function that takes a user's goal and a situation they faced, and returns AI-powered coaching advice.
 */

import { ai } from '@/ai/genkit';
import { GoalFeedbackInputSchema, GoalFeedbackOutputSchema, type GoalFeedbackInput, type GoalFeedbackOutput } from '@/ai/schemas/goal-feedback-schemas';


export async function getGoalFeedback(input: GoalFeedbackInput): Promise<GoalFeedbackOutput> {
  return getGoalFeedbackFlow(input);
}


const prompt = ai.definePrompt({
  name: 'getGoalFeedbackPrompt',
  input: { schema: GoalFeedbackInputSchema },
  output: { schema: GoalFeedbackOutputSchema },
  prompt: `You are an expert executive and leadership coach. A user is working on a personal development goal and needs your feedback on a specific situation they encountered.

Your task is to analyze their situation in the context of their goal and provide clear, constructive, and actionable advice. Be encouraging but direct. Offer specific alternative phrases or actions they could try next time.

**User's Goal:**
- **Area:** {{{goalArea}}}
- **Activity:** {{{goalDescription}}}

**User's Situation:**
"{{{userSituation}}}"

Based on this, provide your expert coaching feedback. Focus on what they can do differently next time to better achieve their goal. Keep the feedback concise and focused, aiming for 2-3 key suggestions.
`,
});

const getGoalFeedbackFlow = ai.defineFlow(
  {
    name: 'getGoalFeedbackFlow',
    inputSchema: GoalFeedbackInputSchema,
    outputSchema: GoalFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI analysis failed to produce an output.");
    }
    return output;
  }
);
