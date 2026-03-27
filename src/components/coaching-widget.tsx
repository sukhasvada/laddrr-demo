
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getOneOnOneHistory, OneOnOneHistoryItem, updateCoachingRecommendationStatus } from '@/services/feedback-service';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Zap, BookOpen, Podcast, Newspaper, GraduationCap, Lightbulb, ThumbsUp, ThumbsDown, Loader2, CheckCircle, MessageSquareQuote } from 'lucide-react';
import type { CoachingRecommendation } from '@/ai/schemas/one-on-one-schemas';
import { roleUserMapping } from '@/lib/role-mapping';
import { format } from 'date-fns';

const RecommendationIcon = ({ type }: { type: CoachingRecommendation['type'] }) => {
    switch (type) {
        case 'Book': return <BookOpen className="h-4 w-4" />;
        case 'Podcast': return <Podcast className="h-4 w-4" />;
        case 'Article': return <Newspaper className="h-4 w-4" />;
        case 'Course': return <GraduationCap className="h-4 w-4" />;
        default: return <Lightbulb className="h-4 w-4" />;
    }
};

export default function CoachingWidget() {
    const { role } = useRole();
    const [pendingRecommendations, setPendingRecommendations] = useState<{ historyItem: OneOnOneHistoryItem; recommendation: CoachingRecommendation }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const [decliningRec, setDecliningRec] = useState<{ historyId: string; recommendation: CoachingRecommendation } | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

    const fetchRecommendations = useCallback(async () => {
        if (!role) return;
        setIsLoading(true);
        const history = await getOneOnOneHistory();
        const pending: { historyItem: OneOnOneHistoryItem; recommendation: CoachingRecommendation }[] = [];
        
        const currentUserName = role ? roleUserMapping[role].name : null;

        history.forEach(item => {
            if (item.supervisorName === currentUserName) {
                item.analysis.coachingRecommendations.forEach(rec => {
                    if (rec.status === 'pending') {
                        pending.push({ historyItem: item, recommendation: rec });
                    }
                });
            }
        });

        setPendingRecommendations(pending);
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchRecommendations();
        window.addEventListener('feedbackUpdated', fetchRecommendations);
        return () => window.removeEventListener('feedbackUpdated', fetchRecommendations);
    }, [fetchRecommendations]);

    const handleCoachingRecAction = async (historyId: string, recommendationId: string, status: 'accepted' | 'declined', reason?: string) => {
        try {
            await updateCoachingRecommendationStatus(historyId, recommendationId, status, reason);
            toast({
                title: `Recommendation ${status}`,
                description: `The coaching recommendation has been updated.`,
            });
            fetchRecommendations();
        } catch (error) {
            console.error(`Failed to ${status} recommendation`, error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleDeclineSubmit = () => {
        if (!decliningRec || !rejectionReason) return;
        setIsSubmittingDecline(true);
        handleCoachingRecAction(decliningRec.historyId, decliningRec.recommendation.id, 'declined', rejectionReason).finally(() => {
            setIsSubmittingDecline(false);
            setDecliningRec(null);
            setRejectionReason('');
        });
    };

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap />
                        Recommended Coaching
                    </CardTitle>
                    <CardDescription>
                        AI-powered recommendations based on your recent 1-on-1 sessions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingRecommendations.length === 0 ? (
                         <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold">All Caught Up!</h3>
                            <p className="text-muted-foreground mt-1">There are no new coaching recommendations for you.</p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {pendingRecommendations.map(({ historyItem, recommendation: rec }) => (
                                <AccordionItem value={rec.id} key={rec.id}>
                                    <AccordionTrigger>
                                        <div className="flex flex-col items-start text-left">
                                            <p className="font-semibold">{rec.area}</p>
                                            <p className="text-sm font-normal text-muted-foreground">From 1-on-1 with {historyItem.employeeName} on {format(new Date(historyItem.date), 'PPP')}</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <div className="p-3 bg-background/60 rounded-lg border space-y-3">
                                             <p className="text-sm text-muted-foreground">{rec.recommendation}</p>

                                             {rec.example && (
                                                <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                                                    <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5"><MessageSquareQuote className="h-4 w-4" /> Example from Session</p>
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
                                             <div className="flex gap-2 mt-4 pt-4 border-t">
                                                <Button size="sm" variant="success" onClick={() => handleCoachingRecAction(historyItem.id, rec.id, 'accepted')}>
                                                    <ThumbsUp className="mr-2 h-4 w-4" /> Accept
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => setDecliningRec({ historyId: historyItem.id, recommendation: rec })}>
                                                    <ThumbsDown className="mr-2 h-4 w-4" /> Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
