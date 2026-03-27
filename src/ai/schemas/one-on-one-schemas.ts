/**
 * @fileOverview Zod schemas for the 1-on-1 analysis feature.
 * This file is kept separate to allow its non-async exports (the schemas)
 * to be imported into client components without violating the "use server"
 * directive's constraints.
 */

import { z } from 'zod';
import type { AuditEvent as FeedbackServiceAuditEvent } from '@/services/feedback-service';

// Define a schema for what an audit event should look like for the AI
const AuditEventSchema = z.object({
  event: z.string().describe("The type of event that occurred (e.g., 'Insight Identified', 'Supervisor Responded')."),
  actor: z.string().describe("The role of the person or system that performed the action."),
  timestamp: z.string().describe("The ISO 8601 timestamp of when the event occurred."),
  details: z.string().optional().describe("Any relevant details or notes about the event."),
});

// Base form schema from the UI
export const formSchema = z.object({
  location: z.string().min(1, "Location is required."),
  liveConversation: z.boolean().refine(val => val === true, { message: "You must acknowledge this was a live conversation." }),
  employeeAware: z.boolean().refine(val => val === true, { message: "You must confirm the employee is aware of action items." }),
  primaryFeedback: z.string(),
  feedbackTone: z.enum(["Constructive", "Positive", "Corrective", "Neutral"]),
  employeeAcceptedFeedback: z.enum(["Fully", "Partially", "Not Well"]),
  improvementAreas: z.string().optional(),
  growthRating: z.string().refine(val => ["1","2","3","4","5"].includes(val), { message: "Please select a rating."}),
  showedSignsOfStress: z.enum(["Yes", "No", "Unsure"]),
  stressDescription: z.string().optional(),
  expressedAspirations: z.boolean(),
  aspirationDetails: z.string().optional(),
  didAppreciate: z.boolean(),
  appreciationMessage: z.string().optional(),
  isCrossFunctional: z.boolean(),
  broadcastAppreciation: z.boolean(),
  otherComments: z.string().optional(),
  transcript: z.string().optional().describe("An optional transcript of the conversation, either recorded or uploaded."),
  supervisorName: z.string(),
  employeeName: z.string(),
  oneOnOneId: z.string().optional(),
  conversationRecordingDataUri: z.string().optional().describe("A data URI of the recorded audio."),
  pastDeclinedRecommendationAreas: z.array(z.string()).optional(),
  activeDevelopmentGoals: z.array(z.object({ id: z.string(), area: z.string(), title: z.string(), notes: z.string() })).optional(),
  languageLocale: z.string().default('en'),
  employeePerformanceData: z.object({
      overall: z.number(),
      projectDelivery: z.number(),
      codeQuality: z.number(),
      collaboration: z.number(),
  }).optional().describe("The employee's latest quantitative performance scores."),
}).transform(data => ({
  ...data,
  supervisorNotes: [data.primaryFeedback, data.otherComments].filter(Boolean).join('\n\n'),
  conversationTranscript: data.transcript,
}));


// Zod schema for the AI flow's input, derived and transformed from the form schema
export const AnalyzeOneOnOneInputSchema = formSchema;
export type AnalyzeOneOnOneInput = z.infer<typeof AnalyzeOneOnOneInputSchema>;

export const CriticalCoachingInsightSchema = z.object({
    summary: z.string().describe("A summary of what was missed or the unaddressed red flag."),
    reason: z.string().describe("Why the issue is important and a recommended micro-learning action. Prefixed with 'RECURRING ISSUE: ' if it matches a past declined area."),
    severity: z.enum(["low", "medium", "high"]),
    status: z.enum([
        'open', 
        'pending_employee_acknowledgement', 
        'resolved', 
        'pending_am_review', 
        'pending_supervisor_retry', 
        'pending_manager_review', 
        'pending_hr_review',
        'pending_final_hr_action'
    ]).default('open').describe("The resolution status of the insight."),
    supervisorResponse: z.string().optional().describe("The supervisor's notes on how they addressed the insight."),
    employeeAcknowledgement: z.string().optional().describe("The employee's feedback on the resolution."),
    // Add audit trail to the insight itself to track its specific journey
    auditTrail: z.array(AuditEventSchema).optional().describe("An audit trail for the insight itself."),
  });

export type CriticalCoachingInsight = z.infer<typeof CriticalCoachingInsightSchema>;

const RecommendationAuditEventSchema = z.object({
    event: z.string(),
    actor: z.string(),
    timestamp: z.string(),
    details: z.string().optional(),
});
export type RecommendationAuditEvent = z.infer<typeof RecommendationAuditEventSchema>;

const CheckInSchema = z.object({
    id: z.string(),
    date: z.string().describe("The ISO 8601 timestamp of the check-in."),
    notes: z.string().describe("The supervisor's notes from the check-in."),
    rating: z.enum(["On Track", "Needs Support", "Blocked"]).optional().describe("The user's self-reported status."),
});
export type CheckIn = z.infer<typeof CheckInSchema>;

