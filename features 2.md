# AccountabilityOS: Detailed Feature Manifest

This document provides a comprehensive, technical breakdown of all features implemented in the AccountabilityOS (Laddrr) prototype. It is intended to serve as a detailed reference for enterprise-level redevelopment.

---

## 1. Core Architecture: Role-Based Experience

The entire application is architected around a role-based access control (RBAC) system. The user's experience, including the dashboard they see, the data they can access, and the actions they can perform, is dictated by their selected role.

- **Roles Implemented**: Employee, Team Lead, AM (Area Manager), Manager, HR Head.
- **Switching Mechanism**: A dropdown menu in the main sidebar allows users to switch between their available roles at any time. A central `useRole` hook manages the current role state, persisting it in `localStorage`.
- **Dynamic UI**:
    - **Dashboard**: The root page dynamically renders a role-specific dashboard component (e.g., `ManagerDashboard`, `EmployeeDashboard`).
    - **Sidebar Navigation**: The main sidebar conditionally renders menu items based on the user's role. For example, the "Coaching" and "Manager's Lab" sections are only visible to supervisor-level roles.

---

## 2. Feature: The "1-on-1" Hub

This is the application's core feature, designed for documenting, analyzing, and acting on manager-employee meetings. It is composed of a meeting list, a feedback submission form, and a historical view with integrated AI analysis and workflows.

### 2.1. Meeting Scheduling & Pre-Meeting Briefing

- **Upcoming Meetings**: The main `1-on-1` page displays a list of mock upcoming meetings. For each meeting, there are options to start the session, reschedule, or cancel.
- **AI-Powered Briefing Packet**:
    - **Trigger**: Accessible via a "Briefing Packet" icon next to each upcoming meeting.
    - **AI Flow**: `generate-briefing-packet-flow.ts`.
    - **Functionality**:
        1.  Fetches the complete 1-on-1 history for the specific supervisor-employee pair.
        2.  Fetches the supervisor's active personal development goals.
        3.  Aggregates data into a structured format, including summaries of the last 3 sessions, a full history of action items (both pending and completed), and any open "Critical Insights."
        4.  The AI flow analyzes this context and generates a tailored JSON output.
        5.  **Role-Specific Content**:
            -   **For Supervisors**: The packet includes key discussion points, a summary of outstanding critical items, suggested questions to ask, and specific opportunities to practice their active coaching goals.
            -   **For Employees**: The packet is motivational, providing suggested talking points for them to bring up and a brief, encouraging summary of their progress.

### 2.2. Feedback Capture & AI Analysis Submission

- **Interface**: A dedicated, multi-section form at `/1-on-1/feedback`.
- **Data Capture Fields**:
    - **Context**: Meeting location.
    - **Media (Optional but Powerful)**:
        -   Direct in-browser audio recording (`MediaRecorder` API).
        -   Upload of an audio file or a `.txt` transcript.
        -   The system handles the conversion of media to a `data:uri` string for the AI.
    -   **Structured Inputs**: Sliders, radio groups, and text areas capture feedback tone, how it was received, employee growth trajectory, signs of stress, expressed aspirations, and appreciation given.
    -   **Performance Data**: The form integrates the employee's mock performance scores (Overall, Project Delivery, etc.) to provide the AI with quantitative context for its analysis.
- **AI Analysis Trigger**:
    - **AI Flow**: `analyze-one-on-one-flow.ts`.
    - **Process**:
        1.  On submission, a placeholder history item is created in `sessionStorage` to ensure data persistence.
        2.  The form data, along with the supervisor's active coaching plans and past declined recommendations, is sent to the AI flow.
        3.  The AI returns a comprehensive JSON object with a full analysis.
        4.  The system updates the placeholder history item with the complete AI analysis.

### 2.3. AI Analysis Report & Post-Submission Display

The result from the `analyze-one-on-one-flow.ts` is immediately displayed on the page. The report contains:
- **Dual Summaries**: A detailed summary for the supervisor and a separate, concise summary for the employee.
- **Quantitative Scores**: A `leadershipScore` for the supervisor and an `effectivenessScore` for the session, both on a 1-10 scale.
- **SWOT Analysis**: A Strengths, Weaknesses, Opportunities, and Threats analysis for the employee based on the conversation and their performance data.
- **Actionable Lists**:
    - **Strengths Observed**: Specific positive actions by the supervisor with examples.
    - **Coaching Recommendations**: Structured suggestions for the supervisor's growth, including a recommended resource (book, podcast, etc.).
    - **Action Items**: A checklist of tasks for both supervisor and employee, with ownership assigned by the AI.
