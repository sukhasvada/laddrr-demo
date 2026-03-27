/**
 * @fileOverview A service for managing Interviewer Lab nominations and progress.
 */
'use client';

import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@/hooks/use-role';
import { roleUserMapping } from '@/lib/role-mapping';
import type { InterviewerAnalysisOutput } from '@/ai/schemas/interviewer-lab-schemas';
import type { NetsInitialInput } from '@/ai/schemas/nets-schemas';
import { getFeedbackFromStorage, saveFeedbackToStorage, type Feedback } from './feedback-service';

// ==========================================
// NEW: Multi-step Lesson Structure
// ==========================================

export interface ScriptStep {
    type: 'script';
    title?: string;
    content: string;
}

export interface QuizStep {
    type: 'quiz_mcq';
    question: string;
    options: string[];
    correctAnswer: string;
    feedback: {
        correct: string;
        incorrect: string;
    };
}

export interface JournalStep {
    type: 'journal';
    prompt: string;
}

export type LessonStep = ScriptStep | QuizStep | JournalStep;

export interface TrainingLesson {
    id: string;
    title: string;
    type: 'standard' | 'practice'; // Simplified type
    isCompleted: boolean;
    steps?: LessonStep[]; // A lesson can have multiple steps
    practiceScenario?: NetsInitialInput; // For practice-type lessons
    result?: any;
}


// --- Old activity types, kept for compatibility if needed, but new lessons use steps ---
export interface QuizActivity {
    type: 'quiz_mcq';
    question: string;
    options: string[];
    correctAnswer: string;
}
export interface MatchActivity { type: 'match_game'; prompt: string; items: { text: string, category: string }[]; categories: string[]; }
export interface FillBlankActivity { type: 'fill_blank'; prompt: string; }
export interface ChecklistActivity { type: 'checklist'; prompt: string; options: string[]; }
export interface BranchingActivity { type: 'branching_scenario'; prompt: string; options: { text: string, isCorrect: boolean }[]; }
export interface JournalActivity { type: 'journal'; prompt: string; }
export interface SwipeActivity { type: 'swipe_quiz'; prompt: string; cards: { text: string, correctAnswer: 'Legal' | 'Illegal' }[]; }
export type LessonActivity = QuizActivity | MatchActivity | FillBlankActivity | ChecklistActivity | BranchingActivity | JournalActivity | SwipeActivity;


export interface TrainingModule {
    id:string;
    title: string;
    description: string;
    duration: number; // in minutes
    isCompleted: boolean;
    lessons: TrainingLesson[];
}

// Mirroring the planned Firebase structure
export interface Nomination {
    id: string;
    nominatedBy: Role;
    nominee: Role;
    targetInterviewRole: string;
    status: 'Pre-assessment pending' | 'In Progress' | 'Post-assessment pending' | 'Retry Needed' | 'Certified';
    scorePre?: number;
    scorePost?: number;
    analysisPre?: InterviewerAnalysisOutput;
    analysisPost?: InterviewerAnalysisOutput;
    modules: TrainingModule[];
    modulesTotal: number;
    modulesCompleted: number;
    certified: boolean;
    lastUpdated: string;
    nominatedAt: string;
}

const INTERVIEWER_LAB_KEY = 'interviewer_lab_nominations_v4'; // Incremented version

// ==========================================
// Generic Storage Helpers
// ==========================================

const getFromStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    const json = sessionStorage.getItem(key);
    return json ? JSON.parse(json) : [];
};

const saveToStorage = (key: string, data: any[]): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('feedbackUpdated')); // Use existing event for simplicity
    window.dispatchEvent(new Event('storage'));
};


