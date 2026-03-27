

"use client";

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRole } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { HeartPulse, Check, Loader2, Plus, Wand2, Info, Send, ListChecks, Activity, Bot, MessageSquare, Eye, XCircle, Download, UserX, Users, Edit, UserPlus, BrainCircuit, FileText, ChevronRight, FileJson, FileType, ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateSurveyQuestions } from '@/ai/flows/generate-survey-questions-flow';
import { summarizeSurveyResults, type SummarizeSurveyResultsOutput } from '@/ai/flows/summarize-survey-results-flow';
import { generateLeadershipPulse } from '@/ai/flows/generate-leadership-pulse-flow';
import { summarizeLeadershipPulse } from '@/ai/flows/summarize-leadership-pulse-flow';
import type { GenerateLeadershipPulseOutput, LeadershipQuestion } from '@/ai/schemas/leadership-pulse-schemas';
import type { SurveyQuestion, DeployedSurvey } from '@/ai/schemas/survey-schemas';
import { deploySurvey, getAllSurveys, closeSurvey, sendLeadershipPulse, markLeadershipPulseAsAnalyzed, saveSurveySummary } from '@/services/survey-service';
import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { assignCoachingFromOrgHealth } from '@/services/org-coaching-service';
import OrgHealthDashboard from '@/components/dashboards/org-health-dashboard';
import { ScrollArea } from '@/components/ui/scroll-area';


const surveyTemplates = [
    {
        title: "General Morale Check",
        objective: "Assess overall employee morale and identify key areas of satisfaction and concern."
    },
    {
        title: "Work-Life Balance Pulse",
        objective: "Gauge team sentiment regarding work-life balance and identify potential burnout risks."
    },
    {
        title: "Post-Reorganization Feedback",
        objective: "Gather feedback on the recent organizational changes to understand their impact on teams."
    },
];

