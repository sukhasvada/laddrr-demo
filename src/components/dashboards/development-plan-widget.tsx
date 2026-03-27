
"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getActiveCoachingPlansForUser, OneOnOneHistoryItem, updateCoachingProgress, addCoachingCheckIn, addCustomCoachingPlan } from '@/services/feedback-service';
import type { CoachingRecommendation, CheckIn } from '@/ai/schemas/one-on-one-schemas';
import { useRole, type Role } from '@/hooks/use-role';
import { roleUserMapping } from '@/lib/role-mapping';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Activity, BookOpen, Podcast, Newspaper, GraduationCap, Lightbulb, History, MessageSquare, Loader2, Check, Plus, Calendar as CalendarIcon, NotebookPen, Bot, HeartPulse } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { getGoalFeedback } from '@/ai/flows/get-goal-feedback-flow';
import type { GoalFeedbackInput } from '@/ai/schemas/goal-feedback-schemas';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateDevelopmentSuggestion } from '@/ai/flows/generate-development-suggestion-flow';
import type { DevelopmentSuggestionOutput, DevelopmentSuggestionInput } from '@/ai/schemas/development-suggestion-schemas';
import { AiGenieIcon } from '../ui/ai-genie-icon';
import Link from 'next/link';

const RecommendationIcon = ({ type }: { type: CoachingRecommendation['type'] }) => {
    switch (type) {
        case 'Book': return <BookOpen className="h-4 w-4 text-blue-500" />;
        case 'Podcast': return <Podcast className="h-4 w-4 text-purple-500" />;
        case 'Article': return <Newspaper className="h-4 w-4 text-green-500" />;
        case 'Course': return <GraduationCap className="h-4 w-4 text-orange-500" />;
        default: return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
};

function AddPlanDialog({ open, onOpenChange, onPlanAdded }: { open: boolean; onOpenChange: (open: boolean) => void; onPlanAdded: () => void }) {
    const { role } = useRole();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [area, setArea] = useState('');
    const [resource, setResource] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);


    const handleSubmit = async () => {
        if (!role || !area || !resource || !startDate || !endDate) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill out all fields to add a plan." });
            return;
        }
        setIsSubmitting(true);
        try {
            await addCustomCoachingPlan(role, { area, resource, startDate, endDate });
            toast({ title: "Development Plan Added", description: "Your new goal is now active." });
            onPlanAdded();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add custom plan", error);
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a Custom Development Goal</DialogTitle>
                    <DialogDescription>
                        Define a new coaching or development activity for yourself. This will appear in your active plan.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal-area" className="text-right">Goal Area</Label>
                        <Input id="goal-area" value={area} onChange={(e) => setArea(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal-resource" className="text-right">Activity</Label>
                        <Input id="goal-resource" value={resource} onChange={(e) => setResource(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start</Label>
                          <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "MM/dd/yy") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    mode="single" 
                                    selected={startDate} 
                                    onSelect={(date) => {
                                        setStartDate(date);
                                        setIsStartDatePickerOpen(false);
                                    }} 
                                    initialFocus 
                                />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                           <Label>End</Label>
                           <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "MM/dd/yy") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    mode="single" 
                                    selected={endDate} 
                                    onSelect={(date) => {
                                        setEndDate(date);
                                        setIsEndDatePickerOpen(false);
                                    }} 
                                    disabled={(date) => date < (startDate || new Date())} 
                                    initialFocus 
                                />
                            </PopoverContent>
                          </Popover>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !area || !resource || !startDate || !endDate}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SuggestPlanDialog({ open, onOpenChange, onPlanAdded }: { open: boolean, onOpenChange: (open: boolean) => void, onPlanAdded: () => void }) {
    const { role } = useRole();
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<DevelopmentSuggestionOutput['suggestions']>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && role) {
            setIsGenerating(true);
            setError(null);
            setSuggestions([]);
            
            const generate = async () => {
                try {
                    const userName = roleUserMapping[role]?.name;
                    if (!userName) throw new Error("User not found for role");

                    const activeGoals = await getActiveCoachingPlansForUser(role);
                    const coachingGoalsInProgress = activeGoals.map(p => ({
                        area: p.rec.area,
                        resource: p.rec.resource,
                    }));

                    const input: DevelopmentSuggestionInput = {
                        userName,
                        coachingGoalsInProgress,
                    };
                    
                    const result = await generateDevelopmentSuggestion(input);
                    setSuggestions(result.suggestions);
                } catch (err) {
                     console.error("Failed to generate suggestions:", err);
                     setError("Could not generate suggestions at this time. Please try again.");
                } finally {
                    setIsGenerating(false);
                }
            }
            generate();
        }
    }, [open, role]);

    const handleAddSuggestion = async (suggestion: DevelopmentSuggestionOutput['suggestions'][0]) => {
        if (!role) return;
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30); // Default 30-day timeline

        try {
            await addCustomCoachingPlan(role, {
                area: suggestion.area,
                resource: suggestion.resource,
                startDate,
                endDate,
            });
            toast({ title: "Development Plan Added", description: `The suggested goal for "${suggestion.area}" is now active.` });
            onPlanAdded();
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to Add Plan" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Bot /> AI-Suggested Development Goals</DialogTitle>
                    <DialogDescription>
                        Based on your recent activity, here are some personalized development goals.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {isGenerating && (
                         <div className="flex items-center justify-center h-48">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>Analyzing your profile...</p>
                            </div>
                        </div>
                    )}
                    {error && (
                         <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {!isGenerating && suggestions.length > 0 && (
                        <div className="space-y-3">
                            {suggestions.map((s, i) => (
                                <Card key={i} className="bg-muted/50">
                                    <CardContent className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-semibold text-primary">{s.area}</p>
                                            <p className="text-sm text-foreground">{s.resource}</p>
                                            <p className="text-xs text-muted-foreground italic mt-1">Justification: {s.justification}</p>
                                        </div>
                                        <Button size="sm" onClick={() => handleAddSuggestion(s)}>
                                            <Plus className="mr-2 h-4 w-4" /> Add to Plan
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                     {!isGenerating && suggestions.length === 0 && !error && (
                        <div className="text-center h-48 flex flex-col justify-center items-center">
                            <p className="text-muted-foreground">Could not generate any specific suggestions at this time.</p>
                            <p className="text-xs text-muted-foreground">Try again after your next 1-on-1 session.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function GoalFeedbackDialog({
    rec,
    historyId,
    open,
    onOpenChange,
    onFeedbackSubmitted
}: {
    rec: CoachingRecommendation | null;
    historyId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFeedbackSubmitted: () => void;
}) {
    const { toast } = useToast();
    const [situation, setSituation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setSituation('');
            setAiFeedback(null);
            setError(null);
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!rec || !situation) return;
        setIsSubmitting(true);
        setError(null);
        setAiFeedback(null);

        try {
            const input: GoalFeedbackInput = {
                goalArea: rec.area,
                goalDescription: rec.resource,
                userSituation: situation,
            };
            const result = await getGoalFeedback(input);
            setAiFeedback(result.feedback);
            
            // Log the AI feedback as a check-in
            const checkInMessage = `[AI FEEDBACK on "${rec.area}"]\nSITUATION: ${situation}\n\nCOACH: ${result.feedback}`;
            await addCoachingCheckIn(historyId, rec.id, checkInMessage);

            toast({ title: "AI Feedback Received", description: "Your AI coach's feedback has been added to your check-in history." });
            onFeedbackSubmitted();

        } catch (e) {
            console.error("Failed to get AI feedback", e);
            setError("The AI coach could not provide feedback at this time. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Get AI Feedback on Your Goal</DialogTitle>
                    <DialogDescription>
                        For your goal: <span className="font-semibold text-primary">{rec?.area} - {rec?.resource}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="situation-description">Describe a recent situation where you tried to apply this goal.</Label>
                        <Textarea
                            id="situation-description"
                            value={situation}
                            onChange={(e) => setSituation(e.target.value)}
                            placeholder="Example: I led a team meeting and tried to be more concise. It felt rushed, and I'm not sure everyone understood the key takeaways. What could I do differently?"
                            rows={6}
                        />
                    </div>
                    {isSubmitting && (
                         <Alert>
                            <div className="flex items-center gap-2 font-bold text-primary">
                                <Loader2 className="animate-spin" />
                                <AlertTitle>Thinking...</AlertTitle>
                            </div>
                            <AlertDescription>
                                Your AI coach is analyzing your situation. This may take a moment.
                            </AlertDescription>
                        </Alert>
                    )}
                    {error && (
                         <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                     {aiFeedback && (
                        <Alert variant="success">
                            <Bot className="h-4 w-4" />
                            <AlertTitle>AI Coach Feedback</AlertTitle>
                            <AlertDescription className="whitespace-pre-wrap">{aiFeedback}</AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !situation || !!aiFeedback}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        Get Feedback
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function DevelopmentPlanWidget() {
    const { role } = useRole();
    const { toast } = useToast();
    const [activePlans, setActivePlans] = useState<{ historyId: string | null; rec: CoachingRecommendation }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    
    const [checkInRec, setCheckInRec] = useState<{ historyId: string | null, rec: CoachingRecommendation, newProgress: number } | null>(null);
    const [checkInNotes, setCheckInNotes] = useState('');
    const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

    const [historyInView, setHistoryInView] = useState<CoachingRecommendation | null>(null);
    const [isAddPlanDialogOpen, setIsAddPlanDialogOpen] = useState(false);
    const [isSuggestPlanDialogOpen, setIsSuggestPlanDialogOpen] = useState(false);
    
    const [feedbackGoal, setFeedbackGoal] = useState<{ historyId: string | null, rec: CoachingRecommendation } | null>(null);

    const fetchActivePlans = useCallback(async () => {
        if (!role) return;
        setIsLoading(true);
        const userName = roleUserMapping[role as Role]?.name || role;
        if (!userName) {
            setIsLoading(false);
            return;
        }

        const plans = await getActiveCoachingPlansForUser(role);
        setActivePlans(plans.sort((a, b) => new Date(a.rec.startDate || 0).getTime() - new Date(b.rec.startDate || 0).getTime()));
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchActivePlans();
        const handleDataUpdate = () => fetchActivePlans();
        window.addEventListener('storage', handleDataUpdate);
        window.addEventListener('feedbackUpdated', handleDataUpdate);
        return () => {
            window.removeEventListener('storage', handleDataUpdate);
            window.removeEventListener('feedbackUpdated', handleDataUpdate);
        };
    }, [fetchActivePlans]);

    const debouncedProgressUpdate = useDebouncedCallback((historyId: string | null, recId: string, newProgress: number) => {
        const plan = activePlans.find(p => p.rec.id === recId);
        if (plan) {
            // Only trigger check-in if progress has increased
            if (newProgress > (plan.rec.progress ?? 0)) {
                setCheckInRec({ historyId, rec: plan.rec, newProgress });
            }
        }
    }, 500);

    const handleCheckInSubmit = () => {
        if (!checkInRec || !checkInNotes) return;
        
        const { historyId, rec, newProgress } = checkInRec;

        setIsSubmittingCheckIn(true);
        startTransition(async () => {
            await updateCoachingProgress(historyId, rec.id, newProgress);
            await addCoachingCheckIn(historyId, rec.id, checkInNotes);
            
            toast({
                title: "Progress Updated",
                description: "Your check-in has been logged successfully.",
            });
            
            setCheckInRec(null);
            setCheckInNotes('');
            setIsSubmittingCheckIn(false);
            fetchActivePlans();
        });
    }
    
    const handleCheckInCancel = () => {
        setCheckInRec(null);
        // Re-fetch to reset slider state to last saved value
        fetchActivePlans();
    }


    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    return (
        <>
            <AddPlanDialog 
                open={isAddPlanDialogOpen} 
                onOpenChange={setIsAddPlanDialogOpen} 
                onPlanAdded={fetchActivePlans} 
            />

            <SuggestPlanDialog
                open={isSuggestPlanDialogOpen}
                onOpenChange={setIsSuggestPlanDialogOpen}
                onPlanAdded={fetchActivePlans}
            />

             <GoalFeedbackDialog
                rec={feedbackGoal?.rec ?? null}
                historyId={feedbackGoal?.historyId ?? null}
                open={!!feedbackGoal}
                onOpenChange={() => setFeedbackGoal(null)}
                onFeedbackSubmitted={fetchActivePlans}
            />

            <Dialog open={!!checkInRec} onOpenChange={(isOpen) => !isOpen && handleCheckInCancel()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>How is it going?</DialogTitle>
                        <DialogDescription>
                            Let's log a quick check-in for your work on "{checkInRec?.rec.area}". Your progress is now at {checkInRec?.newProgress}%.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2 relative">
                        <Label htmlFor="checkin-notes">What have you learned or tried so far?</Label>
                        <Textarea 
                            id="checkin-notes"
                            value={checkInNotes}
                            onChange={(e) => setCheckInNotes(e.target.value)}
                            placeholder="Log your learnings and attempts here..."
                            rows={5}
                            className="pr-12 pb-12"
                        />
                         <Button 
                            size="icon" 
                            className="absolute bottom-6 right-4 h-8 w-8 rounded-full bg-success hover:bg-success/90"
                            onClick={handleCheckInSubmit} 
                            disabled={isSubmittingCheckIn || !checkInNotes}
                            aria-label="Save check-in"
                        >
                            {isSubmittingCheckIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!historyInView} onOpenChange={(isOpen) => !isOpen && setHistoryInView(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Check-in History</DialogTitle>
                        <DialogDescription>
                            Your progress journal for "{historyInView?.area}".
                        </DialogDescription>
                    </DialogHeader>
                     <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="py-4 space-y-4">
                            {historyInView?.checkIns && historyInView.checkIns.length > 0 ? (
                                historyInView.checkIns.slice().reverse().map(checkIn => (
                                    <div key={checkIn.id} className="flex items-start gap-3">
                                        <MessageSquare className="h-4 w-4 mt-1 text-primary/70 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">{format(new Date(checkIn.date), 'PPP, p')}</p>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{checkIn.notes}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No check-ins have been logged for this item yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader className="p-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="text-primary" />
                            Active Development Plan
                        </CardTitle>
                        <div className="flex items-center gap-1">
                             {role === 'HR Head' && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/org-health">
                                        <HeartPulse className="mr-2 h-4 w-4"/>
                                        Assign Tasks
                                    </Link>
                                </Button>
                             )}
                            <Button variant="ghost" size="icon" onClick={() => setIsSuggestPlanDialogOpen(true)} className="hover:bg-transparent transition-transform hover:scale-125">
                                <AiGenieIcon className="h-7 w-7 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddPlanDialogOpen(true)} className="hover:bg-transparent transition-transform hover:scale-125">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {activePlans.length === 0 ? (
                        <div className="p-1"></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {activePlans.map(({ historyId, rec }) => (
                                <div 
                                    key={rec.id} 
                                    className="p-2 space-y-1.5 border rounded-lg bg-card/50 flex flex-col justify-between min-h-[100px]"
                                >
                                     <div className="flex justify-between items-start gap-2">
                                        <div 
                                            className="flex-1 cursor-pointer overflow-hidden"
                                            onClick={() => setHistoryInView(rec)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setHistoryInView(rec); }}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <p className="font-semibold text-foreground leading-tight whitespace-normal pr-2">{rec.area}</p>
                                        </div>
                                        <div className="flex items-center">
                                            {rec.type === "Other" && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-primary/70 hover:text-primary"
                                                    onClick={() => setFeedbackGoal({ historyId, rec })}
                                                >
                                                    <Bot className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <p className="text-lg font-bold text-secondary flex-shrink-0">{rec.progress ?? 0}%</p>
                                        </div>
                                    </div>

                                    <div 
                                        className="w-full space-y-2 mt-auto"
                                    >
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                            <RecommendationIcon type={rec.type} />
                                            <span className="truncate">{rec.type}: {rec.resource}</span>
                                        </div>
                                        <div 
                                            className="w-full"
                                        >
                                            <Slider
                                                defaultValue={[rec.progress ?? 0]}
                                                max={100}
                                                step={10}
                                                onValueChange={(value) => debouncedProgressUpdate(historyId, rec.id, value[0])}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
