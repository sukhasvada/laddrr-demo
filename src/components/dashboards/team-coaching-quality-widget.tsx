
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getTeamCoachingQualityIndex, TeamCoachingQuality } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';

export default function TeamCoachingQualityWidget() {
  const { role } = useRole();
  const [qualityData, setQualityData] = useState<TeamCoachingQuality[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const data = await getTeamCoachingQualityIndex(role);
    setQualityData(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchData();
    window.addEventListener('feedbackUpdated', fetchData);
    return () => window.removeEventListener('feedbackUpdated', fetchData);
  }, [fetchData]);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="text-purple-500" />
          Team Coaching Quality Index
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : qualityData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {qualityData.map(item => (
              <div key={item.teamLeadName} className="p-4 border rounded-lg text-center bg-muted/50">
                <p className="font-semibold">{item.teamLeadName}</p>
                <p className={`text-3xl font-bold ${getScoreColor(item.qualityScore)}`}>{item.qualityScore.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{item.totalSessions} sessions</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Not enough data to calculate coaching quality.</p>
        )}
      </CardContent>
    </Card>
  );
}
