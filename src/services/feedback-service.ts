/**
 * @fileOverview A service for managing feedback submissions using sessionStorage.
 *
 * This service provides a simple, client-side persistent storage mechanism for feedback,
 * suitable for a prototype. It now includes custom event dispatching for same-tab updates.
 */
import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@/hooks/use-role';
import { roleUserMapping, getRoleByName } from '@/lib/role-mapping';
import type { AnalyzeOneOnOneOutput, CriticalCoachingInsight, CoachingRecommendation, CheckIn, ActionItem } from '@/ai/schemas/one-on-one-schemas';
import type { NetsConversationInput, NetsAnalysisOutput } from '@/ai/schemas/nets-schemas';
import { getOrgCoachingItems, type OrgCoachingItem } from './org-coaching-service';


// Helper function to generate a new ID format
const generateTrackingId = () => `Org-Ref-${Math.floor(100000 + Math.random() * 900000)}`;

export interface AuditEvent {
  event: string;
  timestamp: Date | string; 
  actor: Role | string;
  details?: string;
  isPublic?: boolean;
}

// Simplified status for the first level of escalation
export type FeedbackStatus = 
  | 'Open' 
  | 'In Progress'
  | 'Pending Supervisor Action'
  | 'Pending Manager Action'
  | 'Pending Identity Reveal'
  | 'Pending Anonymous Reply'
  | 'Pending HR Action'
  | 'Pending Employee Acknowledgment' // New status for identified concerns
  | 'Pending Anonymous Acknowledgement' // For anonymous users to ack HR resolution
  | 'Pending Acknowledgement' // For FYI notifications
  | 'Final Disposition Required' // For HR's final action
  | 'To-Do'
  | 'Resolved'
  | 'Closed'
  | 'Retaliation Claim'; // New status for child cases


export interface Attachment {
    name: string;
    dataUri: string;
}

export interface Feedback {
  trackingId: string;
  subject: string;
  message: string;
  submittedAt: Date | string; 
  submittedBy?: Role; // For identified concerns
  summary?: string;
  criticality?: 'Low' | 'Medium' | 'High' | 'Critical' | 'Retaliation Claim';
  criticalityReasoning?: string;
  auditTrail?: AuditEvent[];
  viewed?: boolean;
  status?: FeedbackStatus;
  assignedTo?: Role[];
  resolution?: string;
  oneOnOneId?: string; // Link back to the 1-on-1 history item
  supervisor?: Role | string; 
  employee?: Role | string;
  supervisorUpdate?: string;
  actionItems?: ActionItem[];
  isAnonymous?: boolean; // Flag for anonymous submissions from dashboard
  managerResolution?: string; // For collaborative resolution
  hrHeadResolution?: string;  // For collaborative resolution
  parentCaseId?: string; // For retaliation claims
  attachmentNames?: string[];
  attachments?: Attachment[];
}

export interface OneOnOneHistoryItem {
    id: string;
    supervisorName: string;
    employeeName: string;
    date: string;
    analysis: AnalyzeOneOnOneOutput;
    // We add a top-level assignedTo for escalation routing outside the insight
    assignedTo?: Role[]; 
}

export interface AssignedPracticeScenario {
    id: string;
    assignedBy: Role;
    assignedTo: Role;
    scenario: string;
    persona: Role;
    status: 'pending' | 'completed';
    assignedAt: string;
    dueDate: string;
    completedAt?: string;
    analysis?: NetsAnalysisOutput;
}

export interface ActionItemWithSource extends ActionItem {
    sourceType: '1-on-1' | 'Coaching' | 'Training';
    source: string; // e.g., "1-on-1 with Alex Smith" or "Coaching: Active Listening"
    dueDate?: string;
}

const FEEDBACK_KEY = 'accountability_feedback_v3';
const ONE_ON_ONE_HISTORY_KEY = 'one_on_one_history_v3';
const CUSTOM_COACHING_PLANS_KEY = 'custom_coaching_plans_v1';
const PRACTICE_SCENARIOS_KEY = 'practice_scenarios_v1';


// ==========================================
// Mock Data Generation
// ==========================================
const getMockOneOnOneHistory = (): OneOnOneHistoryItem[] => {
    const now = new Date();
    const leadName = roleUserMapping['Team Lead'].name;
    const employeeName = roleUserMapping['Employee'].name;

    return [
        {
            id: 'mock-1on1-1',
            supervisorName: leadName,
            employeeName: employeeName,
            date: new Date(now.setDate(now.getDate() - 14)).toISOString(),
            analysis: {
                supervisorSummary: 'Good session focusing on project blockers. Casey seems motivated but a bit overwhelmed.',
                employeeSummary: 'We discussed the current project challenges and set some clear priorities for the next two weeks.',
                employeeInsights: ["You did a great job articulating the technical challenges you're facing."],
                employeeSwotAnalysis: { strengths: ['Technical Skill'], weaknesses: ['Time Management'], opportunities: ['Lead a sub-feature'], threats: ['Potential burnout'] },
                leadershipScore: 7,
                effectivenessScore: 6,
                strengthsObserved: [{ action: 'Active Listening', example: "When Casey spoke, you summarized their points accurately." }],
                coachingRecommendations: [{ id: 'rec-1', area: 'Setting Clear Expectations', recommendation: 'Try to define "done" more clearly for tasks.', type: 'Article', resource: 'How to Set Clear Expectations', justification: 'Helps with alignment.', status: 'pending', auditTrail: [], checkIns: [], progress: 0 }],
                actionItems: [{ id: 'ai-1', owner: 'Employee', task: 'Draft the API spec for the new feature', status: 'completed', completedAt: new Date(now.getDate() - 10).toISOString() }],
                missedSignals: ["Casey mentioned working late twice, which could be a sign of workload issues you didn't explore."],
                criticalCoachingInsight: {
                    summary: "Employee mentioned 'feeling pretty burned out' and supervisor did not explore this critical signal.",
                    reason: "Signs of burnout, if left unaddressed, can lead to decreased productivity, low morale, and attrition. It's critical to address these signals proactively.",
                    severity: 'high',
                    status: 'open',
                },
                biasFairnessCheck: { flag: false },
                localizationCompliance: { applied: false },
                legalDataCompliance: { piiOmitted: false, privacyRequest: false },
            }
        },
        {
            id: 'mock-1on1-2',
            supervisorName: leadName,
            employeeName: employeeName,
            date: new Date(now.setDate(now.getDate() - 7)).toISOString(),
            analysis: {
                supervisorSummary: 'Follow-up session. Casey has made progress on the API spec. We talked about career growth.',
                employeeSummary: 'We reviewed your progress and discussed your interest in taking on more leadership responsibilities.',
                employeeInsights: ["It's great that you're thinking about your long-term career goals."],
                employeeSwotAnalysis: { strengths: ['Proactive'], weaknesses: ['Public Speaking'], opportunities: ['Mentor a new hire'], threats: ['Impatience with process'] },
                leadershipScore: 8,
                effectivenessScore: 8,
                strengthsObserved: [{ action: 'Coaching', example: "You asked good, open-ended questions about Casey's career goals." }],
                coachingRecommendations: [{ id: 'rec-2', area: 'Delegation', recommendation: 'Consider delegating the next non-critical bug fix to a junior dev.', type: 'Book', resource: 'The One Minute Manager', justification: 'Frees you up for high-level tasks.', status: 'pending', auditTrail: [], checkIns: [], progress: 0 }],
                actionItems: [{ id: 'ai-2', owner: 'Supervisor', task: 'Identify a low-risk task for Casey to lead.', status: 'pending' }],
                missedSignals: [],
                biasFairnessCheck: { flag: false },
                localizationCompliance: { applied: false },
                legalDataCompliance: { piiOmitted: false, privacyRequest: false },
            }
        },
    ];
};

