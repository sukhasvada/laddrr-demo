
/**
 * @fileOverview Zod schemas for the performance comparison chat feature.
 */

import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const PerformanceMetricSchema = z.object({
    value: z.number(),
    trend: z.enum(['up', 'down', 'stable']),
});

const PerformanceContextSchema = z.object({
    name: z.string(),
    metrics: z.record(PerformanceMetricSchema),
});

export const PerformanceChatInputSchema = z.object({
  userQuestion: z.string().describe("The user's question about their performance."),
  performanceContext: z.array(PerformanceContextSchema).describe("An array of performance data for the user and selected peers."),
  chatHistory: z.array(ChatMessageSchema).optional().describe("The history of the conversation so far."),
});
export type PerformanceChatInput = z.infer<typeof PerformanceChatInputSchema>;


export const PerformanceChatOutputSchema = z.object({
  answer: z.string().describe("The AI coach's helpful and encouraging response to the user's question."),
});
export type PerformanceChatOutput = z.infer<typeof PerformanceChatOutputSchema>;
