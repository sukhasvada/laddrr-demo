

'use client';

import { v4 as uuidv4 } from 'uuid';
import type { DeployedSurvey, SummarizeSurveyResultsOutput, SurveyQuestion } from '@/ai/schemas/survey-schemas';
import type { Feedback } from '@/services/feedback-service';
import { getFeedbackFromStorage, saveFeedbackToStorage } from './feedback-service';
import type { Role } from '@/hooks/use-role';

export const SURVEY_KEY = 'org_health_surveys_v1';

const getFromStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    const json = sessionStorage.getItem(key);
    return json ? JSON.parse(json) : [];
};

const saveToStorage = (key: string, data: any[]): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('feedbackUpdated'));
    window.dispatchEvent(new Event('storage'));
};

/**
 * Deploys a new survey.
 */
export async function deploySurvey(surveyData: { objective: string; questions: SurveyQuestion[] }): Promise<DeployedSurvey> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);

    const newSurvey: DeployedSurvey = {
        id: uuidv4(),
        objective: surveyData.objective,
        questions: surveyData.questions,
        deployedAt: new Date().toISOString(),
        status: 'active',
        submissionCount: 0,
        optOutCount: 0,
    };

    allSurveys.unshift(newSurvey);
    saveToStorage(SURVEY_KEY, allSurveys);
    return newSurvey;
}

/**
 * Sends a leadership pulse survey by creating a "Feedback" item assigned to leadership roles.
 */
export async function sendLeadershipPulse(surveyData: { objective: string, questions: Record<Role, SurveyQuestion[]> }): Promise<void> {
    const allFeedback = getFeedbackFromStorage();
    
    for (const role in surveyData.questions) {
        if (role === 'Employee' || role === 'Anonymous') continue;

        const questionsForRole = surveyData.questions[role as Role];
        if (questionsForRole && questionsForRole.length > 0) {
            const newPulseSurvey: Feedback = {
                trackingId: `LP-${uuidv4().substring(0,8)}`,
                subject: 'Leadership Pulse: Your Input is Requested',
                message: `Please respond to the following questions to help us understand the root causes of recent organizational feedback.\n\n**Objective:** ${surveyData.objective}`,
                submittedAt: new Date(),
                criticality: 'Medium',
                status: 'Pending Manager Action', 
                assignedTo: [role as Role],
                viewed: false,
                // @ts-ignore
                surveyQuestions: questionsForRole,
            };
            allFeedback.unshift(newPulseSurvey as Feedback);
        }
    }
    
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    const activeSurvey = allSurveys.find(s => s.status === 'closed' && !s.leadershipPulseSent); // find the survey that was just analyzed
    if(activeSurvey) {
        activeSurvey.leadershipPulseSent = true;
        saveToStorage(SURVEY_KEY, allSurveys);
    }


    saveFeedbackToStorage(allFeedback);
}


/**
 * Gets all surveys, both active and closed.
 */
export async function getAllSurveys(): Promise<DeployedSurvey[]> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    return allSurveys
        .sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime());
}

/**
 * Gets the most recent active survey.
 */
export async function getLatestActiveSurvey(): Promise<DeployedSurvey | null> {
    const allSurveys = await getAllSurveys();
    return allSurveys.find(s => s.status === 'active') || null;
}

/**
 * Anonymously submits a survey response by incrementing the submission count.
 */
export async function submitSurveyResponse(surveyId: string): Promise<void> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    const surveyIndex = allSurveys.findIndex(s => s.id === surveyId);
    if (surveyIndex !== -1) {
        allSurveys[surveyIndex].submissionCount++;
        saveToStorage(SURVEY_KEY, allSurveys);
    }
}

/**
 * Logs that a user has opted out of a survey.
 */
export async function logSurveyOptOut(surveyId: string): Promise<void> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    const surveyIndex = allSurveys.findIndex(s => s.id === surveyId);
    if (surveyIndex !== -1) {
        if (!allSurveys[surveyIndex].optOutCount) {
            allSurveys[surveyIndex].optOutCount = 0;
        }
        allSurveys[surveyIndex].optOutCount++;
        saveToStorage(SURVEY_KEY, allSurveys);
    }
}


/**
 * Closes an active survey.
 */
export async function closeSurvey(surveyId: string): Promise<void> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    const surveyIndex = allSurveys.findIndex(s => s.id === surveyId);
    if (surveyIndex !== -1 && allSurveys[surveyIndex].status === 'active') {
        allSurveys[surveyIndex].status = 'closed';
        saveToStorage(SURVEY_KEY, allSurveys);
    }
}

/**
 * Saves the AI-generated summary to the survey object.
 */
export async function saveSurveySummary(surveyId: string, summary: SummarizeSurveyResultsOutput): Promise<void> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    const surveyIndex = allSurveys.findIndex(s => s.id === surveyId);
    if (surveyIndex !== -1) {
        allSurveys[surveyIndex].summary = summary;
        saveToStorage(SURVEY_KEY, allSurveys);
    }
}

export async function markLeadershipPulseAsAnalyzed(surveyId: string, recommendations: any, summary: any): Promise<void> {
    const allSurveys = getFromStorage<DeployedSurvey>(SURVEY_KEY);
    const surveyIndex = allSurveys.findIndex(s => s.id === surveyId);
    if(surveyIndex !== -1) {
        allSurveys[surveyIndex].coachingRecommendations = recommendations;
        allSurveys[surveyIndex].summary = summary;
        saveToStorage(SURVEY_KEY, allSurveys);
    }
}
