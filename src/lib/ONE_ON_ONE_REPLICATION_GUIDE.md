# How the "1-on-1 & AI Coaching" Feature Works: A Logical Guide

This guide explains the step-by-step process and logic of the AI-powered 1-on-1 feedback and coaching system. It focuses on *what* happens and *why*, without reference to specific code or technologies, so the principles can be recreated in any system.

---

## Part 1: The Supervisor's Experience (Data Input & AI Analysis)

### Step 1: Initiating a 1-on-1 Feedback Session
A supervisor (e.g., Team Lead, AM, Manager) navigates to the "1-on-1" section of the application. They have a list of upcoming meetings. To document a session, they select a meeting, which opens a detailed feedback form.

### Step 2: Capturing the Conversation
The feedback form is the primary data source for the AI. The supervisor provides the following information:
1.  **Session Context:** The location of the meeting (e.g., Conference Room, Remote).
2.  **Media & Transcript (Optional but recommended):**
    *   **Live Recording:** The supervisor can record the conversation audio directly in the browser.
    *   **File Upload:** They can upload a pre-existing audio file or a plain-text transcript.
    *   **Notes Only:** If no media is provided, the supervisor's written notes are used as the primary input.
3.  **Key Acknowledgements (Required):**
    *   Confirmation that the conversation occurred live.
    *   Confirmation that the employee was made aware of any action items discussed.
4.  **Feedback Details (Structured Input):**
    *   **Primary Feedback:** The core message or talking points delivered.
    *   **Feedback Tone:** The nature of the feedback (e.g., Constructive, Positive, Corrective).
    *   **Reception:** How the employee received the feedback (e.g., Fully, Partially, Not Well).
    *   **Growth Trajectory:** A 1-5 rating of the employee's performance trend.
5.  **Sentiment & Signals (Observational Input):**
    *   Did the employee show signs of stress or disengagement?
    *   Did the employee express any career aspirations?
6.  **Appreciation & Other Comments:**
    *   Was specific appreciation given?
    *   Any other noteworthy comments or observations.

### Step 3: Triggering AI Analysis
When the supervisor submits the form, the system packages all the provided data (including any audio as a data URI) and sends it to a dedicated AI analysis flow. The system also fetches and includes two crucial pieces of context for the AI:
*   **Past Declined Coaching Areas:** A list of coaching topics the supervisor has previously rejected for themselves.
*   **Active Development Goals:** A list of coaching plans the supervisor is currently working on.

### Step 4: Receiving and Displaying the AI Report
The AI flow processes the inputs and returns a structured JSON report. The system then displays this report on the same page, directly below the form the supervisor just filled out. This report includes:
*   **Summaries:** One tailored for the supervisor, one for the employee.
*   **Scores:** A "Leadership Score" and a session "Effectiveness Score" (1-10).
*   **SWOT Analysis:** For the employee, based on the conversation.
*   **Strengths Observed:** Positive actions taken by the supervisor.
*   **Coaching Recommendations:** Concrete, actionable suggestions for the supervisor's growth.
*   **Action Items:** A list of tasks for both the supervisor and employee.
*   **Coaching Impact Analysis:** An evaluation of how the supervisor applied their active goals.
*   **Missed Signals:** Subtle cues the supervisor may have overlooked.
*   **Critical Coaching Insight:** A special, high-priority flag if a major issue was detected (this triggers a separate workflow, see Part 2).
*   **Data Handling Metadata:** Confirmation of when the analysis ran and that the source recording was deleted.

---

## Part 2: The Critical Insight Workflow (Automated Escalation)

This automated workflow is triggered only if the AI analysis generates a `criticalCoachingInsight`. This happens if the AI detects a "red flag" like recurring complaints, high emotional distress, or potential HR issues that the supervisor did not address.

### Step 1: Case Creation and Assignment
The system automatically creates a new, distinct "Critical Insight" case linked to the 1-on-1 session.
*   **Status:** Set to `Pending Supervisor Action`.
*   **Assignment:** The case is assigned to the supervisor who conducted the 1-on-1. A 48-hour SLA timer begins.