const getInitialModules = (): TrainingModule[] => [
    {
        id: 'm1',
        title: "Interview Foundations",
        description: "Learn the fundamentals of conducting a structured and professional interview.",
        duration: 30,
        isCompleted: false,
        lessons: [
            {
                id: 'l1-1', title: 'Why Structured Interviews Matter', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '👋 Coach Intro', content: "Most managers think they’re great at interviewing.\n\nBut research says otherwise: unstructured interviews are only about 20% predictive of job success. That’s barely better than flipping a coin.\n\nThe problem? Unstructured interviews:\n- Drift into small talk and gut feelings.\n- Let unconscious bias creep in.\n- Miss important, consistent evaluation points.\n\nSo how do world-class companies solve this? With structured interviews. Think of them as your playbook for fair, consistent, high-quality hiring." },
                    { type: 'script', title: '📊 Teaching Moment', content: "Structured interviews double predictive accuracy — about 40% predictive. That might not sound like much, but in hiring, it’s massive.\n\nHere’s an analogy:\n\nImagine you’re scouting athletes. If you let each coach ask random questions, one might ask about diet, another about favorite music. Results are all over the place.\n\nBut if everyone runs the same timed sprint test, you can compare apples to apples.\n\nThat’s the essence of structure: same test, fairer results, better hires." },
                    { type: 'script', title: '📖 Mini-Case', content: "Let me share a quick story.\n\nA retail company once let managers run their own unstructured interviews. The result? High turnover, inconsistent hiring, and even a lawsuit around discriminatory questioning.\n\nWhen they switched to structured interviews — same questions, standardized scoring — turnover dropped by 25% and legal risk disappeared.\n\nLesson: Structure isn’t bureaucracy. It’s protection + performance." },
                    { type: 'quiz_mcq', question: "Which of these is a proven benefit of structured interviews?", options: ["They allow managers to improvise fully.", "They ensure fairness and reduce legal risk.", "They focus on casual conversation.", "They guarantee every candidate accepts an offer."], correctAnswer: "They ensure fairness and reduce legal risk.", feedback: { correct: "Exactly! Fairness and compliance are the backbone of structured interviews.", incorrect: "Not quite. Improvisation and small talk can feel nice, but they don’t predict performance or protect you legally. The right answer is B." } },
                    { type: 'journal', prompt: "Now, let’s apply this.\n\nThink of a time you were in an interview — either giving it or sitting as a candidate.\n\nWas it structured or unstructured?\n\nHow did it feel — fair, consistent, or random?\n\nWhat did you learn about the effectiveness of that style?\n\nWrite 2–3 sentences in your notes. This reflection primes your brain to connect the concept to real experience." },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: "Here’s what I want you to remember:\n\nUnstructured = random, risky, biased.\n\nStructured = fair, consistent, predictive.\n\nCompanies that use structured interviews not only hire better, they protect themselves legally and build trust with candidates.\n\nYour role as an interviewer is not just to ‘chat.’ It’s to create a reliable system that helps your team win. Structure is that system." },
                    { type: 'journal', prompt: "Want to go deeper? Try this optional stretch activity:\n\nWrite down 3 interview questions you’ve asked (or been asked).\n\nAsk yourself: Could these be standardized and asked to every candidate?\n\nHow would that change fairness and consistency?\n\nBring these to our next lesson — we’ll build on them." }
                ]
            },
            {
                id: 'l1-2', title: 'Core Principles of Structured Interviewing', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: "Structured interviews aren’t just about asking the same questions. They’re built on 3 principles:\n\nConsistency — ask the same core questions.\n\nRelevance — questions tied to the job role.\n\nScoring — rate answers against clear criteria." },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: "Think of it like refereeing a game.\n\nEvery player follows the same rules.\nScores are based on agreed standards.\n\nThat’s how you keep the game — and the hiring process — fair." },
                    { type: 'script', title: '📖 Mini-Case', content: "A financial services firm introduced structured scoring rubrics. Managers reported more confidence in hiring decisions because they had objective data to back them up." },
                    { type: 'quiz_mcq', question: "Which principle ensures fairness across candidates?", options: ["Consistency", "Small talk", "Improvisation", "Intuition"], correctAnswer: "Consistency", feedback: { correct: "Yes! Consistency = fairness.", incorrect: "The answer is A. Consistency is the foundation of fairness." } },
                    { type: 'journal', prompt: "Which of these principles do you personally find hardest: consistency, relevance, or scoring? Why?" },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: "Consistency makes it fair. Relevance makes it useful. Scoring makes it actionable." },
                    { type: 'journal', prompt: "🚀 Stretch Activity\n\nPick one job in your team. Write 2 consistent, relevant questions you could ask every candidate for that role." }
                ]
            },
            {
                id: 'l1-3', title: 'Designing Structured Interview Questions', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: "Not all questions are created equal. Structured interviews rely on behavioral (‘Tell me about a time…’) and situational (‘What would you do if…’) questions. These dig into real skills, not just surface-level talk." },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: "Think of it like testing a driver. Asking ‘Are you good at driving?’ is useless. Making them take a road test shows you the truth.\n\nGood questions = road test for skills." },
                    { type: 'script', title: '📖 Mini-Case', content: "A tech company replaced vague questions (‘What’s your greatest strength?’) with behavioral ones (‘Tell me about a time you solved a tough bug’). Result: much stronger signal about candidate skills." },
                    { type: 'quiz_mcq', question: "Which of these is a behavioral interview question?", options: ["What’s your favorite movie?", "Tell me about a time you led a difficult project.", "Do you consider yourself detail-oriented?", "How would you feel about working weekends?"], correctAnswer: "Tell me about a time you led a difficult project.", feedback: { correct: "Correct — behavioral questions use past experiences as evidence.", incorrect: "The answer is B. Behavioral questions start with ‘Tell me about a time…’" } },
                    { type: 'journal', prompt: "Think of a role you hire for. What’s one strong behavioral question you could use?" },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: "Structured interviews use job-relevant, evidence-based questions. Behavior predicts future behavior." },
                    { type: 'journal', prompt: "🚀 Stretch Activity\n\nWrite one behavioral and one situational question for your next role. Save them for your question bank." }
                ]
            },
            {
                id: 'l1-4', title: 'Scoring and Evaluation Rubrics', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: "Even the best questions fail without clear scoring. Structured interviews use rubrics: 1–5 scales with defined behaviors at each level." },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: "Imagine grading an essay without a rubric. One teacher gives it an A, another a C. That’s chaos. A rubric makes evaluation fair and repeatable." },
                    { type: 'script', title: '📖 Mini-Case', content: "A healthcare company trained managers to use 1–5 rubrics. Result: interviewer agreement went up 40%. That means less debate, faster decisions." },
                    { type: 'quiz_mcq', question: "Why are rubrics important?", options: ["They allow gut-based scoring", "They reduce subjectivity", "They replace job descriptions", "They guarantee a perfect hire"], correctAnswer: "They reduce subjectivity", feedback: { correct: "Exactly — rubrics reduce subjectivity.", incorrect: "The answer is B. Rubrics keep scoring consistent and fair." } },
                    { type: 'journal', prompt: "Think about the last time you scored a candidate. Did you have a clear rubric, or did you rely on gut feel?" },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: "Rubrics = fairness + reliability. They turn vague answers into measurable data." },
                    { type: 'journal', prompt: "🚀 Stretch Activity\n\nDesign a 1–5 scoring rubric for one interview question. Write what ‘1’ looks like, what ‘5’ looks like, and fill in the middle." }
                ]
            },
            {
                id: 'l1-5', title: 'Reducing Bias in Hiring', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: "Bias creeps in when interviews are unstructured. Structured interviews help — but only if you stay disciplined. Bias isn’t always obvious; it’s often unconscious." },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: "Think of it like a GPS. Without structure, you drift off course without noticing. Structure = a route that keeps you honest." },
                    { type: 'script', title: '📖 Mini-Case', content: "A consulting firm trained managers to stick to structured questions and scoring. Over 18 months, their gender balance in new hires improved by 20% — not by lowering the bar, but by reducing bias." },
                    { type: 'quiz_mcq', question: "Which practice reduces bias in interviews?", options: ["Asking every candidate different questions", "Sticking to structured questions and rubrics", "Relying on first impressions", "Letting gut feel decide"], correctAnswer: "Sticking to structured questions and rubrics", feedback: { correct: "Yes — consistency and rubrics reduce bias.", incorrect: "The correct answer is B. Structure keeps bias out." } },
                    { type: 'journal', prompt: "Think of a time when bias — yours or someone else’s — may have influenced a hiring decision. How could structure have reduced it?" },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: "Bias is sneaky. Structure protects against it by forcing consistency and fairness. That’s how you build diverse, high-performing teams." },
                    { type: 'journal', prompt: "🚀 Stretch Activity\n\nReview your last interview notes. Did you evaluate everyone against the same criteria, or were impressions creeping in? Rewrite your notes with a structured rubric lens." }
                ]
            }
        ]
    },
    {
        id: 'm2',
        title: "Behavioral Interviewing Mastery",
        description: "Master the STAR method to effectively probe for behavioral examples.",
        duration: 40,
        isCompleted: false,
        lessons: [
            {
                id: 'l2-1', title: 'Introduction to Behavioral Interviewing', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Behavioral interviews are built on one principle: Past behavior predicts future performance. Asking candidates how they handled situations in the past is far more reliable than asking what they might do.\n\nIn this module, we’ll learn to ask, evaluate, and score behavioral questions consistently.' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Think of it like a flight simulator. You want to see how someone actually responds in realistic scenarios — not just what they say they would do.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A software firm switched from hypotheticals (‘What would you do?’) to behavioral questions (‘Tell me about a time you resolved a customer complaint’). They found predictive validity improved — employees who performed well in the interview excelled on the job.' },
                    { type: 'quiz_mcq', question: 'Why are behavioral interviews effective?', options: ['They are more fun than structured interviews', 'Past behavior predicts future performance', 'They allow improvisation', 'They focus mainly on small talk'], correctAnswer: 'Past behavior predicts future performance', feedback: { correct: 'Correct! Evidence-based questions = better prediction.', incorrect: 'The answer is B. Behavioral questions are based on real past behavior.' } },
                    { type: 'journal', prompt: 'Think of a recent interview you conducted. Did you ask any behavioral questions? What was the outcome?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Behavioral interviewing isn’t optional. It’s the backbone of predicting on-the-job success.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nList 2 behavioral questions for a role you hire often. Keep them job-relevant and open-ended.' }
                ]
            },
            {
                id: 'l2-2', title: 'STAR Method for Structured Answers', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'The STAR method breaks down answers into:\n\nSituation — context\nTask — responsibilities or challenge\nAction — what they did\nResult — the outcome\n\nUsing STAR ensures candidates give complete, measurable answers.' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Think of STAR like a recipe: you need all four ingredients to bake the perfect cake. Missing one? You won’t get a full picture.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A retail manager used STAR to evaluate candidates. Before STAR, answers were vague and hard to compare. After STAR, evaluation became consistent, and candidate comparisons were objective.' },
                    { type: 'quiz_mcq', question: 'Which part of STAR explains what the candidate did?', options: ['Situation', 'Task', 'Action', 'Result'], correctAnswer: 'Action', feedback: { correct: 'Yes! Action = what the candidate actually did.', incorrect: 'The correct answer is C. Action is the steps they took to address the task.' } },
                    { type: 'journal', prompt: 'Pick one past candidate’s answer. Could it be rewritten in STAR format? Try rewriting it briefly.' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'STAR = structured, complete, and comparable answers. Always look for all four parts.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nWrite one behavioral question. Create a sample STAR answer for scoring practice.' }
                ]
            },
            {
                id: 'l2-3', title: 'Probing Techniques', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Candidates often give short or incomplete answers. That’s where probing comes in. Probing ensures you get the full story without leading or biasing them.' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Think of probing like peeling an onion. Each layer you uncover reveals deeper insights. But be gentle — you don’t want to confuse or pressure the candidate.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A tech interviewer asked: ‘Tell me about a time you led a project.’ Candidate gave a brief overview. The interviewer probed: ‘What specifically did you do to motivate your team?’ This revealed leadership behaviors not in the resume.' },
                    { type: 'quiz_mcq', question: 'Which is an example of an effective probe?', options: ['“So you did everything yourself, right?”', '“Can you explain exactly what steps you took?”', '“Was it hard?”', '“Do you think that was good?”'], correctAnswer: '“Can you explain exactly what steps you took?”', feedback: { correct: 'Correct — probes should uncover specifics without leading.', incorrect: 'The correct answer is B. Ask for concrete details, not yes/no answers.' } },
                    { type: 'journal', prompt: 'Think of a time you asked a question and got a short answer. How could you have probed to get a full STAR response?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Probing = complete answers. Practice asking ‘What exactly did you do?’ or ‘How did you handle that challenge?’”' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nWrite 2 probing questions for each behavioral question in your candidate bank.' }
                ]
            },
            {
                id: 'l2-4', title: 'Evaluating STAR Responses', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Once you have a STAR answer, you need to score it objectively. Focus on:\n\nRelevance: Does it match the job requirements?\nDepth: Does it show real skill and ownership?\nOutcome: Did it produce measurable results?' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Think of scoring like judging a competition. Judges follow clear criteria to make fair, comparable evaluations.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A finance firm created a rubric for STAR responses. Each answer was rated 1–5 for relevance, action, and result. Consistency improved and managers trusted the data.' },
                    { type: 'quiz_mcq', question: 'Which element is not a scoring criterion for STAR answers?', options: ['Relevance', 'Depth', 'Outcome', 'Candidate’s personality color preference'], correctAnswer: 'Candidate’s personality color preference', feedback: { correct: 'Correct. Personal traits unrelated to job performance should not affect scoring.', incorrect: 'The answer is D. Focus on relevant skills, actions, and results.' } },
                    { type: 'journal', prompt: 'Review your last STAR evaluation. Did you use all three scoring dimensions? Note one way to improve your scoring next time.' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Scoring STAR responses objectively ensures fair, data-driven decisions.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nTake a sample STAR answer. Score it 1–5 for relevance, depth, and outcome. Compare your scores with a peer or team rubric.' }
                ]
            },
            {
                id: 'l2-5', title: 'Practice, Feedback, and Continuous Improvement', type: 'practice', isCompleted: false,
                steps: [],
                practiceScenario: { persona: 'Candidate', scenario: "This is a practice session for behavioral interviewing. Ask the AI candidate, 'Tell me about a time you had to handle a difficult stakeholder.' Your goal is to get a complete STAR answer, probing effectively for details.", difficulty: 'neutral' }
            }
        ]
    },
    {
        id: 'm3',
        title: "Bias Awareness & Mitigation",
        description: "Learn to identify and reduce unconscious bias in the hiring process.",
        duration: 30,
        isCompleted: false,
        lessons: [
            {
                id: 'l3-1', title: 'Understanding Bias in Interviews', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Bias is a natural human tendency. In interviews, unconscious bias can distort your judgment, favor some candidates, or disadvantage others. Recognizing bias is the first step to reducing it.' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Think of bias like colored glasses. If you don’t notice the tint, everything you see is slightly skewed. Removing or adjusting those glasses gives a clearer, fairer view.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A tech company found interviewers favored candidates from their own alma mater. After bias awareness training, interviewers consciously evaluated candidates based on competencies, not backgrounds.' },
                    { type: 'quiz_mcq', question: 'What is unconscious bias?', options: ['Intentional discrimination', 'Automatic, unintentional mental shortcuts', 'Strict adherence to rules', 'Following the STAR method'], correctAnswer: 'Automatic, unintentional mental shortcuts', feedback: { correct: 'Correct! Unconscious biases happen without awareness but still influence decisions.', incorrect: 'The answer is B. Bias is often invisible and automatic, not intentional.' } },
                    { type: 'journal', prompt: 'Recall your last interview. Can you identify any moments where bias may have influenced your judgment?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Bias is inevitable, but awareness and structured methods help reduce its impact.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nWrite down 2 biases you think might affect your interviews and 1 strategy to mitigate each.' }
                ]
            },
            {
                id: 'l3-2', title: 'Common Interview Biases', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Let’s explore the biases most likely to appear in interviews and how to counter them.' },
                    { type: 'script', title: '📊 Bias Breakdown', content: "Confirmation Bias\n\nDefinition: Seeking info that confirms your first impression.\nMitigation: Follow a structured question set and score each answer objectively.\n\nHalo/Horn Effect\n\nDefinition: One positive/negative trait dominates your judgment.\nMitigation: Evaluate competencies individually.\n\nSimilarity Bias\n\nDefinition: Favoring candidates with similar backgrounds or interests.\nMitigation: Focus on job-relevant criteria, not personal similarities.\n\nRecency Bias\n\nDefinition: Giving disproportionate weight to the last candidate.\nMitigation: Take notes and review previous candidates before scoring.\n\nAffinity Bias\n\nDefinition: Favoring those who share your opinions or personality.\nMitigation: Use objective metrics and a scoring rubric." },
                    { type: 'quiz_mcq', question: 'Which bias occurs when one strong trait influences all judgments?', options: ['Confirmation', 'Halo/Horn', 'Recency', 'Similarity'], correctAnswer: 'Halo/Horn', feedback: { correct: 'Correct! The halo/horn effect makes one trait dominate perception.', incorrect: 'The answer is B. Evaluate each competency independently.' } },
                    { type: 'journal', prompt: 'Identify a bias you think is most common in your interviews. How have you unintentionally allowed it to affect your judgment?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Recognizing common biases is the first step; applying structured mitigation strategies ensures fairness.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nPick one bias. Write a short strategy for counteracting it in every interview you conduct this week.' }
                ]
            },
            {
                id: 'l3-3', title: 'Structural Bias Mitigation Techniques', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Structure is your best defense against bias. The more consistent and objective your process, the less influence bias has.' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Imagine a scale. Bias is like uneven weights. Structured interviews balance the scale.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A sales organization implemented standard scoring rubrics and identical question sets. After six months, employee diversity and performance metrics improved significantly.' },
                    { type: 'quiz_mcq', question: 'Which is a structural bias mitigation technique?', options: ['Using different questions for each candidate', 'Blind resume reviews', 'Relying on gut feeling', 'Asking personal questions'], correctAnswer: 'Blind resume reviews', feedback: { correct: 'Correct! Blind reviews and structured rubrics reduce bias.', incorrect: 'The answer is B. Objective, standardized methods counter bias effectively.' } },
                    { type: 'journal', prompt: 'Which structural change can you implement immediately to reduce bias in your interviews?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Structure = fairness. Standardized questions and scoring rubrics reduce unconscious bias influence.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate a simple scoring rubric for one of your commonly asked behavioral questions.' }
                ]
            },
            {
                id: 'l3-4', title: 'Real-Time Bias Interruption Techniques', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Even with structure, bias can creep in. Real-time techniques help you pause and reset during interviews.' },
                    { type: 'script', title: '📊 Techniques', content: "Self-Check: Ask, ‘Am I favoring this candidate based on irrelevant factors?’\n\nPause & Reflect: Take a 5-second mental pause before scoring.\n\nObjective Notes: Record quotes or behaviors before giving a rating.\n\nUse Comparisons: Evaluate candidates against competency benchmarks, not each other." },
                    { type: 'script', title: '📖 Mini-Case', content: 'During a panel interview, one interviewer realized they were favoring a candidate with similar hobbies. They paused, reviewed the scoring rubric, and corrected their evaluation.' },
                    { type: 'quiz_mcq', question: 'What is the best immediate action if you notice bias creeping in?', options: ['Ignore it', 'Pause and check the rubric', 'Ask the candidate personal questions', 'Score based on gut feeling'], correctAnswer: 'Pause and check the rubric', feedback: { correct: 'Correct! Pause and review your rubric or notes to counter bias immediately.', incorrect: 'The answer is B. Conscious reflection mitigates bias impact.' } },
                    { type: 'journal', prompt: 'Think of a bias you notice in yourself. How will you pause and interrupt it in future interviews?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Bias interruption is about awareness and action — a conscious habit.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nDuring your next interview, note any moments you consciously applied a bias interruption technique.' }
                ]
            },
            {
                id: 'l3-5', title: 'Continuous Improvement and Accountability', type: 'practice', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Bias awareness isn’t one-off. Continuous improvement and accountability help maintain fair interviewing practices.' },
                    { type: 'script', title: '📊 Strategies', content: 'Peer Review: Regularly review each other’s interview notes.\n\nCalibration Meetings: Compare scores across interviewers and align standards.\n\nFeedback Loops: Incorporate feedback from candidates and hiring teams.\n\nSelf-Reflection Journals: Record and review your interviews to spot patterns.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A consulting firm implemented quarterly calibration sessions. Interviewers became more aligned, consistent scoring increased, and hiring outcomes improved.' },
                    { type: 'quiz_mcq', question: 'Which action supports continuous bias mitigation?', options: ['Occasional reminders only', 'Peer review and calibration', 'Relying on memory', 'Ignoring feedback'], correctAnswer: 'Peer review and calibration', feedback: { correct: 'Correct! Continuous checks and accountability prevent bias drift.', incorrect: 'The answer is B. Regular calibration and feedback are essential.' } },
                    { type: 'journal', prompt: 'What one accountability mechanism will you implement immediately to track your own bias reduction?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Bias mitigation is a journey. Structure, reflection, and peer accountability create lasting fairness.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nSet up a bi-weekly review with a peer to discuss scoring alignment and bias reflections.' }
                ]
            }
        ]
    },
    {
        id: 'm4',
        title: "Legal Compliance Essentials",
        description: "Understand the legal boundaries of interviewing.",
        duration: 35,
        isCompleted: false,
        lessons: [
            {
                id: 'l4-1', title: 'Introduction to Legal Compliance', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Legal compliance in interviews isn’t just about avoiding lawsuits — it ensures fairness, protects candidates, and upholds your organization’s reputation. Understanding the law helps you focus on evaluating talent objectively.' },
                    { type: 'script', title: '📊 Teaching Moment / Analogy', content: 'Think of legal compliance as the boundaries on a sports field. The rules don’t stop the game; they make it fair and structured.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'An organization faced legal scrutiny when an interviewer asked candidates about marital status. After training, all interviewers followed structured questions and compliance checklists, reducing risk and increasing fairness.' },
                    { type: 'quiz_mcq', question: 'Why is legal compliance critical in interviews?', options: ['To avoid fines and lawsuits', 'To ensure fair evaluation and protect candidates', 'To limit hiring flexibility', 'Both A & B'], correctAnswer: 'Both A & B', feedback: { correct: 'Correct! Legal compliance protects both the organization and the candidates, while promoting fairness.', incorrect: 'The answer is D. Compliance ensures fairness and reduces legal risk.' } },
                    { type: 'journal', prompt: 'Think about any interview you conducted or participated in. Were all questions compliant with legal standards?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Understanding compliance is the foundation. Every question you ask must focus on job-relevant criteria.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nList 3 topics you should never ask a candidate about during an interview. Think about alternatives you could use instead.' }
                ]
            },
            {
                id: 'l4-2', title: 'Protected Characteristics', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Federal and local laws protect candidates from discrimination based on certain characteristics. Awareness is the first step to ensuring compliance.' },
                    { type: 'script', title: '📊 Protected Characteristics', content: 'Race / Color\n\nReligion\n\nSex / Gender / Pregnancy / Sexual Orientation\n\nNational Origin\n\nAge (40+)\n\nDisability\n\nGenetic Information' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A manager asked a candidate about their childcare arrangements. This violated federal guidance. After training, managers learned to focus only on availability and job requirements.' },
                    { type: 'quiz_mcq', question: 'Which question is legally compliant?', options: ['Are you planning to have children soon?', 'Are you authorized to work in the country?', 'What is your spouse’s job?', 'How old are you?'], correctAnswer: 'Are you authorized to work in the country?', feedback: { correct: 'Correct! Focus only on job-relevant information.', incorrect: 'The answer is B. Questions about family, age, or spouse are prohibited.' } },
                    { type: 'journal', prompt: 'Identify 2 questions you’ve asked in the past that could risk discrimination. How can you reframe them to be compliant?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Protected characteristics must never influence hiring decisions. Always focus on job-related skills and qualifications.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nWrite compliant alternatives for 3 common non-compliant questions.' }
                ]
            },
            {
                id: 'l4-3', title: 'Prohibited Questions & Safe Alternatives', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Some questions may seem harmless but are legally risky. Learn safe alternatives to assess the same competencies.' },
                    { type: 'script', title: '📊 Categories & Examples', content: "Personal / Family\n\nProhibited: Marital status, childcare plans\nSafe Alternative: “Are you available to work the required schedule?”\n\nAge / Physical Characteristics\n\nProhibited: Age, height, weight\nSafe Alternative: “Can you perform the essential functions of this role with or without reasonable accommodation?”\n\nBackground / Origin\n\nProhibited: Nationality, accent, religion\nSafe Alternative: “Are you legally authorized to work in this country?”\n\nHealth / Disability\n\nProhibited: Questions about disabilities or health history\nSafe Alternative: Focus on ability to perform job functions, e.g., “This role requires lifting 20 lbs. Can you perform this task with or without reasonable accommodation?”" },
                    { type: 'quiz_mcq', question: 'Which is a safe interview question?', options: ['What religion do you practice?', 'Are you legally allowed to work here?', 'How tall are you?', 'Are you married?'], correctAnswer: 'Are you legally allowed to work here?', feedback: { correct: 'Correct! Always ask about legal work eligibility or job-related abilities.', incorrect: 'The answer is B. Avoid any questions about personal characteristics.' } },
                    { type: 'journal', prompt: 'Review your current interview guide. Are there any prohibited questions? Replace them with job-relevant alternatives.' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Always ask questions that measure ability and qualifications — not personal attributes.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate a mini cheat sheet of 5 prohibited questions and their compliant alternatives.' }
                ]
            },
            {
                id: 'l4-4', title: 'Documentation and Record-Keeping', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Documentation is your safeguard. Objective, consistent records protect the organization and provide defensible hiring decisions.' },
                    { type: 'script', title: '📊 Best Practices', content: 'Record every question asked\n\nTake detailed, job-relevant notes on candidate responses\n\nUse consistent scoring rubrics\n\nDocument final hiring decisions and rationale\n\nRetain records as required by law' },
                    { type: 'script', title: '📖 Mini-Case', content: 'After an audit, an organization’s well-documented interviews protected them from an EEOC complaint. Notes included structured question responses and objective scoring.' },
                    { type: 'quiz_mcq', question: 'What should interview notes focus on?', options: ['Candidate’s personal background', 'Job-relevant skills and behaviors', 'Gut feeling impressions', 'Off-topic comments'], correctAnswer: 'Job-relevant skills and behaviors', feedback: { correct: 'Correct! Notes must be objective and job-focused.', incorrect: 'The answer is B. Avoid documenting personal characteristics or opinions.' } },
                    { type: 'journal', prompt: 'Examine your note-taking habits. Are you consistently recording objective, job-relevant information?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Good documentation ensures fairness, legal compliance, and audit readiness.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nRevise your current interview template to include structured sections for questions, candidate responses, and scoring.' }
                ]
            },
            {
                id: 'l4-5', title: 'Practical Application and Scenarios', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Let’s apply compliance knowledge in real-world interview scenarios.' },
                    { type: 'script', title: '📖 Scenario 1', content: "Situation: A candidate mentions they are pregnant.\nQuestion: How should you respond?\n\n✅ Focus on role requirements, not personal circumstances.\n\nCompliant Response: “Can you perform the essential functions of this role?”" },
                    { type: 'script', title: '📖 Scenario 2', content: "Situation: A candidate has a foreign accent.\nQuestion: How should you assess them?\n\n✅ Focus on communication ability as required by the role.\n\nCompliant Response: “Please provide an example of a complex task you explained to a team member.”" },
                    { type: 'script', title: '📖 Scenario 3', content: "Situation: You notice a candidate went to the same school as you.\nQuestion: Should this affect scoring?\n\n❌ No. Focus only on skills and competencies, not shared background." },
                    { type: 'quiz_mcq', question: 'If a candidate shares personal information, what’s the best approach?', options: ['Ask follow-up personal questions', 'Focus on job-relevant abilities', 'Let it influence scoring', 'Ignore all responses'], correctAnswer: 'Focus on job-relevant abilities', feedback: { correct: 'Correct! Personal information should not affect your evaluation.', incorrect: 'The answer is B. Keep assessment objective and compliant.' } },
                    { type: 'journal', prompt: 'Write down 1 challenging scenario you’ve faced or could face. How will you ensure your response is compliant?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Practice makes compliance automatic. Use structured questions, focus on role requirements, and document consistently.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate 3 mock interview questions that are fully legally compliant and evaluate the same competencies as your previous non-compliant questions.' }
                ]
            }
        ]
    },
    {
        id: 'm5',
        title: "Mock Interviewing and Feedback Systems",
        description: "Practice conducting interviews and providing structured feedback.",
        duration: 30,
        isCompleted: false,
        lessons: [
            {
                id: 'l5-1', title: 'Introduction to Mock Interviews', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Mock interviews are practice opportunities where you can refine your skills, receive feedback, and simulate real interview conditions without risk. They’re the fastest way to learn structured interviewing and avoid common mistakes.' },
                    { type: 'script', title: '📊 Teaching Moment', content: 'Think of a mock interview as a rehearsal before the performance — like athletes running drills before the big game. Mistakes here become learning opportunities, not consequences.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'An organization implemented regular mock interviews for new interviewers. Within a month, they noticed a 30% improvement in structured questioning and evaluation consistency.' },
                    { type: 'quiz_mcq', question: 'What is the main purpose of a mock interview?', options: ['To make candidates nervous', 'To practice and improve interviewing skills', 'To replace real interviews', 'To test candidate knowledge'], correctAnswer: 'To practice and improve interviewing skills', feedback: { correct: 'Correct! Mock interviews are for skill development and feedback.', incorrect: 'The answer is B. They simulate real interviews for learning, not evaluation.' } },
                    { type: 'journal', prompt: 'Have you ever practiced interviewing before a real session? What was challenging?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Mock interviews allow mistakes in a safe environment. Use them to develop consistency, clarity, and confidence.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nIdentify 3 aspects of your interview style you want to improve during mock sessions.' }
                ]
            },
            {
                id: 'l5-2', title: 'Preparing a Mock Interview', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Preparation is key to a productive mock interview. Define roles, select scenarios, and set evaluation criteria before starting.' },
                    { type: 'script', title: '📊 Steps to Prepare', content: 'Assign Roles: Interviewer, candidate, observer(s)\n\nSelect Scenario: Choose realistic job scenarios relevant to the role\n\nDevelop Questions: Include both behavioral and technical questions\n\nSet Evaluation Criteria: Use structured rubrics aligned with STAR method and legal compliance' },
                    { type: 'script', title: '📖 Mini-Case', content: 'Before mock interviews, an interviewer prepared a role-specific scenario and scoring sheet. Feedback afterward was specific, actionable, and helped the interviewer correct mistakes immediately.' },
                    { type: 'quiz_mcq', question: 'What is the first step in preparing a mock interview?', options: ['Conduct the interview', 'Assign roles and select scenarios', 'Give feedback', 'Review candidate resumes'], correctAnswer: 'Assign roles and select scenarios', feedback: { correct: 'Correct! Role assignment and scenario selection set the stage for effective practice.', incorrect: 'The answer is B. Preparation ensures the session is focused and productive.' } },
                    { type: 'journal', prompt: 'Think about the last mock interview you conducted. Did you follow a structured preparation process?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Always invest time in preparation. A well-structured session ensures actionable feedback and learning.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate a short scenario and set of questions for your next mock interview.' }
                ]
            },
            {
                id: 'l5-3', title: 'Conducting the Mock Interview', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'During the session, follow structured guidelines and maintain a realistic interview environment. Focus on asking, listening, and documenting.' },
                    { type: 'script', title: '📊 Key Guidelines', content: 'Follow Structure: Opening, middle, closing phases\n\nBehavioral Focus: Ask STAR-based questions\n\nActive Listening: Paraphrase, probe, take notes\n\nTime Management: Keep interview within planned duration\n\nProfessionalism: Treat candidate as in real interview' },
                    { type: 'script', title: '📖 Mini-Case', content: 'During a mock session, an interviewer asked consistent questions and documented responses. Observers noted improvement in follow-up questioning and feedback clarity.' },
                    { type: 'quiz_mcq', question: 'Which practice is essential during a mock interview?', options: ['Skip preparation', 'Focus on personal opinions about candidate', 'Follow structured questions and evaluate objectively', 'Rush through questions'], correctAnswer: 'Follow structured questions and evaluate objectively', feedback: { correct: 'Correct! Stick to structured questioning and objective evaluation.', incorrect: 'The answer is C. Personal opinions or shortcuts reduce learning effectiveness.' } },
                    { type: 'journal', prompt: 'During mock interviews, do you find it easier to stick to structured questions or improvise? How does this impact feedback?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Treat mock interviews as real sessions to practice rigor, clarity, and objective evaluation.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nRun a 10-minute mock interview with a colleague using a prepared scenario. Focus on following the STAR method.' }
                ]
            },
            {
                id: 'l5-4', title: 'Providing Feedback', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Feedback is the learning engine of mock interviews. It must be specific, balanced, actionable, and timely.' },
                    { type: 'script', title: '📊 Feedback Characteristics', content: 'Specific: Focus on concrete behaviors\n\nActionable: Give clear guidance for improvement\n\nBalanced: Highlight strengths and areas for growth\n\nTimely: Deliver immediately after the session' },
                    { type: 'script', title: '📖 Mini-Case', content: 'After a mock interview, peer feedback highlighted excellent questioning but weak probing. The interviewer improved significantly in the next session.' },
                    { type: 'quiz_mcq', question: 'Which feedback is effective?', options: ['“You were fine.”', '“Your questions were clear, but you need to probe deeper for details.”', '“You could do better.”', '“Don’t be nervous next time.”'], correctAnswer: '“Your questions were clear, but you need to probe deeper for details.”', feedback: { correct: 'Correct! Feedback should be specific and actionable.', incorrect: 'The answer is B. General comments aren’t helpful for learning.' } },
                    { type: 'journal', prompt: 'Think about feedback you’ve received in the past. Was it actionable or vague? How could it have been improved?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Feedback transforms practice into real skill development. Always be specific, actionable, and constructive.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nObserve a peer mock interview and write 3 actionable feedback points.' }
                ]
            },
            {
                id: 'l5-5', title: 'Self-Assessment and Reflection', type: 'practice', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Reflection solidifies learning. After each mock interview, assess yourself, identify gaps, and plan next steps.' },
                    { type: 'script', title: '📊 Self-Assessment Steps', content: 'Review Notes: Compare your questions and evaluation to the rubric\n\nIdentify Strengths: Note what went well\n\nSpot Gaps: Identify missed opportunities or mistakes\n\nPlan Improvement: Set actionable goals for next session' },
                    { type: 'script', title: '📖 Mini-Case', content: 'An interviewer used a self-assessment checklist after every mock session. Over 4 weeks, their structured questioning improved and feedback became more precise.' },
                    { type: 'quiz_mcq', question: 'What is the main purpose of self-assessment after a mock interview?', options: ['To criticize yourself harshly', 'To reflect, learn, and plan improvement', 'To record candidate details', 'To reduce interview time'], correctAnswer: 'To reflect, learn, and plan improvement', feedback: { correct: 'Correct! Reflection and planning enhance skill development.', incorrect: 'The answer is B. Self-assessment is about improving performance, not blaming.' } },
                    { type: 'journal', prompt: 'After your next mock interview, write down 2 things you did well and 2 things to improve.' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Self-assessment turns each practice into measurable growth. Combine this with peer feedback for maximum impact.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate a personal improvement plan with 3 goals for your next 3 mock interviews.' }
                ]
            }
        ]
    },
    {
        id: 'm6',
        title: "Leadership Through Interviewing",
        description: "Frame interviewing as a core leadership competency.",
        duration: 30,
        isCompleted: false,
        lessons: [
            {
                id: 'l6-1', title: 'Interviewing as a Leadership Skill', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Effective interviewing is a critical leadership competency. The way you conduct interviews reflects your ability to evaluate talent, make decisions, and influence organizational outcomes.' },
                    { type: 'script', title: '📊 Teaching Moment', content: 'Leaders who master interviewing consistently select high-performing teams, identify gaps early, and model organizational values through behavior.' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A TL who mastered structured interviewing noticed her team’s hiring quality improved. She was able to make better decisions, mentor others, and reduce turnover by 15%.' },
                    { type: 'quiz_mcq', question: 'Why is interviewing considered a leadership skill?', options: ['It lets you ask tough questions', 'It reflects your ability to assess talent, make decisions, and influence outcomes', 'It is only about hiring', 'It allows you to test candidates’ knowledge'], correctAnswer: 'It reflects your ability to assess talent, make decisions, and influence outcomes', feedback: { correct: 'Correct! Interviewing is a reflection of leadership and decision-making capabilities.', incorrect: 'The answer is B. Leadership includes guiding hiring and team development through interviews.' } },
                    { type: 'journal', prompt: 'Think about a leader you admire. How do they approach hiring and interviews? What leadership qualities do they demonstrate?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Interviewing hones your communication skills, which are essential for leadership. Clear, concise, and inclusive communication creates trust and ensures accurate evaluation.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nWrite down 2 ways you can demonstrate leadership during interviews beyond asking questions.' }
                ]
            },
            {
                id: 'l6-2', title: 'Strategic Thinking in Interviewing', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Interviews are not isolated events—they are part of broader organizational strategy. Leaders align hiring decisions with long-term business goals.' },
                    { type: 'script', title: '📊 Key Points', content: 'Understand Organizational Needs: Know the skills, culture, and gaps\n\nAlign Candidate Capabilities: Hire talent that supports strategic objectives\n\nPlan for Growth: Consider how candidates can evolve into future roles\n\nIntegrate Feedback Loops: Use interview data to refine hiring strategies' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A hiring manager analyzed past interviews and realized candidates with certain competencies consistently excelled. By integrating this insight, the team improved project delivery speed.' },
                    { type: 'quiz_mcq', question: 'What is a strategic approach to interviewing?', options: ['Asking random questions', 'Aligning candidate capabilities with organizational objectives', 'Only focusing on cultural fit', 'Speeding up the hiring process'], correctAnswer: 'Aligning candidate capabilities with organizational objectives', feedback: { correct: 'Correct! Strategic interviewing ensures hires support organizational goals.', incorrect: 'The answer is B. Leadership requires connecting hiring to broader strategy.' } },
                    { type: 'journal', prompt: 'Reflect on your current team: Are you hiring for immediate needs only, or long-term growth?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Self-reflection solidifies learning. After each mock interview, assess yourself, identify gaps, and plan next steps.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate a simple mapping of a candidate’s skills to potential organizational goals for practice.' }
                ]
            },
            {
                id: 'l6-3', title: 'Emotional Intelligence in Interviewing', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Emotional intelligence (EQ) is crucial during interviews. Leaders with high EQ read candidates, manage dynamics, and create inclusive environments.' },
                    { type: 'script', title: '📊 Key Points', content: 'Self-Awareness: Monitor your own biases and emotions\n\nEmpathy: Understand candidates’ perspectives\n\nSocial Skills: Facilitate smooth interactions\n\nConflict Management: Navigate challenging candidate scenarios' },
                    { type: 'script', title: '📖 Mini-Case', content: 'During a tough interview, a TL noticed a candidate was nervous. By acknowledging it and adjusting their tone, the candidate performed better, giving more accurate insights.' },
                    { type: 'quiz_mcq', question: 'How does emotional intelligence enhance interviewing?', options: ['Helps you intimidate candidates', 'Supports understanding, empathy, and smooth interactions', 'Makes interviews faster', 'Allows you to skip structured questions'], correctAnswer: 'Supports understanding, empathy, and smooth interactions', feedback: { correct: 'Correct! EQ helps leaders interpret candidate responses and maintain professionalism.', incorrect: 'The answer is B. Emotional intelligence is about understanding, not control.' } },
                    { type: 'journal', prompt: 'Think about a time when you or someone else demonstrated empathy in a professional conversation. How did it affect the outcome?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Leadership is a journey. Interviews are both an assessment of others and a mirror for your own development. Reflection turns each session into growth.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nDuring your next interview, practice one EQ skill (e.g., active listening or empathy) and note its impact.' }
                ]
            },
            {
                id: 'l6-4', title: 'Communication Excellence', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Interviewing hones your communication skills, which are essential for leadership. Clear, concise, and inclusive communication creates trust and ensures accurate evaluation.' },
                    { type: 'script', title: '📊 Key Guidelines', content: 'Active Listening: Pay full attention and paraphrase responses\n\nClear Questioning: Avoid ambiguity; use role-relevant examples\n\nInclusive Language: Ensure candidates feel valued\n\nProfessional Representation: Model organization’s values through tone and behavior' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A TL noticed candidates misunderstood a question. By rephrasing clearly and inclusively, candidate responses became more informative, improving decision-making.' },
                    { type: 'quiz_mcq', question: 'Effective communication in interviewing includes:', options: ['Speaking as much as possible', 'Active listening, clear questions, and inclusive language', 'Using technical jargon', 'Rapid-fire questioning'], correctAnswer: 'Active listening, clear questions, and inclusive language', feedback: { correct: 'Correct! Communication is key to understanding candidates accurately.', incorrect: 'The answer is B. Leadership communication fosters clarity and fairness.' } },
                    { type: 'journal', prompt: 'During your last interview, how well did you listen and communicate? Where could you improve?' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Leadership is a journey. Interviews are both an assessment of others and a mirror for your own development. Reflection turns each session into growth.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nPractice rephrasing a technical question into simple, inclusive language for clarity.' }
                ]
            },
            {
                id: 'l6-5', title: 'Self-Reflection and Continuous Improvement', type: 'standard', isCompleted: false,
                steps: [
                    { type: 'script', title: '🎙️ Coach Intro', content: 'Leadership is a journey. Interviews are both an assessment of others and a mirror for your own development. Reflection turns each session into growth.' },
                    { type: 'script', title: '📊 Self-Reflection Steps', content: 'Assess Decisions: Were your judgments fair, consistent, and aligned with strategy?\n\nIdentify Strengths: Where did you communicate or lead effectively?\n\nSpot Improvement Areas: What skills need more practice (e.g., EQ, STAR questioning)?\n\nSet Goals: Create a plan to enhance leadership through interviewing' },
                    { type: 'script', title: '📖 Mini-Case', content: 'A TL reviewed notes after each interview and tracked recurring patterns in decision-making. Over time, their judgment improved, and they became a mentor for peers.' },
                    { type: 'quiz_mcq', question: 'Why is self-reflection critical for leadership in interviewing?', options: ['To feel guilty about mistakes', 'To learn, improve, and model leadership behavior', 'To skip feedback sessions', 'To evaluate candidates faster'], correctAnswer: 'To learn, improve, and model leadership behavior', feedback: { correct: 'Correct! Reflection transforms practice into growth.', incorrect: 'The answer is B. It’s about improving your leadership and interviewing skills.' } },
                    { type: 'journal', prompt: 'Write down 2 behaviors from today’s interview practice that reflect leadership, and 2 you want to improve.' },
                    { type: 'script', title: '📌 Coach Wrap-Up', content: 'Leadership is a journey. Interviews are both an assessment of others and a mirror for your own development. Reflection turns each session into growth.' },
                    { type: 'journal', prompt: '🚀 Stretch Activity\n\nCreate a personal development plan for interviewing skills to enhance leadership over the next month.' }
                ]
            }
        ]
    }
];