const getMockPracticeScenarios = (): AssignedPracticeScenario[] => {
    const now = new Date();
    const leadName = roleUserMapping['Team Lead'].name;
    const employeeName = roleUserMapping['Employee'].name;

    return [
        {
            id: 'mock-score-1',
            assignedBy: 'Team Lead',
            assignedTo: 'Employee',
            scenario: 'Practice giving corrective feedback to a high-performer about their communication style.',
            persona: 'Employee',
            status: 'completed',
            assignedAt: new Date(new Date().setDate(now.getDate() - 10)).toISOString(),
            dueDate: new Date(new Date().setDate(now.getDate() - 5)).toISOString(),
            completedAt: new Date(new Date().setDate(now.getDate() - 4)).toISOString(),
            analysis: {
                scores: { clarity: 8.5, empathy: 7.0, assertiveness: 9.0, overall: 8.2 },
                strengths: ["You started the conversation clearly and directly.", "Good use of 'I' statements to own your perspective."],
                gaps: ["Could have acknowledged their point of view before restating the goal.", "The closing felt a bit abrupt."],
                annotatedConversation: [
                    { role: 'model', content: "Hey, you wanted to chat?" },
                    { role: 'user', content: "Yes, I wanted to discuss some feedback regarding your communication in team meetings.", annotation: "Great start. This is clear and sets the stage without being alarming.", type: 'positive' },
                    { role: 'model', content: "Oh? I thought I was being clear. What's the issue?" },
                    { role: 'user', content: "You need to be less dismissive of others' ideas.", annotation: "This could be perceived as an attack. Try framing it from your perspective, e.g., 'I\'ve noticed that when others share ideas, the conversation sometimes moves on before we can fully explore them.'", type: 'negative' }
                ]
            }
        },
        {
            id: 'mock-score-2',
            assignedBy: 'AM',
            assignedTo: 'Team Lead',
            scenario: 'Negotiating a deadline extension for the Q3 project with a senior manager.',
            persona: 'Manager',
            status: 'completed',
            assignedAt: new Date(new Date().setDate(now.getDate() - 7)).toISOString(),
            dueDate: new Date(new Date().setDate(now.getDate() - 2)).toISOString(),
            completedAt: new Date(new Date().setDate(now.getDate() - 1)).toISOString(),
            analysis: {
                scores: { clarity: 7.0, empathy: 8.0, assertiveness: 6.5, overall: 7.2 },
                strengths: ["Excellent job explaining the 'why' behind the delay.", "You remained calm and professional throughout."],
                gaps: ["A specific proposed new deadline would have been more assertive.", "You agreed to the first counter-offer without exploring other options."],
                annotatedConversation: [
                    { role: 'model', content: "We really can't move that deadline, it will impact the whole roadmap." },
                    { role: 'user', content: "I understand it's difficult, and I appreciate the pressure we're under.", annotation: "Good empathy. This validates their concern before you present your own.", type: 'positive' }
                ]
            }
        }
    ];
};


// ==========================================
// Generic Storage Helpers
// ==========================================

const getFromStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    let json = sessionStorage.getItem(key);
    
    if (!json) {
        // If storage is empty, inject mock data.
        if (key === PRACTICE_SCENARIOS_KEY) {
            const mockData = getMockPracticeScenarios() as T[];
            saveToStorage(key, mockData);
            return mockData;
        }
        if (key === ONE_ON_ONE_HISTORY_KEY) {
            const mockData = getMockOneOnOneHistory() as T[];
            saveToStorage(key, mockData);
            return mockData;
        }
        return [];
    }

    try {
        const data = JSON.parse(json) as any[];
        // Basic data migration/validation
        if (key === FEEDBACK_KEY && data.length > 0 && !data[0].status) {
             console.log("Old feedback data detected, clearing for new structure.");
             sessionStorage.removeItem(key);
             return [];
        }
        return data as T[];
    } catch (e) {
        console.error(`Error parsing ${key} from sessionStorage`, e);
        return [];
    }
}

const saveToStorage = (key: string, data: any[]): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('feedbackUpdated'));
    window.dispatchEvent(new Event('storage')); // for wider compatibility
}

// ==========================================
// Practice Scenario Service
// ==========================================

export async function assignPracticeScenario(assignedBy: Role, assignedTo: Role, scenario: string, persona: Role, dueDate: Date): Promise<void> {
    const allScenarios = getFromStorage<AssignedPracticeScenario>(PRACTICE_SCENARIOS_KEY);
    const newScenario: AssignedPracticeScenario = {
        id: uuidv4(),
        assignedBy,
        assignedTo,
        scenario,
        persona,
        status: 'pending',
        assignedAt: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
    };
    allScenarios.unshift(newScenario);
    saveToStorage(PRACTICE_SCENARIOS_KEY, allScenarios);
}

export async function getPracticeScenariosForUser(userRole: Role): Promise<AssignedPracticeScenario[]> {
    const allScenarios = getFromStorage<AssignedPracticeScenario>(PRACTICE_SCENARIOS_KEY);
    return allScenarios.filter(s => s.assignedTo === userRole && s.status === 'pending');
}

export function getCompletedPracticeScenariosForUser(userRole: Role): AssignedPracticeScenario[] {
    const allScenarios = getFromStorage<AssignedPracticeScenario>(PRACTICE_SCENARIOS_KEY);
    return allScenarios.filter(s => s.assignedTo === userRole && s.status === 'completed');
}

