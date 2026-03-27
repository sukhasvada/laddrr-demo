
'use server';
/**
 * @fileOverview An AI flow for providing performance coaching via chat.
 *
 * - runPerformanceChat - A function that takes a user's question and performance data and returns a coaching response.
 */

import { ai } from '@/ai/genkit';
import { PerformanceChatInputSchema, PerformanceChatOutputSchema, type PerformanceChatInput, type PerformanceChatOutput } from '@/ai/schemas/performance-chat-schemas';

export async function runPerformanceChat(input: PerformanceChatInput): Promise<PerformanceChatOutput> {
  return performanceChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'performanceChatPrompt',
  input: { schema: PerformanceChatInputSchema },
  output: { schema: PerformanceChatOutputSchema },
  prompt: `You are an expert, encouraging, and actionable performance coach. Your name is Laddrr. A user is asking for advice based on their performance data compared to their peers.

**Your Task:**
1.  Analyze the user's question in the context of their performance data and the provided chat history.
2.  Provide a concise, supportive, and actionable answer.
3.  Focus on providing concrete next steps or different ways of thinking about the problem.
4.  Do NOT simply repeat the data. Provide interpretation and coaching.
5.  Keep your tone positive and motivational, even when addressing areas for improvement.

**Performance Context:**
{{#each performanceContext}}
- **{{this.name}}:**
  {{#each this.metrics}}
  - {{@key}}: {{this.value}}
  {{/each}}
{{/each}}

**Chat History:**
{{#each chatHistory}}
- **{{this.role}}:** {{this.content}}
{{/each}}

**User's Current Question:**
"{{userQuestion}}"

Generate a helpful and encouraging response now.`,
});

const performanceChatFlow = ai.defineFlow(
  {
    name: 'performanceChatFlow',
    inputSchema: PerformanceChatInputSchema,
    outputSchema: PerformanceChatOutputSchema,
  },
  async (input) => {
    // Convert the complex object into a string representation for the prompt
    const performanceContextForPrompt = input.performanceContext.map(p => ({
        name: p.name,
        metrics: Object.entries(p.metrics).map(([key, value]) => ({
            key,
            value: value.value
        }))
    }));

    const promptInput = {
        ...input,
        performanceContext: performanceContextForPrompt,
    };
    
    const { output } = await prompt(promptInput as any);
    
    if (!output) {
      throw new Error("AI coach failed to generate a response.");
    }
    
    return output;
  }
);
