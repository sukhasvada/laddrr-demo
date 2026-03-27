/**
 * @fileOverview Zod schemas for the AI-powered pre-1-on-1 briefing packet feature.
 */

import { z } from 'zod';
import type { Role } from '@/hooks/use-role';

const PastIssueSchema = z.object({
  date: z.string().describe("The date of the past session."),
  summary: z.string().describe("The AI-generated summary from that session."),
});

const ActionItemSchema = z.object({
    task: z.string().describe("The description of the action item task."),
    owner: z.enum(["Employee", "Supervisor"]).describe("The owner of the action item."),
    status: z.enum(["pending", "completed"]).describe("The current status of the action item."),
    completedAt: z.string().optional().describe("The date the item was completed."),
});

const CriticalInsightSchema = z.object({
  date: z.string().describe("The date of the session where the insight was identified."),
  summary: z.string().describe("The summary of the critical insight."),
  status: z.string().describe("The current status of the insight (e.g., 'Pending Supervisor Action')."),
});

const CoachingGoalSchema = z.object({
  area: z.string().describe("The area of the coaching goal (e.g., 'Active Listening')."),
  resource: z.string().describe("The specific activity or resource for the goal."),
  progress: z.number().describe("The completion percentage of the goal."),
});


export const BriefingPacketInputSchema = z.object({
  supervisorName: z.string().describe("The name of the supervisor."),
  employeeName: z.string().describe("The name of the employee."),
  viewerRole: z.custom<Role>().describe("The role of the person viewing the packet, e.g., 'Employee' or 'Team Lead'."),
  // The following fields are populated by the client-side wrapper function before calling the AI
  pastIssues: z.array(PastIssueSchema).optional().describe("Summaries from the last few 1-on-1 sessions."),
  actionItems: z.array(ActionItemSchema).optional().describe("A history of all action items, both pending and completed."),
  openCriticalInsights: z.array(CriticalInsightSchema).optional().describe("A list of any unresolved critical insights between the two individuals."),
  coachingGoalsInProgress: z.array(CoachingGoalSchema).optional().describe("The supervisor's active personal development goals."),
});
export type BriefingPacketInput = z.infer<typeof BriefingPacketInputSchema>;


export const BriefingPacketOutputSchema = z.object({
  actionItemAnalysis: z.string().describe("A brief, neutral analysis of past action items, including completion rates and ownership patterns."),
  
  // Supervisor-specific fields
  keyDiscussionPoints: z.array(z.string()).optional().describe("For supervisors: A bulleted list of 2-3 key themes or recurring topics to follow up on."),
  outstandingActionItems: z.array(z.string()).optional().describe("For supervisors: A summary of unresolved critical insights."),
  coachingOpportunities: z.array(z.string()).optional().describe("For supervisors: Suggestions for practicing their active coaching goals."),
  suggestedQuestions: z.array(z.string()).optional().describe("For supervisors: A list of open-ended questions to ask."),
  
  // Employee-specific fields
  talkingPoints: z.array(z.string()).optional().describe("For employees: A bulleted list of forward-looking topics to bring to the meeting."),
  employeeSummary: z.string().optional().describe("For employees: A brief, encouraging summary of their progress and journey."),
});
export type BriefingPacketOutput = z.infer<typeof BriefingPacketOutputSchema>;

    