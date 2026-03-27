
"use client";

import { useState, useTransition, useEffect, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { analyzeOneOnOne } from '@/ai/flows/analyze-one-on-one-flow';
import { formSchema, type AnalyzeOneOnOneOutput, type CoachingRecommendation } from '@/ai/schemas/one-on-one-schemas';
import { saveOneOnOneHistory, getDeclinedCoachingAreasForSupervisor, getActiveCoachingPlansForUser, saveFeedback } from '@/services/feedback-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Info, Mic, Square, Upload, MessageSquareQuote, Bot, Send, Loader2, ArrowLeft, Star, BarChart, Zap, ShieldAlert, AlertTriangle, DatabaseZap, Clock, Timer, BookOpen, Podcast, Newspaper, GraduationCap, Lightbulb, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/dashboard-layout';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatActorName, getRoleByName } from '@/lib/role-mapping';
import { v4 as uuidv4 } from 'uuid';


// Define meeting type locally as it's not exported from the main page
interface Meeting {
  id: number;
  with: string;
  withRole: string;
  date: string | Date; // Allow for serialized date
  time: string;
}

// Mock performance data for the employee
const mockPerformanceData = {
    overall: 82,
    projectDelivery: 88,
    codeQuality: 85,
    collaboration: 75,
};

const dataUriFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function OneOnOneFeedbackForm({ meeting, supervisor }: { meeting: Meeting, supervisor: string }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        location: "",
        liveConversation: false,
        employeeAware: false,
        primaryFeedback: "",
        feedbackTone: "Constructive",
        employeeAcceptedFeedback: "Partially",
        improvementAreas: "",
        growthRating: "3",
        showedSignsOfStress: "No",
        stressDescription: "",
        expressedAspirations: false,
        aspirationDetails: "",
        didAppreciate: false,
        appreciationMessage: "",
        isCrossFunctional: false,
        broadcastAppreciation: false,
        otherComments: "",
        transcript: "",
        supervisorName: supervisor,
        employeeName: meeting.with,
        conversationRecordingDataUri: "",
        employeePerformanceData: mockPerformanceData, // Add performance data
    },
  });

  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { role } = useRole();
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // File upload state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptContent, setTranscriptContent] = useState<string | null>(null);

  // AI result state
  const [analysisResult, setAnalysisResult] = useState<AnalyzeOneOnOneOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [finalRecordingDuration, setFinalRecordingDuration] = useState(0);
  
  const hasMedia = !!recordedAudioUri || !!audioFile || !!transcriptContent;

  useEffect(() => {
    return () => { // Cleanup on unmount
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    }
  }, []);

  const updateTranscript = (content: string | null) => {
    setTranscriptContent(content);
    if (content) {
      form.setValue('transcript', content, { shouldValidate: true });
    } else {
      form.setValue('transcript', '', { shouldValidate: true });
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      setRecordedAudioUri(null);
      setAudioFile(null);
      updateTranscript(null);
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUri(audioUrl);
        setFinalRecordingDuration(recordingTime);
        
        const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
        const audioDataUri = await dataUriFromFile(audioFile);
        form.setValue('conversationRecordingDataUri', audioDataUri);
        updateTranscript("Audio has been recorded. The AI will transcribe and analyze it directly.");

        stream.getTracks().forEach(track => track.stop());
        if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Mic permission denied", error);
      setMicPermission('denied');
      toast({ variant: 'destructive', title: "Microphone Access Denied", description: "Please enable microphone access in your browser settings."});
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setAudioFile(file);
        setRecordedAudioUri(null);
        
        if (file.type.startsWith('audio/')) {
            const audioDataUri = await dataUriFromFile(file);
            form.setValue('conversationRecordingDataUri', audioDataUri);
            updateTranscript(`Audio file ${file.name} uploaded. The AI will process it.`);
        } else if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => updateTranscript(e.target?.result as string);
            reader.readAsText(file);
        } else {
            updateTranscript(`Unsupported file type: ${file.name}. Please upload audio or plain text.`);
        }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setAnalysisResult(null);
    setAnalysisError(null);
    
    startTransition(async () => {
        try {
            const mockResult: AnalyzeOneOnOneOutput = {
                supervisorSummary: "This was a constructive session focused on Casey's recent performance drop in project delivery (from 92 to 88). You did a great job framing the feedback positively, but missed an opportunity to dig into their comment about 'feeling a bit burned out.' Your active coaching goal around 'Delivering Corrective Feedback' was applied well, but the missed signal on burnout is a critical area to follow up on.",
                employeeSummary: "You and your manager had a productive conversation about your recent work. You discussed strategies to get project delivery back on track and your manager acknowledged your strong collaboration skills.",
                employeeInsights: ["You handled the feedback on project delivery with true professionalism.", "Your ability to collaborate with the team was highlighted as a major strength."],
                employeeSwotAnalysis: {
                    strengths: ["Strong collaboration skills", "High code quality", "Receptive to feedback"],
                    weaknesses: ["Recent dip in project delivery speed", "Hesitation to speak up about workload"],
                    opportunities: ["Take lead on a smaller feature to practice project management", "Explore new frontend frameworks"],
                    threats: ["Potential burnout if workload isn't managed", "Risk of missing key Q3 deadlines"]
                },
                leadershipScore: 7.5,
                effectivenessScore: 8.0,
                strengthsObserved: [
                    { action: "Framing feedback positively", example: "You started by saying, 'Your work is always high quality, so I wanted to chat about the recent project pace...'" },
                    { action: "Providing specific examples", example: "You referred directly to the delay in the 'alpha-feature' ticket." }
                ],
                coachingRecommendations: [
                    { id: uuidv4(), area: "Probing for Root Cause", recommendation: "When an employee mentions a feeling like 'burnout,' pause and ask open-ended questions like 'Tell me more about that feeling.'", example: "Casey said, '...just feeling a bit burned out lately,' and the conversation moved on.", type: "Article", resource: "HBR: Beyond Burnout", justification: "This will help you uncover underlying issues before they become critical.", status: 'pending' },
                    { id: uuidv4(), area: "Setting Clear Action Items", recommendation: "Ensure action items are SMART (Specific, Measurable, Achievable, Relevant, Time-bound).", example: "The action item 'Improve project delivery' could be more specific.", type: "Book", resource: "Measure What Matters", justification: "SMART goals provide clarity and make follow-up easier.", status: 'pending' }
                ],
                actionItems: [
                    { id: uuidv4(), owner: "Employee", task: "Block out 1 hour of focus time each morning for the next 2 weeks.", status: 'pending' },
                    { id: uuidv4(), owner: "Supervisor", task: "Check in with Casey mid-week on their workload and any blockers.", status: 'pending' }
                ],
                missedSignals: ["Casey mentioned working late twice but this was not explored further."],
                criticalCoachingInsight: {
                    summary: "Employee mentioned 'feeling pretty burned out' and supervisor did not explore this critical signal.",
                    reason: "Signs of burnout, if left unaddressed, can lead to decreased productivity, low morale, and attrition. It's critical to address these signals proactively.",
                    severity: 'high',
                    status: 'open',
                },
                coachingImpactAnalysis: [{
                    goalId: "mock-goal-1",
                    goalArea: "Delivering Corrective Feedback",
                    didApply: true,
                    applicationExample: "You successfully applied your learning by framing the corrective feedback in a positive and constructive manner, focusing on behavior rather than personality."
                }],
                biasFairnessCheck: { flag: false },
                localizationCompliance: { applied: false },
                legalDataCompliance: { piiOmitted: true, privacyRequest: false },
                dataHandling: {
                    analysisTimestamp: new Date().toISOString(),
                    recordingDeleted: true,
                    deletionTimestamp: new Date().toISOString()
                }
            };
            
            // Simulate AI processing time
            await new Promise(resolve => setTimeout(resolve, 1500));
            setAnalysisResult(mockResult);

            // Now, save the mock result to the history
            const historyItem = await saveOneOnOneHistory({
                supervisorName: supervisor,
                employeeName: meeting.with,
                date: new Date(meeting.date).toISOString(),
                analysis: mockResult, 
            });

            // The logic for creating a critical insight feedback item is now part of the `analyzeOneOnOne` flow,
            // so we'll replicate it here for the mock.
            if (mockResult.criticalCoachingInsight) {
                 const supervisorRole = getRoleByName(supervisor);
                 if (supervisorRole) {
                    await saveFeedback([{
                        trackingId: `Org-Ref-${Math.floor(100000 + Math.random() * 900000)}`,
                        oneOnOneId: historyItem.id,
                        subject: `Critical Coaching Insight from 1-on-1 with ${meeting.with}`,
                        message: `A critical coaching insight was identified during your session. See details in the 1-on-1 history.`,
                        submittedAt: new Date(),
                        criticality: 'Critical',
                        status: 'Pending Supervisor Action',
                        assignedTo: [supervisorRole],
                        supervisor: supervisor,
                        employee: meeting.with,
                        viewed: false,
                        auditTrail: [{
                            event: 'Critical Insight Identified',
                            timestamp: new Date(),
                            actor: 'HR Head',
                            details: 'Critical coaching insight automatically logged from 1-on-1 analysis.',
                        }],
                    }], true);
                 }
            }
            
            toast({ title: "Analysis Complete", description: "The AI has processed the session feedback." });

        } catch (error) {
            console.error("Analysis failed", error);
            setAnalysisError("The AI analysis failed. Please check the console for details.");
            toast({ variant: 'destructive', title: "Analysis Failed", description: "Could not get AI analysis results." });
        }
    });
  };

  const displayedMissedSignals = analysisResult?.missedSignals?.filter(
      signal => signal !== analysisResult.criticalCoachingInsight?.summary
  ) || [];

  const employeeActionItems = analysisResult?.actionItems?.filter(item => item.owner === 'Employee') || [];
  const supervisorActionItems = analysisResult?.actionItems?.filter(item => item.owner === 'Supervisor') || [];

  return (
    <div className="p-4 md:p-8">
       <div className="mb-4">
          <Button variant="ghost" asChild>
              <Link href="/1-on-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Meetings
              </Link>
          </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="text-2xl font-bold">1-on-1 Session Feedback</CardTitle>
                  <CardDescription>
                      Complete this form to document your session with {meeting.with} and generate AI-powered insights.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  {/* Session Context */}
                  <div className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2 font-semibold">
                          <Info className="h-5 w-5 text-primary" />
                          <h3>Session Context</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                              <p><strong>Date & Time:</strong> {format(new Date(meeting.date), 'PPP')} at {format(new Date(`1970-01-01T${meeting.time}`), 'p')}</p>
                              <p><strong>Employee:</strong> {meeting.with}</p>
                              <p><strong>Supervisor:</strong> {supervisor}</p>
                              <p><strong>Employee Role/Level:</strong> {meeting.withRole}</p>
                          </div>
                          <div>
                              <FormField
                                  control={form.control}
                                  name="location"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Location <span className="text-destructive">*</span></FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                  <SelectTrigger><SelectValue placeholder="Select meeting location" /></SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  <SelectItem value="Conference Room">Conference Room</SelectItem>
                                                  <SelectItem value="At Desk">At Desk</SelectItem>
                                                  <SelectItem value="Remote">Remote</SelectItem>
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                      </div>
                  </div>

                  {/* Record or Upload */}
                   <div className="border rounded-lg p-3 space-y-3">
                       <div className="flex items-center gap-2 font-semibold">
                          <Mic className="h-5 w-5 text-primary" />
                          <h3>Record or Upload</h3>
                      </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:border-l md:pl-4">
                          <div className="space-y-4">
                              <Label>Record Session or Upload Audio/Transcript</Label>
                              {micPermission === 'denied' && (
                                  <Alert variant="destructive">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertTitle>Microphone Access Denied</AlertTitle>
                                      <AlertDescription>
                                          Please enable it in your browser settings to record.
                                      </AlertDescription>
                                  </Alert>
                              )}
                              <div className="flex gap-2">
                                  {!isRecording ? (
                                       <Button type="button" onClick={handleStartRecording}><Mic className="mr-2"/> Start Recording</Button>
                                  ) : (
                                      <Button type="button" variant="destructive" onClick={handleStopRecording}><Square className="mr-2"/> Stop Recording</Button>
                                  )}
                                  <Button type="button" variant="secondary" size="icon" asChild>
                                      <Label htmlFor="file-upload" className="cursor-pointer"><Upload /></Label>
                                  </Button>
                                  <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} accept="audio/*,text/plain"/>
                              </div>
                              <p className="text-sm text-muted-foreground min-h-[20px]">
                                  {isRecording && `${formatRecordingTime(recordingTime)} - Recording...`}
                                  {!isRecording && recordedAudioUri && `✅ Live recording saved.`}
                                  {audioFile && `📎 Uploaded: ${audioFile.name}`}
                              </p>
                              {recordedAudioUri && <audio src={recordedAudioUri} controls className="w-full" />}
                          </div>
                          <div className="space-y-4">
                              <Label>Acknowledgements</Label>
                              <FormField control={form.control} name="liveConversation" render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                      <FormLabel className="font-normal">This conversation occurred live.</FormLabel>
                                  </FormItem>
                               )} />
                               <FormField control={form.control} name="employeeAware" render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                      <FormLabel className="font-normal">Employee is aware of any action items. <span className="text-destructive">*</span></FormLabel>
                                  </FormItem>
                               )} />
                          </div>
                      </div>
                  </div>

                  {/* Detailed Input Accordion */}
                  <Accordion type="multiple" defaultValue={[]} className="w-full space-y-1">
                      <AccordionItem value="performance-data">
                          <AccordionTrigger className="py-2 justify-start gap-2"><TrendingUp className="mr-2 text-primary" /> Employee Performance Data</AccordionTrigger>
                          <AccordionContent className="p-2">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                  <div className="p-3 rounded-md bg-muted">
                                      <p className="text-sm font-semibold text-muted-foreground">Overall</p>
                                      <p className="text-3xl font-bold text-primary">{mockPerformanceData.overall}</p>
                                  </div>
                                  <div className="p-3 rounded-md bg-muted/50">
                                      <p className="text-sm text-muted-foreground">Project Delivery</p>
                                      <p className="text-2xl font-semibold">{mockPerformanceData.projectDelivery}</p>
                                  </div>
                                  <div className="p-3 rounded-md bg-muted/50">
                                      <p className="text-sm text-muted-foreground">Code Quality</p>
                                      <p className="text-2xl font-semibold">{mockPerformanceData.codeQuality}</p>
                                  </div>
                                  <div className="p-3 rounded-md bg-muted/50">
                                      <p className="text-sm text-muted-foreground">Collaboration</p>
                                      <p className="text-2xl font-semibold">{mockPerformanceData.collaboration}</p>
                                  </div>
                              </div>
                          </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="feedback">
                          <AccordionTrigger className="py-2 justify-start gap-2"><MessageSquareQuote className="mr-2 text-primary" /> Feedback & Conversation Capture</AccordionTrigger>
                          <AccordionContent className="space-y-4 p-2">
                               <FormField control={form.control} name="primaryFeedback" render={({ field }) => (
                                  <FormItem><FormLabel>Primary Feedback / Talking Points {!hasMedia && <span className="text-destructive">*</span>}</FormLabel><FormControl><Textarea rows={5} placeholder="What was the core message delivered?" {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <FormField control={form.control} name="feedbackTone" render={({ field }) => (
                                      <FormItem><FormLabel>Feedback Tone</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Constructive">Constructive</SelectItem><SelectItem value="Positive">Positive</SelectItem><SelectItem value="Corrective">Corrective</SelectItem><SelectItem value="Neutral">Neutral</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                   )} />
                                   <FormField control={form.control} name="employeeAcceptedFeedback" render={({ field }) => (
                                      <FormItem><FormLabel>How was it received?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Fully">Fully</SelectItem><SelectItem value="Partially">Partially</SelectItem><SelectItem value="Not Well">Not Well</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                   )} />
                               </div>
                               <FormField control={form.control} name="improvementAreas" render={({ field }) => (
                                  <FormItem><FormLabel>Specific Areas for Improvement {form.getValues("feedbackTone") === 'Corrective' && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input placeholder="Describe specific areas for improvement..." {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                               <FormField control={form.control} name="growthRating" render={({ field }) => (
                                  <FormItem><FormLabel>Growth/Performance Trajectory (1=Needs significant improvement, 5=Exceeding expectations) <span className="text-destructive">*</span>}</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="1" /></FormControl><FormLabel className="font-normal">1</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="2" /></FormControl><FormLabel className="font-normal">2</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="3" /></FormControl><FormLabel className="font-normal">3</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="4" /></FormControl><FormLabel className="font-normal">4</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="5" /></FormControl><FormLabel className="font-normal">5</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                               )} />
                          </AccordionContent>
                      </AccordionItem>
                       <AccordionItem value="signals">
                          <AccordionTrigger className="py-2 justify-start gap-2"><Zap className="mr-2 text-yellow-500"/> Sentiment & Signals</AccordionTrigger>
                          <AccordionContent className="space-y-4 p-2">
                               <FormField control={form.control} name="showedSignsOfStress" render={({ field }) => (
                                  <FormItem><FormLabel>Did employee show signs of stress or disengagement?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="Unsure">Unsure</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                               )} />
                              <FormField control={form.control} name="stressDescription" render={({ field }) => (
                                  <FormItem><FormLabel>If yes, describe</FormLabel><FormControl><Textarea placeholder="Describe body language, tone, or comments..." {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                              <FormField control={form.control} name="expressedAspirations" render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Did employee express career aspirations or goals?</FormLabel></FormItem>
                               )} />
                              <FormField control={form.control} name="aspirationDetails" render={({ field }) => (
                                  <FormItem><FormLabel>If yes, what were they?</FormLabel><FormControl><Textarea placeholder="Describe their goals or aspirations..." {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                          </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="appreciation">
                          <AccordionTrigger className="py-2 justify-start gap-2"><Star className="mr-2 text-yellow-400"/> Appreciation Block</AccordionTrigger>
                          <AccordionContent className="space-y-4 p-2">
                               <FormField control={form.control} name="didAppreciate" render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Did you specifically appreciate the employee for something?</FormLabel></FormItem>
                               )} />
                              <FormField control={form.control} name="appreciationMessage" render={({ field }) => (
                                  <FormItem><FormLabel>If yes, what was the message?</FormLabel><FormControl><Textarea placeholder="Describe the appreciation message..." {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                              <FormField control={form.control} name="isCrossFunctional" render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Was the contribution cross-functional?</FormLabel></FormItem>
                               )} />
                              <FormField control={form.control} name="broadcastAppreciation" render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Should this appreciation be broadcast to a wider team?</FormLabel></FormItem>
                               )} />
                          </AccordionContent>
                      </AccordionItem>
                       <AccordionItem value="summary">
                          <AccordionTrigger className="py-2 justify-start gap-2"><MessageSquareQuote className="mr-2 text-muted-foreground"/> Media & Summary</AccordionTrigger>
                          <AccordionContent className="space-y-4 p-2">
                              <FormField control={form.control} name="otherComments" render={({ field }) => (
                                  <FormItem><FormLabel>Other Comments or Observations</FormLabel><FormControl><Textarea rows={4} placeholder="Anything else of note from the conversation?" {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
              </CardContent>
              <CardFooter className="justify-center">
                   <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="mr-2 animate-spin"/> : <Send className="mr-2" />}
                      Submit
                  </Button>
              </CardFooter>
          </Card>
        </form>
      </Form>
      
      <div className="mt-6">
        {isPending && (
            <Alert>
                <div className="flex items-center gap-2 font-bold text-primary">
                    <Loader2 className="animate-spin" />
                    <AlertTitle>Analyzing Session...</AlertTitle>
                </div>
                <AlertDescription>
                    The AI is processing your 1-on-1 feedback. This may take a moment.
                </AlertDescription>
            </Alert>
        )}
        {analysisResult && !isPending && (
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <div className="flex items-center gap-2 font-bold text-primary">
                        <Bot />
                        <CardTitle>AI Analysis & Coaching Report</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-primary/90">
                    
                     {/* Supervisor View */}
                    {role !== 'Employee' && analysisResult.supervisorSummary && (
                        <div>
                            <h4 className="font-semibold text-foreground mb-2">Session Summary for Supervisor</h4>
                            <p className="whitespace-pre-wrap">{analysisResult.supervisorSummary}</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-md bg-background/50 border">
                            <h4 className="font-semibold text-foreground flex items-center gap-2"><Star className="text-yellow-400"/> Leadership Score</h4>
                            <p className="text-2xl font-bold">{analysisResult.leadershipScore}/10</p>
                        </div>
                        <div className="p-3 rounded-md bg-background/50 border">
                            <h4 className="font-semibold text-foreground flex items-center gap-2"><BarChart className="text-green-500"/> Effectiveness Score</h4>
                            <p className="text-2xl font-bold">{analysisResult.effectivenessScore}/10</p>
                        </div>
                         {analysisResult.dataHandling && (
                            <div className="p-3 rounded-md bg-background/50 border">
                                <h4 className="font-semibold text-foreground flex items-center gap-2"><DatabaseZap className="h-4 w-4 text-muted-foreground" /> Data Handling</h4>
                                <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                                    <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /><strong>Analyzed:</strong> {format(new Date(analysisResult.dataHandling.analysisTimestamp), 'PPp')}</p>
                                    {analysisResult.dataHandling.recordingDeleted && finalRecordingDuration > 0 && (
                                        <p className="flex items-center gap-1.5"><Timer className="h-3 w-3" /><strong>Duration:</strong> {formatRecordingTime(finalRecordingDuration)}</p>
                                    )}
                                     {analysisResult.dataHandling.recordingDeleted && (
                                        <p className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-success" /><strong>Media Deleted:</strong> Yes</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {analysisResult.coachingImpactAnalysis && analysisResult.coachingImpactAnalysis.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-foreground">Coaching Impact Analysis</h4>
                            <div className="mt-2 space-y-3">
                                {analysisResult.coachingImpactAnalysis.map((impact, i) => (
                                    <div key={i} className={cn(
                                        "p-3 border rounded-md",
                                        impact.didApply ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"
                                    )}>
                                        <p className={cn(
                                            "font-semibold flex items-center gap-2",
                                            impact.didApply ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"
                                        )}>
                                            {impact.didApply ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                            {impact.didApply ? 'Learning Applied' : 'Missed Opportunity'}: {impact.goalArea}
                                        </p>
                                        <p className={cn(
                                            "text-sm mt-1 whitespace-pre-wrap",
                                            impact.didApply ? "text-green-600 dark:text-green-300" : "text-yellow-600 dark:text-yellow-300"
                                        )}>
                                            {impact.didApply ? impact.applicationExample : impact.missedOpportunityExample}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold text-foreground">Strengths Observed</h4>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            {analysisResult.strengthsObserved.map((strength, i) => <li key={i}><strong>{strength.action}:</strong> "{strength.example}"</li>)}
                        </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground">Action Items</h4>
                      <div className="mt-2 space-y-4">
                        {supervisorActionItems.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="font-medium">{formatActorName('Supervisor')}</h5>
                                {supervisorActionItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-3">
                                        <Checkbox id={`item-${item.id}`} disabled />
                                        <label htmlFor={`item-${item.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {item.task}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                        {employeeActionItems.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="font-medium">{formatActorName('Employee')}</h5>
                                {employeeActionItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-3">
                                        <Checkbox id={`item-${item.id}`} disabled />
                                        <label htmlFor={`item-${item.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {item.task}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                    </div>
                                        
                    {displayedMissedSignals.length > 0 && (
                         <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 mt-4">
                            <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2"><AlertTriangle/>Missed Signals</h4>
                             <ul className="list-disc pl-5 mt-2 space-y-1 text-yellow-600 dark:text-yellow-300">
                                {displayedMissedSignals.map((signal, i) => <li key={i}>{signal}</li>)}
                            </ul>
                        </div>
                    )}

                    {analysisResult.criticalCoachingInsight && (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 mt-4">
                            <h4 className="font-semibold text-destructive flex items-center gap-2">
                                <ShieldAlert /> Critical Coaching Insight
                            </h4>
                            <p className="text-destructive/90 mt-2">{analysisResult.criticalCoachingInsight.summary}</p>
                            <p className="text-destructive/90 mt-1"><strong>Why it matters:</strong> {analysisResult.criticalCoachingInsight.reason}</p>
                             <div className="mt-4">
                                <Button variant="destructive" asChild>
                                    <Link href="/1-on-1">Address Insight in Session History</Link>
                                </Button>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        )}
        {analysisError && (
            <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}

export default function OneOnOneFeedbackPage() {
    const { role, setRole, isLoading: isRoleLoading } = useRole();
    const router = useRouter();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [supervisor, setSupervisor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedData = sessionStorage.getItem('current_1_on_1_meeting');
        if (storedData) {
            const { meeting, supervisor } = JSON.parse(storedData);
            setMeeting(meeting);
            setSupervisor(supervisor);
        } else {
            // If no data, redirect back to the list
            router.replace('/1-on-1');
        }
        setIsLoading(false);
    }, [router]);

    if (isRoleLoading || isLoading || !role) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Skeleton className="h-[500px] w-full max-w-4xl" />
            </div>
        );
    }
    
    return (
        <DashboardLayout role={role} onSwitchRole={setRole}>
            {meeting && supervisor ? (
                <OneOnOneFeedbackForm meeting={meeting} supervisor={supervisor} />
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    <p>Loading meeting data...</p>
                </div>
            )}
        </DashboardLayout>
    );
}