function CreateSurveyWizard({ onSurveyDeployed }: { onSurveyDeployed: () => void }) {
  const [objective, setObjective] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<SurveyQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [customQuestion, setCustomQuestion] = useState('');
  const [isGenerating, startGeneration] = useTransition();
  const { toast } = useToast();
  const [mode, setMode] = useState<'selection' | 'template' | 'custom'>('selection');

  const handleGenerateQuestions = (currentObjective: string) => {
    if (!currentObjective.trim()) {
      toast({ variant: 'destructive', title: "Objective is required", description: "Please describe the goal of your survey." });
      return;
    }
    setObjective(currentObjective);

    startGeneration(async () => {
      // MOCK DATA for "General Morale Check"
      if (currentObjective === "Assess overall employee morale and identify key areas of satisfaction and concern.") {
        const mockQuestions: SurveyQuestion[] = [
          { id: uuidv4(), questionText: "On a scale of 1-10, how would you rate your overall morale at work recently?", reasoning: "Provides a quantifiable baseline for overall employee sentiment." },
          { id: uuidv4(), questionText: "What is one thing that has energized you at work in the last month?", reasoning: "Identifies positive drivers of engagement and morale." },
          { id: uuidv4(), questionText: "What is one thing that has drained your energy or been a source of frustration?", reasoning: "Pinpoints specific pain points and areas for improvement." },
          { id: uuidv4(), questionText: "How well do you feel your work is recognized and valued by your manager and peers?", reasoning: "Measures the effectiveness of recognition practices, a key driver of morale." },
          { id: uuidv4(), questionText: "Do you feel you have the resources and support needed to succeed in your role?", reasoning: "Assesses potential blockers related to tools, training, or support systems." },
          { id: uuidv4(), questionText: "Is there anything else you would like to share about your experience at work?", reasoning: "An open-ended question to capture any issues not covered by the other questions." }
        ];
        
        setSuggestedQuestions(mockQuestions);
        const initialSelection = mockQuestions.reduce((acc, q) => {
          if (q.id) acc[q.id] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setSelectedQuestions(initialSelection);
        setMode('template'); // Switch to curation view
        return;
      }
      
      // Real API call for other objectives
      try {
        const result = await generateSurveyQuestions({ objective: currentObjective });
        const questionsWithIds = result.questions.map(q => ({ ...q, id: uuidv4() }));
        setSuggestedQuestions(questionsWithIds);
        // Pre-select all suggested questions by default
        const initialSelection = questionsWithIds.reduce((acc, q) => {
          if (q.id) acc[q.id] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setSelectedQuestions(initialSelection);
      } catch (e) {
        console.error("Failed to generate questions", e);
        toast({ variant: 'destructive', title: "Generation Failed", description: "Could not get AI suggestions at this time." });
      }
    });
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestion.trim()) return;
    const newQuestion: SurveyQuestion = {
      id: uuidv4(),
      questionText: customQuestion,
      reasoning: 'Custom question added by HR Head.',
      isCustom: true,
    };
    setSuggestedQuestions(prev => [...prev, newQuestion]);
    setSelectedQuestions(prev => ({ ...prev, [newQuestion.id!]: true }));
    setCustomQuestion('');
  };

  const handleDeploySurvey = async () => {
    const finalQuestions = suggestedQuestions.filter(q => selectedQuestions[q.id!]);
    if (finalQuestions.length === 0) {
        toast({ variant: 'destructive', title: "No questions selected", description: "Please select at least one question for the survey." });
        return;
    }
    
    await deploySurvey({
        objective,
        questions: finalQuestions,
    });
    
    toast({ variant: 'success', title: "Survey Deployed!", description: "Your anonymous survey is now active."});
    
    // Reset state and notify parent
    setObjective('');
    setSuggestedQuestions([]);
    setSelectedQuestions({});
    setMode('selection');
    onSurveyDeployed();
  };
  
  const allQuestionsSelected = suggestedQuestions.length > 0 && suggestedQuestions.every(q => selectedQuestions[q.id!]);
  const handleSelectAll = () => {
      const newSelection: Record<string, boolean> = {};
      suggestedQuestions.forEach(q => {
          newSelection[q.id!] = !allQuestionsSelected;
      });
      setSelectedQuestions(newSelection);
  }
  
  const handleTemplateClick = (templateObjective: string) => {
    handleGenerateQuestions(templateObjective);
    setMode('template'); 
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">Create New Anonymous Survey</CardTitle>
                {mode !== 'selection' && (
                     <Button variant="ghost" size="icon" onClick={() => { setMode('selection'); setSuggestedQuestions([])} }>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {mode === 'selection' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => setMode('template')}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex flex-col items-center justify-center text-center"
                >
                    <FileJson className="h-8 w-8 text-primary mb-2"/>
                    <p className="font-semibold">Start from a Template</p>
                </button>
                <button
                    onClick={() => setMode('custom')}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex flex-col items-center justify-center text-center"
                >
                    <FileType className="h-8 w-8 text-primary mb-2"/>
                    <p className="font-semibold">Start with an Objective</p>
                </button>
            </div>
          )}

          {mode === 'template' && (
            <div className="space-y-3">
              {surveyTemplates.map((template, index) => (
                  <button 
                      key={index}
                      onClick={() => handleTemplateClick(template.objective)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex justify-between items-center"
                  >
                      <div>
                          <p className="font-semibold text-foreground">{template.title}</p>
                          <p className="text-sm text-muted-foreground">{template.objective}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
              ))}
            </div>
          )}

          {mode === 'custom' && (
            <div className="space-y-4">
                <Accordion type="single" collapsible defaultValue="custom-objective">
                    <AccordionItem value="custom-objective" className="border-0">
                        <AccordionTrigger className="font-semibold py-2">Define a Custom Objective</AccordionTrigger>
                        <AccordionContent className="space-y-4 px-0 pb-0">
                             <div className="space-y-2">
                                <Textarea
                                    id="survey-objective"
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <Button onClick={() => handleGenerateQuestions(objective)} disabled={isGenerating || !objective.trim()}>
                                {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                Generate Suggestions
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
          )}
          
          {(isGenerating || suggestedQuestions.length > 0) && (
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold text-foreground">2. Curate and Add Questions</h3>
              {isGenerating ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                      <Checkbox id="select-all" checked={allQuestionsSelected} onCheckedChange={handleSelectAll} />
                      <Label htmlFor="select-all" className="font-semibold">Select All</Label>
                  </div>
                  {suggestedQuestions.map((q) => (
                  <div key={q.id} className="flex items-start gap-4 p-3 border rounded-lg bg-muted/50">
                      <Checkbox
                      id={q.id}
                      checked={!!selectedQuestions[q.id!]}
                      onCheckedChange={(checked) => {
                          setSelectedQuestions(prev => ({ ...prev, [q.id!]: !!checked }));
                      }}
                      className="mt-1"
                      />
                      <div className="flex-1">
                      <Label htmlFor={q.id} className="font-medium">{q.questionText}</Label>
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{q.reasoning}</span>
                      </p>
                      </div>
                  </div>
                  ))}
              </div>
              )}
              <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="custom-question">Add a Custom Question</Label>
                  <div className="flex items-center gap-2">
                      <Input 
                          id="custom-question" 
                          placeholder="Type your own question here" 
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                      />
                      <Button variant="outline" onClick={handleAddCustomQuestion} disabled={!customQuestion.trim()}>
                          <Plus className="mr-2"/> Add
                      </Button>
                  </div>
              </div>
            </div>
          )}
        </CardContent>
        {(isGenerating || suggestedQuestions.length > 0) && (
          <CardFooter>
              <Button size="lg" onClick={handleDeploySurvey} disabled={suggestedQuestions.filter(q => selectedQuestions[q.id!]).length === 0}>
                  <Send className="mr-2"/> Deploy Survey
              </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

const mockResponses: Record<string, string>[] = [
    {
        'q1': "I feel like my work isn't valued.",
        'q2': "Rarely, maybe once a month.",
        'q3': "More transparency about company direction.",
    },
    {
        'q1': "The work is interesting, but the deadlines are stressful.",
        'q2': "My manager gives good feedback weekly.",
        'q3': "Better work-life balance would be great.",
    },
    {
        'q1': "I enjoy my team, but the overall company morale seems low.",
        'q2': "Almost never. I usually hear about my performance during the quarterly review.",
        'q3': "Clearer communication from leadership.",
    },
    {
        'q1': "It feels like we're always in a state of chaos after the re-org.",
        'q2': "I get regular feedback, which I appreciate.",
        'q3': "I just want to know if my job is secure.",
    },
];

const mockLeadershipResponses = {
    'Team Lead': [
        "My team seems okay, but I've heard some chatter about workloads.",
        "I try to give recognition, but I'm often too busy with my own deliverables.",
    ],
    'AM': [
        "The Team Leads seem stretched thin, which might be impacting how they manage their teams.",
        "We need a clearer process for project planning to avoid last-minute crunches.",
    ],
    'Manager': [
        "Cross-department dependencies are causing a lot of friction and rework.",
        "I'm concerned about the lack of visibility into project pipelines.",
    ]
};


function LeadershipPulseDialog({ open, onOpenChange, summary, surveyObjective, onPulseSent }: { open: boolean, onOpenChange: (open: boolean) => void, summary: SummarizeSurveyResultsOutput | null, surveyObjective: string, onPulseSent: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pulseData, setPulseData] = useState<GenerateLeadershipPulseOutput | null>(null);
    const [customQuestions, setCustomQuestions] = useState<Record<string, string>>({});
    const [isGeneratingTargeted, setIsGeneratingTargeted] = useState(false);
    const [targetedQuestionInput, setTargetedQuestionInput] = useState('');

    const { toast } = useToast();

    useEffect(() => {
        if (open && summary && !pulseData) {
            setIsLoading(true);
            setError(null);
            
            // Mock the API call
            const mockPulseData: GenerateLeadershipPulseOutput = {
                teamLeadQuestions: [
                    { id: uuidv4(), questionText: "On a scale of 1-5, how confident are you in your team's current work-life balance?", type: 'rating', reasoning: "To gauge Team Lead awareness of the 'Work-Life Balance' theme identified in employee feedback." },
                    { id: uuidv4(), questionText: "What is the biggest obstacle your team faces in meeting deadlines without stress?", type: 'free-text', reasoning: "To get ground-level reasons for the workload concerns." }
                ],
                amQuestions: [
                    { id: uuidv4(), questionText: "What themes are you hearing from your Team Leads regarding their teams' morale?", type: 'free-text', reasoning: "To assess how well information is flowing up from teams to AMs." },
                    { id: uuidv4(), questionText: "How can we better support you in coaching your Team Leads on recognition?", type: 'free-text', reasoning: "To directly address the 'Recognition' theme with the managers of managers." }
                ],
                managerQuestions: [
                    { id: uuidv4(), questionText: "From your perspective, what is the root cause of the confusion around company direction?", type: 'free-text', reasoning: "To get a strategic view on the 'Communication Clarity' issue." },
                    { id: uuidv4(), questionText: "What is one process change that could improve cross-departmental collaboration and reduce project friction?", type: 'free-text', reasoning: "To solicit solutions for operational issues that may be causing stress." }
                ],
            };
            
            setTimeout(() => {
                setPulseData(mockPulseData);
                setIsLoading(false);
            }, 500);

        } else if (!open) {
            // Reset when dialog is closed
            setPulseData(null);
            setCustomQuestions({});
            setTargetedQuestionInput('');
        }
    }, [open, summary, surveyObjective, pulseData]);
    
    const handleAddCustomQuestion = (roleKey: 'teamLeadQuestions' | 'amQuestions' | 'managerQuestions') => {
        const questionText = customQuestions[roleKey];
        if (!questionText || !pulseData) return;

        const newQuestion: LeadershipQuestion = {
            id: uuidv4(),
            questionText,
            reasoning: 'Custom question added by HR Head.',
            type: 'free-text', // Default type for custom questions
        };

        setPulseData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [roleKey]: [...prev[roleKey], newQuestion]
            }
        });
        
        setCustomQuestions(prev => ({ ...prev, [roleKey]: '' }));
    };
    
    const handleGenerateTargetedQuestion = async (roleKey: 'teamLeadQuestions' | 'amQuestions' | 'managerQuestions') => {
        if (!targetedQuestionInput) {
            toast({ variant: 'destructive', title: "Input required", description: "Please provide a metric or insight to generate a question." });
            return;
        }
        setIsGeneratingTargeted(true);
        try {
            const result = await generateSurveyQuestions({ objective: targetedQuestionInput });
            if (result.questions.length > 0) {
                const newQuestion: LeadershipQuestion = { ...result.questions[0], id: uuidv4(), type: 'free-text' };
                 setPulseData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        [roleKey]: [...prev[roleKey], newQuestion]
                    }
                });
                setTargetedQuestionInput('');
                toast({ title: "Question Generated", description: "A new targeted question has been added to the list." });
            } else {
                throw new Error("AI did not return a question.");
            }
        } catch (e) {
            console.error("Failed to generate targeted question", e);
            toast({ variant: 'destructive', title: "Generation Failed" });
        } finally {
            setIsGeneratingTargeted(false);
        }
    };

    const handleSendToLeaders = async () => {
        if (!pulseData) return;
        setIsLoading(true);
        try {
            await sendLeadershipPulse({
                objective: `Follow-up on: ${surveyObjective}`,
                questions: {
                    'Team Lead': pulseData.teamLeadQuestions,
                    'AM': pulseData.amQuestions,
                    'Manager': pulseData.managerQuestions,
                    'Employee': [], // Ensure all keys are present if needed elsewhere
                    'HR Head': [],
                    'Anonymous': [],
                }
            });
            toast({ title: "Leadership Pulse Sent", description: "Leaders have been notified in their Messages." });
            onPulseSent();
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to send", description: "Could not send the leadership pulse." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderQuestionList = (questions: LeadershipQuestion[], roleKey: 'teamLeadQuestions' | 'amQuestions' | 'managerQuestions') => (
        <div className="py-4 max-h-[50vh] overflow-y-auto pr-4 space-y-4">
            {questions.map((q, index) => (
                <div key={q.id} className="space-y-2">
                     <Label className="flex items-center gap-2">
                        {q.reasoning === 'Custom question added by HR Head.' ? <UserPlus className="h-4 w-4 text-primary"/> : <Bot className="h-4 w-4 text-muted-foreground"/>}
                        Question {index + 1}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Textarea defaultValue={q.questionText} />
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                    </div>
                    {q.reasoning !== 'Custom question added by HR Head.' && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>AI Rationale: {q.reasoning}</span>
                        </p>
                    )}
                </div>
            ))}
             <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                    <Label htmlFor={`targeted-q-${roleKey}`} className="font-semibold">Generate a question from a specific insight</Label>
                    <Textarea
                        id={`targeted-q-${roleKey}`}
                        placeholder="e.g., 'Low sentiment around work-life balance' or 'Scores for leadership clarity are down 15%'"
                        value={targetedQuestionInput}
                        onChange={(e) => setTargetedQuestionInput(e.target.value)}
                        rows={2}
                    />
                     <Button variant="secondary" size="sm" onClick={() => handleGenerateTargetedQuestion(roleKey)} disabled={isGeneratingTargeted}>
                        {isGeneratingTargeted ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                        Generate
                    </Button>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`custom-q-${roleKey}`}>Or add a custom question</Label>
                    <div className="flex items-center gap-2">
                        <Textarea
                            id={`custom-q-${roleKey}`}
                            placeholder="Type your question here..."
                            value={customQuestions[roleKey] || ''}
                            onChange={(e) => setCustomQuestions(prev => ({ ...prev, [roleKey]: e.target.value }))}
                            rows={2}
                        />
                        <Button variant="outline" size="icon" onClick={() => handleAddCustomQuestion(roleKey)} disabled={!customQuestions[roleKey]}>
                            <Plus />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Users className="text-primary"/> Generate Leadership Pulse Survey</DialogTitle>
                    <DialogDescription>
                        AI has generated role-specific questions for leadership based on the anonymous feedback. Review, edit, and send.
                    </DialogDescription>
                </DialogHeader>
                 {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin" /></div>}
                 {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                 {pulseData && (
                    <Tabs defaultValue="team-lead" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="team-lead">Team Lead</TabsTrigger>
                            <TabsTrigger value="am">AM</TabsTrigger>
                            <TabsTrigger value="manager">Manager</TabsTrigger>
                        </TabsList>
                        <TabsContent value="team-lead">
                            {renderQuestionList(pulseData.teamLeadQuestions, 'teamLeadQuestions')}
                        </TabsContent>
                         <TabsContent value="am">
                            {renderQuestionList(pulseData.amQuestions, 'amQuestions')}
                        </TabsContent>
                         <TabsContent value="manager">
                            {renderQuestionList(pulseData.managerQuestions, 'managerQuestions')}
                        </TabsContent>
                    </Tabs>
                 )}
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSendToLeaders} disabled={isLoading || !pulseData}>
                        {isLoading && <Loader2 className="mr-2 animate-spin"/>}
                        Send to Leaders
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

type CoachingRecommendation = {
    theme: string;
    recommendation: string;
    targetAudience: string;
}

function SurveyResults({ survey, onPulseSent, onSurveyUpdated }: { survey: DeployedSurvey, onPulseSent: () => void, onSurveyUpdated: () => void }) {
    const [summary, setSummary] = useState<SummarizeSurveyResultsOutput | null>(survey.summary || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLeadershipPulseDialogOpen, setIsLeadershipPulseDialogOpen] = useState(false);
    
    const [isAnalyzingCoaching, setIsAnalyzingCoaching] = useState(false);
    const [coachingRecs, setCoachingRecs] = useState<CoachingRecommendation[] | null>(survey.coachingRecommendations || null);
    const { toast } = useToast();
    const { role } = useRole();

    useEffect(() => {
        setSummary(survey.summary || null);
        setCoachingRecs(survey.coachingRecommendations || null);
    }, [survey]);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        
        // Mock the result
        const mockSummary: SummarizeSurveyResultsOutput = {
            overallSentiment: "Mixed, with pockets of high engagement but growing concerns about workload and communication clarity.",
            keyThemes: [
                { theme: "Work-Life Balance", summary: "Multiple employees cited increased workload and stress related to tight deadlines. There's a feeling that the pace is unsustainable." },
                { theme: "Recognition", summary: "While some feel valued by their immediate managers, many feel their contributions are not visible to wider leadership." },
                { theme: "Communication Clarity", summary: "There is confusion regarding the company's direction after the recent re-organization. Employees are unsure about long-term priorities." }
            ],
            recommendations: [
                "Investigate workload distribution in the Engineering and Sales departments.",
                "Implement a more structured, public recognition program.",
                "Schedule an all-hands meeting to clarify Q4 priorities and roadmap."
            ]
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSummary(mockSummary);
        await saveSurveySummary(survey.id, mockSummary);
        onSurveyUpdated();

        setIsLoading(false);
    }
    
    const handleDownloadCsv = () => {
        if (!survey || !survey.questions || survey.questions.length === 0) {
            toast({ variant: 'destructive', title: "No questions to download." });
            return;
        }
    
        // Since mockResponses uses generic keys 'q1', 'q2', etc., we map them by index
        const headers = survey.questions.map(q => `"${q.questionText.replace(/"/g, '""')}"`).join(',');
        
        const rows = mockResponses.map(response => {
            return survey.questions.map((q, index) => {
                const questionKey = `q${index + 1}`; // Assuming keys are q1, q2, ...
                const answer = response[questionKey] || 'No answer';
                return `"${answer.replace(/"/g, '""')}"`;
            }).join(',');
        });
    
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `survey_results_${survey.id}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const handleAnalyzeLeadershipResponses = async () => {
        if (!summary) return;
        setIsAnalyzingCoaching(true);

        const mockCoachingRecs: CoachingRecommendation[] = [
            {
                theme: "Communication & Clarity",
                recommendation: "Assign a 'Nets' practice scenario to Ben Carter (Team Lead) focused on delivering clear project updates and handling questions about team workload.",
                targetAudience: "Team Lead: Ben Carter"
            },
            {
                theme: "Workload Management",
                recommendation: "Conduct a workshop for all managers on recognizing signs of burnout and managing team capacity during high-pressure sprints.",
                targetAudience: "All Managers"
            },
            {
                theme: "Recognition Culture",
                recommendation: "Create a coaching plan for all AMs focused on 'Giving Specific & Timely Recognition', with a goal to log one example per week.",
                targetAudience: "All AMs"
            }
        ];
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCoachingRecs(mockCoachingRecs);
        await markLeadershipPulseAsAnalyzed(survey.id, mockCoachingRecs, summary);
        toast({ title: "Analysis Complete", description: "Coaching recommendations have been generated."});
        onSurveyUpdated();
        setIsAnalyzingCoaching(false);
    };

    const handleAssignCoaching = async (recs: CoachingRecommendation[]) => {
        if (!role) return;
        try {
            await assignCoachingFromOrgHealth(recs, role);
            toast({ title: "Tasks Assigned", description: "Coaching tasks have been created from the recommendations." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Assignment Failed" });
        }
    }


    return (
        <div className="space-y-6">
             <LeadershipPulseDialog 
                open={isLeadershipPulseDialogOpen}
                onOpenChange={setIsLeadershipPulseDialogOpen}
                summary={summary}
                surveyObjective={survey.objective}
                onPulseSent={onPulseSent}
            />
            
            <p className="text-sm text-muted-foreground italic">"{survey.objective}"</p>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" />
                        Raw Responses ({mockResponses.length} total)
                    </h3>
                    <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                        <Download className="mr-2 h-4 w-4" /> Download CSV
                    </Button>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {survey.questions.map(q => (
                                    <TableHead key={q.id} className="min-w-[200px]">{q.questionText}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockResponses.map((response, index) => (
                                <TableRow key={index}>
                                    {survey.questions.map((q, qIndex) => {
                                        const questionKey = `q${qIndex + 1}`;
                                        return (
                                            <TableCell key={q.id} className="text-sm py-2">
                                                {response[questionKey] || 'No answer'}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {survey.status === 'closed' && (
                <div>
                     {!summary && (
                        <Button onClick={handleAnalyze} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                            Analyze Anonymous Responses
                        </Button>
                     )}

                    {error && (
                         <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {summary && (
                        <Card className="mt-4">
                             <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Bot className="text-primary" /> AI Summary & Actions</span>
                                     {survey.leadershipPulseSent ? (
                                        !coachingRecs && (
                                            <Button onClick={handleAnalyzeLeadershipResponses} disabled={isAnalyzingCoaching}>
                                                {isAnalyzingCoaching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                                Analyze Leadership Responses
                                            </Button>
                                        )
                                     ) : (
                                        <Button onClick={() => setIsLeadershipPulseDialogOpen(true)}>
                                            <Users className="mr-2 h-4 w-4" /> Generate Leadership Pulse
                                        </Button>
                                     )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-foreground">Overall Sentiment</h4>
                                    <p className="text-sm text-muted-foreground">{summary.overallSentiment}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">Key Themes</h4>
                                    <ul className="list-disc pl-5 space-y-2 mt-2">
                                        {summary.keyThemes.map((theme, i) => (
                                            <li key={i}>
                                                <span className="font-semibold">{theme.theme}</span>
                                                <p className="text-sm text-muted-foreground">{theme.summary}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">Actionable Recommendations</h4>
                                    <ul className="list-disc pl-5 space-y-2 mt-2">
                                        {summary.recommendations.map((rec, i) => (
                                            <li key={i} className="text-sm text-muted-foreground">{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {coachingRecs && (
                        <Card className="mt-4 border-purple-500/50">
                            <CardHeader className="bg-purple-500/10">
                                <CardTitle className="text-purple-700 dark:text-purple-400 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <BrainCircuit /> Final Coaching Recommendations
                                    </span>
                                    <Button size="sm" onClick={() => handleAssignCoaching(coachingRecs)}>
                                        Assign All as Tasks
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-3">
                                {coachingRecs.map((rec, i) => (
                                    <div key={i} className="p-3 border rounded-md">
                                        <p className="font-semibold">{rec.theme}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{rec.recommendation}</p>
                                        <Badge variant="secondary" className="mt-2">{rec.targetAudience}</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

function DeployedSurveys({ onUpdate }: { onUpdate: () => void }) {
    const [surveys, setSurveys] = useState<DeployedSurvey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchSurveys = useCallback(async () => {
        setIsLoading(true);
        const allSurveys = await getAllSurveys();
        setSurveys(allSurveys.filter(s => s.status === 'active'));
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchSurveys();
    }, [fetchSurveys]);
    
    const handleCloseSurvey = async (surveyId: string) => {
        await closeSurvey(surveyId);
        toast({ title: "Survey Closed", description: "The survey is no longer accepting new responses." });
        onUpdate(); // This will re-trigger fetch in both Deployed and History
    }

    if (isLoading) {
        return <Skeleton className="h-32 w-full" />;
    }
    
    if (surveys.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListChecks /> Active Surveys
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-3">
                     {surveys.map(survey => (
                         <AccordionItem value={survey.id} key={survey.id} className="border rounded-lg bg-card-foreground/5">
                            <div className="p-4 flex flex-1 items-center justify-between">
                                <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                    <div className="flex items-center w-full">
                                        <div className="text-left">
                                            <p className="font-semibold text-lg text-foreground">Survey Details</p>
                                            <p className="text-sm font-normal text-muted-foreground">
                                                Deployed {formatDistanceToNow(new Date(survey.deployedAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 pl-4 ml-auto">
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <Users />
                                                <span className="font-semibold text-foreground">{survey.submissionCount}</span> Submissions
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <UserX />
                                                <span className="font-semibold text-foreground">{survey.optOutCount || 0}</span> Opt-outs
                                            </div>
                                            <Badge variant={survey.status === 'active' ? 'success' : 'secondary'}>
                                                {survey.status === 'active' ? 'Active' : 'Closed'}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                {survey.status === 'active' && (
                                    <Button variant="destructive" size="sm" className="ml-4" onClick={(e) => { e.stopPropagation(); handleCloseSurvey(survey.id); }}>
                                        <XCircle className="mr-2 h-4 w-4" /> Close Survey
                                    </Button>
                                )}
                            </div>
                            <AccordionContent className="p-4 pt-2 border-t">
                                <SurveyResults survey={survey} onPulseSent={onUpdate} onSurveyUpdated={onUpdate} />
                            </AccordionContent>
                        </AccordionItem>
                     ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}

function SurveyHistory({ onUpdate }: { onUpdate: () => void }) {
    const [surveys, setSurveys] = useState<DeployedSurvey[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSurveys = useCallback(async () => {
        setIsLoading(true);
        const allSurveys = (await getAllSurveys()).filter(s => s.status === 'closed');
        setSurveys(allSurveys);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchSurveys();
         const handleDataUpdate = () => fetchSurveys();
        window.addEventListener('storage', handleDataUpdate);
        window.addEventListener('feedbackUpdated', handleDataUpdate);
        return () => {
            window.removeEventListener('storage', handleDataUpdate);
            window.removeEventListener('feedbackUpdated', handleDataUpdate);
        };
    }, [fetchSurveys]);

    if (isLoading) {
        return <Skeleton className="h-24 w-full" />;
    }
    
    if (surveys.length === 0) {
        return null; // Don't show if there's no history
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <History /> Survey History
                </CardTitle>
                 <CardDescription>
                    A log of all completed organizational health surveys.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Accordion type="single" collapsible className="w-full space-y-3">
                     {surveys.map(survey => (
                         <AccordionItem value={survey.id} key={survey.id} className="border rounded-lg bg-card-foreground/5">
                            <AccordionTrigger className="p-4 hover:no-underline flex-1">
                                <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                        <p className="font-medium text-foreground truncate max-w-md">{survey.objective}</p>
                                        <p className="text-sm font-normal text-muted-foreground">
                                            Closed {formatDistanceToNow(new Date(survey.deployedAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={survey.coachingRecommendations ? 'success' : survey.summary ? 'secondary' : 'outline'}>
                                            {survey.coachingRecommendations ? 'Completed' : survey.summary ? 'Analyzed' : 'Closed'}
                                        </Badge>
                                    </div>
                                </div>
                            </AccordionTrigger>
                             <AccordionContent className="border-t">
                                <ScrollArea className="h-[70vh] w-full">
                                    <div className="p-4 pt-2">
                                        <SurveyResults survey={survey} onPulseSent={onUpdate} onSurveyUpdated={onUpdate} />
                                    </div>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                     ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}

function OrgHealthContent() {
  const [key, setKey] = useState(0);

  const handleSurveyChange = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
                    <HeartPulse className="h-8 w-8 text-pink-500" />
                    Org Health
                </h1>
                 <p className="text-lg text-muted-foreground mt-2">Deploy anonymous surveys, analyze feedback with AI, and drive targeted L&D actions.</p>
            </div>
        </div>

        <OrgHealthDashboard />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreateSurveyWizard onSurveyDeployed={handleSurveyChange} />
        </div>
        
        <DeployedSurveys key={`deployed-${key}`} onUpdate={handleSurveyChange} />
        <SurveyHistory key={`history-${key}`} onUpdate={handleSurveyChange} />
    </div>
  );
}


export default function OrgHealthPage() {
  const { role, setRole, isLoading } = useRole();

  if (isLoading || !role) {
    return (
      <DashboardLayout role="HR Head" onSwitchRole={() => {}}>
        <Skeleton className="w-full h-screen" />
      </DashboardLayout>
    );
  }

  if (role !== 'HR Head') {
    return (
      <DashboardLayout role={role} onSwitchRole={setRole}>
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground mt-2">This page is only available for the HR Head role.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={role} onSwitchRole={setRole}>
      <OrgHealthContent />
    </DashboardLayout>
  );
}





