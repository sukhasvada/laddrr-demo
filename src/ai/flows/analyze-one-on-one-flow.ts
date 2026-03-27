
'use server';
/**
 * @fileOverview An AI flow for analyzing 1-on-1 feedback sessions.
 *
 * - analyzeOneOnOne - a function that takes form data from a 1-on-1 and returns a structured analysis.
 */

import { ai } from '@/ai/genkit';
import { AnalyzeOneOnOneInputSchema, AnalyzeOneOnOneOutputSchema, type AnalyzeOneOnOneInput, type AnalyzeOneOnOneOutput } from '@/ai/schemas/one-on-one-schemas';
import { saveFeedback } from '@/services/feedback-service';
import { v4 as uuidv4 } from 'uuid';
import { getRoleByName } from '@/lib/role-mapping';

const generateTrackingId = () => `Org-Ref-${Math.floor(100000 + Math.random() * 900000)}`;

export async function analyzeOneOnOne(input: AnalyzeOneOnOneInput): Promise<AnalyzeOneOnOneOutput> {
  const result = await analyzeOneOnOneFlow(input);
  const submittedAt = new Date();
  
  const supervisorRole = getRoleByName(input.supervisorName);
  const employeeRole = getRoleByName(input.employeeName);

  if (!supervisorRole || !employeeRole) {
      console.error("Could not determine roles for supervisor or employee. Aborting insight creation.");
      return result;
  }

  // If a critical insight is found, create a new feedback record to trigger the workflow.
  if (result.criticalCoachingInsight && input.oneOnOneId) {
      const allFeedback = [];
      const newFeedback = {
          trackingId: generateTrackingId(),
          oneOnOneId: input.oneOnOneId, // Link the feedback to the 1-on-1
          subject: `Critical Coaching Insight from 1-on-1 with ${input.employeeName}`,
          message: `A critical coaching insight was identified during a 1-on-1 session between ${input.supervisorName} and ${input.employeeName}. See details below.
          
- **Location**: ${input.location}
- **Feedback Tone**: ${input.feedbackTone}
- **How Feedback Was Received**: ${input.employeeAcceptedFeedback}
- **Primary Feedback**: ${input.supervisorNotes || 'N/A'}`,
          submittedAt: submittedAt,
          summary: result.criticalCoachingInsight.summary,
          criticality: 'Critical' as const,
          criticalityReasoning: result.criticalCoachingInsight.reason,
          viewed: false,
          status: 'Pending Supervisor Action' as const,
          assignedTo: [supervisorRole],
          supervisor: input.supervisorName,
          employee: input.employeeName,
          auditTrail: [
              {
                  event: 'Critical Insight Identified',
                  timestamp: submittedAt,
                  actor: 'HR Head' as const, // System action attributed to HR
                  details: 'Critical coaching insight automatically logged from 1-on-1 analysis.',
              },
               {
                  event: 'Assigned',
                  timestamp: new Date(submittedAt.getTime() + 1000),
                  actor: 'HR Head' as const,
                  details: `Case automatically assigned to ${supervisorRole} for initial response.`,
              },
          ],
      };
      
      allFeedback.unshift(newFeedback as any);
      await saveFeedback(allFeedback, true); // Use append mode
  }
  
  // If there are action items, create a "To-Do" feedback item for the supervisor.
  if (result.actionItems && result.actionItems.length > 0 && input.oneOnOneId) {
      const allFeedback = [];
      const newActionItemRecord = {
          trackingId: generateTrackingId(),
          oneOnOneId: input.oneOnOneId,
          subject: `Action Items from 1-on-1 with ${input.employeeName}`,
          message: `The following action items were generated from your 1-on-1 on ${new Date().toLocaleDateString()}.`,
          submittedAt: submittedAt,
          criticality: 'Low' as const,
          status: 'To-Do' as const,
          assignedTo: [supervisorRole], // Assign to the role for general query
          supervisor: input.supervisorName, // Explicitly set supervisor name for filtering
          employee: input.employeeName,
          viewed: true, // It's a To-Do, so it's implicitly viewed by its creator
          actionItems: result.actionItems.map(itemText => ({
              id: uuidv4(),
              text: itemText.task,
              status: 'pending' as const,
              owner: itemText.owner === 'Supervisor' ? supervisorRole : employeeRole,
          })),
          auditTrail: [
              {
                  event: 'To-Do List Created',
                  timestamp: submittedAt,
                  actor: 'HR Head' as const, // System action
                  details: 'Action items were generated from 1-on-1 analysis and assigned to the supervisor.',
              }
          ]
      };
      allFeedback.unshift(newActionItemRecord as any);
      await saveFeedback(allFeedback, true); // Use append mode
  }
  
  return result;
}

