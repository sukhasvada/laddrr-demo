
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole, Role } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { MessageSquare, MessageCircleQuestion, AlertTriangle, CheckCircle, Loader2, ChevronsRight, User, Users, Briefcase, ShieldCheck, UserX, UserPlus, FileText, Zap, BookOpen, Podcast, Newspaper, GraduationCap, Lightbulb, MessageSquareQuote, CheckSquare as CheckSquareIcon, Info, Archive } from 'lucide-react';
import { getOneOnOneHistory, OneOnOneHistoryItem, submitEmployeeAcknowledgement, getAllFeedback, Feedback, resolveFeedback, submitEmployeeFeedbackAcknowledgement } from '@/services/feedback-service';
import { roleUserMapping, formatActorName } from '@/lib/role-mapping';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CriticalCoachingInsight, CoachingRecommendation } from '@/ai/schemas/one-on-one-schemas';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { SurveyQuestion } from '@/ai/schemas/survey-schemas';

function LeadershipPulseWidget({ item, onUpdate }: { item: Feedback, onUpdate: () => void }) {
    // @ts-ignore
    const questions: SurveyQuestion[] = item.surveyQuestions || [];
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { role } = useRole();

    const allQuestionsAnswered = questions.every(q => responses[q.id!] && responses[q.id!].trim() !== '');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const resolutionMessage = `Leadership Pulse submitted with ${Object.keys(responses).length} responses.`;
            await resolveFeedback(item.trackingId, role!, resolutionMessage);
            toast({ title: "Pulse Submitted", description: "Thank you for your valuable input." });
            onUpdate();
        } catch (error) {
            console.error("Failed to submit pulse survey:", error);
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card className="border-purple-500/50">
            <CardHeader className="bg-purple-500/10">
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <MessageCircleQuestion className="h-6 w-6" />
                    Leadership Pulse Survey
                </CardTitle>
                <CardDescription>
                    {item.message}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {questions.map((q, index) => (
                    <div key={q.id} className="space-y-2">
                        <Label htmlFor={`lp-q-${q.id}`} className="font-semibold">Question {index + 1}</Label>
                        <p className="text-sm">{q.questionText}</p>
                        <Textarea
                            id={`lp-q-${q.id}`}
                            placeholder="Your thoughtful response..."
                            value={responses[q.id!] || ''}
                            onChange={(e) => setResponses(prev => ({...prev, [q.id!]: e.target.value}))}
                            rows={3}
                        />
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSubmit} disabled={isSubmitting || !allQuestionsAnswered}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Pulse
                </Button>
            </CardFooter>
        </Card>
    );
}

function GeneralNotificationWidget({ item, onUpdate }: { item: Feedback, onUpdate: () => void }) {
    const { toast } = useToast();
    const { role } = useRole();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAcknowledge = async () => {
        setIsSubmitting(true);
        try {
            // Resolve the feedback item, which serves as acknowledging it
            await resolveFeedback(item.trackingId, role!, "Notification acknowledged.");
            toast({ title: "Notification Acknowledged" });
            onUpdate();
        } catch (error) {
            console.error("Failed to acknowledge notification", error);
            toast({ variant: 'destructive', title: "Acknowledgement Failed" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="border-green-500/50">
            <CardHeader className="bg-green-500/10">
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Info className="h-6 w-6" />
                    For Your Information
                </CardTitle>
                <CardDescription>
                   {item.subject}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
            </CardContent>
             <CardFooter>
                <Button variant="success" onClick={handleAcknowledge} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Acknowledge
                </Button>
            </CardFooter>
        </Card>
    )
}

function ConcernAcknowledgementWidget({ item, onUpdate }: { item: Feedback, onUpdate: () => void }) {
    const { toast } = useToast();
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const lastResponderEvent = item.auditTrail?.slice().reverse().find(e => ['Supervisor Responded', 'HR Resolution Submitted'].includes(e.event));

    const handleAcknowledge = async (accepted: boolean) => {
        setIsSubmitting(true);
        try {
            await submitEmployeeFeedbackAcknowledgement(item.trackingId, accepted, comments);
            if (accepted) {
                toast({ title: "Resolution Accepted", description: "The case has been closed." });
            } else {
                toast({ title: "Concern Escalated", description: "Your feedback has been escalated to the next level." });
            }
            onUpdate();
        } catch (error) {
            console.error("Failed to submit acknowledgement", error);
            toast({ variant: 'destructive', title: "Acknowledgement Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-blue-500/50">
            <CardHeader className="bg-blue-500/10">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <MessageCircleQuestion className="h-6 w-6" />
                    Response to Your Concern
                </CardTitle>
                <CardDescription>
                    Regarding: {item.subject}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-muted/80 rounded-md border">
                    <p className="font-semibold text-foreground">{formatActorName(lastResponderEvent?.actor)}'s Response:</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.supervisorUpdate}</p>
                </div>
                <div className="space-y-3">
                    <Label className="font-semibold">Your Acknowledgement</Label>
                    <p className="text-sm text-muted-foreground">
                        Please review the response and provide your feedback on the resolution.
                    </p>
                    <div className="space-y-2 pt-2">
                        <Label htmlFor={`ack-comments-${item.trackingId}`}>Additional Comments (Optional)</Label>
                        <Textarea
                            id={`ack-comments-${item.trackingId}`}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Provide more detail about your selection..."
                            rows={3}
                            className="bg-background"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={() => handleAcknowledge(true)} variant="success" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Accept Resolution
                        </Button>
                        <Button onClick={() => handleAcknowledge(false)} variant="destructive" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            I'm Not Satisfied, Escalate
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function MessagesContent({ role }: { role: Role }) {
  const [activeMessages, setActiveMessages] = useState<Feedback[]>([]);
  const [acknowledgedHistory, setAcknowledgedHistory] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    const feedback = await getAllFeedback();
    
    const userActiveMessages: Feedback[] = [];
    const userAcknowledgedHistory: Feedback[] = [];

    feedback.forEach(item => {
        const isAssignedToMe = item.assignedTo?.includes(role);
        
        // Active "For Your Info" notifications
        if (item.status === 'Pending Acknowledgement' && isAssignedToMe) {
            userActiveMessages.push(item);
        }
        
        // Active "Acknowledge Concern" messages
        if (item.status === 'Pending Employee Acknowledgment' && item.submittedBy === role) {
            userActiveMessages.push(item);
        }
        
        // Active "Leadership Pulse" surveys
        // @ts-ignore
        if (item.status === 'Pending Manager Action' && isAssignedToMe && item.surveyQuestions) {
            userActiveMessages.push(item);
        }

        // Acknowledged History items
        if (item.status === 'Closed' && item.assignedTo?.includes(role)) {
            userAcknowledgedHistory.push(item);
        }
    });

    userActiveMessages.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    userAcknowledgedHistory.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    setActiveMessages(userActiveMessages);
    setAcknowledgedHistory(userAcknowledgedHistory);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchMessages();
    
    const handleDataUpdate = () => {
        fetchMessages();
    }
    window.addEventListener('storage', handleDataUpdate);
    window.addEventListener('feedbackUpdated', handleDataUpdate);
    return () => {
        window.removeEventListener('storage', handleDataUpdate);
        window.removeEventListener('feedbackUpdated', handleDataUpdate);
    };
  }, [fetchMessages]);

  const hasActiveMessages = activeMessages.length > 0;

  const renderWidgets = (item: Feedback) => {
    // @ts-ignore
    if (item.surveyQuestions) {
      return <LeadershipPulseWidget key={`${item.trackingId}-pulse`} item={item} onUpdate={fetchMessages} />;
    }
    if (item.status === 'Pending Acknowledgement') {
        return <GeneralNotificationWidget key={`${item.trackingId}-info`} item={item} onUpdate={fetchMessages} />;
    }
    if (item.status === 'Pending Employee Acknowledgment') {
        return <ConcernAcknowledgementWidget key={`${item.trackingId}-concern`} item={item} onUpdate={fetchMessages} />;
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline mb-2 text-foreground flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Messages
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            A central place for critical notifications and actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {isLoading ? (
                 <Skeleton className="h-48 w-full" />
            ) : hasActiveMessages ? (
                <>
                    {activeMessages.map(item => renderWidgets(item))}
                </>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">All Caught Up</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Important updates and required actions will appear here.
                    </p>
                </div>
            )}

            {acknowledgedHistory.length > 0 && (
                <Accordion type="single" collapsible className="w-full pt-6">
                    <AccordionItem value="history" className="border-t">
                        <AccordionTrigger className="text-lg font-semibold text-muted-foreground hover:no-underline">
                            <div className="flex items-center gap-2">
                                <Archive className="h-5 w-5" />
                                Acknowledged History
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-4">
                            {acknowledgedHistory.map(item => (
                                <Card key={item.trackingId} className="bg-muted/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">{item.subject}</CardTitle>
                                        <CardDescription className="text-xs">
                                            Acknowledged on: {item.auditTrail?.find(e => e.event === 'Acknowledged')?.timestamp ? format(new Date(item.auditTrail.find(e => e.event === 'Acknowledged')!.timestamp), 'PPP p') : 'N/A'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function MessagesPage() {
  const { role, setRole, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full mt-8" />
        </div>
      </div>
    );
  }
  
  if (!role) {
    // This shouldn't happen if navigation is correct, but as a fallback
    return null;
  }

  return (
    <DashboardLayout role={role} onSwitchRole={setRole}>
        <MessagesContent role={role} />
    </DashboardLayout>
  );
}
