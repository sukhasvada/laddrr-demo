
'use server';
/**
 * @fileOverview An AI flow for running conversation simulations in "Nets".
 *
 * - runNetsConversation - A function that takes the simulation config and conversation history, and returns the AI's next response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { NetsConversationInputSchema, NetsMessageSchema, type NetsConversationInput } from '@/ai/schemas/nets-schemas';

export async function runNetsConversation(input: z.infer<typeof NetsConversationInputSchema>): Promise<z.infer<typeof NetsMessageSchema>> {
  return runNetsConversationFlow(input);
}

const continueConversationPrompt = ai.definePrompt({
  name: 'netsContinueConversationPrompt',
  input: { schema: NetsConversationInputSchema },
  output: { schema: z.string().describe("The AI's response in the conversation.") },
  prompt: `You are an AI actor in a role-playing simulation designed to help users practice difficult conversations.

**Your Persona:**
- You are playing the role of a {{persona}}.
- Your demeanor should be {{difficulty}}.

**The Scenario:**
- The user wants to practice the following scenario they have described: "{{scenario}}".

**Your Task:**
- Stay in character as the {{persona}} at all times.
- Your responses should be realistic and reflect your assigned role and difficulty.
- Do NOT break character or reveal that you are an AI.
- Do NOT be overly agreeable. If the user is vague, push back. If their tone is poor, react accordingly. Your goal is to provide a realistic challenge.
- Keep your responses concise and conversational.
- You must always respond with a plain text string.

**Conversation History:**
{{#each history}}
  {{#if this.isUser}}
    User: {{{this.content}}}
  {{else if this.isModel}}
    You: {{{this.content}}}
  {{/if}}
{{/each}}

Based on the history, provide your next response as the {{persona}}.`,
});

const startConversationPrompt = ai.definePrompt({
  name: 'netsStartConversationPrompt',
  input: { schema: z.object({ persona: z.string(), scenario: z.string(), difficulty: z.string() }) },
  output: { schema: z.string().describe("The AI's first response in the conversation.") },
  prompt: `You are an AI actor in a role-playing simulation. Your task is to start a conversation.

**Your Persona:**
- You are playing the role of a {{persona}}.
- Your demeanor should be {{difficulty}}.

**The Scenario:**
- The user wants to practice the following scenario they have described: "{{scenario}}".

**Your Task:**
- Generate ONLY the first line of the conversation from your perspective as the {{persona}}.
- Do NOT wait for the user to speak. Your response should be the opening statement.
- Keep your response concise and conversational.
- You must always respond with a plain text string.

For example, if the scenario is "giving feedback about missed deadlines," a good opening might be "Hi, thanks for joining. I wanted to chat about the recent project deadlines."

Generate your opening line now.`
});

const mockResponses = [
    "Thanks for making time to chat. I wanted to talk about the project deadline for the 'Phoenix' feature.",
    "Okay. What about it?",
    "I understand, but we're now at risk of missing our Q3 launch commitment. The knock-on effect is that the marketing team can't start their campaigns.",
    "Well, the initial requirements were unclear, and we had to do a lot of rework. It's not entirely on us.",
    "I agree the initial brief was vague, and I take responsibility for not getting you clearer specs sooner. That said, we're now in a difficult position. What do you think is a realistic timeline to get this feature completed?",
    "I'm not sure. With the current workload, at least another two weeks, maybe three.",
    "Two weeks is tough. If I can get you dedicated support from a junior developer to handle your other tickets, could we aim to get it done by next Friday?",
    "That would help. Yes, I think I can make that work.",
    "Great. I appreciate your flexibility. Let's touch base tomorrow to confirm the support plan. Thanks for your commitment to this."
];

const runNetsConversationFlow = ai.defineFlow(
  {
    name: 'runNetsConversationFlow',
    outputSchema: NetsMessageSchema,
    inputSchema: NetsConversationInputSchema,
  },
  async (input) => {
    // MOCK IMPLEMENTATION
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    let outputText: string;

    const userTurns = input.history.filter(m => m.role === 'user').length;

    if (input.history.length === 0) {
      // First turn, AI starts the conversation.
      outputText = mockResponses[0];
    } else {
      // Subsequent turns, get the next mock response.
      // The AI speaks on even turns (0, 2, 4...), so we look at the number of user turns to decide the AI's response index.
      const responseIndex = userTurns;
      outputText = mockResponses[responseIndex] || "I'm not sure how to respond to that. Let's try restarting the scenario.";
    }
    
    return {
      role: 'model',
      content: outputText,
    };
  }
);