- **Advanced AI Insights**:
    - **Coaching Impact Analysis**: The AI analyzes if the supervisor applied their active development goals during the session, providing positive reinforcement ("Learning Applied") or constructive feedback ("Missed Opportunity").
    - **Missed Signals**: Subtle cues (e.g., potential burnout, unspoken ambition) that the supervisor did not explore.
    - **Critical Coaching Insight**: A special object generated *only* if an unaddressed red flag is detected. This insight contains a summary, a reason for its criticality, and a severity level. Its presence automatically triggers the escalation workflow.

---

## 3. Feature: Critical Insight Escalation Workflow

This is a fully automated, multi-level workflow to ensure serious issues are not ignored. It is managed via `sessionStorage` and component logic in `src/app/1-on-1/page.tsx`.

- **Trigger**: The creation of a `criticalCoachingInsight` object by the AI.
- **L1 - Supervisor Action**: A "Critical Insight" case is created with a `Pending Supervisor Action` status. The supervisor is prompted to respond to how they addressed the issue.
- **L2 - Employee Acknowledgement**: After the supervisor responds, the status changes to `Pending Employee Acknowledgement`. The employee reviews the response and must choose:
    - **Satisfied**: The case is `Resolved`.
    - **Not Satisfied**: The case is automatically escalated.
- **L3 - AM Review**: Status becomes `Pending AM Review`. The supervisor's Area Manager (AM) can either:
    - **Coach the Supervisor**: Status changes to `Pending Supervisor Retry`, sending it back to the supervisor with private coaching notes.
    - **Address Employee Directly**: The AM responds, and it goes back to the employee for acknowledgement.
- **L4+ - The Escalation Ladder**: If the employee remains dissatisfied, the case continues up the chain to `Manager Review` and then `HR Review`, following the same pattern of review and response.
- **L5 - Final HR Disposition**: If an HR Head's resolution is rejected, the status becomes `Pending Final HR Action`. The HR Head must make a final binding decision (e.g., assign to an ombudsman, close the case) to end the workflow.

---

## 4. Feature: The "Nets" – Practice Arena

A safe, AI-driven environment for users to practice difficult conversations.

- **Setup**: The user defines a scenario to practice, chooses an AI persona to practice with (e.g., Team Lead, Manager), and sets the AI's difficulty/demeanor (e.g., Friendly, Strict).
- **AI Simulation (`nets-flow.ts`)**: The user engages in a back-and-forth chat with the AI, which stays in character based on the persona and difficulty settings.
- **Mid-Simulation "Nudge" (`generate-nets-nudge-flow.ts`)**: At any point, the user can request a hint. The AI provides a short, actionable piece of coaching advice for their next turn.
- **Post-Simulation Analysis (`analyze-nets-conversation-flow.ts`)**:
    - When the session ends, the entire transcript is sent for analysis.
    - The user receives a detailed **Scorecard** with:
        - **Scores**: Clarity, Empathy, Assertiveness, and Overall (1-10).
        - **Strengths & Gaps**: Bulleted lists of what went well and what could be improved.
        - **Annotated Conversation**: A turn-by-turn replay of the chat with specific, contextual feedback bubbles on key user messages, tagged as "positive" or "negative."
- **AI-Suggested Scenarios (`generate-nets-suggestion-flow.ts`)**: On the setup screen, users can get a personalized practice scenario suggested by an AI that has analyzed their recent 1-on-1 history for recurring challenges or missed signals.
- **Assigned Practice Scenarios**: Managers can assign specific practice scenarios with due dates to their team members. These appear as actionable cards in the user's Nets arena.

---

## 5. Feature: Coaching & Development Hub

This feature, located on the `/coaching` page, centralizes a user's professional growth journey.

- **Actionable Recommendations**: The page displays a list of all "pending" AI-generated coaching recommendations from a user's 1-on-1s. The user must either:
    - **Accept**: This action prompts them to set a start and end date, converting the recommendation into an active goal in their "Development Plan."
    - **Decline**: This requires a written justification.
- **Decline Escalation Workflow**:
    - A declined recommendation is escalated to the user's manager (e.g., an AM) with a `Pending AM Review` status.
    - The manager reviews the AI's advice and the user's justification and can either **Approve the Decline** or **Uphold the AI**, forcing the recommendation into the user's active plan.
- **Active Development Plan**:
    - This widget displays all accepted coaching goals.
    - Users track progress with a slider (0-100%).
    - Updating the slider prompts a "check-in," where the user logs notes about their learning. This creates a historical journal for each goal, accessible via a "History" button.
- **AI-Powered Goal Feedback**: For custom goals added by the user, they can request on-demand AI coaching by describing a situation where they tried to apply their goal. The `get-goal-feedback-flow.ts` provides tailored advice, which is then logged as a check-in.
- **AI-Suggested Goals**: Similar to the Nets feature, users can get AI-suggested development goals based on an analysis of their performance history.