// ==========================================
// Service Functions
// ==========================================

/**
 * Nominates a user for the Interviewer Coaching program.
 */
export async function nominateUser(managerRole: Role, nomineeRole: Role, targetRole: string): Promise<Nomination> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    const now = new Date().toISOString();
    const initialModules = getInitialModules();

    const newNomination: Nomination = {
        id: uuidv4(),
        nominatedBy: managerRole,
        nominee: nomineeRole,
        targetInterviewRole: targetRole,
        status: 'Pre-assessment pending',
        modules: initialModules,
        modulesTotal: initialModules.length,
        modulesCompleted: 0,
        certified: false,
        lastUpdated: now,
        nominatedAt: now,
    };

    allNominations.unshift(newNomination);
    saveToStorage(INTERVIEWER_LAB_KEY, allNominations);
    
    // Create a notification for the nominated user
    const managerName = roleUserMapping[managerRole]?.name || managerRole;
    const notification: Feedback = {
        trackingId: `IL-NOM-${newNomination.id}`,
        subject: `You've been nominated for Interviewer Training!`,
        message: `Congratulations! ${managerName} has nominated you for the Laddrr Interviewer Lab, a program designed to help you become a more effective and confident interviewer.\n\nThis training will help you:\n- Conduct structured, fair, and legally compliant interviews.\n- Master behavioral interviewing techniques like the STAR method.\n- Identify and mitigate unconscious bias.\n\nTo get started, please navigate to the "Interviewer Lab" section from the main sidebar and complete your pre-assessment.`,
        submittedAt: now,
        criticality: 'Low',
        status: 'Pending Acknowledgement',
        assignedTo: [nomineeRole],
        viewed: false,
        auditTrail: [{
            event: 'Notification Created',
            timestamp: now,
            actor: 'System',
            details: `Automated notification for Interviewer Lab nomination.`
        }]
    };
    
    const allFeedback = getFeedbackFromStorage();
    allFeedback.unshift(notification);
    saveFeedbackToStorage(allFeedback);

    return newNomination;
}

