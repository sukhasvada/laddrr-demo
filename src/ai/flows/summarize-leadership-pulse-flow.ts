'use server';
/**
 * @fileOverview An AI flow for analyzing submitted leadership pulse surveys to generate coaching recommendations.
 */

import { ai } from '@/ai/genkit';
import { GenerateLeadershipPulseInputSchema } from '@/ai/schemas/leadership-pulse-schemas';
import { z } from 'zod';

const SummarizeLeadershipPulseInputSchema = z.object({
  anonymousSurveySummary: GenerateLeadershipPulseInputSchema.shape.anonymousSurveySummary,
  leadershipResponses: z.record(z.string(), z.array(z.string())).describe("An object where keys are leadership roles (e.g., 'Team Lead') and values are arrays of their free-text responses."),
});
type SummarizeLeadershipPulseInput = z.infer<typeof SummarizeLeadershipPulseInputSchema>;

const SummarizeLeadershipPulseOutputSchema = z.object({
  recommendations: z.array(z.object({
      theme: z.string().describe("The high-level theme of the coaching need (e.g., 'Clarity in Communication')."),
      recommendation: z.string().describe("A specific, actionable coaching recommendation or workshop suggestion."),
      targetAudience: z.string().describe("Who this recommendation applies to (e.g., 'All Team Leads', 'Manager: Alex Smith').")
  })).describe("A list of concrete coaching or L&D recommendations."),
});
type SummarizeLeadershipPulseOutput = z.infer<typeof SummarizeLeadershipPulseOutputSchema>;


export async function summarizeLeadershipPulse(input: SummarizeLeadershipPulseInput): Promise<SummarizeLeadershipPulseOutput> {
  return summarizeLeadershipPulseFlow(input);
}


const prompt = ai.definePrompt({
  name: 'summarizeLeadershipPulsePrompt',
  input: { schema: SummarizeLeadershipPulseInputSchema },
  output: { schema: SummarizeLeadershipPulseOutputSchema },
  prompt: `You are a Senior HR Business Partner specializing in leadership development. You have the results from two surveys.
  
1. An anonymous employee survey summary.
2. A follow-up pulse survey sent to leaders to diagnose the issues from the employee survey.

Your task is to connect the dots and generate concrete, actionable coaching recommendations.

**1. Anonymous Employee Survey Summary:**
- **Overall Sentiment:** {{anonymousSurveySummary.overallSentiment}}
- **Key Themes:**
  {{#each anonymousSurveySummary.keyThemes}}
  - **{{this.theme}}**: {{this.summary}}
  {{/each}}

**2. Leadership Pulse Responses:**
{{#each leadershipResponses}}
- **Responses from {{@key}}s:**
  {{#each this}}
  - "{{this}}"
  {{/each}}
{{/each}}

---

**Your Analysis Task:**

Based on both sets of data, generate a list of coaching recommendations. For each recommendation, identify the core 'theme', suggest a specific 'recommendation', and define the 'targetAudience'.

- If a specific leader's response indicates a clear gap, target them directly (e.g., 'Team Lead: Ben Carter').
- If multiple leaders show a similar gap, suggest a group workshop (e.g., 'All Team Leads').
- The recommendation should be a concrete action for an L&D or HR team to take.

**Example Output:**
- theme: "Proactive Communication"
  recommendation: "Assign a 'Nets' practice scenario to Ben Carter focused on delivering project updates proactively."
  targetAudience: "Team Lead: Ben Carter"
- theme: "Work-Life Balance"
  recommendation: "Conduct a workshop for all managers on recognizing signs of burnout and managing team workload."
  targetAudience: "All Managers"

Generate the JSON output with your recommendations now.`,
});

const summarizeLeadershipPulseFlow = ai.defineFlow(
  {
    name: 'summarizeLeadershipPulseFlow',
    inputSchema: SummarizeLeadershipPulseInputSchema,
    outputSchema: SummarizeLeadershipPulseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate coaching recommendations.");
    }
    return output;
  }
);
