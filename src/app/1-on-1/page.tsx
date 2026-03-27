

"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import RoleSelection from '@/components/role-selection';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Calendar, Clock, Video, CalendarCheck, CalendarX, History, AlertTriangle, Send, Loader2, CheckCircle, MessageCircleQuestion, Lightbulb, BrainCircuit, ShieldCheck, TrendingDown, EyeOff, UserCheck, Star, Repeat, MessageSquare, Briefcase, UserX, UserPlus, FileText, Bot, BarChart, Zap, ShieldAlert, DatabaseZap, Timer, ListTodo, ThumbsUp, ThumbsDown, BookOpen, Mic as MicIcon, Podcast, Newspaper, GraduationCap, MessageSquareQuote, CheckCircle2, XCircle, ChevronsRight, User as UserIcon, SquareStack } from 'lucide-react';
import { format, formatDistanceToNow, addHours } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { roleUserMapping, getRoleByName, formatActorName } from '@/lib/role-mapping';
import { getOneOnOneHistory, OneOnOneHistoryItem, submitSupervisorInsightResponse, submitSupervisorRetry, getAllFeedback, Feedback, updateCoachingRecommendationStatus, resolveFeedback, toggleActionItemStatus, AuditEvent, submitAmCoachingNotes, submitAmDirectResponse, submitManagerResolution, submitHrResolution, submitFinalHrDecision, submitEmployeeAcknowledgement, getActiveCoachingPlansForUser } from '@/services/feedback-service';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { CriticalCoachingInsight, CoachingRecommendation, ActionItem } from '@/ai/schemas/one-on-one-schemas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { generateBriefingPacket } from '@/ai/flows/generate-briefing-packet-flow';
import type { BriefingPacketInput, BriefingPacketOutput } from '@/ai/schemas/briefing-packet-schemas';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const getMeetingDataForRole = (role: Role) => {
    let currentUser = roleUserMapping[role as keyof typeof roleUserMapping];
    let participant;
    switch(role) {
        case 'Employee':
            participant = roleUserMapping['Team Lead'];
            break;
        case 'Team Lead':
            participant = roleUserMapping['Employee'];
            break;
        case 'AM':
            participant = roleUserMapping['Team Lead'];
            break;
        case 'Manager':
            participant = roleUserMapping['Team Lead'];
            break;
        case 'HR Head':
            participant = roleUserMapping['Manager'];
            break;
        default:
             participant = { name: 'Participant', role: 'Role', imageHint: 'person' };
             currentUser = { name: 'Current User', role: 'Role', imageHint: 'person' };
            break;
    }

    return {
      meetings: [
        {
          id: 1,
          with: participant.name,
          withRole: participant.role,
          date: new Date(new Date().setDate(new Date().getDate() + 2)),
          time: '10:00',
        },
        {
          id: 2,
          with: participant.name,
          withRole: participant.role,
          date: new Date(new Date().setDate(new Date().getDate() + 9)),
          time: '14:30',
        },
      ],
      supervisor: currentUser.name,
    };
};

type Meeting = ReturnType<typeof getMeetingDataForRole>['meetings'][0];

