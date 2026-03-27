/**
 * @fileOverview Zod schemas for the "Nets" conversation simulation feature.
 */

import { z } from 'zod';

export const NetsMessageSchema = z.object({
  role: z.enum(["user", "model", "system"]),
  content: z.string(),
});
export type NetsMessage = z.infer<typeof NetsMessageSchema>;

export const NetsInitialInputSchema = z.object({
  scenario: z.string().describe("The user-defined scenario for the conversation."),
  persona: z.string().describe("The persona the AI should adopt, e.g., 'Team Lead'."),
  difficulty: z.string().describe("The difficulty level of the conversation, e.g., 'Strict'."),
});
export type NetsInitialInput = z.infer<typeof NetsInitialInputSchema>;

export const NetsConversationInputSchema = NetsInitialInputSchema.extend({
  history: z.array(NetsMessageSchema).describe("The conversation history so far."),
});
export type NetsConversationInput = z.infer<typeof NetsConversationInputSchema>;


// Schemas for the scenario suggestion feature
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

export const NetsSuggestionInputSchema = z.object({
    supervisorName: z.string(),
    pastIssues: z.array(PastIssueSchema),
    coachingGoalsInProgress: z.array(CoachingGoalSchema),
});
export type NetsSuggestionInput = z.infer<typeof NetsSuggestionInputSchema>;

export const NetsSuggestionOutputSchema = z.object({
    suggestedScenario: z.string().describe("A concise, one-sentence practice scenario suggested by the AI based on user's history."),
});
export type NetsSuggestionOutput = z.infer<typeof NetsSuggestionOutputSchema>;


// Schemas for the mid-simulation nudge feature
export const NetsNudgeOutputSchema = z.object({
    nudge: z.string().describe("A single, actionable coaching nudge for the user based on the conversation so far."),
});
export type NetsNudgeOutput = z.infer<typeof NetsNudgeOutputSchema>;


// Schemas for post-simulation analysis
const AnnotatedMessageSchema = NetsMessageSchema.extend({
    annotation: z.string().optional().describe("A short, insightful piece of feedback on a user's message."),
    type: z.enum(["positive", "negative"]).optional().describe("The type of feedback provided in the annotation."),
});
export type AnnotatedMessage = z.infer<typeof AnnotatedMessageSchema>;


export const NetsAnalysisOutputSchema = z.object({
    scores: z.object({
        clarity: z.number().min(1.0).max(10.0),
        empathy: z.number().min(1.0).max(10.0),
        assertiveness: z.number().min(1.0).max(10.0),
        overall: z.number().min(1.0).max(10.0),
    }),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
    annotatedConversation: z.array(AnnotatedMessageSchema),
});
export type NetsAnalysisOutput = z.infer<typeof NetsAnalysisOutputSchema>;

// The schemas for the Interviewer Lab are structurally identical to the Nets analysis output,
// so we can reuse them or alias them for clarity if needed. For now, we'll just be aware of this.
export type InterviewerAnalysisOutput = z.infer<typeof NetsAnalysisOutputSchema>;
