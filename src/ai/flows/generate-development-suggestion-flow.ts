
'use server';
/**
 * @fileOverview An AI flow for suggesting a personalized development plan goal.
 */

import { ai } from '@/ai/genkit';
import { DevelopmentSuggestionInputSchema, DevelopmentSuggestionOutputSchema, type DevelopmentSuggestionInput, type DevelopmentSuggestionOutput } from '@/ai/schemas/development-suggestion-schemas';
import { getOneOnOneHistory } from '@/services/feedback-service';
import type { Role } from '@/hooks/use-role';
import { roleUserMapping } from '@/lib/role-mapping';

export async function generateDevelopmentSuggestion(input: DevelopmentSuggestionInput): Promise<DevelopmentSuggestionOutput> {
    const userName = input.userName;
    
    // 1. Fetch history data on the server side
    const allHistory = await getOneOnOneHistory();

    const relevantHistory = allHistory
        .filter(h => h.supervisorName === userName)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const pastIssues = relevantHistory.map(h => ({
        employeeName: h.employeeName,
        missedSignals: h.analysis.missedSignals,
        criticalInsightSummary: h.analysis.criticalCoachingInsight?.summary,
        coachingRecs: h.analysis.coachingRecommendations.map(r => r.area),
    }));
    
    // 2. Call the AI flow with all prepared data
    const flowInput: DevelopmentSuggestionInput = {
        userName,
        pastIssues,
        coachingGoalsInProgress: input.coachingGoalsInProgress,
    };
    
    const result = await generateDevelopmentSuggestionFlow(flowInput);
    return result;
}


const prompt = ai.definePrompt({
  name: 'generateDevelopmentSuggestionPrompt',
  input: { schema: DevelopmentSuggestionInputSchema },
  output: { schema: DevelopmentSuggestionOutputSchema },
  prompt: `You are an expert executive coach. Your task is to analyze a user's recent performance history and active development goals to suggest 1-2 highly relevant, concrete development goals for them.

**Context:**
- User: {{{userName}}}

**Recent Performance & Feedback (from last 5 sessions where they were the supervisor):**
{{#if pastIssues}}
  {{#each pastIssues}}
  - **With {{this.employeeName}}:**
    {{#if this.missedSignals}}
    - Missed Signals: {{#each this.missedSignals}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}
    {{/if}}
    {{#if this.criticalInsightSummary}}
    - Critical Insight: "{{this.criticalInsightSummary}}"
    {{/if}}
    {{#if this.coachingRecs}}
    - AI Coaching Recs: {{#each this.coachingRecs}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}
    {{/if}}
  {{/each}}
{{else}}
- No past sessions found.
{{/if}}

**User's Active Coaching Goals:**
{{#if coachingGoalsInProgress}}
    {{#each coachingGoalsInProgress}}
    - **Goal:** Practice '{{this.area}}' (Related to: {{this.resource}})
    {{/each}}
{{else}}
- No active coaching goals.
{{/if}}

---

**Your Task:**

Based on the context, identify recurring themes or significant gaps in the user's performance. This could be a repeated type of missed signal, a critical insight that needs practice, or a theme from past coaching recommendations.

Generate a JSON object containing a 'suggestions' array with 1-2 development goal objects. Each object must have:
1.  **area**: A high-level skill to improve (e.g., "Conflict Resolution", "Giving Recognition").
2.  **resource**: A *specific, actionable activity* the user can do (e.g., "Initiate a conversation with a disengaged employee," not "Read a book").
3.  **justification**: A short sentence explaining *why* this is a good goal for them based on their history.

**Example Suggestions:**
- { "area": "Difficult Conversations", "resource": "Practice giving corrective feedback to a peer.", "justification": "Based on missed signals about performance issues, this will build confidence in addressing problems directly." }
- { "area": "Team Morale", "resource": "Publicly recognize a team member's contribution in a team-wide channel.", "justification": "This helps practice giving specific appreciation, a common coaching recommendation." }

Generate the suggestions now.
`,
});

const generateDevelopmentSuggestionFlow = ai.defineFlow(
  {
    name: 'generateDevelopmentSuggestionFlow',
    inputSchema: DevelopmentSuggestionInputSchema,
    outputSchema: DevelopmentSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error("AI analysis failed to produce a suggestion.");
    }
    return output;
  }
);