export async function getPracticeScenariosAssignedByMe(assignerRole: Role): Promise<AssignedPracticeScenario[]> {
    const allScenarios = getFromStorage<AssignedPracticeScenario>(PRACTICE_SCENARIOS_KEY);
    return allScenarios.filter(s => s.assignedBy === assignerRole);
}


export async function completePracticeScenario(input: NetsConversationInput, assignedScenarioId?: string): Promise<NetsAnalysisOutput> {
    const { analyzeNetsConversation } = await import('@/ai/flows/analyze-nets-conversation-flow');
    const analysis = await analyzeNetsConversation(input);
    const allScenarios = getFromStorage<AssignedPracticeScenario>(PRACTICE_SCENARIOS_KEY);
    
    if (assignedScenarioId) {
        const scenarioIndex = allScenarios.findIndex(s => s.id === assignedScenarioId);
        
        if (scenarioIndex !== -1) {
            allScenarios[scenarioIndex].status = 'completed';
            allScenarios[scenarioIndex].completedAt = new Date().toISOString();
            allScenarios[scenarioIndex].analysis = analysis;
        }
    } else {
        // This was a self-initiated practice, save it anyway for the scorecard
        const newCompletedScenario: AssignedPracticeScenario = {
            id: uuidv4(),
            assignedBy: input.persona as Role, // Loosely assign to self
            assignedTo: getRoleByName(roleUserMapping['Employee'].name)!, // Assuming employee is practicing
            scenario: input.scenario,
            persona: input.persona as Role,
            status: 'completed',
            assignedAt: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            analysis: analysis,
        };
        allScenarios.unshift(newCompletedScenario);
    }
    
    saveToStorage(PRACTICE_SCENARIOS_KEY, allScenarios);
    return analysis;
}


// ==========================================
// 1-on-1 History Service
// ==========================================

export async function getOneOnOneHistory(): Promise<OneOnOneHistoryItem[]> {
    const history = getFromStorage<OneOnOneHistoryItem>(ONE_ON_ONE_HISTORY_KEY);
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getDeclinedCoachingAreasForSupervisor(supervisorName: string): Promise<string[]> {
    const history = await getOneOnOneHistory();
    const declinedAreas = new Set<string>();

    history.forEach(item => {
        if (item.supervisorName === supervisorName) {
            item.analysis.coachingRecommendations.forEach(rec => {
                // A recommendation is officially declined only after the manager acknowledges it,
                // or if the AM approved the decline and it's pending manager acknowledgement.
                if (rec.status === 'declined' || rec.status === 'pending_manager_acknowledgement') {
                    declinedAreas.add(rec.area);
                }
            });
        }
    });

    return Array.from(declinedAreas);
}

export async function getActiveCoachingPlansForUser(userNameOrRole: string | Role): Promise<{ historyId: string | null, rec: CoachingRecommendation }[]> {
    const userName = roleUserMapping[userNameOrRole as Role]?.name || userNameOrRole;
    const userRole = (Object.keys(roleUserMapping) as Role[]).find(r => roleUserMapping[r].name === userName) || userNameOrRole;
    
    const history = await getOneOnOneHistory();
    const customPlans = getFromStorage<CoachingRecommendation>(CUSTOM_COACHING_PLANS_KEY);
    const orgPlans = await getOrgCoachingItems();
    const activePlans: { historyId: string | null, rec: CoachingRecommendation }[] = [];
    
    // Add plans from 1-on-1 history
    history.forEach(item => {
        const isUserInvolved = item.supervisorName === userName || item.employeeName === userName;
        if (isUserInvolved) {
            item.analysis.coachingRecommendations.forEach(rec => {
                if (rec.status === 'accepted') {
                     // The person who owns the plan is the supervisor from that 1-on-1
                    if (item.supervisorName === userName) {
                        activePlans.push({ historyId: item.id, rec });
                    }
                }
            });
        }
    });

    // Add custom self-directed plans
    customPlans.forEach(rec => {
        const planOwnerName = rec.auditTrail?.[0]?.actor;
        if (planOwnerName === userName && rec.status === 'accepted') {
             activePlans.push({ historyId: null, rec });
        }
    });

    // Add plans from Org Health coaching
    orgPlans.forEach(item => {
        if (item.status === 'Assigned' || item.status === 'In Progress') {
            const audience = item.targetAudience;
            const isForAll = audience.startsWith('All ');
            const targetRole = isForAll ? audience.replace('All ', '') : audience;
            
            if (audience === userName || (isForAll && userRole === targetRole)) {
                // Transform OrgCoachingItem to CoachingRecommendation format
                const transformedRec: CoachingRecommendation = {
                    id: item.id,
                    area: item.theme,
                    recommendation: item.recommendation,
                    type: 'Other',
                    resource: 'Organizational Initiative',
                    justification: 'This goal was assigned based on a recent org-wide health analysis.',
                    status: 'accepted',
                    progress: 0, // Assuming new items have 0 progress
                    startDate: item.assignedAt,
                    endDate: new Date(new Date(item.assignedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30-day timeline
                    auditTrail: [{
                        event: "Goal Assigned from Org Health",
                        actor: item.assignedBy,
                        timestamp: item.assignedAt,
                        details: `Theme: ${item.theme}`
                    }]
                };
                activePlans.push({ historyId: null, rec: transformedRec });
            }
        }
    });


    return activePlans;
}


export async function saveOneOnOneHistory(item: Omit<OneOnOneHistoryItem, 'id' | 'assignedTo'>): Promise<OneOnOneHistoryItem> {
    const history = await getOneOnOneHistory();
    const newHistoryItem: OneOnOneHistoryItem = { ...item, id: generateTrackingId(), assignedTo: [] };
    history.unshift(newHistoryItem);
    saveToStorage(ONE_ON_ONE_HISTORY_KEY, history);
    return newHistoryItem;
}

export async function updateOneOnOneHistoryItem(updatedItem: OneOnOneHistoryItem): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === updatedItem.id);
    if (index !== -1) {
        allHistory[index] = updatedItem;
        saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
    }
}

export async function toggleActionItemStatus(historyId: string, actionItemId: string): Promise<void> {
    const allHistory = await getOneOnOneHistory();
    const historyIndex = allHistory.findIndex(h => h.id === historyId);
    if (historyIndex === -1) return;

    const item = allHistory[historyIndex];
    if (!item.analysis.actionItems) return;

    const actionItemIndex = item.analysis.actionItems.findIndex(a => a.id === actionItemId);
    if (actionItemIndex === -1) return;

    const actionItem = item.analysis.actionItems[actionItemIndex];
    if (actionItem.status === 'pending') {
        actionItem.status = 'completed';
        actionItem.completedAt = new Date().toISOString();
    } else {
        actionItem.status = 'pending';
        actionItem.completedAt = undefined;
    }

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function submitSupervisorInsightResponse(historyId: string, response: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index !== -1 && allHistory[index].analysis.criticalCoachingInsight) {
        const item = allHistory[index];
        item.analysis.criticalCoachingInsight!.supervisorResponse = response;
        item.analysis.criticalCoachingInsight!.status = 'pending_employee_acknowledgement';

        if (!item.analysis.criticalCoachingInsight!.auditTrail) {
            item.analysis.criticalCoachingInsight!.auditTrail = [];
        }
        item.analysis.criticalCoachingInsight!.auditTrail.push({
            event: 'Responded',
            timestamp: new Date(),
            actor: item.supervisorName,
            details: response,
        });
        
        saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
    } else {
        throw new Error("Could not find history item or critical insight to update.");
    }
}

export async function submitEmployeeAcknowledgement(historyId: string, acknowledgement: string, comments: string, previousStatus?: CriticalCoachingInsight['status']): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }
    
    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;

    const fullAcknowledgement = `${acknowledgement}${comments ? ` "${comments}"` : ''}`;
    insight.employeeAcknowledgement = fullAcknowledgement;
    
    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'Acknowledged',
        timestamp: new Date(),
        actor: item.employeeName as Role,
        details: fullAcknowledgement,
    });
    
    const wasAmResponse = insight.auditTrail?.some(e => e.event === 'AM Responded to Employee');
    const wasRetry = insight.auditTrail?.some(e => e.event === 'Supervisor Retry Action');
    const wasManagerAction = insight.auditTrail?.some(e => e.event === 'Manager Resolution');
    const wasHrAction = insight.auditTrail?.some(e => e.event === 'HR Resolution');

    const currentAssignees = new Set(item.assignedTo || []);

    if (acknowledgement === "The concern was fully addressed to my satisfaction.") {
        insight.status = 'resolved';
        item.assignedTo = Array.from(currentAssignees); // Keep current assignees for history
    } else if (wasHrAction) {
        insight.status = 'pending_final_hr_action';
        currentAssignees.add('HR Head');
        item.assignedTo = Array.from(currentAssignees);
    } else if (wasManagerAction) {
        insight.status = 'pending_hr_review';
        currentAssignees.add('HR Head');
        item.assignedTo = Array.from(currentAssignees);
    } else if (wasRetry || wasAmResponse) {
        insight.status = 'pending_manager_review';
        currentAssignees.add('Manager');
        item.assignedTo = Array.from(currentAssignees);
    } else {
        insight.status = 'pending_am_review';
        currentAssignees.add('AM');
        item.assignedTo = Array.from(currentAssignees);
    }

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function submitAmCoachingNotes(historyId: string, actor: Role, notes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }
    
    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;

    insight.status = 'pending_supervisor_retry';
    
    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'AM Coaching Notes',
        timestamp: new Date(),
        actor: actor,
        details: notes,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function submitAmDirectResponse(historyId: string, actor: Role, notes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }

    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;
    
    // Send back to employee for acknowledgement
    insight.status = 'pending_employee_acknowledgement';

    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'AM Responded to Employee',
        timestamp: new Date(),
        actor: actor,
        details: notes,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}


