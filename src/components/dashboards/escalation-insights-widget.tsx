
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getEscalationInsights, EscalationInsight } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, Lightbulb } from 'lucide-react';

export default function EscalationInsightsWidget() {
  const { role } = useRole();
  const [insights, setInsights] = useState<EscalationInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const data = await getEscalationInsights(role);
    setInsights(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchData();
    window.addEventListener('feedbackUpdated', fetchData);
    return () => window.removeEventListener('feedbackUpdated', fetchData);
  }, [fetchData]);

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="text-orange-500" />
          Escalation Root Causes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map(insight => (
              <div key={insight.theme} className="p-3 border rounded-lg bg-orange-500/10 border-orange-500/20">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm text-orange-700 dark:text-orange-400">{insight.theme}</p>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-300">{insight.count} cases</span>
                </div>
                 <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                    <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{insight.recommendation}</span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No escalation patterns identified yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