### Step 2: Supervisor Response (Level 1)
The supervisor is notified and must respond to the insight by documenting how they addressed the issue with the employee.
*   Upon submission, the **Status** changes to `Pending Employee Acknowledgement`.

### Step 3: Employee Acknowledgement (Level 2)
The employee receives a notification. They must review the supervisor's response and choose one of three options:
1.  **"Fully Addressed":** The case **Status** is set to `Resolved`. The workflow ends.
2.  **"Partially Addressed" / "Not Adequately Addressed":** The case is automatically escalated.

### Step 4: AM Review (Level 3)
If escalated, the **Status** changes to `Pending AM Review`, and the case is assigned to the supervisor's Area Manager (AM). The AM has two choices:
1.  **Coach Supervisor:** The AM provides private coaching notes. The **Status** changes to `Pending Supervisor Retry`, and the case goes back to the supervisor to re-engage with the employee.
2.  **Address Employee Directly:** The AM speaks with the employee and logs their own response. The **Status** returns to `Pending Employee Acknowledgement`.

### Step 5: The Escalation Ladder
If the employee remains dissatisfied after the AM's intervention or the supervisor's retry, the case continues up the management chain with the same pattern:
*   **Manager Review (Level 4):** Status becomes `Pending Manager Review`.
*   **HR Review (Level 5):** Status becomes `Pending HR Review`.
Each level reviews the full history and provides their own resolution, which is then sent back to the employee for a final acknowledgement.

### Step 6: Final HR Disposition (Level 6)
If the employee rejects the HR Head's resolution, the **Status** becomes `Pending Final HR Action`. The HR Head must make a final, binding decision to formally close the case, such as:
*   Assigning it to an external Ombudsman.
*   Routing it to a formal Grievance Office.
*   Logging the employee's dissatisfaction and closing the case file.
This action ends the automated workflow.

---

## Part 3: The Coaching & Development Loop

This feature focuses on the supervisor's personal growth, using the AI's `coachingRecommendations` and `coachingImpactAnalysis`.

### Step 1: Reviewing AI Recommendations
In a dedicated "Coaching" area, the supervisor sees a list of all "pending" AI-generated recommendations from their 1-on-1s. For each recommendation, they have two choices:
1.  **Accept:** This opens a dialog where they must set a start and tentative end date, creating a personalized development plan item.
2.  **Decline:** This requires them to provide a written justification for why they are rejecting the advice.

### Step 2: The "Decline" Workflow
When a recommendation is declined, its **Status** changes to `Pending AM Review`.
*   The supervisor's AM is notified.
*   The AM reviews the original AI recommendation and the supervisor's reason for declining.
*   The AM makes a decision:
    *   **Approve Decline:** The AM agrees with the supervisor. The recommendation's **Status** changes to `Pending Manager Acknowledgement` so the Manager is aware, after which it becomes `Declined`.
    *   **Uphold AI:** The AM disagrees and mandates the coaching. The recommendation's **Status** is forced to `Accepted`, and it becomes an active development plan item for the supervisor.

### Step 3: Managing the Active Development Plan
Once a recommendation is "Accepted," it appears in the supervisor's "Active Development Plan" widget.
*   **Progress Tracking:** The supervisor can update a progress slider (0-100%) for each item.
*   **Check-ins:** Updating the progress slider prompts the supervisor to write a brief "check-in" note about what they've learned or tried. This creates a progress journal.

### Step 4: AI Impact Analysis (Closing the Loop)
In every subsequent 1-on-1 session, the AI receives the supervisor's list of active development goals. As part of its analysis, it looks for opportunities where the supervisor could have applied their learning.
*   **Learning Applied:** If the AI finds an example where the supervisor successfully used their new skill, it generates a positive "applicationExample" message.
*   **Missed Opportunity:** If an opportunity existed but was missed, the AI generates a constructive "missedOpportunityExample" message.
*   **Goal Mastery:** If the supervisor consistently demonstrates mastery, the AI can flag the goal as completed, removing it from their active plan.
