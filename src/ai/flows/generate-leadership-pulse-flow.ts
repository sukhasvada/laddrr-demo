'use server';
/**
 * @fileOverview An AI flow for generating a targeted leadership survey based on organizational feedback.
 */

import { ai } from '@/ai/genkit';
import { GenerateLeadershipPulseInputSchema, GenerateLeadershipPulseOutputSchema, type GenerateLeadershipPulseInput, type GenerateLeadershipPulseOutput } from '@/ai/schemas/leadership-pulse-schemas';
import { v4 as uuidv4 } from 'uuid';

export async function generateLeadershipPulse(input: GenerateLeadershipPulseInput): Promise<GenerateLeadershipPulseOutput> {
  return generateLeadershipPulseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLeadershipPulsePrompt',
  input: { schema: GenerateLeadershipPulseInputSchema },
  output: { schema: GenerateLeadershipPulseOutputSchema },
  prompt: `You are an expert in organizational development and leadership coaching. You have been given the results of an anonymous employee survey. Your task is to generate three distinct sets of short, targeted follow-up surveys for different leadership roles (Team Leads, AMs, Managers) to diagnose the root causes of the employee feedback.

**Anonymous Survey Objective:** "{{surveyObjective}}"

**AI-Generated Summary of Anonymous Feedback:**
- **Overall Sentiment:** {{anonymousSurveySummary.overallSentiment}}
- **Key Themes:**
  {{#each anonymousSurveySummary.keyThemes}}
  - **{{this.theme}}**: {{this.summary}}
  {{/each}}
- **Recommendations:**
  {{#each anonymousSurveySummary.recommendations}}
  - {{this}}
  {{/each}}

**Your Task:**
Based on the summary above, create a list of 2-3 insightful, multiple-choice or rating-scale questions for EACH of the following roles. These questions should help clarify the "why" behind the employee sentiment from the perspective of that leader's responsibilities.

1.  **teamLeadQuestions**: Questions for **Team Leads**. These should focus on their direct team interactions, day-to-day management, and communication clarity.
2.  **amQuestions**: Questions for **Assistant Managers (AMs)**. These should focus on their role in coaching Team Leads, identifying broader team trends, and resource allocation.
3.  **managerQuestions**: Questions for **Managers**. These should be more strategic, focusing on departmental culture, process issues, and cross-team collaboration.

For each question in each list, provide a brief justification for why it's being asked.

**Example Question Format:**
- questionText: "How confident are you in your team's understanding of our current project priorities? (1-5 scale)"
- type: "rating"
- reasoning: "This question probes into the 'Clarity from Leadership' theme and helps determine if communication gaps exist."
- options: ["1 - Not Confident", "2", "3 - Somewhat Confident", "4", "5 - Very Confident"]

Generate the complete JSON output with the 'teamLeadQuestions', 'amQuestions', and 'managerQuestions' arrays for the leadership pulse survey now.`,
});

const generateLeadershipPulseFlow = ai.defineFlow(
  {
    name: 'generateLeadershipPulseFlow',
    inputSchema: GenerateLeadershipPulseInputSchema,
    outputSchema: GenerateLeadershipPulseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate leadership pulse questions.");
    }
    // Add unique IDs to each question post-generation
    output.teamLeadQuestions.forEach(q => q.id = q.id || uuidv4());
    output.amQuestions.forEach(q => q.id = q.id || uuidv4());
    output.managerQuestions.forEach(q => q.id = q.id || uuidv4());
    return output;
  }
);