export async function escalateToManager(historyId: string, actor: Role, notes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }
    
    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;

    insight.status = 'pending_manager_review';
    
    const currentAssignees = new Set(item.assignedTo || []);
    currentAssignees.add('Manager');
    item.assignedTo = Array.from(currentAssignees);

    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'Escalated by AM',
        timestamp: new Date(),
        actor: actor,
        details: `Case escalated to Manager for direct intervention. Notes: ${notes}`,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function submitSupervisorRetry(historyId: string, retryNotes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }
    
    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;

    // Reset for the next acknowledgement round
    insight.status = 'pending_employee_acknowledgement';
    
    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'Supervisor Retry Action',
        timestamp: new Date(),
        actor: item.supervisorName as Role, // Assuming supervisorName is a valid Role
        details: retryNotes,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function submitManagerResolution(historyId: string, actor: Role, notes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }
    
    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;

    // Send back to employee for acknowledgement
    insight.status = 'pending_employee_acknowledgement';
    // Don't unassign, keep in manager's view
    
    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'Manager Resolution',
        timestamp: new Date(),
        actor: actor,
        details: notes,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function submitHrResolution(historyId: string, actor: Role, notes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
         throw new Error("Could not find history item or critical insight to update.");
    }
    
    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;

    // Send back to employee for one last acknowledgement
    insight.status = 'pending_employee_acknowledgement';
    
    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: 'HR Resolution',
        timestamp: new Date(),
        actor: actor,
        details: notes,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}


