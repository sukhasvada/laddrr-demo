"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getTeamPulse } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeamPulseWidget() {
  const { role } = useRole();
  const [pulse, setPulse] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPulse = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const averageScore = await getTeamPulse(); // The service function is simplified for the employee view
    setPulse(averageScore);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  
  if (pulse === null) {
      return null;
  }

  const getPulseColor = (score: number) => {
    if (score > 4) return 'text-green-500';
    if (score > 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="h-5 w-5 text-red-500" />
          Team Pulse
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <p className={cn("text-4xl font-bold", getPulseColor(pulse))}>
          {pulse.toFixed(1)}
        </p>
        <p className="text-sm text-muted-foreground">/ 5.0</p>
      </CardContent>
    </Card>
  );
}
