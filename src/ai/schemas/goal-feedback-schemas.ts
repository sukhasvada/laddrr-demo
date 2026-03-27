/**
 * @fileOverview Zod schemas for the AI-powered goal feedback feature.
 * This file is kept separate to allow its non-async exports (the schemas)
 * to be imported into client components without violating the "use server"
 * directive's constraints.
 */

import { z } from 'zod';

export const GoalFeedbackInputSchema = z.object({
  goalArea: z.string().describe("The high-level skill or area the user is trying to improve, e.g., 'Public Speaking'."),
  goalDescription: z.string().describe("The specific activity or resource the user is engaged in, e.g., 'Practicing storytelling in team meetings'."),
  userSituation: z.string().describe("A description from the user about a specific situation where they tried to apply their goal, including what they are struggling with."),
});
export type GoalFeedbackInput = z.infer<typeof GoalFeedbackInputSchema>;

export const GoalFeedbackOutputSchema = z.object({
  feedback: z.string().describe("Actionable, constructive feedback from the AI coach that analyzes the user's situation and provides specific advice and alternative strategies."),
});
export type GoalFeedbackOutput = z.infer<typeof GoalFeedbackOutputSchema>;
