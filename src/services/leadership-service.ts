

'use client';

import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@/hooks/use-role';
import { roleUserMapping } from '@/lib/role-mapping';
import { getFeedbackFromStorage, saveFeedbackToStorage, type Feedback } from './feedback-service';
import type { NetsInitialInput } from '@/ai/schemas/nets-schemas';

export interface ScriptStep {
    type: 'script';
    id: string;
    content: string;
}

export interface QuizStep {
    type: 'quiz_mcq';
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    feedback?: {
        correct: string;
        incorrect: string;
    };
}

export interface ActivityStep {
    type: 'activity';
    id: string;
    content: string;
}

export interface SynthesisStep {
    type: 'synthesis';
    id: string;
    title: string;
    intro: string;
    weeklyPractices: {
        id: string;
        startWeek: number;
        endWeek: number;
        focus: string;
        tasks: string[];
    }[];
    outro: string;
}

export interface PracticeStep {
    type: 'practice';
    id: string;
    scenario: NetsInitialInput;
}


export type LessonStep = ScriptStep | QuizStep | ActivityStep | SynthesisStep | PracticeStep;

export interface LeadershipLesson {
    id: string;
    title: string;
    isCompleted: boolean;
    steps: LessonStep[];
    userInputs?: Record<string, any>; // To store answers and reflections
    startDate?: string;
    type?: 'standard' | 'practice';
}

export interface LeadershipModule {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    lessons: LeadershipLesson[];
}

export interface LeadershipNomination {
    id: string;
    nominatedBy: Role;
    nomineeRole: Role;
    targetRole: Role;
    mentorRole?: Role;
    status: 'InProgress' | 'Completed' | 'Certified';
    startDate: string;
    modules: LeadershipModule[];
    modulesCompleted: number;
    currentModuleId: string;
    certified: boolean;
    lastUpdated: string;
}

export const LEADERSHIP_COACHING_KEY = 'leadership_coaching_nominations_v5';

