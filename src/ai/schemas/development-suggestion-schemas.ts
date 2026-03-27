/**
 * @fileOverview Zod schemas for the AI-powered development goal suggestion feature.
 */

import { z } from 'zod';

const PastIssueSchema = z.object({
    employeeName: z.string(),
    missedSignals: z.array(z.string()).optional(),
    criticalInsightSummary: z.string().optional(),
    coachingRecs: z.array(z.string()).optional(),
});

const CoachingGoalSchema = z.object({
    area: z.string(),
    resource: z.string(),
});

export const DevelopmentSuggestionInputSchema = z.object({
    userName: z.string(),
    pastIssues: z.array(PastIssueSchema).optional(),
    coachingGoalsInProgress: z.array(CoachingGoalSchema),
});
export type DevelopmentSuggestionInput = z.infer<typeof DevelopmentSuggestionInputSchema>;

export const DevelopmentSuggestionOutputSchema = z.object({
    suggestions: z.array(z.object({
        area: z.string().describe("The high-level skill or area for improvement, e.g., 'Public Speaking'."),
        resource: z.string().describe("A specific, actionable activity the user can undertake, e.g., 'Volunteer to present the next team update.'"),
        justification: z.string().describe("A brief explanation for why this suggestion is relevant based on the user's history.")
    })).describe("An array of 1-2 concrete development goal suggestions."),
});
export type DevelopmentSuggestionOutput = z.infer<typeof DevelopmentSuggestionOutputSchema>;