/**
 * Gets all nominations initiated by a specific manager.
 */
export async function getNominationsForManager(managerRole: Role): Promise<Nomination[]> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    return allNominations
        .filter(n => n.nominatedBy === managerRole)
        .sort((a, b) => new Date(b.nominatedAt).getTime() - new Date(a.nominatedAt).getTime());
}

/**
 * Gets the nomination for the currently logged-in user, if one exists.
 */
export async function getNominationForUser(userRole: Role): Promise<Nomination | null> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    return allNominations.find(n => n.nominee === userRole) || null;
}

/**
 * Saves the result of a pre-assessment mock interview.
 */
export async function savePreAssessment(nominationId: string, analysis: InterviewerAnalysisOutput): Promise<void> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    const index = allNominations.findIndex(n => n.id === nominationId);

    if (index !== -1) {
        allNominations[index].scorePre = analysis.overallScore;
        allNominations[index].analysisPre = analysis;
        allNominations[index].status = 'In Progress';
        allNominations[index].lastUpdated = new Date().toISOString();
        saveToStorage(INTERVIEWER_LAB_KEY, allNominations);
    }
}

/**
 * Saves the result of a post-assessment and determines certification.
 */
export async function savePostAssessment(nominationId: string, analysis: InterviewerAnalysisOutput): Promise<void> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    const index = allNominations.findIndex(n => n.id === nominationId);

    if (index !== -1) {
        const nomination = allNominations[index];
        nomination.scorePost = analysis.overallScore;
        nomination.analysisPost = analysis;
        nomination.lastUpdated = new Date().toISOString();

        // Certification Logic: Must show at least 15% improvement
        const preScore = nomination.scorePre || 0;
        const postScore = nomination.scorePost;
        const improvement = preScore > 0 ? ((postScore - preScore) / preScore) * 100 : 100;

        if (postScore >= 75 && improvement >= 15) {
            nomination.status = 'Certified';
            nomination.certified = true;
        } else {
            nomination.status = 'Retry Needed';
        }

        saveToStorage(INTERVIEWER_LAB_KEY, allNominations);
    }
}