const getModulesForEmployeeToLead = (): LeadershipModule[] => [
    { 
        id: 'm1', 
        title: 'Building Personal Leadership Presence', 
        description: 'Learn to show up as someone others trust, respect, and want to follow.',
        isCompleted: false,
        lessons: [
            {
                id: 'l1-0',
                title: 'What is Leadership Presence?',
                isCompleted: false,
                steps: [
                     {
                        id: 's1-0-1',
                        type: 'script',
                        content: `<h4>What is Leadership Presence and Why Does It Matter?</h4><p>Imagine walking into a meeting where Sarah, a software developer, quietly takes her seat in the back. When the project hits a roadblock, she doesn't speak up even though she knows the solution. Compare this to Marcus, also a developer, who enters the same meeting, makes eye contact with colleagues, and when the roadblock emerges, he leans forward and says, "I've seen this issue before. Here's what worked for our team last time, and here's what we learned to avoid."</p><p class="mt-4">Both Sarah and Marcus have the same technical skills. The difference? Marcus has developed <strong>leadership presence</strong>—the ability to show up as someone others trust, respect, and want to follow, even when he has no formal authority.</p><p class="mt-4">Leadership presence isn't about being the loudest person in the room or having a commanding personality. It's about developing four core qualities that make people think, "I trust this person's judgment" and "I want to hear what they have to say."</p>`
                    },
                    {
                        id: 's1-0-2',
                        type: 'quiz_mcq',
                        question: 'According to the text, what is the best definition of leadership presence?',
                        options: [
                            'Having a commanding personality and being the loudest in the room.',
                            'The ability to show up in a way that inspires trust and respect from others.',
                            'Having the most technical skill and experience on the team.',
                            'Always having the correct answer to every problem.'
                        ],
                        correctAnswer: 'The ability to show up in a way that inspires trust and respect from others.',
                        feedback: {
                            correct: "Correct! Leadership presence is about how you project credibility and earn trust, regardless of your official title.",
                            incorrect: "Not quite. The key to leadership presence is inspiring trust and respect, which is more than just personality or technical skill."
                        }
                    }
                ]
            },
            {
                id: 'l1-1',
                title: 'Pillar 1: Authenticity',
                isCompleted: false,
                steps: [
                    {
                        id: 's1-1-1',
                        type: 'script',
                        content: `<h4>Pillar 1: Authenticity - Being Real Without Being Raw</h4><p>Authenticity means bringing your genuine self to work while maintaining professionalism. It's not about sharing every personal detail or emotion—it's about aligning your values with your actions consistently.</p><p class="mt-4 font-semibold">What authentic leadership looks like:</p><ul class="list-disc pl-5 mt-2 space-y-1"><li>When you make a mistake, you own it immediately: "I missed that deadline because I underestimated the complexity. Here's my plan to prevent this in the future."</li><li>You share credit generously: "This success happened because Maria caught the critical bug and Tom stayed late to help test the fix."</li><li>You admit when you don't know something: "I'm not familiar with that technology stack. Can you walk me through how it would work?"</li></ul><p class="mt-4 font-semibold">What authentic leadership does NOT look like:</p><ul class="list-disc pl-5 mt-2 space-y-1"><li>Oversharing personal problems: "I'm having marriage issues and that's why I've been distracted"</li><li>Being brutally honest without consideration: "That idea is terrible and won't work"</li><li>Using authenticity as an excuse for unprofessional behavior: "That's just who I am" when someone gives you feedback</li></ul>`
                    },
                    {
                        id: 's1-1-2',
                        type: 'quiz_mcq',
                        question: 'A colleague praises you for a project you completed with a lot of help from a teammate. What is the most authentic response?',
                        options: [
                            'Say "Thanks, I worked really hard on it."',
                            'Say "Thanks, but it was all [teammate\'s name]."',
                            'Say "Thanks! [Teammate\'s name] and I made a great team on this. Their work on the data model was critical."',
                            'Say nothing to avoid making it awkward.'
                        ],
                        correctAnswer: 'Say "Thanks! [Teammate\'s name] and I made a great team on this. Their work on the data model was critical."',
                        feedback: {
                            correct: "Excellent! This response is authentic because it accepts the praise gracefully while generously and specifically sharing credit.",
                            incorrect: "While well-intentioned, the best answer is to share credit specifically. It acknowledges your role while highlighting your teammate's contribution, which is a key leadership behavior."
                        }
                    }
                ]
            },
            {
                id: 'l1-2',
                title: 'Pillar 2: Consistency',
                isCompleted: false,
                steps: [
                    {
                        id: 's1-2-1',
                        type: 'script',
                        content: `<h4>Pillar 2: Consistency - Becoming Predictably Reliable</h4><p>Consistency means people know what to expect from you. They trust that your mood won't dramatically affect your decision-making, that you'll follow through on commitments, and that you'll apply the same standards fairly to everyone.</p><p class="mt-4 font-semibold">Building consistency in daily interactions:</p><ul class="list-disc pl-5 mt-2 space-y-1"><li><strong>Morning routine example:</strong> Instead of rushing into work, take two minutes to check in with your team. "Good morning, everyone. Any obstacles I can help remove today?" This signals you care about both people and results.</li><li><strong>Decision-making consistency:</strong> When evaluating ideas, use the same criteria every time. "Let's check this against our goals: Does it align with the project? Do we have resources? What's the risk?"</li><li><strong>Follow-through consistency:</strong> If you say "I'll get back to you by Friday," do it. If you can't, communicate that on Thursday.</li></ul><p class="mt-4"><strong>The compound effect of consistency:</strong> People start coming to you for reliable information, then for your opinion, and eventually, they see you as leadership material because they trust your judgment.</p>`
                    },
                    {
                        id: 's1-2-2',
                        type: 'quiz_mcq',
                        question: 'You promised a colleague you would review their document by end of day, but an urgent issue came up. What is the best demonstration of consistency?',
                        options: [
                            'Ignore the commitment and hope they forget.',
                            'Send them a message saying "Sorry, can\'t do it today."',
                            'Work late to finish the review, even if it means doing a poor job.',
                            'Proactively message them before the deadline, explain the situation, and propose a new, specific timeline (e.g., "by 10 AM tomorrow").'
                        ],
                        correctAnswer: 'Proactively message them before the deadline, explain the situation, and propose a new, specific timeline (e.g., "by 10 AM tomorrow").',
                        feedback: {
                            correct: "Perfect. Consistency isn't about being perfect; it's about being reliably communicative and managing expectations.",
                            incorrect: "The best choice is proactive communication. Reliability comes from managing commitments, even when you have to adjust them."
                        }
                    }
                ]
            },
            {
                id: 'l1-3',
                title: 'Pillar 3: Composure',
                isCompleted: false,
                steps: [
                    {
                        id: 's1-3-1',
                        type: 'script',
                        content: `<h4>Pillar 3: Composure - Staying Calm When Others Can't</h4><p>Composure isn't about suppressing emotions. It's about managing your emotional responses so you can think clearly during stressful situations.</p><p class="mt-4 font-semibold">Practical composure techniques:</p><ul class="list-disc pl-5 mt-2 space-y-1"><li><strong>The 3-breath technique:</strong> When stress rises, take three slow, deep breaths before responding. This engages your rational brain.</li><li><strong>The clarifying question:</strong> Instead of reacting to bad news, ask a question like, "Help me understand what you mean by that?" This buys you thinking time.</li><li><strong>The emotional labeling technique:</strong> Internally acknowledge your emotion without being controlled by it: "I'm feeling frustrated. Let me focus on what we can control."</li></ul><p class="mt-4 font-semibold">Composure in action example:</p><p>The situation: A major bug will delay a launch. The client is furious, and teammates are blaming each other.</p><p><em>Poor response:</em> "This is a disaster! How did we miss this?"</p><p><em>Composed response:</em> "This is a serious issue. Let's focus on three things: First, a plan to fix the bug. Second, how to communicate with the client. Third, what we can learn to prevent this."</p>`
                    },
                    {
                        id: 's1-3-2',
                        type: 'quiz_mcq',
                        question: 'In a tense meeting, a colleague criticizes your work. What is the best first response to demonstrate composure?',
                        options: [
                            'Immediately defend your work and point out their flaws.',
                            'Take a slow breath and ask, "Can you help me understand which part is most concerning to you?"',
                            'Say nothing and shut down.',
                            'Tell them they are being unprofessional.'
                        ],
                        correctAnswer: 'Take a slow breath and ask, "Can you help me understand which part is most concerning to you?"',
                        feedback: {
                            correct: "Exactly. This response combines the pause (breath) with a clarifying question, de-escalating the situation and gathering information.",
                            incorrect: "The most composed response is to pause and ask a clarifying question. This prevents an emotional reaction and shifts the focus to problem-solving."
                        }
                    }
                ]
            },
            {
                id: 'l1-4',
                title: 'Pillar 4: Connection',
                isCompleted: false,
                steps: [
                    {
                        id: 's1-4-1',
                        type: 'script',
                        content: `<h4>Pillar 4: Connection - Building Bridges, Not Walls</h4><p>Connection is about making others feel heard, valued, and understood. It's the skill that transforms individual contributors into leaders that others want to follow.</p><p class="mt-4 font-semibold">Building connection through active listening:</p><ul class="list-disc pl-5 mt-2 space-y-1"><li><strong>Level 1 - Passive listening:</strong> You're quiet, but your mind is preparing your response.</li><li><strong>Level 2 - Active listening:</strong> You're focused on understanding, asking clarifying questions, and reflecting back what you heard.</li><li><strong>Level 3 - Empathetic listening:</strong> You're not just hearing words, but understanding the emotions and motivations behind them.</li></ul><p class="mt-4 font-semibold">Building connection through recognition:</p><p><em>Generic:</em> "Good job."</p><p><em>Specific:</em> "Your decision to add automated testing caught three bugs. That attention to quality made a real difference."</p><p><em>Development-focused:</em> "The way you explained that complex concept to the sales team showed real leadership. That skill will serve you well."</p>`
                    },
                    {
                        id: 's1-4-2',
                        type: 'quiz_mcq',
                        question: 'A junior team member successfully completes their first solo project. Which form of recognition best demonstrates the "Connection" pillar?',
                        options: [
                            'A quick "good job" in team chat.',
                            'Mentioning their success in the weekly team meeting.',
                            '"The way you managed the project timeline and communicated risks was exactly what we look for in future leaders on this team. Great work."',
                            'Giving them an even harder project next time.'
                        ],
                        correctAnswer: '"The way you managed the project timeline and communicated risks was exactly what we look for in future leaders on this team. Great work."',
                        feedback: {
                            correct: "Yes. This feedback is specific, ties their actions to valued leadership behaviors, and encourages future growth.",
                            incorrect: "Specific, development-focused feedback is the most powerful way to build connection and motivate your colleagues."
                        }
                    }
                ]
            },
             {
                id: 'l1-5',
                title: 'Synthesis: Putting It All Together',
                isCompleted: false,
                startDate: undefined,
                steps: [
                    {
                        id: 's1-5-1',
                        type: 'synthesis',
                        title: 'Daily Practices to Build Leadership Presence',
                        intro: "Leadership presence isn't about perfecting each pillar in isolation—it's about integrating them into a consistent way of showing up. The following is a guided 8-week plan to help you build these skills daily. Each week, focus on the assigned tasks.",
                        weeklyPractices: [
                            { id: 'w1-2', startWeek: 1, endWeek: 2, focus: 'Authenticity Focus', tasks: ["Practice admitting when you don't know something in low-stakes situations.", "Give credit to others at least once per day.", "When you make a mistake, own it immediately and share what you learned."] },
                            { id: 'w3-4', startWeek: 3, endWeek: 4, focus: 'Consistency Focus', tasks: ["Track three commitments you make each day and whether you keep them.", "Use the same decision-making criteria for similar situations.", "Develop a standard way of responding to common requests."] },
                            { id: 'w5-6', startWeek: 5, endWeek: 6, focus: 'Composure Focus', tasks: ["Practice the 3-breath technique during routine conversations.", "When someone shares bad news, pause and ask a clarifying question before reacting.", "Start meetings with a brief moment to center yourself."] },
                            { id: 'w7-8', startWeek: 7, endWeek: 8, focus: 'Connection Focus', tasks: ["Ask one genuine question about each person you work with each day.", "Practice level 3 listening in at least one conversation daily.", "Give specific, development-focused recognition to colleagues."] }
                        ],
                        outro: "Signs of growth include: people seeking your input more often, feeling more confident in meetings, and your influence growing even without a formal title."
                    }
                ]
            },
            {
                id: 'l1-6',
                title: 'Activity: Self-Discovery',
                isCompleted: false,
                steps: [
                    {
                        id: 's1-6-1',
                        type: 'activity',
                        content: `<h4>Part A: Authenticity Assessment</h4><p>Think about your last work week. For each situation below, write what you actually did and what a more authentic response might have looked like:</p><ul class="list-disc pl-5 mt-2 space-y-1"><li>Someone praised you for work that involved others.</li><li>You were asked about something you weren’t sure about.</li><li>You made an error that affected others.</li></ul>`
                    },
                    {
                        id: 's1-6-2',
                        type: 'activity',
                        content: `<h4>Part B: Composure Practice</h4><p>List your top 3 work stress triggers, the physical signs you notice, your usual reaction, and a more composed response you could try for each.</p>`
                    },
                    {
                        id: 's1-6-3',
                        type: 'activity',
                        content: `<h4>Part C: Connection Experiment</h4><p>Choose three colleagues and practice Level 2 listening (active listening), Level 3 listening (empathetic listening), and specific recognition. Note your observations and their responses for each person.</p>`
                    }
                ]
            },
            {
                id: 'l1-7',
                title: 'Practice Scenario: The Project Conflict',
                isCompleted: false,
                type: 'practice',
                steps: [
                    {
                        id: 's1-7-1',
                        type: 'practice',
                        scenario: {
                            persona: 'Team Lead',
                            difficulty: 'strict',
                            scenario: `You’re part of a six-person project team. In a meeting, Elena says: "James, your dashboard design doesn’t make sense. It’s going to confuse users." James fires back: "Well maybe if the requirements had been clear, I wouldn’t have designed it this way!" The tension is rising. You need to intervene to de-escalate the conflict and refocus the team.`,
                        }
                    }
                ]
            }
        ]
    }
];