---

## 6. Feature: Goals & KPI Framework Management

This feature, accessible only to the 'Manager' role at `/goals`, allows for the setup and management of performance evaluation frameworks for different teams.

### 6.1. Multi-Step Setup Wizard
If a framework has not been set up, the Manager is guided through a five-step wizard:
1.  **Framework Selection**: Choose a core evaluation methodology (`Bell Curve`, `9-Box Grid`, `OKR-based System`, or `Custom Framework`). The user also defines the review frequency (e.g., Monthly, Quarterly) and the level at which performance is tracked (e.g., Site, Department, Team).
2.  **Review Group Definition**: Define the specific employee group for this framework. This includes selecting the role (e.g., `Employee`, `Team Lead`), specifying the headcount, and defining the number of Key Performance Indicator (KPI) categories. A dynamic table allows the Manager to add multiple KPIs, each with a name, a percentage weightage, and defined thresholds for "Poor," "Average," "Good," and "Excellent" performance.
3.  **Data Collection & Delegation**: Specify how performance data will be input into the system (`Manual entry` or `Excel upload`) and the frequency of uploads (e.g., Monthly, Quarterly). A Manager can also delegate the data upload responsibility to another team member.
4.  **Role Change Management**: Configure automated actions for when an employee within this review group changes roles. Options include `Realign KPIs` to the new role and `Reset Scores`.
5.  **Setup Assistance**: The final step offers two choices:
    *   **Guided Wizard**: Laddrr AI will pre-populate KPIs, weights, and thresholds based on the selected role and its historical data. These can be edited later.
    *   **Manual Setup**: The Manager configures all parameters from scratch.

### 6.2. Goals Dashboard
Once the setup is complete, the `/goals` page displays a dashboard with two main functions:
- **Framework Overview**: A table displays the currently active KPIs, their weightages, and the evaluation methodology for each defined role.
- **Performance Data Upload**: A dedicated card allows the Manager to upload performance data for a specific role (`Employee` or `Team Lead`). The user can download a sample CSV/Excel template and then upload their file. The upload button is disabled until a file is selected.

---

## 7. Feature: Manager's Lab & Specialized Programs

This is a dedicated area for managers to manage structured training programs for their team.

### 7.1. Interviewer Lab

- **Nomination**: Managers can nominate team members to become certified interviewers, specifying the target role they will be trained to interview for (e.g., "Frontline Employee," "Manager").
- **Learner Experience**:
    - **Pre-Assessment**: The nominee must first complete a baseline mock interview simulation to establish their initial skill level.
    - **Training Modules**: They proceed through a series of modules (e.g., "Interview Foundations," "Behavioral Interviewing Mastery," "Legal Compliance").
    - **Lesson Structure**: Each module contains multiple lessons, which can be standard content (text, quizzes) or practice simulations.
    - **Post-Assessment**: After completing all modules, the nominee takes a final mock interview assessment.
    - **Certification**: The user is "Certified" if their post-assessment score is above a certain threshold and shows sufficient improvement over their pre-assessment score. If not, their status becomes "Retry Needed."
- **Manager View**: Managers can track the progress of all their nominees, viewing their pre- and post-assessment scores and module completion status.

### 7.2. Leadership Development Program

- **Nomination**: Managers can nominate high-potential employees for leadership grooming, assigning a mentor in the process.
- **Learner Experience**:
    - The nominee gets access to a curriculum of modules focused on leadership skills like "Authenticity" and "Composure."
    - Lessons include scripts, quizzes, journaling activities, and practice simulations.
    - A key feature is the "Synthesis" lesson, an 8-week guided plan where users practice specific skills each week and log their reflections.

---

## 8. Feature: Employee-Facing Tools

### 8.1. Compare Performance

- **Interface**: A side-sheet accessible from the employee dashboard.
- **Functionality**:
    - The user can select one or more peers from a searchable dropdown.
    - The tool displays a side-by-side comparison of key performance metrics (e.g., Goal Completion, Project Delivery) using progress bars.
    - An AI-generated summary provides a motivational, constructive interpretation of the data.
- **AI Performance Coach**:
    - **Trigger**: Embedded within the "Compare Performance" sheet.
    - **AI Flow**: `performance-chat-flow.ts`.
    - **Functionality**: Allows the user to have a conversation with an AI coach. The user can ask questions about their performance data (e.g., "How can I improve my project delivery score?"), and the AI provides supportive, actionable advice based on the comparison data and chat history.

### 8.2. AI Insight Feed

- A carousel on the employee dashboard that displays a rotating feed of short, encouraging, or reflective insights generated by the AI from their past 1-on-1s.
- **AI Flow**: `analyze-one-on-one-flow.ts` (The `employeeInsights` field).

