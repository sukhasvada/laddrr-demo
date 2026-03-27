
'use server';
/**
 * @fileOverview An AI flow for suggesting a practice scenario for the "Nets" conversation arena.
 *
 * - generateNetsSuggestion - A function that analyzes a user's history and suggests a scenario.
 */

import { ai } from '@/ai/genkit';
import { NetsSuggestionInputSchema, NetsSuggestionOutputSchema, type NetsSuggestionInput, type NetsSuggestionOutput } from '@/ai/schemas/nets-schemas';
import { getOneOnOneHistory, getActiveCoachingPlansForUser } from '@/services/feedback-service';
import type { Role } from '@/hooks/use-role';
import { roleUserMapping } from '@/lib/role-mapping';

export async function generateNetsSuggestion(input: { forRole: Role; }): Promise<NetsSuggestionOutput> {
    const supervisorName = roleUserMapping[input.forRole]?.name;
    if (!supervisorName) {
        throw new Error("Could not find user for the provided role.");
    }
    
    // 1. Fetch all relevant data
    const allHistory = await getOneOnOneHistory();
    const supervisorActiveGoals = await getActiveCoachingPlansForUser(supervisorName);

    // 2. Filter data for the specific supervisor
    const relevantHistory = allHistory
        .filter(h => h.supervisorName === supervisorName)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); // Limit to last 5 sessions for brevity

    // 3. Extract and format the necessary context for the AI
    const pastIssues = relevantHistory.map(h => ({
        employeeName: h.employeeName,
        missedSignals: h.analysis.missedSignals,
        criticalInsightSummary: h.analysis.criticalCoachingInsight?.summary,
        coachingRecs: h.analysis.coachingRecommendations.map(r => r.area),
    }));

    const coachingGoalsInProgress = supervisorActiveGoals.map(p => ({
        area: p.rec.area,
        resource: p.rec.resource,
    }));
    
    // 4. Call the AI flow with the prepared data
    const flowInput: NetsSuggestionInput = {
        supervisorName,
        pastIssues,
        coachingGoalsInProgress,
    };
    
    const result = await generateNetsSuggestionFlow(flowInput);

    return result;
}


const prompt = ai.definePrompt({
  name: 'generateNetsSuggestionPrompt',
  input: { schema: NetsSuggestionInputSchema },
  output: { schema: NetsSuggestionOutputSchema },
  prompt: `You are an expert executive coach who helps leaders prepare for difficult conversations. Your task is to analyze a supervisor's recent performance history and active development goals to suggest a single, highly relevant practice scenario for them.

**Context:**
- Supervisor: {{{supervisorName}}}

**Recent Performance & Feedback (from last 5 sessions):**
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

**Supervisor's Active Coaching Goals:**
{{#if coachingGoalsInProgress}}
    {{#each coachingGoalsInProgress}}
    - **Goal:** Practice '{{this.area}}' (Related to: {{this.resource}})
    {{/each}}
{{else}}
- No active coaching goals.
{{/if}}

---

**Your Task:**

Based on the context, identify a recurring theme or a significant gap in the supervisor's performance. This could be a repeated type of missed signal, a critical insight that needs practice, or an active coaching goal.

Generate a JSON object with a single field, 'suggestedScenario', that contains a concise, one-sentence practice scenario. The scenario should be specific and actionable.

**Examples of good scenarios:**
- "Giving tough feedback about missed deadlines to a good performer."
- "Addressing a conflict with a peer from another team."
- "Responding to an employee who seems disengaged and is giving one-word answers."
- "Starting a conversation with a report who you suspect is looking for other jobs."

Generate the scenario now.
`,
});

const generateNetsSuggestionFlow = ai.defineFlow(
  {
    name: 'generateNetsSuggestionFlow',
    inputSchema: NetsSuggestionInputSchema,
    outputSchema: NetsSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error("AI analysis failed to produce a suggestion.");
    }
    return output;
  }
);
