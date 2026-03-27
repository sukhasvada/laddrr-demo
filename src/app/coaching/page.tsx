

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole, Role } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getOneOnOneHistory, OneOnOneHistoryItem, updateCoachingRecommendationStatus, reviewCoachingRecommendationDecline, acknowledgeDeclinedRecommendation } from '@/services/feedback-service';
import type { CoachingRecommendation } from '@/ai/schemas/one-on-one-schemas';
import { roleUserMapping } from '@/lib/role-mapping';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Zap, BookOpen, Podcast, Newspaper, GraduationCap, Lightbulb, ThumbsUp, ThumbsDown, Loader2, CheckCircle, MessageSquareQuote, BrainCircuit, Users, CheckSquare as CheckSquareIcon, UserCog, History, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


const RecommendationIcon = ({ type }: { type: CoachingRecommendation['type'] }) => {
    switch (type) {
        case 'Book': return <BookOpen className="h-4 w-4 text-blue-500" />;
        case 'Podcast': return <Podcast className="h-4 w-4 text-purple-500" />;
        case 'Article': return <Newspaper className="h-4 w-4 text-green-500" />;
        case 'Course': return <GraduationCap className="h-4 w-4 text-orange-500" />;
        default: return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
};

function MyDevelopmentWidget() {
    const { role } = useRole();
    const [recommendations, setRecommendations] = useState<{ historyItem?: OneOnOneHistoryItem; recommendation: CoachingRecommendation }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(undefined);


    // State for Decline Dialog
    const [decliningRec, setDecliningRec] = useState<{ historyId?: string; recommendation: CoachingRecommendation } | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

    // State for Accept Dialog
    const [acceptingRec, setAcceptingRec] = useState<{ historyId: string; recommendationId: string; } | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

    const fetchRecommendations = useCallback(async () => {
        if (!role) return;
        setIsLoading(true);
        const history = await getOneOnOneHistory();
        const recsMap = new Map<string, { historyItem: OneOnOneHistoryItem; recommendation: CoachingRecommendation }>();
        
        const currentUserName = role ? roleUserMapping[role].name : null;
        const statusesToFetch: CoachingRecommendation['status'][] = ['pending', 'declined', 'pending_am_review', 'pending_manager_acknowledgement'];

        history.forEach(item => {
            if (item.supervisorName === currentUserName) {
                item.analysis.coachingRecommendations.forEach(rec => {
                    // We only want to show actionable items or items that were just actioned (declined).
                    // Accepted items move to the other widget.
                    if (statusesToFetch.includes(rec.status)) {
                        // If we've already seen this rec, only keep the one from the most recent history item.
                        const existing = recsMap.get(rec.id);
                        if (!existing || new Date(item.date) > new Date(existing.historyItem.date)) {
                            recsMap.set(rec.id, { historyItem: item, recommendation: rec });
                        }
                    }
                });
            }
        });

        const allRecs = Array.from(recsMap.values());

        setRecommendations(allRecs.sort((a,b) => {
            const statusOrder = (status: CoachingRecommendation['status']) => {
                if (status === 'pending') return 1;
                if (status === 'pending_am_review') return 2;
                return 3;
            };
            return statusOrder(a.recommendation.status) - statusOrder(b.recommendation.status) || new Date(b.historyItem.date).getTime() - new Date(a.historyItem.date).getTime();
        }));
        setIsLoading(false);
    }, [role]);

    const handleUpdate = useCallback(() => {
        const currentOpenItem = openAccordionItem;
        fetchRecommendations().then(() => {
            if (currentOpenItem) {
                setOpenAccordionItem(currentOpenItem);
            }
        });
    }, [fetchRecommendations, openAccordionItem]);

    useEffect(() => {
        fetchRecommendations();
        const handleDataUpdate = () => fetchRecommendations();
        window.addEventListener('storage', handleDataUpdate);
        window.addEventListener('feedbackUpdated', handleDataUpdate);
        return () => {
            window.removeEventListener('storage', handleDataUpdate);
            window.removeEventListener('feedbackUpdated', handleDataUpdate);
        };
    }, [fetchRecommendations]);

    const handleCoachingRecAction = async (recommendationId: string, status: 'accepted' | 'declined', data?: { historyId?: string, reason?: string; startDate?: string; endDate?: string; }) => {
        try {
            await updateCoachingRecommendationStatus(recommendationId, status, data);
            toast({
                title: `Recommendation ${status}`,
                description: `The coaching recommendation has been updated.`,
            });
            handleUpdate();
        } catch (error) {
            console.error(`Failed to ${status} recommendation`, error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleDeclineSubmit = () => {
        if (!decliningRec || !rejectionReason) return;
        setIsSubmittingDecline(true);
        handleCoachingRecAction(decliningRec.recommendation.id, 'declined', { historyId: decliningRec.historyId, reason: rejectionReason }).finally(() => {
            setIsSubmittingDecline(false);
            setDecliningRec(null);
            setRejectionReason('');
        });
    };
    
    const handleAcceptSubmit = () => {
        if (!acceptingRec || !startDate || !endDate) return;
        setIsSubmittingAccept(true);
        handleCoachingRecAction(acceptingRec.recommendationId, 'accepted', { 
            historyId: acceptingRec.historyId,
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString() 
        }).finally(() => {
            setIsSubmittingAccept(false);
            setAcceptingRec(null);
            setStartDate(undefined);
            setEndDate(undefined);
        });
    };
    
    const getStatusBadge = (status: CoachingRecommendation['status']) => {
        switch(status) {
            case 'pending':
                return <Badge variant="destructive">Action Required</Badge>;
            case 'pending_am_review':
                 return <Badge className="bg-orange-500 text-white">AM Review</Badge>;
            case 'pending_manager_acknowledgement':
                return <Badge className="bg-red-700 text-white">Manager Review</Badge>;
            case 'declined':
                return <Badge variant="secondary">Declined</Badge>;
            default:
                return null;
        }
    }


    return (
        <>
            <Dialog open={!!decliningRec} onOpenChange={() => setDecliningRec(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Decline Recommendation</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for declining this coaching recommendation. This helps in understanding your needs better.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="rejection-reason">Justification</Label>
                        <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Provide your justification here..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDecliningRec(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeclineSubmit} disabled={!rejectionReason || isSubmittingDecline}>
                            {isSubmittingDecline && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Justification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={!!acceptingRec} onOpenChange={() => setAcceptingRec(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Your Development Plan</DialogTitle>
                        <DialogDescription>
                            Set a timeline for this coaching activity. This will help you and your manager track progress.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
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
                           <Label>Tentative End Date</Label>
                           <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
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
                    <DialogFooter>
                         <Button variant="ghost" onClick={() => setAcceptingRec(null)}>Cancel</Button>
                         <Button variant="success" onClick={handleAcceptSubmit} disabled={!startDate || !endDate || isSubmittingAccept}>
                            {isSubmittingAccept && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Accept & Start Plan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="text-primary" />
                        My Actionable Items
                    </CardTitle>
                    <CardDescription>
                        AI-powered recommendations based on your recent 1-on-1 sessions. Review pending items and view your history.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : recommendations.length === 0 ? (
                         <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold">All Caught Up!</h3>
                            <p className="text-muted-foreground mt-1">There are no new coaching recommendations for you.</p>
                        </div>
                    ) : (
                        <Accordion 
                          type="single" 
                          collapsible 
                          className="w-full"
                          value={openAccordionItem}
                          onValueChange={setOpenAccordionItem}
                        >
                            {recommendations.map(({ historyItem, recommendation: rec }) => {
                                const isActionable = rec.status === 'pending';
                                
                                return (
                                <AccordionItem value={rec.id} key={rec.id} className={cn(!isActionable && "bg-muted/30")}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex flex-col items-start text-left">
                                                <p className="font-semibold">{rec.area}</p>
                                                {historyItem && (
                                                    <p className="text-sm font-normal text-muted-foreground">From 1-on-1 with {historyItem.employeeName} on {format(new Date(historyItem.date), 'PPP')}</p>
                                                )}
                                            </div>
                                            <div className="mr-2">
                                                {getStatusBadge(rec.status)}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="p-3 bg-background/60 rounded-lg border space-y-3">
                                             <p className="text-sm text-muted-foreground">{rec.recommendation}</p>

                                             {rec.example && rec.example !== "N/A (user-added goal)" && (
                                                <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                                                    <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5"><MessageSquareQuote className="h-4 w-4 text-primary" /> Example from Session</p>
                                                    <blockquote className="mt-1 text-sm italic text-primary/90">"{rec.example}"</blockquote>
                                                </div>
                                             )}

                                            <div className="mt-3 pt-3 border-t">
                                                <div className="flex items-center gap-2 text-sm text-foreground mb-2">
                                                    <RecommendationIcon type={rec.type} />
                                                    <strong>{rec.type}:</strong> {rec.resource}
                                                </div>
                                                <p className="text-xs text-muted-foreground italic">AI Justification: "{rec.justification}"</p>
                                            </div>

                                             {isActionable && historyItem && (
                                                 <div className="flex gap-2 mt-4 pt-4 border-t">
                                                    <Button size="sm" variant="success" onClick={() => setAcceptingRec({ historyId: historyItem.id, recommendationId: rec.id })}>
                                                        <ThumbsUp className="mr-2 h-4 w-4" /> Accept
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => setDecliningRec({ historyId: historyItem.id, recommendation: rec })}>
                                                        <ThumbsDown className="mr-2 h-4 w-4" /> Decline
                                                    </Button>
                                                </div>
                                             )}

                                            {!isActionable && (
                                                <div className="mt-4 pt-4 border-t">
                                                    <p className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground"/>Status: {rec.status.replace(/_/g, ' ')}</p>
                                                    {rec.rejectionReason && (
                                                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                                            <p className="text-xs font-semibold text-muted-foreground">Your Decline Reason:</p>
                                                            <p className="text-sm text-foreground italic">"{rejectionReason}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </>
    );
}

function AmReviewWidget({ item, rec, onUpdate }: { item: OneOnOneHistoryItem, rec: CoachingRecommendation, onUpdate: () => void }) {
    const { toast } = useToast();
    const { role } = useRole();
    const [amNotes, setAmNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAmDecision = async (approved: boolean) => {
        if (!amNotes || !role) {
            toast({ variant: 'destructive', title: "Notes Required", description: "Please provide notes for your decision."});
            return;
        };
        setIsSubmitting(true);
        try {
            await reviewCoachingRecommendationDecline(item.id, rec.id, role, approved, amNotes);
            toast({ title: "Decision Submitted", description: `The coaching recommendation has been updated.`});
            onUpdate(); // This will trigger a re-fetch in the parent
        } catch (error) {
            console.error("Failed to submit review", error);
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmitting(false);
            setAmNotes('');
        }
    };

    return (
        <div className="space-y-4">
            <div className="p-3 bg-muted/80 rounded-lg border space-y-2">
                <p className="font-semibold text-foreground">Original AI Recommendation ({rec.area})</p>
                <p className="text-sm text-muted-foreground">{rec.recommendation}</p>
                {rec.example && (
                    <div className="mt-2 p-3 bg-background/80 rounded-md border-l-4 border-primary">
                        <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5"><MessageSquareQuote className="h-4 w-4 text-primary" /> Example from Session</p>
                        <blockquote className="mt-1 text-sm italic text-primary/90">"{rec.example}"</blockquote>
                    </div>
                )}
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 space-y-2">
                <p className="font-semibold text-blue-700 dark:text-blue-500">Supervisor's Reason for Declining</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{rec.rejectionReason}</p>
            </div>
            <div className="space-y-2 pt-4 border-t">
                <Label htmlFor={`am-notes-${rec.id}`}>Your Decision & Notes</Label>
                <Textarea 
                    id={`am-notes-${rec.id}`}
                    placeholder="Provide your reasoning here..."
                    value={amNotes}
                    onChange={(e) => setAmNotes(e.target.value)}
                    rows={3}
                />
            </div>
            <div className="flex gap-2">
                <Button onClick={() => handleAmDecision(false)} disabled={isSubmitting || !amNotes} variant="destructive">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Uphold AI
                </Button>
                <Button onClick={() => handleAmDecision(true)} disabled={isSubmitting || !amNotes} variant="secondary">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve Decline
                </Button>
            </div>
        </div>
    );
}

function ManagerAcknowledgementWidget({ item, rec, onUpdate }: { item: OneOnOneHistoryItem, rec: CoachingRecommendation, onUpdate: () => void }) {
    const { toast } = useToast();
    const { role } = useRole();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAcknowledge = async () => {
        if (!role) return;
        setIsSubmitting(true);
        try {
            await acknowledgeDeclinedRecommendation(item.id, rec.id, role);
            toast({ title: "Acknowledgement Logged", description: "The workflow for this recommendation is now complete." });
            onUpdate();
        } catch (error) {
            console.error("Failed to submit acknowledgement", error);
            toast({ variant: 'destructive', title: "Submission Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const amApprovalNotes = rec.auditTrail?.find(e => e.event === "Decline Approved by AM")?.details;
    const isActionable = rec.status === 'pending_manager_acknowledgement';

    return (
        <div className="space-y-4">
            <div className="space-y-2 p-3 rounded-lg border bg-muted/50">
                <Label className="font-semibold text-foreground">Original AI Recommendation: {rec.area}</Label>
                <p className="text-sm text-muted-foreground">{rec.recommendation}</p>
                {rec.example && (
                    <div className="p-2 bg-background/80 rounded-md border-l-2 border-primary mt-2">
                         <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><MessageSquareQuote className="h-4 w-4 text-primary" /> Example from Session</p>
                         <blockquote className="mt-1 text-sm italic text-primary/90">"{rec.example}"</blockquote>
                    </div>
                )}
            </div>

            <div className="space-y-2 p-3 rounded-lg border bg-blue-500/10 border-blue-500/20">
                <Label className="font-semibold text-blue-700 dark:text-blue-500">{item.supervisorName}'s (TL) Decline Reason</Label>
                <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{rec.rejectionReason}</p>
            </div>
            
            {amApprovalNotes && (
                <div className="space-y-2 p-3 rounded-lg border bg-orange-500/10 border-orange-500/20">
                    <Label className="font-semibold text-orange-700 dark:text-orange-500">AM's Approval Notes</Label>
                    <p className="text-sm text-orange-600 dark:text-orange-400 whitespace-pre-wrap">{amApprovalNotes}</p>
                </div>
            )}
            
            {isActionable ? (
                <div className="space-y-3 pt-4 border-t">
                     <Label className="font-semibold text-base">Your Action</Label>
                    <p className="text-sm text-muted-foreground">
                        No action is required other than acknowledging that you have seen this decision. This is for your awareness of your team's coaching and development activities.
                    </p>
                    <div className="flex gap-2 pt-2">
                         <Button onClick={handleAcknowledge} disabled={isSubmitting} variant="secondary">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Acknowledge & Close
                        </Button>
                    </div>
                </div>
            ) : (
                 <div className="space-y-3 pt-4 border-t">
                    <p className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground"/>This item has been acknowledged and is closed.</p>
                </div>
            )}
        </div>
    );
}

function TeamDevelopmentWidget({ role }: { role: Role }) {
    const [teamActions, setTeamActions] = useState<{ historyItem: OneOnOneHistoryItem; recommendation: CoachingRecommendation }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(undefined);

    const fetchTeamActions = useCallback(async () => {
        setIsLoading(true);
        const history = await getOneOnOneHistory();
        const actionsMap = new Map<string, { historyItem: OneOnOneHistoryItem; recommendation: CoachingRecommendation }>();
        
        const amActorName = roleUserMapping['AM']?.name;

        history.forEach(item => {
            item.analysis.coachingRecommendations.forEach(rec => {
                if (role === 'AM') {
                    const amWasInvolved = rec.auditTrail?.some(e => e.actor === amActorName);
                    // AM sees items pending their review, or items they have already reviewed
                    if (rec.status === 'pending_am_review' || (amWasInvolved && (rec.status === 'pending_manager_acknowledgement' || rec.status === 'declined' || rec.status === 'accepted'))) {
                         const existing = actionsMap.get(rec.id);
                        if (!existing || new Date(item.date) > new Date(existing.historyItem.date)) {
                           actionsMap.set(rec.id, { historyItem: item, recommendation: rec });
                        }
                    }
                } else if (role === 'Manager') {
                     // Manager sees items pending their acknowledgement, or that they have already acknowledged (status becomes 'declined')
                    if (rec.status === 'pending_manager_acknowledgement' || rec.status === 'declined') {
                        const existing = actionsMap.get(rec.id);
                        if (!existing || new Date(item.date) > new Date(existing.historyItem.date)) {
                           actionsMap.set(rec.id, { historyItem: item, recommendation: rec });
                        }
                    }
                }
            });
        });
        
        const pendingActions = Array.from(actionsMap.values());

        setTeamActions(pendingActions.sort((a,b) => {
            const dateA = a.recommendation.auditTrail?.slice(-1)[0]?.timestamp;
            const dateB = b.recommendation.auditTrail?.slice(-1)[0]?.timestamp;
            return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
        }));
        setIsLoading(false);
    }, [role]);

    const handleUpdate = useCallback(() => {
        const currentOpenItem = openAccordionItem;
        fetchTeamActions().then(() => {
            if (currentOpenItem) {
                setOpenAccordionItem(currentOpenItem);
            }
        });
    }, [fetchTeamActions, openAccordionItem]);

    useEffect(() => {
        fetchTeamActions();
        const handleDataUpdate = () => fetchTeamActions();
        window.addEventListener('storage', handleDataUpdate);
        window.addEventListener('feedbackUpdated', handleDataUpdate);
        return () => {
            window.removeEventListener('storage', handleDataUpdate);
            window.removeEventListener('feedbackUpdated', handleDataUpdate);
        };
    }, [fetchTeamActions]);

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (!['AM', 'Manager', 'HR Head'].includes(role)) {
        return null;
    }

    const renderWidgetContent = (item: OneOnOneHistoryItem, rec: CoachingRecommendation) => {
        if (rec.status === 'pending_am_review' && role === 'AM') {
            return <AmReviewWidget item={item} rec={rec} onUpdate={handleUpdate} />;
        }
        
        const amWasInvolved = rec.auditTrail?.some(e => e.actor === roleUserMapping['AM'].name);
        if (role === 'Manager' && (rec.status === 'pending_manager_acknowledgement' || rec.status === 'declined')) {
            return <ManagerAcknowledgementWidget item={item} rec={rec} onUpdate={handleUpdate} />;
        }
        if (role === 'AM' && amWasInvolved && (rec.status === 'pending_manager_acknowledgement' || rec.status === 'declined' || rec.status === 'accepted')) {
            // Re-use manager widget for read-only history view for AMs.
            return <ManagerAcknowledgementWidget item={item} rec={rec} onUpdate={handleUpdate} />;
        }
        return null;
    };

    const getTriggerInfo = (item: OneOnOneHistoryItem, rec: CoachingRecommendation) => {
        let icon = <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
        let title = "Coaching Item History";
        let subtitle = `For TL: ${item.supervisorName}`;
        let statusBadge = <Badge variant="secondary">Closed</Badge>;
        let isActionable = false;

        if (role === 'AM') {
            if (rec.status === 'pending_am_review') {
                isActionable = true;
                icon = <UserCog className="h-5 w-5 text-orange-600 dark:text-orange-500" />;
                title = "Review Declined Recommendation";
                statusBadge = <Badge variant="destructive">Action Required</Badge>;
            } else if (rec.status === 'pending_manager_acknowledgement') {
                 title = "Awaiting Manager Acknowledgement";
                 statusBadge = <Badge variant="secondary">Pending</Badge>;
            } else if (rec.status === 'accepted') {
                 title = "Mandated Development Plan";
                 subtitle += ` | Status: Active`
                 statusBadge = <Badge variant="success">Active</Badge>;
            } else { // Declined
                 title = "Declined Recommendation History";
                 statusBadge = <Badge variant="success">Closed</Badge>;
            }
        }
        if (role === 'Manager') {
            isActionable = rec.status === 'pending_manager_acknowledgement';
            icon = <CheckSquareIcon className="h-5 w-5 text-red-600 dark:text-red-500" />;
            title = isActionable ? "Acknowledge Declined Recommendation" : "Declined Recommendation History";
            subtitle = `For AM: ${roleUserMapping['AM'].name} | TL: ${item.supervisorName}`;
            statusBadge = isActionable ? <Badge variant="destructive">Ack Required</Badge> : <Badge variant="success">Acknowledged</Badge>;
        }
        return { icon, title, subtitle, statusBadge, isActionable };
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="text-primary"/>
                    Team Development
                </CardTitle>
                <CardDescription>
                    Review coaching and development items from your direct reports.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {teamActions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold">No Pending Team Actions</h3>
                        <p className="text-muted-foreground mt-1">Actions requiring your review will appear here.</p>
                    </div>
                ) : (
                    <Accordion 
                      type="single" 
                      collapsible 
                      className="w-full space-y-2"
                      value={openAccordionItem}
                      onValueChange={setOpenAccordionItem}
                    >
                        {teamActions.map(({ historyItem, recommendation: rec }) => {
                            const { icon, title, subtitle, statusBadge, isActionable } = getTriggerInfo(historyItem, rec);
                            const widgetContent = renderWidgetContent(historyItem, rec);
                            if (!widgetContent) return null; // Don't render if there's nothing to show
                            
                            return (
                                <AccordionItem value={rec.id} key={rec.id} className={cn("border rounded-lg", isActionable ? "bg-muted/30" : "bg-transparent")}>
                                    <AccordionTrigger className="px-4 py-3 w-full hover:no-underline">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-3">
                                                {icon}
                                                <div className="text-left">
                                                    <p className="font-semibold text-foreground">{title}</p>
                                                    <p className="text-sm font-normal text-muted-foreground">{subtitle}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mr-2">
                                                {statusBadge}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 border-t">
                                        {widgetContent}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}


export default function CoachingPage() {
  const { role, setRole, isLoading } = useRole();
  const isSupervisor = role && ['Team Lead', 'AM', 'Manager', 'HR Head'].includes(role);
  const isManager = role && ['AM', 'Manager', 'HR Head'].includes(role);

  if (isLoading || !role) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Skeleton className="h-screen w-full" />
      </div>
    );
  }
  
  return (
    <DashboardLayout role={role} onSwitchRole={setRole}>
        <div className="p-4 md:p-8 space-y-8">
            {isSupervisor && (
                <>
                    <MyDevelopmentWidget />
                </>
            )}
            {isManager && <TeamDevelopmentWidget role={role} />}
        </div>
    </DashboardLayout>
  );
}
