
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getAiInterventionLog, InterventionLogEntry } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AiInterventionLogWidget() {
  const { role } = useRole();
  const [log, setLog] = useState<InterventionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const data = await getAiInterventionLog(role);
    setLog(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchData();
    window.addEventListener('feedbackUpdated', fetchData);
    return () => window.removeEventListener('feedbackUpdated', fetchData);
  }, [fetchData]);

  const getStatusIcon = (status: 'Timely' | 'Delayed' | 'Unresolved') => {
    switch(status) {
        case 'Timely': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'Delayed': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        case 'Unresolved': return <ShieldAlert className="h-4 w-4 text-red-500" />;
    }
  }

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="text-destructive" />
          AI Intervention Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : log.length > 0 ? (
          <div className="space-y-4">
            {log.map(entry => (
              <div key={entry.id} className="p-3 border rounded-lg bg-muted/50">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm pr-4">{entry.summary}</p>
                    <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                        {getStatusIcon(entry.responseStatus)}
                        <span>{entry.responseStatus}</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  For {entry.employeeName} ({formatDistanceToNow(new Date(entry.date), { addSuffix: true })})
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No AI interventions recorded for your teams.</p>
        )}
      </CardContent>
    </Card>
  );
}