/**
 * Marks a training module as complete for a given nomination.
 */
export async function completeModule(nominationId: string, moduleId: string): Promise<Nomination> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    const index = allNominations.findIndex(n => n.id === nominationId);

    if (index === -1) {
        throw new Error("Nomination not found.");
    }

    const nomination = allNominations[index];
    const moduleIndex = nomination.modules.findIndex(m => m.id === moduleId);

    if (moduleIndex !== -1 && !nomination.modules[moduleIndex].isCompleted) {
        nomination.modules[moduleIndex].isCompleted = true;
        nomination.modulesCompleted = nomination.modules.filter(m => m.isCompleted).length;
        nomination.lastUpdated = new Date().toISOString();

        if (nomination.modulesCompleted === nomination.modulesTotal) {
            nomination.status = 'Post-assessment pending';
        }
        
        saveToStorage(INTERVIEWER_LAB_KEY, allNominations);
    }

    return nomination;
}

/**
 * Saves the result of a single lesson.
 */
export async function saveLessonResult(nominationId: string, moduleId: string, lessonId: string, result: any): Promise<void> {
    const allNominations = getFromStorage<Nomination>(INTERVIEWER_LAB_KEY);
    const nominationIndex = allNominations.findIndex(n => n.id === nominationId);
    if (nominationIndex === -1) return;

    const moduleIndex = allNominations[nominationIndex].modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return;

    const lessonIndex = allNominations[nominationIndex].modules[moduleIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) return;

    allNominations[nominationIndex].modules[moduleIndex].lessons[lessonIndex].isCompleted = true;
    allNominations[nominationIndex].modules[moduleIndex].lessons[lessonIndex].result = result;
    
    saveToStorage(INTERVIEWER_LAB_KEY, allNominations);
}
