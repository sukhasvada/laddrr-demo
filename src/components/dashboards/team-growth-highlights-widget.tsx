"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getTeamGrowthHighlights } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, User, Award } from 'lucide-react';

export default function TeamGrowthHighlightsWidget() {
  const { role } = useRole();
  const [highlights, setHighlights] = useState<{ employeeName: string; growth: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHighlights = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const data = await getTeamGrowthHighlights(role);
    setHighlights(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchHighlights();
    window.addEventListener('feedbackUpdated', fetchHighlights);
    return () => window.removeEventListener('feedbackUpdated', fetchHighlights);
  }, [fetchHighlights]);

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="text-green-500" />
          Team Growth Highlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-36 w-full" />
        ) : highlights.length > 0 ? (
          <div className="space-y-4">
            {highlights.map((item, index) => (
              <div key={item.employeeName} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                {index === 0 ? <Award className="h-6 w-6 text-yellow-400" /> : <User className="h-6 w-6 text-muted-foreground" />}
                <div className="flex-1">
                  <p className="font-semibold">{item.employeeName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-500">+{item.growth.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">score increase</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No growth highlights to show.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