function BriefingPacketDialog({ meeting, supervisor, viewerRole }: { meeting: Meeting; supervisor: string; viewerRole: Role; }) {
    const [isLoading, setIsLoading] = useState(true);
    const [packet, setPacket] = useState<BriefingPacketOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const { role } = useRole();

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && !packet) {
            // Trigger generation when the dialog opens
            generatePacket();
        }
    };

    const generatePacket = useCallback(async () => {
        if (!role) return;
        setIsLoading(true);
        setError(null);
        
        const isEmployeeView = viewerRole === 'Employee';

        // Mock data generation
        const mockSupervisorPacket: BriefingPacketOutput = {
            actionItemAnalysis: "The employee has a 100% completion rate on their single action item. The supervisor has one pending item. The distribution is balanced.",
            keyDiscussionPoints: ["Follow up on Casey's feeling of being 'burned out' from the last session.", "Discuss the next steps for the API spec now that it's drafted.", "Explore Casey's interest in leadership opportunities."],
            outstandingActionItems: ["A critical insight regarding 'burnout' is still open and requires your action.", "You have a pending action item: 'Identify a low-risk task for Casey to lead.'"],
            coachingOpportunities: ["Practice probing for the root cause when you hear an emotional keyword like 'burned out'.", "Use this session to practice delegating a task clearly and with full context."],
            suggestedQuestions: ["How has your workload felt since our last conversation?", "What part of the recent project are you most proud of and why?", "If you had a magic wand, what's one thing you would change about your current role?"]
        };

        const mockEmployeePacket: BriefingPacketOutput = {
            actionItemAnalysis: "You have successfully completed all your assigned action items. Great job staying on top of your commitments!",
            talkingPoints: ["Mention that you've completed the API spec and ask what the next priority is.", "Bring up your interest in mentoring a junior developer to build leadership skills.", "You could ask for more context on the long-term vision for the project you're on."],
            employeeSummary: "You've shown great initiative in your recent work. This meeting is a good opportunity to build on that momentum and discuss your career growth with your manager."
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (isEmployeeView) {
            setPacket(mockEmployeePacket);
        } else {
            setPacket(mockSupervisorPacket);
        }

        setIsLoading(false);
    }, [supervisor, meeting.with, viewerRole, role]);

    const renderList = (items?: string[]) => {
        if (!items || items.length === 0) {
            return <p className="text-sm text-muted-foreground">None found.</p>;
        }
        return (
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <SquareStack className="h-5 w-5 text-purple-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <SquareStack className="h-6 w-6 text-purple-500" /> Pre-1-on-1 Briefing Packet
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto pr-2 space-y-6">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Generating your briefing packet...</p>
                        </div>
                    )}
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {packet && (
                        <div className="space-y-4">
                            {packet.actionItemAnalysis && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Action Item Analysis</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{packet.actionItemAnalysis}</p>
                                </div>
                            )}

                             {/* Employee View */}
                            {packet.talkingPoints && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Your Talking Points</h4>
                                    {renderList(packet.talkingPoints)}
                                </div>
                            )}
                             {packet.employeeSummary && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Your Progress Summary</h4>
                                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">{packet.employeeSummary}</p>
                                </div>
                            )}
                            
                            {/* Supervisor View */}
                            {packet.keyDiscussionPoints && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Key Discussion Points</h4>
                                    {renderList(packet.keyDiscussionPoints)}
                                </div>
                            )}
                            {packet.outstandingActionItems && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Outstanding Critical Items</h4>
                                    {renderList(packet.outstandingActionItems)}
                                </div>
                            )}
                            {packet.coachingOpportunities && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Coaching Opportunities</h4>
                                    {renderList(packet.coachingOpportunities)}
                                </div>
                            )}
                            {packet.suggestedQuestions && (
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Suggested Questions</h4>
                                    {renderList(packet.suggestedQuestions)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ScheduleMeetingDialog({ meetingToEdit, onSchedule }: { meetingToEdit?: Meeting, onSchedule: (details: any) => void }) {
  const [date, setDate] = useState<Date | undefined>(meetingToEdit?.date);
  const [time, setTime] = useState(meetingToEdit?.time || '');
  const [participant, setParticipant] = useState(meetingToEdit?.with || '');
  
  const handleSchedule = () => {
    onSchedule({ date, time, participant });
  }

  const title = meetingToEdit ? "Reschedule 1-on-1" : "Schedule New 1-on-1";
  const description = meetingToEdit ? "Update the date and time for your meeting." : "Select a participant, date, and time for your meeting.";

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="participant">Participant</Label>
          <Input id="participant" value={participant} onChange={e => setParticipant(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time</Label>
          <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
            <Button type="submit" onClick={handleSchedule}>{meetingToEdit ? "Update" : "Schedule"}</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}

function ToDoSection({ role }: { role: Role }) {
    const [toDoItems, setToDoItems] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchToDos = useCallback(async () => {
        setIsLoading(true);
        const allFeedback = await getAllFeedback();
        const supervisorName = roleUserMapping[role].name;

        const userToDos = allFeedback.filter(item => 
            item.status === 'To-Do' &&
            item.supervisor === supervisorName
        );
        
        setToDoItems(userToDos.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchToDos();
        const handleDataUpdate = () => fetchToDos();
        window.addEventListener('storage', handleDataUpdate);
        window.addEventListener('feedbackUpdated', handleDataUpdate);
        return () => {
            window.removeEventListener('storage', handleDataUpdate);
            window.removeEventListener('feedbackUpdated', handleDataUpdate);
        }
    }, [fetchToDos]);

    const handleToggleActionItem = async (trackingId: string, actionItemId: string) => {
        // This function is now a placeholder as action items are managed within the 1-on-1 history item
        console.log("Toggling action item... this should be handled in the main history section now.");
    };

    const handleMarkAsCompleted = async (trackingId: string) => {
        const item = toDoItems.find(i => i.trackingId === trackingId);
        if (!item || !item.assignedTo || item.assignedTo.length === 0) return;
        
        await resolveFeedback(trackingId, item.assignedTo[0], "All action items completed.");
        toast({ title: "To-Do List Completed", description: "This item has been moved to your history." });
        fetchToDos(); // Re-fetch to remove the item from the active list
    };

    if (isLoading) {
        return <Skeleton className="h-24 w-full mt-8" />;
    }

    if (!['Team Lead', 'AM', 'Manager', 'HR Head'].includes(role) || toDoItems.length === 0) {
        return null; // Only show for supervisors if there are items
    }

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-primary" />
                To-Do
            </h2>
            <div className="space-y-4">
                {toDoItems.map(item => {
                    const allItemsCompleted = item.actionItems?.every(action => action.status === 'completed');
                    return (
                        <div key={item.trackingId} className="border rounded-lg p-4">
                            <h3 className="font-medium">From 1-on-1 with {item.employee} on {format(new Date(item.submittedAt), 'PPP')}</h3>
                            <div className="space-y-2 mt-3">
                                {/* Action items are now displayed in the history section */}
                            </div>
                            {allItemsCompleted && (
                                <div className="mt-4 pt-4 border-t">
                                    <Button variant="success" onClick={() => handleMarkAsCompleted(item.trackingId)}>Mark as Completed</Button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function SlaTimer({ expiryTimestamp }: { expiryTimestamp: number }) {
    const [timeLeft, setTimeLeft] = useState(expiryTimestamp - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(expiryTimestamp - Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return '00:00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-muted-foreground">
                {formatTime(timeLeft)}
            </span>
        </div>
    );
}

function InsightAuditTrail({ trail }: { trail: AuditEvent[] }) {
    const eventIcons: { [key: string]: { icon: React.ElementType, color: string } } = {
        'default': { icon: Briefcase, color: 'text-muted-foreground' },
        'Responded': { icon: MessageSquare, color: 'text-primary' },
        'Acknowledged': { icon: CheckCircle, color: 'text-success' },
        'AM Coaching Notes': { icon: BrainCircuit, color: 'text-orange-500' },
        'AM Responded to Employee': { icon: MessageSquare, color: 'text-blue-500' },
        'Supervisor Retry Action': { icon: Repeat, color: 'text-purple-500' },
        'Manager Resolution': { icon: Briefcase, color: 'text-red-600' },
        'HR Resolution': { icon: ShieldCheck, color: 'text-black dark:text-white' },
        'Assigned to Ombudsman': { icon: UserX, color: 'text-gray-500' },
        'Assigned to Grievance Office': { icon: UserPlus, color: 'text-gray-500' },
        'Logged Dissatisfaction & Closed': { icon: FileText, color: 'text-gray-500' },
    };
    
    const formatEventTitle = (event: string) => {
        switch (event) {
            case 'Responded': return "Supervisor's Response";
            case 'Acknowledged': return "Employee's Acknowledgement";
            case 'AM Coaching Notes': return "AM's Coaching Notes for Supervisor";
            case 'AM Responded to Employee': return "AM's Direct Response";
            case 'Supervisor Retry Action': return "Supervisor's Follow-up Action";
            case 'Manager Resolution': return "Manager's Resolution";
            case 'HR Resolution': return "HR's Final Resolution";
            default: return event;
        }
    };
    
    // The initial "Critical Insight Identified" event is now part of the card title, so we can skip it here.
    const eventsToDisplay = trail.filter(event => event.event !== 'Critical Insight Identified');

    return (
        <div className="space-y-4 pt-4 border-t border-muted">
            {eventsToDisplay.map((event, index) => { 
                const { icon: Icon, color } = eventIcons[event.event as keyof typeof eventIcons] || eventIcons.default;
                return (
                    <div key={index} className="space-y-2">
                        <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", color)} />
                            {formatEventTitle(event.event)} by {formatActorName(event.actor)}
                        </p>
                        {event.details && <p className="text-sm text-muted-foreground whitespace-pre-wrap ml-6 italic">"{event.details}"</p>}
                    </div>
                )
            })}
        </div>
    );
}

function EscalationActionWidget({ item, onUpdate, role }: { item: OneOnOneHistoryItem, onUpdate: () => void, role: Role }) {
    const insight = item.analysis.criticalCoachingInsight as CriticalCoachingInsight;
    const { toast } = useToast();

    // State for AM actions
    const [amAction, setAmAction] = useState<'coach' | 'address' | null>(null);
    const [amNotes, setAmNotes] = useState('');
    const [isSubmittingAm, setIsSubmittingAm] = useState(false);
    
    // State for Manager actions
    const [managerNotes, setManagerNotes] = useState('');
    const [isSubmittingManager, setIsSubmittingManager] = useState(false);

    // State for HR actions
    const [hrNotes, setHrNotes] = useState('');
    const [isSubmittingHr, setIsSubmittingHr] = useState(false);
    const [finalAction, setFinalAction] = useState<string | null>(null);
    const [finalActionNotes, setFinalActionNotes] = useState('');
    const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);


    const handleAmSubmit = async () => {
        if (!amNotes || !amAction) return;
        setIsSubmittingAm(true);
        try {
            if (amAction === 'coach') {
                await submitAmCoachingNotes(item.id, role, amNotes);
                toast({ title: "Coaching Notes Submitted" });
            } else {
                await submitAmDirectResponse(item.id, role, amNotes);
                toast({ title: "Response Submitted to Employee" });
            }
            onUpdate();
        } catch (e) {
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmittingAm(false);
            setAmAction(null);
            setAmNotes('');
        }
    };
    
    const handleManagerSubmit = async () => {
        if (!managerNotes) return;
        setIsSubmittingManager(true);
        try {
            await submitManagerResolution(item.id, role, managerNotes);
            toast({ title: "Resolution Submitted to Employee" });
            onUpdate();
        } catch(e) {
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmittingManager(false);
        }
    };

    const handleHrSubmit = async () => {
        if (!hrNotes) return;
        setIsSubmittingHr(true);
        try {
            await submitHrResolution(item.id, role, hrNotes);
            toast({ title: "HR Resolution Submitted" });
            onUpdate();
        } catch(e) {
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmittingHr(false);
        }
    };
    
    const handleFinalHrDecision = async () => {
        if (!finalAction || !finalActionNotes) return;
        setIsSubmittingFinal(true);
        try {
            await submitFinalHrDecision(item.id, role, finalAction, finalActionNotes);
            toast({ title: "Final Action Logged", description: "The case is now closed." });
            onUpdate();
        } catch(e) {
             toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmittingFinal(false);
        }
    };


    const isActionableForRole = () => {
        if (!role || !insight) return false;
        const finalDispositionEvent = insight.auditTrail?.find(e => ["Assigned to Ombudsman", "Assigned to Grievance Office", "Logged Dissatisfaction & Closed"].includes(e.event));
        if (finalDispositionEvent) return false;

        return (role === 'AM' && insight.status === 'pending_am_review') ||
               (role === 'Manager' && insight.status === 'pending_manager_review') ||
               (role === 'HR Head' && (insight.status === 'pending_hr_review' || insight.status === 'pending_final_hr_action'));
    };

    if (!isActionableForRole()) return null;

    return (
        <Card className="mt-4">
            <CardHeader className={cn(
                role === 'AM' && 'bg-orange-500/10',
                role === 'Manager' && 'bg-red-700/10',
                role === 'HR Head' && 'bg-black/10 dark:bg-gray-800/50'
            )}>
                <CardTitle className={cn(
                    "font-semibold text-lg flex items-center gap-2",
                    role === 'AM' && 'text-orange-700 dark:text-orange-400',
                    role === 'Manager' && 'text-red-800 dark:text-red-500',
                    role === 'HR Head' && 'text-black dark:text-white'
                )}>
                    <AlertTriangle className="h-5 w-5" /> Your Action Required
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {/* AM Action Widget */}
                {role === 'AM' && insight.status === 'pending_am_review' && (
                    !amAction ? (
                        <div className="flex flex-wrap gap-4">
                            <Button variant="secondary" className="bg-yellow-400/80 text-yellow-900 hover:bg-yellow-400/90" onClick={() => setAmAction('coach')}>
                                <BrainCircuit className="mr-2 h-4 w-4" /> Coach Supervisor
                            </Button>
                            <Button onClick={() => setAmAction('address')} className="bg-blue-600 text-white hover:bg-blue-700">
                                <ChevronsRight className="mr-2 h-4 w-4" /> Address Employee
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Label htmlFor="am-notes">{amAction === 'coach' ? 'Coaching Notes for Supervisor' : 'Direct Response to Employee'}</Label>
                            <Textarea id="am-notes" value={amNotes} onChange={(e) => setAmNotes(e.target.value)} rows={4} />
                            <div className="flex gap-2">
                                <Button onClick={handleAmSubmit} disabled={isSubmittingAm || !amNotes}>
                                    {isSubmittingAm && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Submit
                                </Button>
                                <Button variant="ghost" onClick={() => setAmAction(null)}>Cancel</Button>
                            </div>
                        </div>
                    )
                )}

                {/* Manager Action Widget */}
                {role === 'Manager' && insight.status === 'pending_manager_review' && (
                    <div className="space-y-3">
                        <Label htmlFor="manager-notes">Your Resolution</Label>
                         <p className="text-sm text-muted-foreground">Document the actions you will take. This will be sent to the employee for final acknowledgement.</p>
                        <Textarea id="manager-notes" value={managerNotes} onChange={(e) => setManagerNotes(e.target.value)} rows={4} />
                        <Button variant="destructive" onClick={handleManagerSubmit} disabled={isSubmittingManager || !managerNotes}>
                            {isSubmittingManager && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Submit to Employee
                        </Button>
                    </div>
                )}
                
                {/* HR Head Action Widgets */}
                {role === 'HR Head' && insight.status === 'pending_hr_review' && (
                     <div className="space-y-3">
                        <Label htmlFor="hr-notes">Final HR Resolution</Label>
                        <p className="text-sm text-muted-foreground">Document your final actions. The employee will be asked for a final acknowledgement.</p>
                        <Textarea id="hr-notes" value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} rows={4} />
                        <Button className="bg-black text-white hover:bg-black/80" onClick={handleHrSubmit} disabled={isSubmittingHr || !hrNotes}>
                           {isSubmittingHr && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Submit Final Resolution
                        </Button>
                    </div>
                )}

                {role === 'HR Head' && insight.status === 'pending_final_hr_action' && (
                    !finalAction ? (
                         <div className="space-y-3">
                             <Label>Final Action Required</Label>
                             <p className="text-sm text-muted-foreground">The employee remains dissatisfied. Select a final action to formally close this case.</p>
                             <div className="flex flex-wrap gap-2">
                                 <Button variant="secondary" onClick={() => setFinalAction('Assigned to Ombudsman')}><UserX className="mr-2 text-gray-500" /> Assign to Ombudsman</Button>
                                 <Button variant="secondary" onClick={() => setFinalAction('Assigned to Grievance Office')}><UserPlus className="mr-2 text-gray-500" /> Assign to Grievance Office</Button>
                                 <Button variant="destructive" onClick={() => setFinalAction('Logged Dissatisfaction & Closed')}><FileText className="mr-2 text-gray-500" /> Log & Close</Button>
                             </div>
                         </div>
                    ) : (
                        <div className="space-y-3">
                           <p className="font-medium">Action: <span className="text-primary">{finalAction}</span></p>
                            <Label htmlFor="final-notes">Reasoning / Notes</Label>
                            <Textarea id="final-notes" value={finalActionNotes} onChange={(e) => setFinalActionNotes(e.target.value)} rows={4} placeholder="Provide justification..." />
                            <div className="flex gap-2">
                                <Button className="bg-black text-white hover:bg-black/80" onClick={handleFinalHrDecision} disabled={isSubmittingFinal || !finalActionNotes}>
                                   {isSubmittingFinal && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Submit Final Action
                                </Button>
                                <Button variant="ghost" onClick={() => setFinalAction(null)}>Cancel</Button>
                            </div>
                        </div>
                    )
                )}

            </CardContent>
        </Card>
    );
}


function HistorySection({ role }: { role: Role }) {
    const [history, setHistory] = useState<OneOnOneHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // State for inline insight addressing (supervisor)
    const [addressingInsightId, setAddressingInsightId] = useState<string | null>(null);
    const [supervisorResponse, setSupervisorResponse] = useState('');
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

    // State for retry flow (supervisor)
    const [retryingInsightId, setRetryingInsightId] = useState<string | null>(null);
    const [retryResponse, setRetryResponse] = useState('');
    const [isSubmittingRetry, setIsSubmittingRetry] = useState(false);

    // State for employee acknowledgement
    const [employeeAcknowledgement, setEmployeeAcknowledgement] = useState('');
    const [acknowledgementComments, setAcknowledgementComments] = useState('');
    const [isSubmittingAck, setIsSubmittingAck] = useState(false);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        const historyData = await getOneOnOneHistory();
        
        const currentUser = roleUserMapping[role];
        let userHistory: OneOnOneHistoryItem[] = [];
        
        if (role === 'Employee' || role === 'Team Lead') {
             userHistory = historyData.filter(item => {
                 return item.supervisorName === currentUser.name || item.employeeName === currentUser.name;
            });
        } else {
             // Managers and above see all history
             userHistory = historyData;
        }
        
        setHistory(userHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchHistory();
        const handleDataUpdate = () => fetchHistory();
        window.addEventListener('storage', handleDataUpdate);
        window.addEventListener('feedbackUpdated', handleDataUpdate);
        return () => {
            window.removeEventListener('storage', handleDataUpdate);
            window.removeEventListener('feedbackUpdated', handleDataUpdate);
        }
    }, [fetchHistory]);

    const handleToggleActionItem = async (historyId: string, actionItemId: string) => {
        await toggleActionItemStatus(historyId, actionItemId);
        fetchHistory();
    };

    const handleAddressInsightSubmit = async (itemToUpdate: OneOnOneHistoryItem) => {
        if (!supervisorResponse) return;
        setIsSubmittingResponse(true);

        try {
            await submitSupervisorInsightResponse(itemToUpdate.id, supervisorResponse);
            setSupervisorResponse("");
            setAddressingInsightId(null);
            toast({ title: "Response Submitted", description: "The employee will be asked to acknowledge the resolution." });
            fetchHistory(); // Re-fetch to update UI
        } catch (error) {
            console.error("Failed to submit response", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Could not submit your response." });
        } finally {
            setIsSubmittingResponse(false);
        }
    };
    
    const handleRetrySubmit = async (itemToUpdate: OneOnOneHistoryItem) => {
        if (!retryResponse) return;
        setIsSubmittingRetry(true);
        try {
            await submitSupervisorRetry(itemToUpdate.id, retryResponse);
            toast({ title: "Follow-up Submitted", description: "Your notes have been logged and the employee has been notified to acknowledge again."});
            setRetryResponse('');
            setRetryingInsightId(null);
            fetchHistory();
        } catch (error) {
            console.error("Failed to submit retry", error);
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmittingRetry(false);
        }
    };

    const handleEmployeeAckSubmit = async (itemToUpdate: OneOnOneHistoryItem) => {
        if (!employeeAcknowledgement) return;
        setIsSubmittingAck(true);
        
        const previousStatus = itemToUpdate.analysis.criticalCoachingInsight?.status;

        try {
            await submitEmployeeAcknowledgement(itemToUpdate.id, employeeAcknowledgement, acknowledgementComments, previousStatus);
            setEmployeeAcknowledgement("");
            setAcknowledgementComments("");
            
            if (employeeAcknowledgement === "The concern was fully addressed to my satisfaction.") {
                 toast({ title: "Acknowledgement Submitted", description: "Thank you for your feedback. This insight is now resolved." });
            } else {
                 toast({ title: "Feedback Escalated", description: "Your feedback has been sent to the next level for review." });
            }

            fetchHistory();
        } catch (error) {
            console.error("Failed to submit acknowledgement", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Could not submit your acknowledgement." });
        } finally {
            setIsSubmittingAck(false);
        }
    };

    if (isLoading) {
        return <Skeleton className="h-24 w-full mt-8" />;
    }

    if (history.length === 0) {
        return (
             <div className="mt-12 text-center py-12 border-2 border-dashed rounded-lg">
                <History className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">No Session History</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your past 1-on-1 sessions and their analyses will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                <History className="h-5 w-5" />
                Session History
            </h2>
            <Accordion type="single" collapsible className="w-full border rounded-lg">
                {history.map(item => {
                    const analysisResult = item.analysis;
                    const insight = analysisResult.criticalCoachingInsight;
                    const insightStatus = insight?.status;
                    const currentUserName = roleUserMapping[role].name;
                    
                    const isSupervisorForThisInsight = currentUserName === item.supervisorName;
                    const isEmployee = currentUserName === item.employeeName;
                    const isManagerialRole = ['AM', 'Manager', 'HR Head'].includes(role);
                    
                    const canSupervisorAct = isSupervisorForThisInsight && insightStatus === 'open';
                    const canSupervisorRetry = isSupervisorForThisInsight && insightStatus === 'pending_supervisor_retry';
                    const canEmployeeAck = isEmployee && insightStatus === 'pending_employee_acknowledgement';

                    const finalDecisionEvent = insight?.auditTrail?.find(e => ["Assigned to Ombudsman", "Assigned to Grievance Office", "Logged Dissatisfaction & Closed"].includes(e.event));
                    const amCoachingNotes = item.analysis.criticalCoachingInsight?.auditTrail?.find(e => e.event === 'AM Coaching Notes')?.details;

                    const displayedMissedSignals = analysisResult?.missedSignals?.filter(
                        signal => signal !== analysisResult.criticalCoachingInsight?.summary
                    ) || [];
                    
                    const employeeActionItems = analysisResult.actionItems?.filter(ai => ai.owner === 'Employee') || [];
                    const supervisorActionItems = analysisResult.actionItems?.filter(ai => ai.owner === 'Supervisor') || [];
                    const pendingActionItemsCount = supervisorActionItems.concat(employeeActionItems).filter(ai => ai.status === 'pending').length;


                    const getStatusBadge = () => {
                        if (!insight) return null;

                        if (finalDecisionEvent) {
                            let Icon = FileText;
                            let text = "Case Logged";
                            if (finalDecisionEvent.event.includes("Ombudsman")) { Icon = UserX; text = "Ombudsman"; }
                            if (finalDecisionEvent.event.includes("Grievance")) { Icon = UserPlus; text = "Grievance"; }
                            return <Badge className="bg-gray-700 text-white flex items-center gap-1.5"><Icon className="h-3 w-3" />{text}</Badge>;
                        }

                        switch(insightStatus) {
                            case 'open':
                                return <Badge variant="destructive" className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" />Action Required</Badge>;
                            case 'pending_employee_acknowledgement':
                                return <Badge className="bg-blue-500 text-white flex items-center gap-1.5"><MessageCircleQuestion className="h-3 w-3" />Pending Ack</Badge>;
                             case 'pending_supervisor_retry':
                                return <Badge className="bg-purple-500 text-white flex items-center gap-1.5"><Repeat className="h-3 w-3" />Retry Required</Badge>;
                            case 'pending_am_review':
                                return <Badge className="bg-orange-500 text-white flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" />AM Review</Badge>;
                            case 'pending_manager_review':
                                return <Badge className="bg-red-700 text-white flex items-center gap-1.5"><Briefcase className="h-3 w-3" />Manager Review</Badge>;
                            case 'pending_hr_review':
                            case 'pending_final_hr_action':
                                return <Badge className="bg-black text-white flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />HR Review</Badge>;
                            case 'resolved':
                                return <Badge variant="success" className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3" />Resolved</Badge>;
                            default:
                                return null;
                        }
                    }

                    return (
                        <AccordionItem value={item.id} key={item.id}>
                            <AccordionTrigger className="px-4 py-3 w-full">
                                <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                        <p className="font-medium">
                                            1-on-1: {item.supervisorName} & {item.employeeName}
                                        </p>
                                        <p className="text-sm text-muted-foreground font-normal">
                                            {format(new Date(item.date), 'PPP')} ({formatDistanceToNow(new Date(item.date), { addSuffix: true })})
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 mr-2">
                                        {pendingActionItemsCount > 0 && (
                                            <Badge variant="secondary">{pendingActionItemsCount} Action Item{pendingActionItemsCount > 1 ? 's' : ''}</Badge>
                                        )}
                                        {getStatusBadge()}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-6 pt-2 px-4 pb-4">
                                
                                {(isSupervisorForThisInsight || isManagerialRole) && (
                                    <div className="space-y-4">
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-semibold text-lg flex items-center gap-2 text-primary"><Bot className="text-primary"/>AI Analysis & Coaching Report</h4>
                                                <span 
                                                    className="text-xs text-muted-foreground font-mono cursor-text"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    ID: {item.id}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-6 text-primary/90">
                                                {analysisResult.supervisorSummary && (
                                                    <div>
                                                        <h4 className="font-semibold text-foreground mb-2">Session Summary for Supervisor</h4>
                                                        <p className="whitespace-pre-wrap">{analysisResult.supervisorSummary}</p>
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="p-3 rounded-md bg-background/50 border">
                                                        <h4 className="font-semibold text-foreground flex items-center gap-2"><Star className="text-yellow-400" /> Leadership Score</h4>
                                                        <p className="text-2xl font-bold">{analysisResult.leadershipScore}/10</p>
                                                    </div>
                                                    <div className="p-3 rounded-md bg-background/50 border">
                                                        <h4 className="font-semibold text-foreground flex items-center gap-2"><BarChart className="text-green-500" /> Effectiveness Score</h4>
                                                        <p className="text-2xl font-bold">{analysisResult.effectivenessScore}/10</p>
                                                    </div>
                                                    {analysisResult.dataHandling && (
                                                        <div className="p-3 rounded-md bg-background/50 border">
                                                            <h4 className="font-semibold text-foreground flex items-center gap-2"><DatabaseZap className="h-4 w-4 text-muted-foreground" /> Data Handling</h4>
                                                            <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                                                              <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /><strong>Analyzed:</strong> {format(new Date(analysisResult.dataHandling.analysisTimestamp), 'PPp')}</p>
                                                              {analysisResult.dataHandling.recordingDeleted && (
                                                                <>
                                                                    <p className="flex items-center gap-1.5"><Timer className="h-3 w-3" /><strong>Duration:</strong> {analysisResult.dataHandling.deletionTimestamp}</p>
                                                                    <p className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-success"/><strong>Media Deleted:</strong> Yes</p>
                                                                </>
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
                                                                        {impact.didApply ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
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
                                                
                                                {analysisResult.coachingRecommendations.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold text-foreground">Coaching Recommendations</h4>
                                                        <div className="mt-2 space-y-3">
                                                            {analysisResult.coachingRecommendations.map((rec, i) => (
                                                                <div key={i} className="p-3 border rounded-md bg-background/50">
                                                                    <p className="font-medium text-foreground">{rec.area}</p>
                                                                    <p className="text-sm text-muted-foreground mt-1">{rec.recommendation}</p>
                                                                    {rec.example && (
                                                                        <div className="mt-2 p-2 bg-muted/50 rounded-md border-l-2 border-primary">
                                                                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><MessageSquareQuote className="h-4 w-4 text-primary" /> Example</p>
                                                                            <blockquote className="mt-1 text-sm italic text-primary/90">"{rec.example}"</blockquote>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {isEmployee && (
                                     <Card>
                                        <CardHeader>
                                            <CardTitle className="font-semibold text-foreground flex items-center gap-2 text-lg">
                                                <UserIcon className="h-5 w-5 text-muted-foreground" /> Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                             <p className="whitespace-pre-wrap text-sm text-muted-foreground">{analysisResult.employeeSummary}</p>
                                        
                                            {analysisResult.employeeSwotAnalysis && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-muted-foreground">
                                                    <div className="space-y-1">
                                                        <h5 className="font-medium flex items-center gap-1.5 text-green-600 dark:text-green-400"><Lightbulb className="h-4 w-4"/>Strengths</h5>
                                                        <ul className="list-disc pl-5 text-sm">
                                                            {analysisResult.employeeSwotAnalysis?.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h5 className="font-medium flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400"><TrendingDown className="h-4 w-4"/>Weaknesses</h5>
                                                        <ul className="list-disc pl-5 text-sm">
                                                            {analysisResult.employeeSwotAnalysis?.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h5 className="font-medium flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><BrainCircuit className="h-4 w-4"/>Opportunities</h5>
                                                        <ul className="list-disc pl-5 text-sm">
                                                            {analysisResult.employeeSwotAnalysis?.opportunities.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h5 className="font-medium flex items-center gap-1.5 text-red-600 dark:text-red-500"><ShieldCheck className="h-4 w-4"/>Threats</h5>
                                                        <ul className="list-disc pl-5 text-sm">
                                                           {analysisResult.employeeSwotAnalysis?.threats.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                     </Card>
                                )}

                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold text-foreground">Action Items</h4>
                                    <div className="mt-2 space-y-4">
                                      {supervisorActionItems.length > 0 && (
                                          <div key={`${item.id}-supervisor-items`}>
                                              <h5 className="font-medium">{formatActorName('Supervisor')}</h5>
                                              <div className="space-y-2 mt-2">
                                                  {supervisorActionItems.map(ai => {
                                                      const isOwner = isSupervisorForThisInsight;
                                                      return (
                                                          <div key={ai.id} className="flex items-center gap-3">
                                                              <Checkbox id={`item-${ai.id}`} checked={ai.status === 'completed'} onCheckedChange={() => handleToggleActionItem(item.id, ai.id)} disabled={!isOwner} />
                                                              <label htmlFor={`item-${ai.id}`} className={cn("text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", ai.status === 'completed' && "line-through text-muted-foreground")}>
                                                                  {ai.task}
                                                              </label>
                                                              {ai.completedAt && <span className="text-xs text-muted-foreground">({format(new Date(ai.completedAt), 'MMM d')})</span>}
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      )}
                                      {employeeActionItems.length > 0 && (
                                          <div key={`${item.id}-employee-items`}>
                                              <h5 className="font-medium">{formatActorName('Employee')}</h5>
                                               <div className="space-y-2 mt-2">
                                                  {employeeActionItems.map(ai => {
                                                      const isOwner = isEmployee;
                                                      return (
                                                          <div key={ai.id} className="flex items-center gap-3">
                                                              <Checkbox id={`item-${ai.id}`} checked={ai.status === 'completed'} onCheckedChange={() => handleToggleActionItem(item.id, ai.id)} disabled={!isOwner} />
                                                              <label htmlFor={`item-${ai.id}`} className={cn("text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", ai.status === 'completed' && "line-through text-muted-foreground")}>
                                                                  {ai.task}
                                                              </label>
                                                              {ai.completedAt && <span className="text-xs text-muted-foreground">({format(new Date(ai.completedAt), 'MMM d')})</span>}
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {(isSupervisorForThisInsight || isManagerialRole) && displayedMissedSignals.length > 0 && (
                                       <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 mt-4">
                                          <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2"><AlertTriangle className="text-yellow-500"/>Missed Signals</h4>
                                           <ul className="list-disc pl-5 mt-2 space-y-1 text-yellow-600 dark:text-yellow-300">
                                              {displayedMissedSignals.map((signal, i) => <li key={i}>{signal}</li>)}
                                          </ul>
                                      </div>
                                  )}

                                </div>
                                
                                {insight && (
                                    <Card className="mt-4">
                                        <CardHeader>
                                            <CardTitle className="font-semibold text-foreground flex items-center gap-2 text-lg">
                                                <AlertTriangle className="h-5 w-5 text-destructive" />Critical Coaching Insight & Resolution
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">{insight.summary}</p>
                                                <p className="text-sm text-muted-foreground mt-2"><strong>Why it matters:</strong> {insight.reason}</p>
                                                
                                                {canSupervisorAct && (
                                                    <div className="mt-4">
                                                        {addressingInsightId !== item.id ? (
                                                            <div className="flex items-center gap-4">
                                                                <Button variant="destructive" onClick={() => setAddressingInsightId(item.id)}>
                                                                    Address Insight
                                                                </Button>
                                                                {insight.auditTrail && insight.auditTrail.length > 0 && (
                                                                    <SlaTimer expiryTimestamp={addHours(new Date(insight.auditTrail[0].timestamp), 48).getTime()} />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2 bg-background/50 p-3 rounded-md">
                                                                <Label htmlFor={`supervisor-response-${item.id}`} className="text-foreground font-semibold">
                                                                    How did you address this?
                                                                </Label>
                                                                <Textarea
                                                                    id={`supervisor-response-${item.id}`}
                                                                    value={supervisorResponse}
                                                                    onChange={(e) => setSupervisorResponse(e.target.value)}
                                                                    rows={4}
                                                                    className="bg-background"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        onClick={() => handleAddressInsightSubmit(item)}
                                                                        disabled={isSubmittingResponse || !supervisorResponse}
                                                                    >
                                                                        {isSubmittingResponse && <Loader2 className="mr-2 animate-spin" />}
                                                                        Submit
                                                                    </Button>
                                                                    <Button variant="ghost" onClick={() => setAddressingInsightId(null)}>
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {insight.auditTrail && <InsightAuditTrail trail={insight.auditTrail} />}

                                                {canSupervisorRetry && (
                                                     <div className="mt-4 p-4 border rounded-lg bg-purple-500/10 space-y-4">
                                                        <h4 className="font-semibold text-lg text-purple-700 dark:text-purple-400">Action Required: Retry 1-on-1</h4>
                                                        
                                                        {amCoachingNotes && (
                                                             <div className="p-3 bg-muted/80 rounded-md border">
                                                                <p className="font-semibold text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />AM Coaching Notes ({formatActorName('AM')})</p>
                                                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{amCoachingNotes}</p>
                                                            </div>
                                                        )}
                                                        
                                                        <p className="text-sm text-muted-foreground">
                                                          Your AM has reviewed this case and coached you. Please re-engage with the employee to address their remaining concerns.
                                                        </p>

                                                        {retryingInsightId !== item.id ? (
                                                            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setRetryingInsightId(item.id)}>
                                                                <Repeat className="mr-2 h-4 w-4" /> Log Retry Actions
                                                            </Button>
                                                        ) : (
                                                            <div className="space-y-2 bg-background/50 p-3 rounded-md">
                                                                <Label htmlFor={`retry-response-${item.id}`} className="text-foreground font-semibold">
                                                                    Describe your follow-up actions
                                                                </Label>
                                                                <Textarea
                                                                    id={`retry-response-${item.id}`}
                                                                    value={retryResponse}
                                                                    onChange={(e) => setRetryResponse(e.target.value)}
                                                                    rows={4}
                                                                    className="bg-background"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        onClick={() => handleRetrySubmit(item)}
                                                                        disabled={isSubmittingRetry || !retryResponse}
                                                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                                                    >
                                                                        {isSubmittingRetry && <Loader2 className="mr-2 animate-spin" />}
                                                                        Submit Follow-up
                                                                    </Button>
                                                                    <Button variant="ghost" onClick={() => setRetryingInsightId(null)}>
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                     </div>
                                                )}

                                                {canEmployeeAck && (
                                                    <div className="mt-4 pt-4 border-t border-dashed space-y-4">
                                                        <div className="space-y-1">
                                                            <Label className="font-semibold text-base text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                                                <MessageCircleQuestion className="h-5 w-5" /> Your Acknowledgement
                                                            </Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                Please review the latest response and provide feedback on the resolution.
                                                            </p>
                                                        </div>
                                                        <RadioGroup onValueChange={setEmployeeAcknowledgement} value={employeeAcknowledgement}>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="The concern was fully addressed to my satisfaction." id={`ack-yes-${item.id}`} />
                                                                <Label htmlFor={`ack-yes-${item.id}`}>The concern was fully addressed to my satisfaction.</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="The concern was partially addressed, but I still have reservations." id={`ack-partial-${item.id}`} />
                                                                <Label htmlFor={`ack-partial-${item.id}`}>The concern was partially addressed, but I still have reservations.</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="I do not feel the concern was adequately addressed." id={`ack-no-${item.id}`} />
                                                                <Label htmlFor={`ack-no-${item.id}`}>I do not feel the concern was adequately addressed.</Label>
                                                            </div>
                                                        </RadioGroup>
                                                        <div className="space-y-2 pt-2">
                                                            <Label htmlFor={`ack-comments-${item.id}`}>Additional Comments (Optional)</Label>
                                                            <Textarea
                                                                id={`ack-comments-${item.id}`}
                                                                value={acknowledgementComments}
                                                                onChange={(e) => setAcknowledgementComments(e.target.value)}
                                                                placeholder="Provide more detail about your selection..."
                                                                rows={3}
                                                                className="bg-background"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 pt-2">
                                                            <Button
                                                                onClick={() => handleEmployeeAckSubmit(item)}
                                                                disabled={isSubmittingAck || !employeeAcknowledgement}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                            >
                                                                {isSubmittingAck && <Loader2 className="mr-2 animate-spin" />}
                                                                Submit Acknowledgement
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {isManagerialRole && <EscalationActionWidget item={item} onUpdate={fetchHistory} role={role} />}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}

function OneOnOnePage({ role }: { role: Role }) {
  const { meetings: upcomingMeetings, supervisor } = useMemo(() => getMeetingDataForRole(role), [role]);
  const [meetings, setMeetings] = useState(upcomingMeetings);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const handleSchedule = (details: any) => {
    toast({
        title: "Meeting Scheduled!",
        description: "In a real app, this would save to a database."
    })
    setIsScheduleDialogOpen(false);
  }
  
  const handleCancelMeeting = (meetingId: number) => {
    toast({
        title: "Meeting Cancelled",
        description: `Meeting ${meetingId} has been removed.`,
    })
    setMeetings(meetings.filter(m => m.id !== m.id));
  }

  const handleStartMeeting = (meeting: Meeting) => {
    // Save meeting data to sessionStorage to pass it to the next page
    sessionStorage.setItem('current_1_on_1_meeting', JSON.stringify({ meeting, supervisor }));
    router.push('/1-on-1/feedback');
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, 'p');
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline text-foreground">1-on-1s</h1>
        {['Team Lead', 'AM', 'Manager', 'HR Head'].includes(role) && (
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 text-green-300" />
                  Schedule New Meeting
                </Button>
              </DialogTrigger>
              <ScheduleMeetingDialog onSchedule={handleSchedule} />
            </Dialog>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Upcoming Meetings</h2>
        {meetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="border rounded-lg">
                <div className="flex items-center justify-between p-3 py-2">
                    <h3 className="text-lg font-semibold">{meeting.with}</h3>
                     {['Team Lead', 'AM', 'Manager', 'HR Head'].includes(role) && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleStartMeeting(meeting)}>
                            <Video className="h-5 w-5 text-green-500" />
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <CalendarCheck className="h-5 w-5 text-blue-500" />
                                </Button>
                            </DialogTrigger>
                            <ScheduleMeetingDialog meetingToEdit={meeting} onSchedule={handleSchedule} />
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <CalendarX className="h-5 w-5" />
                                </Button>
                            </AlertDialogTrigger>
                              <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently cancel your meeting with {meeting.with} on {format(new Date(meeting.date), 'PPP')} at {formatTime(meeting.time)}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Go Back</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelMeeting(meeting.id)} className={cn(buttonVariants({variant: 'destructive'}))}>
                                  Yes, Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    )}
                </div>
                <div className="border-t p-3 py-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{format(new Date(meeting.date), 'MM/dd/yy')}</span>
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{formatTime(meeting.time)}</span>
                    <BriefingPacketDialog meeting={meeting} supervisor={supervisor} viewerRole={role} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-lg">No upcoming meetings.</p>
            {['Team Lead', 'AM', 'Manager', 'HR Head'].includes(role) && (
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Schedule New Meeting" to get started.
                </p>
            )}
          </div>
        )}
      </div>
      
      <ToDoSection role={role} />

      <HistorySection role={role} />
    </div>
  );
}


export default function Home() {
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
    return <RoleSelection onSelectRole={setRole} />;
  }

  return (
    <DashboardLayout role={role} onSwitchRole={setRole}>
        <OneOnOnePage role={role} />
    </DashboardLayout>
  );
}

    

    