const prompt = ai.definePrompt({
  name: 'analyzeOneOnOnePrompt',
  input: { schema: AnalyzeOneOnOneInputSchema },
  output: { schema: AnalyzeOneOnOneOutputSchema },
  prompt: `You are an expert organizational coach, licensed behavioral analyst, and AI-powered leadership assistant. Your task is to analyze a 1-on-1 conversation between a supervisor and employee. Use the provided audio, transcript, and/or notes to create a comprehensive JSON report. This report will be used for coaching, compliance monitoring, and continuous leadership development. Your analysis must remain objective, bias-aware, privacy-compliant, and contextually accurate.

Inputs You Will Receive:

Supervisor's Notes: {{{supervisorNotes}}}
{{#if conversationTranscript}}
Conversation Transcript: {{{conversationTranscript}}}
{{/if}}
{{#if conversationRecordingDataUri}}
Audio Recording (Primary source of truth): {{media url=conversationRecordingDataUri}}
{{/if}}
{{#if employeePerformanceData}}
Employee's Recent Performance Scores (out of 100):
- Overall: {{employeePerformanceData.overall}}
- Project Delivery: {{employeePerformanceData.projectDelivery}}
- Code Quality: {{employeePerformanceData.codeQuality}}
- Collaboration: {{employeePerformanceData.collaboration}}
{{/if}}
Past Declined Coaching Areas: {{#if pastDeclinedRecommendationAreas}}{{#each pastDeclinedRecommendationAreas}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
Active Development Goals: {{#if activeDevelopmentGoals}}{{#each activeDevelopmentGoals}}* Goal Area: {{this.area}} (Title: {{this.title}}). User's check-in notes: "{{this.notes}}"{{/each}}{{else}}None{{/if}}
Language Locale: {{languageLocale}}

Analysis Instructions:

If the input is empty or non-meaningful (e.g., silence, test phrases), return a JSON with a basic explanation. Otherwise, generate the full report:

1.  **supervisorSummary**: A comprehensive summary for the supervisor, including tone, energy, who led, leadership effectiveness, and actionable feedback.
2.  **employeeSummary**: A concise, forward-looking summary for the employee. Focus on key takeaways, agreed-upon action items, and positive reinforcement or growth opportunities discussed. Frame it constructively.
3.  **employeeInsights**: Generate a short, bulleted list of 2-3 encouraging or reflective insights specifically for the employee's feed. Examples: "You handled corrective feedback with real professionalism," or "Asking clarifying questions about the project timeline was a great move." These should be concise and positive.
4.  **employeeSwotAnalysis**: A SWOT analysis for the employee based on the conversation and their performance data. Be objective and base it on evidence from the inputs. If performance data is available, correlate it with the conversation (e.g., "Strengths: High project delivery score is reflected in their confident discussion of recent accomplishments.").
5.  **Leadership Score (1-10)**: Rate the supervisor based on empathy, clarity, and ownership. Ask yourself: "Would I follow this person as a leader?"
6.  **Effectiveness Score (1-10)**: Rate the session based on whether feedback was useful, specific, actionable, growth-oriented, and if the employee left with clear next steps.
7.  **Strengths Observed**: List 2-3 specific positive actions by the supervisor, with supporting quotes as examples.
8.  **Coaching Recommendations**: This is the MOST IMPORTANT part of your analysis. Provide 2-3 concrete, structured coaching recommendations based on weaknesses observed in this session. For each recommendation:
    *   Generate a temporary unique string for the 'id' field, like 'temp-rec-1'.
    *   Identify a clear 'area' for improvement (e.g., "Active Listening," "Delivering Corrective Feedback," "Setting Clear Expectations").
    *   Write a concise 'recommendation' for the supervisor.
    *   **IMPORTANT**: Include a direct quote in the 'example' field that demonstrates the area for improvement.
    *   Choose a resource 'type': "Book", "Podcast", "Article", or "Course".
    *   Provide the name of a REAL, SPECIFIC 'resource' (e.g., book title: "Crucial Conversations"; podcast: "HBR IdeaCast").
    *   Write a compelling 'justification' explaining why this resource is a good fit.
    *   The 'status' must be "pending".
9.  **Action Items**: List all concrete tasks for both employee and supervisor. For each item:
    *   Generate a temporary unique string for the 'id' field, like 'temp-ai-1'.
    *   Set the 'owner' field to either "Employee" or "Supervisor".
    *   Set the 'status' field to "pending".
    *   DO NOT set the 'completedAt' field.
10. **Coaching Impact Analysis**: (Only if activeDevelopmentGoals are provided). Analyze if the supervisor had an opportunity to apply their active learning goals in this session.
    *   For each active goal, review the user's check-in notes for context on what they are learning/practicing.
    *   Determine if a situation arose where this learning could be applied.
    *   If the learning was applied, set \`didApply\` to true and provide an \`applicationExample\` with a supporting quote. This is an appreciation of their effort.
    *   If an opportunity existed but was missed, set \`didApply\` to false and provide a \`missedOpportunityExample\` with a quote and a explanation of how they could have applied their learning. This is a notification.
    *   If the supervisor has clearly mastered the goal (e.g., applied it consistently and effectively), set \`completedGoalId\` to the ID of the goal and provide a \`masteryJustification\` explaining why they've mastered it.
11. **Critical Insight Filtering (MANDATORY LOGIC):** Before generating 'Missed Signals' or 'Critical Coaching Insight', you MUST follow this logic. Identify every potential unaddressed issue. For each issue, first check if it meets the **Trigger Conditions** for a Critical Coaching Insight.
    *   **If YES**, it MUST be generated ONLY in the 'criticalCoachingInsight' field and MUST NOT appear in 'missedSignals'.
    *   **If NO**, and it is a subtle, non-critical issue, then and only then can it be placed in the 'missedSignals' field.
12. **Missed Signals**: Identify any *subtle, non-critical* indications of disengagement, burnout, confusion, or unspoken ambition that the supervisor failed to explore. Do NOT include issues that qualify as a critical insight here.
13. **Critical Coaching Insight**: (Generate ONLY if an unaddressed red flag is present. If no flag is present, OMIT this field from the JSON.)
    *   **Trigger Conditions**: Any unaddressed issue involving repeated complaints, ignored aspirations, unresolved conflict, emotional distress, or potential HR issues. Keywords like **"frustration," "unhappy," "hate this workplace," "not fair,"** or any personal attacks (e.g., "you are a bad TL") MUST be treated as a Critical Coaching Insight. If a signal meets these conditions, it MUST be a Critical Coaching Insight and NOT a Missed Signal.
    *   **Content**: Must include a \`summary\` (what was missed), \`reason\` (why it matters AND a recommended micro-learning action), and \`severity\`. If a declined coaching area matches the issue, prepend the reason with "RECURRING ISSUE: " and set severity to "high".
    *   The \`status\` field should be set to 'open'. The AI should NOT generate content for \`supervisorResponse\` or \`employeeAcknowledgement\`.
14. **Bias/Fairness Check**: Flag any language indicating unconscious bias or power imbalance (e.g., "You always..."). Use cultural sensitivity based on locale.
15. **Localization Compliance**: If languageLocale is not 'en', note that analysis applied localized norms.
16. **Legal & Data Compliance**: Set piiOmitted to true if any PII was detected and removed. Set privacyRequest to true if the employee expressed a desire for privacy.

Generate the complete, compliant, and objective report now.`,
});

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check for 503 Service Unavailable or similar network/overload errors
      if (error.status === 503 || (error.message && error.message.includes('503'))) {
        if (i < retries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.log(`AI service unavailable. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        // Not a retryable error, so throw immediately
        throw error;
      }
    }
  }
  console.error("AI analysis failed after multiple retries.", lastError);
  throw new Error(`AI analysis failed after ${retries} retries. Last error: ${lastError.message}`);
}


const analyzeOneOnOneFlow = ai.defineFlow(
  {
    name: 'analyzeOneOnOneFlow',
    inputSchema: AnalyzeOneOnOneInputSchema,
    outputSchema: AnalyzeOneOnOneOutputSchema,
  },
  async (input) => {
    // Explicitly ask the AI to determine ownership of action items
    const promptWithActionItemOwnership = {
        ...input,
        promptAddition: "For each action item, clearly define who the 'owner' is: the 'Supervisor' or the 'Employee'."
    };

    const analysisTime = new Date();
    const { output } = await retryWithBackoff(() => prompt(promptWithActionItemOwnership));
    
    if (!output) {
      throw new Error("AI analysis failed to produce an output after multiple retries.");
    }

    // Post-process to add UUIDs to coaching recommendations and action items, as the AI can't generate them.
    if (output.coachingRecommendations) {
        output.coachingRecommendations.forEach(rec => {
            if (!rec.id || rec.id.startsWith('temp-')) {
                rec.id = uuidv4();
            }
        });
    }

    if (output.actionItems) {
      output.actionItems.forEach(item => {
        if (!item.id || item.id.startsWith('temp-')) {
          item.id = uuidv4();
        }
      });
    }
    
    // Add data handling metadata after the fact.
    // The recording is transient and doesn't persist beyond this flow execution.
    output.dataHandling = {
        analysisTimestamp: analysisTime.toISOString(),
        recordingDeleted: !!input.conversationRecordingDataUri,
        deletionTimestamp: new Date().toISOString(), // Deleted upon completion of this flow
    };

    return output;
  }
);