// ==========================================
// Generic Storage Helpers
// ==========================================

export const getFromStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    const json = sessionStorage.getItem(key);
    
    if (!json) {
        if (key === LEADERSHIP_COACHING_KEY) {
            const mockData = getMockLeadershipData() as T[];
            saveToStorage(key, mockData);
            return mockData;
        }
        return [];
    }
    
    return JSON.parse(json);
};

export const saveToStorage = (key: string, data: any[]): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('feedbackUpdated'));
    window.dispatchEvent(new Event('storage'));
};


const getMockLeadershipData = (): LeadershipNomination[] => {
    const modules = getModulesForEmployeeToLead();
    const mockNomination: LeadershipNomination = {
        id: 'mock-lead-1',
        nominatedBy: 'Manager',
        nomineeRole: 'Team Lead',
        targetRole: 'AM',
        mentorRole: 'Manager',
        status: 'InProgress',
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
        modules: modules.map((m, i) => ({ ...m, isCompleted: i < 0 })), // Nothing completed initially
        modulesCompleted: 0,
        currentModuleId: 'm1',
        certified: false,
        lastUpdated: new Date().toISOString(),
    };
    return [mockNomination];
};


// ==========================================
// Service Functions
// ==========================================

/**
 * Nominates an employee for the Leadership Coaching program.
 */
