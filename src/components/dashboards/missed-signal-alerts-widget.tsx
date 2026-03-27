"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getOneOnOneHistory } from '@/services/feedback-service';
import { roleUserMapping } from '@/lib/role-mapping';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

type MissedSignal = {
    id: string;
    signal: string;
    employeeName: string;
    date: string;
}

export default function MissedSignalAlertsWidget() {
  const { role } = useRole();
  const [signals, setSignals] = useState<MissedSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    if (!role) return;
    const userName = roleUserMapping[role]?.name;
    if (!userName) return;
    
    setIsLoading(true);
    const history = await getOneOnOneHistory();
    const allSignals: MissedSignal[] = [];

    history.forEach(item => {
        if (item.supervisorName === userName && item.analysis.missedSignals) {
            item.analysis.missedSignals.forEach((signal, index) => {
                // Ensure the signal is not the same as a critical insight summary
                if (signal !== item.analysis.criticalCoachingInsight?.summary) {
                    allSignals.push({
                        id: `${item.id}-${index}`,
                        signal,
                        employeeName: item.employeeName,
                        date: item.date,
                    });
                }
            });
        }
    });

    setSignals(allSignals.slice(0, 4)); // Show latest 4
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchSignals();
    window.addEventListener('feedbackUpdated', fetchSignals);
    return () => window.removeEventListener('feedbackUpdated', fetchSignals);
  }, [fetchSignals]);

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="text-yellow-500" />
          Missed Signal Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : signals.length > 0 ? (
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-3">
              {signals.map(signal => (
                <div key={signal.id} className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-500/10 border-yellow-500/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">"{signal.signal}"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                          With {signal.employeeName} {formatDistanceToNow(new Date(signal.date), { addSuffix: true })}
                      </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No missed signals detected in recent sessions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
