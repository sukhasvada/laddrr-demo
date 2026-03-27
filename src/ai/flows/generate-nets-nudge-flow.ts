
'use server';
/**
 * @fileOverview An AI flow for providing a mid-simulation "nudge" in the Nets arena.
 *
 * - generateNetsNudge - A function that analyzes a conversation and provides a hint.
 */

import { ai } from '@/ai/genkit';
import { NetsConversationInputSchema, NetsNudgeOutputSchema, type NetsConversationInput, type NetsNudgeOutput } from '@/ai/schemas/nets-schemas';

export async function generateNetsNudge(input: NetsConversationInput): Promise<NetsNudgeOutput> {
  return generateNetsNudgeFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateNetsNudgePrompt',
  input: { schema: NetsConversationInputSchema },
  output: { schema: NetsNudgeOutputSchema },
  prompt: `You are an expert conversation coach observing a role-play simulation. The user has asked for a hint. Your task is to analyze the conversation so far and provide a single, actionable "nudge" to help them get unstuck or improve their approach.

Do not comment on the entire conversation. Focus on providing a specific suggestion for their *next* turn.

**The Simulation Context:**
- Scenario: "{{scenario}}"
- The user is practicing with an AI playing a {{difficulty}} {{persona}}.

**Conversation History:**
{{#each history}}
  {{#if this.isUser}}
    User: {{{this.content}}}
  {{else if this.isModel}}
    {{../persona}}: {{{this.content}}}
  {{/if}}
{{/each}}

---

**Your Task:**

Based on the history, generate a JSON object with a single field, 'nudge'. The nudge should be a short, encouraging, and specific piece of advice.

**Examples of good nudges:**
- "Try asking an open-ended question to understand their perspective."
- "It might be helpful to clearly state the purpose of this conversation now."
- "Consider acknowledging their last point before stating your own."
- "You've stated the problem well. What's a potential solution you can propose?"

Generate the coaching nudge now.
`,
});

const generateNetsNudgeFlow = ai.defineFlow(
  {
    name: 'generateNetsNudgeFlow',
    inputSchema: NetsConversationInputSchema,
    outputSchema: NetsNudgeOutputSchema,
  },
  async (input) => {
    // Pre-process history for Handlebars compatibility
    const processedHistory = input.history.map(msg => ({
      isUser: msg.role === 'user',
      isModel: msg.role === 'model',
      content: msg.content,
    }));
    
    const promptInput = {
      ...input,
      history: processedHistory,
    };

    const { output } = await prompt(promptInput);

    if (!output) {
      throw new Error("AI analysis failed to produce a nudge.");
    }
    return output;
  }
);

    