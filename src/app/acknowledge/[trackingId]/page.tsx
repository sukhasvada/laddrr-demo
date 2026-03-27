
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFeedbackById, Feedback } from '@/services/feedback-service';
import { useRole } from '@/hooks/use-role';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// This page is currently not used in the simplified workflow.
// It will be wired up when we add the next level of escalation (Employee Acknowledgement).
export default function AcknowledgePage() {
    const { trackingId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { role, isLoading: isRoleLoading } = useRole();
    const [feedbackItem, setFeedbackItem] = useState<Feedback | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchFeedback = async () => {
            if (!trackingId || typeof trackingId !== 'string') return;
            setIsLoading(true);
            try {
                const item = await getFeedbackById(trackingId);
                setFeedbackItem(item);
            } catch (error) {
                console.error("Failed to fetch feedback", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the feedback item.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchFeedback();
    }, [trackingId, toast]);

    if (isLoading || isRoleLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center p-4">
                <Skeleton className="h-96 w-full max-w-2xl" />
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
             <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Acknowledge Resolution</CardTitle>
                    <CardDescription>This feature is not yet active in the current workflow.</CardDescription>
                </CardHeader>
                 <CardFooter className="flex justify-start">
                     <Button asChild variant="outline">
                        <Link href="/messages">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Link>
                    </Button>
                </CardFooter>
             </Card>
        </div>
    )
}