export const CoachingRecommendationSchema = z.object({
  id: z.string().describe("A unique identifier for this recommendation. The AI should not generate this; it's added post-analysis."),
  area: z.string().describe("The specific area or weakness identified for coaching, e.g., 'Active Listening'."),
  recommendation: z.string().describe("A concise, actionable recommendation for the supervisor to improve in the identified area."),
  example: z.string().optional().describe("A direct quote from the conversation that serves as an example of the area for improvement."),
  type: z.enum(["Book", "Podcast", "Article", "Course", "Other"]).describe("The type of resource being recommended."),
  resource: z.string().describe("The title of the recommended book, podcast episode, article, or course."),
  justification: z.string().describe("A brief explanation of why this specific resource is recommended and how it addresses the area of improvement."),
  status: z.enum(["pending", "accepted", "declined", "pending_am_review", "pending_manager_acknowledgement"]).default("pending").describe("The supervisor's response to the recommendation."),
  rejectionReason: z.string().optional().describe("If declined, the supervisor's reason for not accepting the recommendation."),
  auditTrail: z.array(RecommendationAuditEventSchema).optional().describe("An audit trail for this specific recommendation."),
  // Fields for personalized coaching plan
  startDate: z.string().optional().describe("The ISO 8601 timestamp when the user plans to start the activity."),
  endDate: z.string().optional().describe("The ISO 8601 timestamp when the user tentatively plans to complete the activity."),
  progress: z.number().optional().describe("The completion percentage of the coaching item (0-100)."),
  checkIns: z.array(CheckInSchema).optional().describe("A log of periodic check-ins on progress."),
});

export type CoachingRecommendation = z.infer<typeof CoachingRecommendationSchema>;


const CoachingImpactAnalysisSchema = z.object({
    goalId: z.string().describe("The ID of the active development goal being analyzed."),
    goalArea: z.string().describe("The area of the development goal, e.g., 'Active Listening'."),
    didApply: z.boolean().describe("Whether the supervisor successfully applied the learning from this goal."),
    applicationExample: z.string().optional().describe("An appreciation message with a quote showing successful application. Used when didApply is true."),
    missedOpportunityExample: z.string().optional().describe("A notification with a quote and explanation of a missed opportunity. Used when didApply is false."),
    completedGoalId: z.string().optional().describe("The ID of the development goal if mastery was demonstrated."),
    masteryJustification: z.string().optional().describe("Justification for why the goal is considered mastered."),
}).describe("Analysis of how the supervisor's actions relate to active development goals.");

export type CoachingImpactAnalysis = z.infer<typeof CoachingImpactAnalysisSchema>;


export const ActionItemSchema = z.object({
  id: z.string().describe("A unique identifier for this action item. The AI should not generate this; it's added post-analysis."),
  owner: z.enum(["Employee", "Supervisor"]).describe("The owner of the action item."),
  task: z.string().describe("The description of the action item task."),
  status: z.enum(["pending", "completed"]).default("pending").describe("The current status of the action item."),
  completedAt: z.string().optional().describe("The ISO 8601 timestamp when the item was completed."),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;


// Zod schema for the new, comprehensive structured output from the AI
export const AnalyzeOneOnOneOutputSchema = z.object({
  supervisorSummary: z.string().describe("A comprehensive summary for the supervisor, including tone, energy, who led, leadership effectiveness, and actionable feedback."),
  employeeSummary: z.string().describe("A concise summary for the employee, focusing on key takeaways, action items, and growth opportunities discussed."),
  employeeInsights: z.array(z.string()).optional().describe("A short, bulleted list of 2-3 encouraging or reflective insights specifically for the employee's feed."),
  employeeSwotAnalysis: z.object({
      strengths: z.array(z.string()).describe("List of strengths observed for the employee."),
      weaknesses: z.array(z.string()).describe("List of weaknesses or areas for improvement for the employee."),
      opportunities: z.array(z.string()).describe("List of opportunities for the employee's growth."),
      threats: z.array(z.string()).describe("List of potential threats or challenges for the employee."),
  }).describe("A SWOT analysis for the employee based on the conversation."),
  leadershipScore: z.number().min(1).max(10).describe("A score from 1-10 rating the supervisor's leadership qualities."),
  effectivenessScore: z.number().min(1).max(10).describe("A score from 1-10 rating the effectiveness of the feedback provided."),
  strengthsObserved: z.array(z.object({
    action: z.string().describe("The positive action taken by the supervisor."),
    example: z.string().describe("A supporting quote or example."),
  })).describe("A list of 2-3 observed strengths of the supervisor during the session."),
  coachingRecommendations: z.array(CoachingRecommendationSchema).describe("A list of 2-3 structured coaching recommendations for the supervisor, including specific learning resources."),
  actionItems: z.array(ActionItemSchema).describe("A list of clear, actionable items for the employee or supervisor."),
  coachingImpactAnalysis: z.array(CoachingImpactAnalysisSchema).optional().describe("A list of analyses, one for each active development goal provided."),
  missedSignals: z.array(z.string()).optional().describe("A list of subtle signals that the supervisor failed to explore."),
  criticalCoachingInsight: CriticalCoachingInsightSchema.optional().describe("An insight generated ONLY if an unaddressed red flag is present."),
  biasFairnessCheck: z.object({
    flag: z.boolean().describe("True if potential bias was detected."),
    details: z.string().optional().describe("Details of the potential bias."),
  }).describe("A check for unconscious bias or power imbalance."),
  localizationCompliance: z.object({
    applied: z.boolean().describe("True if localized norms were applied."),
    locale: z.string().optional().describe("The locale used for analysis."),
  }).describe("Notes on localization compliance."),
  legalDataCompliance: z.object({
    piiOmitted: z.boolean().describe("True if PII was detected and theoretically removed."),
    privacyRequest: z.boolean().describe("True if the employee expressed a desire for privacy."),
  }).describe("Notes on legal and data compliance."),
  dataHandling: z.object({
    analysisTimestamp: z.string().describe("The ISO 8601 timestamp of when the analysis was generated."),
    recordingDeleted: z.boolean().describe("Confirms if the source audio recording was deleted after analysis."),
    deletionTimestamp: z.string().describe("The ISO 8601 timestamp of when the source audio recording was deleted."),
  }).optional().describe("Metadata about data processing and privacy."),
});

export type AnalyzeOneOnOneOutput = z.infer<typeof AnalyzeOneOnOneOutputSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
