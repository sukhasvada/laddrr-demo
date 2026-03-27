

/**
 * @fileOverview Zod schemas for the anonymous survey generation feature.
 */

import { z } from 'zod';

export const GenerateSurveyQuestionsInputSchema = z.object({
  objective: z.string().describe("The high-level objective of the survey."),
});
export type GenerateSurveyQuestionsInput = z.infer<typeof GenerateSurveyQuestionsInputSchema>;

export const SurveyQuestionSchema = z.object({
    id: z.string().optional().describe("Unique ID for the question, added post-generation."),
    questionText: z.string().describe("The exact text of the question to be asked."),
    reasoning: z.string().describe("The reasoning behind why this question is valuable and what it helps measure."),
    isCustom: z.boolean().optional().default(false).describe("Flag to indicate if the question was added by the user."),
});
export type SurveyQuestion = z.infer<typeof SurveyQuestionSchema>;

export const GenerateSurveyQuestionsOutputSchema = z.object({
  questions: z.array(SurveyQuestionSchema).describe("An array of suggested survey questions."),
});
export type GenerateSurveyQuestionsOutput = z.infer<typeof GenerateSurveyQuestionsOutputSchema>;


export const DeployedSurveySchema = z.object({
    id: z.string(),
    objective: z.string(),
    questions: z.array(SurveyQuestionSchema),
    deployedAt: z.string(),
    status: z.enum(['active', 'closed']),
    submissionCount: z.number().default(0),
    optOutCount: z.number().default(0),
    leadershipPulseSent: z.boolean().optional(),
    summary: z.any().optional(),
    coachingRecommendations: z.any().optional(),
});
export type DeployedSurvey = z.infer<typeof DeployedSurveySchema>;


// --- Schemas for Summarization ---

export const SummarizeSurveyResultsInputSchema = z.object({
    surveyObjective: z.string().describe("The original objective of the survey."),
    anonymousResponses: z.array(z.string()).describe("A list of all the raw, anonymous text responses from employees."),
});
export type SummarizeSurveyResultsInput = z.infer<typeof SummarizeSurveyResultsInputSchema>;

export const SummarizeSurveyResultsOutputSchema = z.object({
    overallSentiment: z.string().describe("A high-level summary of the overall mood or sentiment from the responses (e.g., 'Positive but with concerns about communication')."),
    keyThemes: z.array(z.object({
        theme: z.string().describe("The name of a recurring theme, e.g., 'Work-Life Balance' or 'Clarity from Leadership'."),
        summary: z.string().describe("A brief summary of what employees said about this theme."),
    })).describe("A list of the top 3-4 recurring themes found in the responses."),
    recommendations: z.array(z.string()).describe("A list of 2-3 concrete, actionable recommendations for the HR Head based on the feedback."),
});
export type SummarizeSurveyResultsOutput = z.infer<typeof SummarizeSurveyResultsOutputSchema>;