export async function submitFinalHrDecision(historyId: string, actor: Role, decision: string, notes: string): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const index = allHistory.findIndex(h => h.id === historyId);
    if (index === -1 || !allHistory[index].analysis.criticalCoachingInsight) {
        throw new Error("Could not find history item or critical insight to update.");
    }

    const item = allHistory[index];
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;
    
    // This is the end of the line. Mark as resolved.
    insight.status = 'resolved';
    
    if (!insight.auditTrail) {
        insight.auditTrail = [];
    }
    insight.auditTrail.push({
        event: decision, // e.g., 'Assigned to Ombudsman'
        timestamp: new Date(),
        actor: actor,
        details: notes,
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function updateCoachingRecommendationStatus(
    recommendationId: string, 
    status: 'accepted' | 'declined', 
    data?: { historyId?: string; reason?: string; startDate?: string; endDate?: string; }
): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const historyIndex = allHistory.findIndex(h => h.id === data?.historyId);
    if (historyIndex === -1) throw new Error("History item not found.");
    
    const item = allHistory[historyIndex];
    const recIndex = item.analysis.coachingRecommendations.findIndex(rec => rec.id === recommendationId);
    if (recIndex === -1) throw new Error("Coaching recommendation not found.");
    
    const recommendation = item.analysis.coachingRecommendations[recIndex];
    const supervisorName = item.supervisorName;

    // Initialize audit trail if it doesn't exist
    if (!recommendation.auditTrail) {
        recommendation.auditTrail = [];
    }

    if (status === 'accepted') {
        recommendation.status = 'accepted';
        recommendation.startDate = data?.startDate;
        recommendation.endDate = data?.endDate;
        recommendation.progress = 0; // Initialize progress
        recommendation.auditTrail.push({
            event: 'Recommendation Accepted',
            actor: supervisorName,
            timestamp: new Date().toISOString(),
            details: `Plan set from ${data?.startDate ? new Date(data.startDate).toLocaleDateString() : 'N/A'} to ${data?.endDate ? new Date(data.endDate).toLocaleDateString() : 'N/A'}.`
        });

        // Create notification for AM and Manager
        const allFeedback = getFeedbackFromStorage();
        const notification: Feedback = {
            trackingId: generateTrackingId(),
            subject: `Development Plan Started by ${supervisorName}`,
            message: `${supervisorName} has accepted a coaching recommendation and started a new development plan for the area: "${recommendation.area}".\n\n**Recommendation:** ${recommendation.recommendation}\n**Resource:** ${recommendation.type} - "${recommendation.resource}"\n**Timeline:** ${data?.startDate ? new Date(data.startDate).toLocaleDateString() : 'N/A'} to ${data?.endDate ? new Date(data.endDate).toLocaleDateString() : 'NA'}.`,
            submittedAt: new Date(),
            criticality: 'Low',
            status: 'Pending Acknowledgement',
            assignedTo: ['AM', 'Manager'],
            viewed: false,
            auditTrail: [{
                event: 'Notification Created',
                timestamp: new Date(),
                actor: 'System',
                details: `Automated notification for accepted coaching plan by ${supervisorName}.`
            }]
        };
        allFeedback.unshift(notification);
        saveFeedbackToStorage(allFeedback);

    } else if (status === 'declined') {
        recommendation.status = 'pending_am_review';
        recommendation.rejectionReason = data?.reason;
        recommendation.auditTrail.push({
            event: 'Recommendation Declined by Supervisor',
            actor: supervisorName,
            timestamp: new Date().toISOString(),
            details: `Reason: ${data?.reason}`,
        });
    }
    
    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function addCustomCoachingPlan(actor: Role, data: { area: string; resource: string; startDate: Date; endDate: Date }): Promise<void> {
    const supervisorName = roleUserMapping[actor]?.name;
    if (!supervisorName) throw new Error("Invalid actor role provided.");

    const allCustomPlans = getFromStorage<CoachingRecommendation>(CUSTOM_COACHING_PLANS_KEY);

    const newCustomRecommendation: CoachingRecommendation = {
        id: uuidv4(),
        area: data.area,
        recommendation: `Custom goal added by user: ${data.resource}`,
        example: "N/A (user-added goal)",
        type: "Other", // Default type for custom plans
        resource: data.resource,
        justification: "This is a self-directed development goal.",
        status: "accepted",
        rejectionReason: undefined,
        auditTrail: [{
            event: "Custom Goal Created",
            actor: supervisorName,
            timestamp: new Date().toISOString(),
            details: "User added a new self-directed development goal."
        }],
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        progress: 0,
        checkIns: [],
    };
    
    allCustomPlans.unshift(newCustomRecommendation);
    saveToStorage(CUSTOM_COACHING_PLANS_KEY, allCustomPlans);
}


export async function updateCoachingProgress(historyId: string | null, recommendationId: string, progress: number): Promise<void> {
    if (historyId) {
        // It's a recommendation from a 1-on-1
        let allHistory = await getOneOnOneHistory();
        const historyIndex = allHistory.findIndex(h => h.id === historyId);
        if (historyIndex === -1) throw new Error("History item not found.");
        
        const item = allHistory[historyIndex];
        const recIndex = item.analysis.coachingRecommendations.findIndex(rec => rec.id === recommendationId);
        if (recIndex === -1) throw new Error("Coaching recommendation not found.");
        
        const recommendation = item.analysis.coachingRecommendations[recIndex];
        recommendation.progress = progress;
        
        saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
    } else {
        // It's a custom plan
        let allCustomPlans = getFromStorage<CoachingRecommendation>(CUSTOM_COACHING_PLANS_KEY);
        const recIndex = allCustomPlans.findIndex(rec => rec.id === recommendationId);
        if (recIndex !== -1) {
            allCustomPlans[recIndex].progress = progress;
            saveToStorage(CUSTOM_COACHING_PLANS_KEY, allCustomPlans);
        } else {
            // It might be an org coaching plan
            let orgPlans = getFromStorage<OrgCoachingItem>('org_coaching_items_v1'); // Use literal key
            const orgPlanIndex = orgPlans.findIndex(p => p.id === recommendationId);
            if (orgPlanIndex !== -1) {
                // There's no progress field on OrgCoachingItem, so this is a conceptual no-op for now
                // In a real app, you'd update its status.
                console.log(`Updating progress for org plan ${recommendationId} - currently a no-op.`);
            } else {
                 throw new Error("Custom or Org coaching plan not found.");
            }
        }
    }
}

export async function addCoachingCheckIn(historyId: string | null, recommendationId: string, notes: string): Promise<void> {
     const newCheckIn: CheckIn = {
        id: uuidv4(),
        date: new Date().toISOString(),
        notes: notes,
    };

    if (historyId) {
        let allHistory = await getOneOnOneHistory();
        const historyIndex = allHistory.findIndex(h => h.id === historyId);
        if (historyIndex === -1) throw new Error("History item not found.");

        const item = allHistory[historyIndex];
        const recIndex = item.analysis.coachingRecommendations.findIndex(rec => rec.id === recommendationId);
        if (recIndex === -1) throw new Error("Coaching recommendation not found.");

        const recommendation = item.analysis.coachingRecommendations[recIndex];
        if (!recommendation.checkIns) recommendation.checkIns = [];
        recommendation.checkIns.push(newCheckIn);
        saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
    } else {
        let allCustomPlans = getFromStorage<CoachingRecommendation>(CUSTOM_COACHING_PLANS_KEY);
        const recIndex = allCustomPlans.findIndex(rec => rec.id === recommendationId);
        if (recIndex !== -1) {
            const recommendation = allCustomPlans[recIndex];
            if (!recommendation.checkIns) recommendation.checkIns = [];
            recommendation.checkIns.push(newCheckIn);
            saveToStorage(CUSTOM_COACHING_PLANS_KEY, allCustomPlans);
        } else {
            let orgPlans = getFromStorage<OrgCoachingItem>('org_coaching_items_v1');
            const orgPlanIndex = orgPlans.findIndex(p => p.id === recommendationId);
            if (orgPlanIndex !== -1) {
                // Org plans don't have check-ins in this model, so this is a conceptual no-op.
                // In a real app, we might log this differently.
                 console.log(`Adding check-in for org plan ${recommendationId} - currently a no-op.`);
            } else {
                throw new Error("Custom or Org coaching plan not found.");
            }
        }
    }
}


export async function reviewCoachingRecommendationDecline(
    historyId: string,
    recommendationId: string,
    amActor: Role,
    approved: boolean,
    amNotes: string
): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const historyIndex = allHistory.findIndex(h => h.id === historyId);
    if (historyIndex === -1) throw new Error("History item not found.");

    const item = allHistory[historyIndex];
    const recIndex = item.analysis.coachingRecommendations.findIndex(rec => rec.id === recommendationId);
    if (recIndex === -1) throw new Error("Coaching recommendation not found.");

    const recommendation = item.analysis.coachingRecommendations[recIndex];
    
    if (!recommendation.auditTrail) {
        recommendation.auditTrail = [];
    }

    if (approved) {
        recommendation.status = 'pending_manager_acknowledgement'; // Escalate to manager for FYI
        recommendation.auditTrail.push({
            event: "Decline Approved by AM",
            actor: amActor,
            timestamp: new Date().toISOString(),
            details: `AM approved decline. Notes: ${amNotes}`
        });
    } else {
        recommendation.status = 'accepted';
        recommendation.progress = 0;
        const now = new Date();
        const endDate = new Date(new Date().setDate(now.getDate() + 30)); // Default 30 day timeline
        recommendation.startDate = now.toISOString();
        recommendation.endDate = endDate.toISOString();

        recommendation.auditTrail.push({
            event: "Decline Denied by AM",
            actor: amActor,
            timestamp: new Date().toISOString(),
            details: `AM upheld AI recommendation and created a mandatory development plan. Notes: ${amNotes}`
        });
    }

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}

export async function acknowledgeDeclinedRecommendation(
    historyId: string,
    recommendationId: string,
    managerActor: Role
): Promise<void> {
    let allHistory = await getOneOnOneHistory();
    const historyIndex = allHistory.findIndex(h => h.id === historyId);
    if (historyIndex === -1) throw new Error("History item not found.");

    const item = allHistory[historyIndex];
    const recIndex = item.analysis.coachingRecommendations.findIndex(rec => rec.id === recommendationId);
    if (recIndex === -1) throw new Error("Coaching recommendation not found.");

    const recommendation = item.analysis.coachingRecommendations[recIndex];

    recommendation.status = 'declined'; // Final status
    if (!recommendation.auditTrail) {
        recommendation.auditTrail = [];
    }
    recommendation.auditTrail.push({
        event: "Manager Acknowledged Declined Recommendation",
        actor: managerActor,
        timestamp: new Date().toISOString(),
        details: "Manager acknowledged the AM's approval of the decline. This recommendation is now closed."
    });

    saveToStorage(ONE_ON_ONE_HISTORY_KEY, allHistory);
}


// ==========================================
// Feedback Service
// ==========================================

export const getFeedbackFromStorage = (): Feedback[] => {
  const feedback = getFromStorage<Feedback>(FEEDBACK_KEY);
  return feedback.map(c => ({
    ...c,
    submittedAt: new Date(c.submittedAt),
    auditTrail: c.auditTrail?.map(a => ({...a, timestamp: new Date(a.timestamp)}))
  }));
};

export const saveFeedbackToStorage = (feedback: Feedback[]): void => {
   saveToStorage(FEEDBACK_KEY, feedback);
};

export async function getAllFeedback(): Promise<Feedback[]> {
  return getFeedbackFromStorage();
}

export async function getFeedbackById(trackingId: string): Promise<Feedback | null> {
    const allFeedback = await getAllFeedback();
    return allFeedback.find(f => f.trackingId === trackingId) || null;
}


export async function saveFeedback(feedback: Feedback[], append = false): Promise<void> {
    if (append) {
        const existingFeedback = getFeedbackFromStorage();
        saveFeedbackToStorage([...feedback, ...existingFeedback]);
    } else {
        saveFeedbackToStorage(feedback);
    }
}

/**
 * Resolves a feedback item.
 */
export async function resolveFeedback(trackingId: string, actor: Role, resolution: string): Promise<void> {
    const allFeedback = getFeedbackFromStorage();
    const feedbackIndex = allFeedback.findIndex(f => f.trackingId === trackingId);

    if (feedbackIndex === -1) return;

    const feedback = allFeedback[feedbackIndex];

    // For general notifications and leadership pulses, we'll mark them as 'Closed' to keep them in history.
    if (feedback.status === 'Pending Acknowledgement' || feedback.status === 'Pending Manager Action') {
        feedback.status = 'Closed';
    } else {
        feedback.status = 'Resolved';
    }
    
    feedback.resolution = resolution;
    // We keep assignedTo so we can filter by who acknowledged it in history views.
    // feedback.assignedTo = []; 
    feedback.auditTrail?.push({
        event: 'Acknowledged',
        timestamp: new Date(),
        actor,
        details: resolution,
        isPublic: true,
    });

    saveFeedbackToStorage(allFeedback);
}

export async function submitEmployeeFeedbackAcknowledgement(trackingId: string, accepted: boolean, comments: string): Promise<void> {
    const allFeedback = getFeedbackFromStorage();
    const feedbackIndex = allFeedback.findIndex(f => f.trackingId === trackingId);
    if (feedbackIndex === -1) return;

    const item = allFeedback[feedbackIndex];
    const actor = item.submittedBy || 'Anonymous';
    
    const relevantEvents = ['Resolution Submitted', 'HR Resolution Submitted', 'HR Responded to Retaliation Claim', 'Manager Resolution'];
    const lastResponderEvent = item.auditTrail?.slice().reverse().find(e => relevantEvents.includes(e.event));
    const lastResponder = lastResponderEvent?.actor as Role | undefined;

    const currentAssignees = new Set(item.assignedTo || []);

    if (accepted) {
        item.status = 'Resolved';
        item.resolution = item.supervisorUpdate;
        item.auditTrail?.push({
            event: 'Employee Accepted Resolution',
            timestamp: new Date(),
            actor: actor,
            details: `Resolution accepted.${comments ? ` "${comments}"` : ''}`
        });
        item.auditTrail?.push({
            event: 'Resolved',
            timestamp: new Date(),
            actor: actor,
            details: 'Case resolved after employee acknowledgment.',
        });
    } else {
        const escalationDetails = `Resolution not accepted.${comments ? ` "${comments}"` : ''}`;
        
        let nextAssignee: Role | undefined = undefined;
        let nextStatus: FeedbackStatus = 'Pending Manager Action';
        
        const lastResponderRole = Object.values(roleUserMapping).find(u => u.name === lastResponder)?.role || lastResponder;
        
        if (item.criticality === 'Retaliation Claim' || lastResponderEvent?.event === 'HR Resolution Submitted' || lastResponderRole === 'HR Head') {
             item.status = 'Final Disposition Required';
             currentAssignees.add('HR Head');
             item.auditTrail?.push({
                event: 'Final Disposition Required',
                timestamp: new Date(),
                actor: 'System',
                details: 'Employee rejected HR resolution. Final disposition is required from HR Head.'
            });
        } else if (lastResponderRole === 'Team Lead') {
            nextAssignee = 'AM';
            nextStatus = 'Pending Manager Action';
        } else if (lastResponderRole === 'AM') {
            nextAssignee = 'Manager';
            nextStatus = 'Pending Manager Action';
        } else if (lastResponderRole === 'Manager') {
            nextAssignee = 'HR Head';
            nextStatus = 'Pending HR Action';
        }


        if (nextAssignee) {
             item.status = nextStatus;
             currentAssignees.add(nextAssignee);
             item.auditTrail?.push({
                event: 'Employee Escalated Concern',
                timestamp: new Date(),
                actor: actor,
                details: `Concern escalated to ${nextAssignee}. ${escalationDetails}`
            });
        }
    }
    
    item.assignedTo = Array.from(currentAssignees);
    saveFeedbackToStorage(allFeedback);
}

// ==========================================
// Dashboard Widget Services
// ==========================================

export async function getAggregatedActionItems(role: Role): Promise<ActionItemWithSource[]> {
    const allItems: ActionItemWithSource[] = [];
    const currentUserName = roleUserMapping[role]?.name;
    if (!currentUserName) return [];

    // 1. From 1-on-1s
    const history = await getOneOnOneHistory();
    history.forEach(h => {
        if (h.analysis.actionItems) {
            h.analysis.actionItems.forEach(ai => {
                const ownerRole = getRoleByName(ai.owner);
                if (ownerRole === role && ai.status === 'pending') {
                    allItems.push({
                        ...ai,
                        sourceType: '1-on-1',
                        source: `1-on-1 with ${h.supervisorName === currentUserName ? h.employeeName : h.supervisorName}`,
                        dueDate: new Date(new Date(h.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Mock due date: 1 week after 1-on-1
                    });
                }
            });
        }
    });

    // 2. From Coaching Plans
    const coachingPlans = await getActiveCoachingPlansForUser(role);
    coachingPlans.forEach(plan => {
        allItems.push({
            id: `coach-${plan.rec.id}`,
            owner: role,
            task: `Continue working on coaching goal: ${plan.rec.area}`,
            status: 'pending',
            sourceType: 'Coaching',
            source: `Plan: ${plan.rec.resource}`,
            dueDate: plan.rec.endDate,
        });
    });

    // In a real app, you would also fetch from training programs etc.
    // For now, this is a good start.

    return allItems.sort((a,b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
}

export async function getActionItemsForEmployee(employeeName: string): Promise<ActionItemWithSource[]> {
    const allItems: ActionItemWithSource[] = [];
    const employeeRole = getRoleByName(employeeName);

    // From 1-on-1s
    const history = await getOneOnOneHistory();
    history.forEach(h => {
        if (h.employeeName === employeeName && h.analysis.actionItems) {
            h.analysis.actionItems.forEach(ai => {
                // Show all items, not just pending
                allItems.push({
                    ...ai,
                    sourceType: '1-on-1',
                    source: `1-on-1 with ${h.supervisorName}`,
                    dueDate: new Date(new Date(h.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                });
            });
        }
    });

    // From Coaching Plans (if the employee can have them)
    if (employeeRole) {
        const coachingPlans = await getActiveCoachingPlansForUser(employeeRole);
        coachingPlans.forEach(plan => {
            allItems.push({
                id: `coach-${plan.rec.id}`,
                owner: employeeRole,
                task: `Work on coaching goal: ${plan.rec.area}`,
                status: 'pending',
                sourceType: 'Coaching',
                source: `Plan: ${plan.rec.resource}`,
                dueDate: plan.rec.endDate,
            });
        });
    }
    
    return allItems.sort((a,b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime()
    });
}

export async function getTeamPulse(): Promise<number> {
    const history = await getOneOnOneHistory();
    const recentRatings = history
        .slice(0, 20) // Look at the last 20 1-on-1s for the pulse
        .map(h => parseInt(h.analysis.employeeSwotAnalysis?.opportunities[0] || h.analysis.leadershipScore.toString(), 10)) // Using SWOT as a proxy for growthRating
        .filter(r => !isNaN(r));

    if (recentRatings.length === 0) return 3.5; // Default pulse if no data

    const average = recentRatings.reduce((sum, current) => sum + current, 0) / recentRatings.length;
    return average;
}

export async function getTeamActionItemStatus(supervisorRole: Role): Promise<Record<string, { open: number, overdue: number }>> {
    const history = await getOneOnOneHistory();
    const supervisorName = roleUserMapping[supervisorRole]?.name;
    const teamMembers: Record<string, { open: number, overdue: number }> = {};
    const now = new Date();

    history.forEach(item => {
        // Find sessions where the current user was the supervisor
        if (item.supervisorName === supervisorName) {
            const employeeName = item.employeeName;
            if (!teamMembers[employeeName]) {
                teamMembers[employeeName] = { open: 0, overdue: 0 };
            }

            item.analysis.actionItems?.forEach(action => {
                if (action.status === 'pending') {
                    teamMembers[employeeName].open++;
                    // Mock due date is 1 week after the 1-on-1
                    const dueDate = new Date(new Date(item.date).getTime() + 7 * 24 * 60 * 60 * 1000);
                    if (now > dueDate) {
                        teamMembers[employeeName].overdue++;
                    }
                }
            });
        }
    });

    return teamMembers;
}

export async function getTeamGrowthHighlights(supervisorRole: Role): Promise<{ employeeName: string, growth: number }[]> {
    const history = await getOneOnOneHistory();
    const supervisorName = roleUserMapping[supervisorRole]?.name;
    const growthMap: Record<string, number[]> = {};

    history
        .filter(item => item.supervisorName === supervisorName)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort oldest to newest
        .forEach(item => {
            const employeeName = item.employeeName;
            if (!growthMap[employeeName]) {
                growthMap[employeeName] = [];
            }
            growthMap[employeeName].push(item.analysis.effectivenessScore);
        });

    const highlights = Object.entries(growthMap)
        .map(([employeeName, scores]) => {
            if (scores.length < 2) return { employeeName, growth: 0 };
            const latestScore = scores[scores.length - 1];
            const previousScore = scores[scores.length - 2];
            return { employeeName, growth: latestScore - previousScore };
        })
        .filter(item => item.growth > 0)
        .sort((a, b) => b.growth - a.growth)
        .slice(0, 3); // Get top 3 growers

    return highlights;
}

export async function getTeamNetsScores(supervisorRole: Role): Promise<Record<string, { average: number, sessions: number }>> {
    const allPractice = getFromStorage<AssignedPracticeScenario>(PRACTICE_SCENARIOS_KEY);
    const supervisorName = roleUserMapping[supervisorRole]?.name;
    const allHistory = await getOneOnOneHistory();
    
    // Simple hierarchy: Team Lead manages Employee
    const teamMemberRoles: Role[] = [];
    if (supervisorRole === 'Team Lead') {
        teamMemberRoles.push('Employee');
    }

    const teamScores: Record<string, { totalScore: number, count: number }> = {};

    allPractice.forEach(practice => {
        if (teamMemberRoles.includes(practice.assignedTo) && practice.status === 'completed' && practice.analysis) {
            const memberName = roleUserMapping[practice.assignedTo]?.name;
            if (!teamScores[memberName]) {
                teamScores[memberName] = { totalScore: 0, count: 0 };
            }
            teamScores[memberName].totalScore += practice.analysis.scores.overall;
            teamScores[memberName].count++;
        }
    });

    const result: Record<string, { average: number, sessions: number }> = {};
    for (const memberName in teamScores) {
        result[memberName] = {
            average: teamScores[memberName].totalScore / teamScores[memberName].count,
            sessions: teamScores[memberName].count,
        };
    }
    return result;
}

// AM Dashboard Services
export interface InterventionLogEntry {
    id: string;
    date: string;
    summary: string;
    employeeName: string;
    responseStatus: 'Timely' | 'Delayed' | 'Unresolved';
}

export async function getAiInterventionLog(role: Role): Promise<InterventionLogEntry[]> {
    const history = await getOneOnOneHistory();
    const log: InterventionLogEntry[] = [];
    const SLA_HOURS = 48;

    history.forEach(item => {
        if (item.analysis.criticalCoachingInsight) {
            const insight = item.analysis.criticalCoachingInsight;
            const creationEvent = insight.auditTrail?.find(e => e.event === 'Critical Insight Identified');
            const responseEvent = insight.auditTrail?.find(e => e.event === 'Responded');

            if (creationEvent) {
                let responseStatus: InterventionLogEntry['responseStatus'] = 'Unresolved';
                if (responseEvent) {
                    const creationTime = new Date(creationEvent.timestamp).getTime();
                    const responseTime = new Date(responseEvent.timestamp).getTime();
                    const diffHours = (responseTime - creationTime) / (1000 * 60 * 60);
                    responseStatus = diffHours <= SLA_HOURS ? 'Timely' : 'Delayed';
                }

                log.push({
                    id: item.id,
                    date: item.date,
                    summary: insight.summary,
                    employeeName: item.employeeName,
                    responseStatus: responseStatus,
                });
            }
        }
    });
    return log.slice(0, 5); // Return latest 5
}

export interface DevelopmentMapNode {
    name: string;
    role: Role;
    leadershipScore: number;
    trajectory: 'positive' | 'negative' | 'stable';
}

export async function getManagerDevelopmentMapData(amRole: Role): Promise<DevelopmentMapNode[]> {
    const history = await getOneOnOneHistory();
    const teamLeadRole: Role = 'Team Lead'; // AM manages Team Leads
    const teamLeadName = roleUserMapping[teamLeadRole].name;

    const leadScores = history
        .filter(item => item.supervisorName === teamLeadName)
        .map(item => ({ date: new Date(item.date), score: item.analysis.leadershipScore }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (leadScores.length < 2) {
        return [{
            name: teamLeadName,
            role: teamLeadRole,
            leadershipScore: leadScores[0]?.score || 5,
            trajectory: 'stable'
        }];
    }

    const latestScore = leadScores[leadScores.length - 1].score;
    const previousScore = leadScores[leadScores.length - 2].score;
    let trajectory: DevelopmentMapNode['trajectory'] = 'stable';
    if (latestScore > previousScore) trajectory = 'positive';
    if (latestScore < previousScore) trajectory = 'negative';

    return [{
        name: teamLeadName,
        role: teamLeadRole,
        leadershipScore: latestScore,
        trajectory: trajectory
    }];
}

export interface TeamCoachingQuality {
    teamLeadName: string;
    qualityScore: number;
    totalSessions: number;
}

export async function getTeamCoachingQualityIndex(amRole: Role): Promise<TeamCoachingQuality[]> {
    const history = await getOneOnOneHistory();
    const qualityMap: Record<string, { totalScore: number, count: number }> = {};

    history.forEach(item => {
        // For AM, we're looking at their direct reports, the Team Leads
        const supervisorName = item.supervisorName;
        if (!qualityMap[supervisorName]) {
            qualityMap[supervisorName] = { totalScore: 0, count: 0 };
        }
        qualityMap[supervisorName].totalScore += item.analysis.effectivenessScore;
        qualityMap[supervisorName].count++;
    });

    return Object.entries(qualityMap).map(([teamLeadName, data]) => ({
        teamLeadName,
        qualityScore: (data.totalScore / data.count) * 10, // Scale to 100
        totalSessions: data.count,
    })).filter(item => item.teamLeadName === roleUserMapping['Team Lead'].name); // Only show Team Lead for this demo
}

export interface ReadinessPipelineData {
    employeeToLead: number;
    leadToAm: number;
}

export async function getReadinessPipelineData(amRole: Role): Promise<ReadinessPipelineData> {
    // This is heavily mocked as it requires complex logic
    return {
        employeeToLead: 65, // % of employees showing potential for TL role
        leadToAm: 40,       // % of TLs showing potential for AM role
    };
}

export interface EscalationInsight {
    theme: string;
    recommendation: string;
    count: number;
}

export async function getEscalationInsights(amRole: Role): Promise<EscalationInsight[]> {
    // This is mocked based on common HR themes
    return [
        {
            theme: 'Lack of Clarity in Feedback',
            recommendation: 'Reinforce STAR method training for giving specific, behavioral feedback.',
            count: 3
        },
        {
            theme: 'Unaddressed Career Growth Signals',
            recommendation: 'Coach leads to proactively ask about career aspirations in every 1-on-1.',
            count: 2
        }
    ];
}