---

## 9. Feature: Org Health & Anonymous Surveys (HR Head Only)

This feature provides the HR Head with a powerful, multi-phase tool to gauge organizational health, diagnose issues, and assign targeted coaching. The entire workflow is managed from the `/org-health` page.

### 9.1. Phase 1: Anonymous Survey Creation & Deployment
- **Objective-Driven Creation**: The HR Head starts by defining a clear objective for the survey (e.g., "Assess team morale after the recent re-organization").
- **AI-Powered Question Generation**:
    - **AI Flow**: `generate-survey-questions-flow.ts`.
    - **Process**: The objective is sent to an AI, which returns a list of 5-7 relevant, neutrally-worded survey questions, each with a justification for why it's being asked.
- **Curation and Customization**: The HR Head can review the AI's suggestions, deselect any they don't want, and add their own custom questions to the list.
- **Deployment**: Once finalized, the survey is "deployed." This creates a `DeployedSurvey` object in `sessionStorage` (managed by `survey-service.ts`) with an `active` status.

### 9.2. Phase 2: Anonymous Feedback Analysis & Leadership Pulse
- **Employee Response**: Any user can navigate to the `/survey` page to see and respond to the single active survey. Responses are anonymous (in the mock app, this just increments a counter).
- **AI-Powered Summary**:
    - **Trigger**: Once the HR Head closes the survey, an "Analyze Anonymous Responses" button appears.
    - **AI Flow**: `summarize-survey-results-flow.ts`.
    - **Process**: The flow receives all the (mock) anonymous text responses and generates a high-level `SummarizeSurveyResultsOutput` object, which includes the overall sentiment, key themes, and initial recommendations. This summary is then saved back to the `DeployedSurvey` object in storage.
- **Leadership Pulse Generation**:
    - **Trigger**: With the AI summary in hand, a "Generate Leadership Pulse" button becomes active.
    - **AI Flow**: `generate-leadership-pulse-flow.ts`.
    - **Process**: This flow is given the AI summary and is tasked with creating distinct sets of follow-up questions for Team Leads, AMs, and Managers to diagnose the root causes of the employee feedback.
- **Leadership Pulse Curation and Deployment**:
    - The HR Head can review the AI-generated questions for each leadership role in a tabbed interface. They can edit them, add new custom questions, or use a special AI-powered tool to generate a targeted question from a specific insight (e.g., input "low work-life balance score" to get a relevant question).
    - **Trigger**: Clicking "Send to Leaders".
    - **Process**: The `sendLeadershipPulse` function in `survey-service.ts` creates new items in the main `feedback-service` storage. Each item is a `Feedback` object with a `Pending Manager Action` status, assigned to the corresponding leadership role (e.g., one for all 'Team Lead's, one for 'AM's), containing their unique set of questions.

### 9.3. Phase 3: Leadership Response Analysis & Coaching Assignment
- **Leader Response**: Leaders see the pulse survey as a new item on their `/messages` page. They fill out their responses (free-text in the prototype).
- **Final AI Analysis**:
    - **Trigger**: Once responses are collected (simulated), an "Analyze Leadership Responses" button appears for the HR Head on the `/org-health` page.
    - **AI Flow**: `summarize-leadership-pulse-flow.ts`.
    - **Process**: This final flow analyzes the original employee feedback summary *and* the leaders' responses to connect the dots. It returns a list of specific, actionable coaching recommendations, each with a target audience (e.g., "All Team Leads" or a specific individual like "Ben Carter").
- **Coaching Assignment**:
    - **Trigger**: The HR Head clicks an "Assign Task" button next to a recommendation.
    - **Process**: This calls the `assignCoachingFromOrgHealth` function in the `org-coaching-service.ts`. It creates a new `OrgCoachingItem` and saves it to storage.
- **Closing the Loop**: The `getActiveCoachingPlansForUser` function in `feedback-service.ts` (which powers the "Active Development Plan" widget) is configured to also fetch and display these newly assigned `OrgCoachingItem`s. This means an assigned task from the HR Head immediately appears in the target leader's personal development plan.

---

## 10. Global UI Components & UX

- **Theming**: Supports both light and dark modes, managed by `next-themes`.
- **Styling**: Uses `Tailwind CSS` and `ShadCN/UI` components for a consistent design system.
- **Feedback**: Employs a global `Toaster` component for non-blocking notifications.
- **Icons**: Primarily uses `lucide-react` for icons, with custom SVG icons for branding elements like the lab programs.
- **Data Persistence**: Uses `sessionStorage` as a lightweight, client-side database for all application data, making the prototype fully self-contained in the browser. A custom event system (`feedbackUpdated`) ensures components re-render when data changes in storage.
