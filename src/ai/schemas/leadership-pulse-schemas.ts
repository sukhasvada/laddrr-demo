/**
 * @fileOverview Zod schemas for the AI-powered leadership pulse survey feature.
 */

import { z } from 'zod';
import { SummarizeSurveyResultsOutputSchema } from './survey-schemas';

export const GenerateLeadershipPulseInputSchema = z.object({
  surveyObjective: z.string().describe("The original objective of the anonymous employee survey."),
  anonymousSurveySummary: SummarizeSurveyResultsOutputSchema.describe("The AI-generated summary of the anonymous survey results."),
});
export type GenerateLeadershipPulseInput = z.infer<typeof GenerateLeadershipPulseInputSchema>;


export const LeadershipQuestionSchema = z.object({
    id: z.string().optional().describe("Unique ID for the question, added post-generation."),
    questionText: z.string().describe("The exact text of the question to be asked to a leader."),
    type: z.enum(["rating", "multiple-choice", "free-text"]).describe("The type of question."),
    reasoning: z.string().describe("The reasoning behind why this question is valuable for diagnosing leadership behaviors."),
    options: z.array(z.string()).optional().describe("A list of options for multiple-choice or rating scale questions."),
});
export type LeadershipQuestion = z.infer<typeof LeadershipQuestionSchema>;


export const GenerateLeadershipPulseOutputSchema = z.object({
  teamLeadQuestions: z.array(LeadershipQuestionSchema).describe("An array of suggested questions specifically for the Team Lead role."),
  amQuestions: z.array(LeadershipQuestionSchema).describe("An array of suggested questions specifically for the Assistant Manager (AM) role."),
  managerQuestions: z.array(LeadershipQuestionSchema).describe("An array of suggested questions specifically for the Manager role."),
});
export type GenerateLeadershipPulseOutput = z.infer<typeof GenerateLeadershipPulseOutputSchema>;
