'use server';
/**
 * @fileOverview An AI flow for analyzing and scoring a "Nets" conversation simulation.
 *
 * - analyzeNetsConversation - A function that takes a conversation history and returns a full analysis.
 */

import { ai } from '@/ai/genkit';
import { NetsConversationInputSchema, NetsAnalysisOutputSchema, type NetsConversationInput, type NetsAnalysisOutput } from '@/ai/schemas/nets-schemas';

export async function analyzeNetsConversation(input: NetsConversationInput): Promise<NetsAnalysisOutput> {
  return analyzeNetsConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeNetsConversationPrompt',
  input: { schema: NetsConversationInputSchema },
  output: { schema: NetsAnalysisOutputSchema },
  prompt: `You are an expert conversation and executive coach. Your task is to analyze a practice conversation from a role-play simulation and provide a detailed scorecard.

**The Simulation Context:**
- Scenario: "{{scenario}}"
- The user was practicing a conversation with an AI playing a {{difficulty}} {{persona}}.

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

Based on the full conversation, generate a complete JSON scorecard with the following structure:

1.  **scores**:
    *   **clarity**: Rate the user's clarity from 1.0 to 10.0. Were they direct and easy to understand?
    *   **empathy**: Rate the user's empathy from 1.0 to 10.0. Did they acknowledge the other person's perspective?
    *   **assertiveness**: Rate the user's assertiveness from 1.0 to 10.0. Did they state their needs and goals confidently without being aggressive?
    *   **overall**: Provide an overall score for the user's performance in this specific scenario.

2.  **strengths**: Provide a bulleted list of 2-3 things the user did well. Be specific.

3.  **gaps**: Provide a bulleted list of 2-3 specific areas for improvement.

4.  **annotatedConversation**: This is the MOST IMPORTANT part. Review the conversation turn-by-turn. For at least 3-4 key moments in the conversation (both good and bad), provide a short, insightful annotation.
    *   For each message in the original history, copy the 'role' and 'content'.
    *   If a user's message represents a key learning moment, add an 'annotation' and a 'type' ('positive' for good, 'negative' for an area of improvement).
    *   The annotation should be a concise piece of feedback explaining WHY that specific phrase or approach was effective or ineffective.
    *   Do NOT add annotations to the AI's (model's) turns. Only annotate the user's turns.

Generate the complete scorecard now.`,
});

const analyzeNetsConversationFlow = ai.defineFlow(
  {
    name: 'analyzeNetsConversationFlow',
    inputSchema: NetsConversationInputSchema,
    outputSchema: NetsAnalysisOutputSchema,
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
      throw new Error("AI analysis failed to produce a scorecard.");
    }
    return output;
  }
);
