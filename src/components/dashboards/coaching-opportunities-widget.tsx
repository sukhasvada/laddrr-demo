"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getOneOnOneHistory, OneOnOneHistoryItem } from '@/services/feedback-service';
import { roleUserMapping } from '@/lib/role-mapping';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, MessageSquareQuote } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

type CoachingOpportunity = {
  id: string;
  area: string;
  recommendation: string;
  employeeName: string;
  date: string;
}

export default function CoachingOpportunitiesWidget() {
  const { role } = useRole();
  const [opportunities, setOpportunities] = useState<CoachingOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOpportunities = useCallback(async () => {
    if (!role) return;
    const userName = roleUserMapping[role]?.name;
    if (!userName) return;

    setIsLoading(true);
    const history = await getOneOnOneHistory();
    const allOpportunities: CoachingOpportunity[] = [];

    history.forEach(item => {
      if (item.supervisorName === userName) {
        item.analysis.coachingRecommendations.forEach(rec => {
          // Only show new, unactioned recommendations
          if (rec.status === 'pending') {
            allOpportunities.push({
              id: rec.id,
              area: rec.area,
              recommendation: rec.recommendation,
              employeeName: item.employeeName,
              date: item.date,
            });
          }
        });
      }
    });

    setOpportunities(allOpportunities.slice(0, 4)); // Show latest 4
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchOpportunities();
    window.addEventListener('feedbackUpdated', fetchOpportunities);
    return () => window.removeEventListener('feedbackUpdated', fetchOpportunities);
  }, [fetchOpportunities]);

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="text-purple-500" />
          Coaching Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : opportunities.length > 0 ? (
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-4">
              {opportunities.map(opp => (
                <div key={opp.id} className="p-3 border rounded-lg bg-muted/50">
                  <p className="font-semibold text-primary">{opp.area}</p>
                  <p className="text-sm text-muted-foreground mt-1">"{opp.recommendation}"</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    From session with {opp.employeeName} {formatDistanceToNow(new Date(opp.date), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No new coaching opportunities found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
