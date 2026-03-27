'use server';
/**
 * @fileOverview An AI flow for generating a daily coaching tip.
 *
 * - getDailyCoachingTip - A function that returns a single, concise coaching tip.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DailyCoachingTipInputSchema = z.object({
  role: z.string().describe("The user's role, e.g., 'Employee' or 'Team Lead'."),
  recentThemes: z.array(z.string()).optional().describe("Optional list of recent performance themes, e.g., ['Clarity', 'Empathy']."),
});

const DailyCoachingTipOutputSchema = z.object({
  tip: z.string().describe("A single, concise, actionable coaching tip for the user for the day."),
});

export async function getDailyCoachingTip(input: z.infer<typeof DailyCoachingTipInputSchema>): Promise<z.infer<typeof DailyCoachingTipOutputSchema>> {
  return getDailyCoachingTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyCoachingTipPrompt',
  input: { schema: DailyCoachingTipInputSchema },
  output: { schema: DailyCoachingTipOutputSchema },
  prompt: `You are an expert executive coach. Your task is to generate a single, micro-coaching tip for a user based on their role.

If recent performance themes are provided, tailor the tip to one of those themes. If not, provide a general but useful tip for their role.

The tip must be short, actionable, and encouraging. Frame it as a "Tip of the Day".

**User Role:** {{{role}}}
{{#if recentThemes}}
**Recent Themes:** {{#each recentThemes}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

**Examples:**
- "Tip of the Day: In your next meeting, try to summarize the key takeaway in your own words. This is a great way to practice active listening."
- "Tip of the Day: When giving feedback today, start by stating your positive intent. For example, 'I'm sharing this because I want to see you succeed.'"

Generate one coaching tip now.`,
});

const getDailyCoachingTipFlow = ai.defineFlow(
  {
    name: 'getDailyCoachingTipFlow',
    inputSchema: DailyCoachingTipInputSchema,
    outputSchema: DailyCoachingTipOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a coaching tip.");
    }
    return output;
  }
);