export async function nominateForLeadership(managerRole: Role, nomineeRole: Role, targetRole: Role, mentorRole: Role): Promise<LeadershipNomination> {
    const allNominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
    const now = new Date().toISOString();
    const initialModules = getModulesForEmployeeToLead();

    const newNomination: LeadershipNomination = {
        id: uuidv4(),
        nominatedBy: managerRole,
        nomineeRole,
        targetRole: targetRole,
        mentorRole: mentorRole,
        status: 'InProgress',
        startDate: now,
        modules: initialModules.map(m => ({
            ...m,
            lessons: m.lessons.map(l => ({ ...l, userInputs: {} })) // Initialize userInputs
        })),
        modulesCompleted: 0,
        currentModuleId: initialModules[0].id,
        certified: false,
        lastUpdated: now,
    };

    allNominations.unshift(newNomination);
    saveToStorage(LEADERSHIP_COACHING_KEY, allNominations);

    // Create a notification for the nominated user
    const managerName = roleUserMapping[managerRole]?.name || managerRole;
    const notification: Feedback = {
        trackingId: `LD-NOM-${newNomination.id}`,
        subject: `You've been enrolled in the Leadership Development Program!`,
        message: `Congratulations! ${managerName} has enrolled you in the Leadership Development Program.\n\nThis program is designed to help you grow from a subject matter expert into an effective leader. You can track your progress and access modules in the "Leadership" section.`,
        submittedAt: new Date(now),
        criticality: 'Low',
        status: 'Pending Acknowledgement',
        assignedTo: [nomineeRole],
        viewed: false,
        auditTrail: [{
            event: 'Notification Created',
            timestamp: new Date(now),
            actor: 'System',
            details: `Automated notification for Leadership Program enrollment.`
        }]
    };
    
    const allFeedback = getFeedbackFromStorage();
    allFeedback.unshift(notification);
    saveFeedbackToStorage(allFeedback);

    return newNomination;
}

