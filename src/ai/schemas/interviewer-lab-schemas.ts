/**
 * @fileOverview Zod schemas for the Interviewer Lab feature.
 */

import { z } from 'zod';

// Input for the analysis flow
export const InterviewerConversationInputSchema = z.object({
  transcript: z.string().describe("The full transcript of the mock interview."),
});
export type InterviewerConversationInput = z.infer<typeof InterviewerConversationInputSchema>;


// The detailed scoring rubric for the AI to follow
const ScoringRubricSchema = z.object({
  structureAndFlow: z.number().min(0).max(10).describe("Score for interview structure, pacing, and time management."),
  starProbing: z.number().min(0).max(10).describe("Score for effectiveness in probing using the STAR method."),
  activeListening: z.number().min(0).max(10).describe("Score for demonstrating active listening and follow-up questions."),
  biasAwareness: z.number().min(0).max(10).describe("Score for avoiding biased language and questions."),
  legalCompliance: z.number().min(0).max(10).describe("Score for adhering to legal hiring practices and avoiding inappropriate questions."),
  confidenceAndDemeanor: z.number().min(0).max(10).describe("Score for the interviewer's overall confidence and professionalism."),
});

// The final output from the AI analysis
export const InterviewerAnalysisOutputSchema = z.object({
  scores: ScoringRubricSchema,
  overallScore: z.number().min(0).max(100).describe("The overall weighted score, from 0 to 100."),
  strengths: z.array(z.string()).describe("A bulleted list of 2-3 things the interviewer did well."),
  gaps: z.array(z.string()).describe("A bulleted list of 2-3 specific areas for improvement."),
  coachingSummary: z.string().describe("A concise paragraph summarizing the key coaching advice for the interviewer based on this session."),
});
export type InterviewerAnalysisOutput = z.infer<typeof InterviewerAnalysisOutputSchema>;