/**
 * Gets all leadership nominations initiated by a specific manager.
 */
export async function getLeadershipNominationsForManager(managerRole: Role): Promise<LeadershipNomination[]> {
    const allNominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
    return allNominations
        .filter(n => n.nominatedBy === managerRole)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

/**
 * Gets the leadership nomination for the currently logged-in user, if one exists.
 */
export async function getNominationForUser(userRole: Role): Promise<LeadershipNomination | null> {
    const allNominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
    return allNominations.find(n => n.nomineeRole === userRole) || null;
}

export async function getNominationsForMentor(mentorRole: Role): Promise<LeadershipNomination[]> {
    const allNominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
    return allNominations.filter(n => n.mentorRole === mentorRole);
}

export async function completeLeadershipLesson(nominationId: string, moduleId: string, lessonId: string): Promise<void> {
    const nominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
    const nomIndex = nominations.findIndex(n => n.id === nominationId);
    if (nomIndex === -1) return;

    const nomination = nominations[nomIndex];
    const modIndex = nomination.modules.findIndex(m => m.id === moduleId);
    if (modIndex === -1) return;

    const lessonIndex = nomination.modules[modIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex !== -1) {
        nomination.modules[modIndex].lessons[lessonIndex].isCompleted = true;
    }

    // Check if module is complete
    const module = nomination.modules[modIndex];
    const allLessonsCompleted = module.lessons.every(l => l.isCompleted);
    if (allLessonsCompleted && !module.isCompleted) {
        module.isCompleted = true;
        nomination.modulesCompleted = nomination.modules.filter(m => m.isCompleted).length;
        
        // Unlock next module
        const nextModule = nomination.modules[modIndex + 1];
        if (nextModule) {
            nomination.currentModuleId = nextModule.id;
        } else {
            // All modules completed
            nomination.status = 'Completed';
        }
    }

    nomination.lastUpdated = new Date().toISOString();
    saveToStorage(LEADERSHIP_COACHING_KEY, nominations);
}

export async function saveLeadershipLessonAnswer(nominationId: string, lessonId: string, stepId: string, answer: any): Promise<void> {
    const nominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
    const nomIndex = nominations.findIndex(n => n.id === nominationId);
    if (nomIndex === -1) return;

    const nomination = nominations[nomIndex];
    
    // Find the correct lesson across all modules
    let lesson: LeadershipLesson | undefined;
    for (const module of nomination.modules) {
        lesson = module.lessons.find(l => l.id === lessonId);
        if (lesson) break;
    }

    if (lesson) {
        if (!lesson.userInputs) {
            lesson.userInputs = {};
        }
        lesson.userInputs[stepId] = answer;
        nomination.lastUpdated = new Date().toISOString();
        saveToStorage(LEADERSHIP_COACHING_KEY, nominations);
    } else {
        console.error(`Lesson with ID ${lessonId} not found in nomination ${nominationId}`);
    }
}
