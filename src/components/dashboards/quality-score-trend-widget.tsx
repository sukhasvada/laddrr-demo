
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRole } from '@/hooks/use-role';
import { getOneOnOneHistory } from '@/services/feedback-service';
import { roleUserMapping } from '@/lib/role-mapping';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';

export default function QualityScoreTrendWidget() {
  const { role } = useRole();
  const [chartData, setChartData] = useState<{ date: string; score: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    if (!role) return;
    const userName = roleUserMapping[role]?.name;
    if (!userName) return;

    setIsLoading(true);
    const history = await getOneOnOneHistory();
    const userSessions = history
      .filter(item => item.supervisorName === userName)
      .slice(0, 5) // Get last 5 sessions
      .reverse(); // Reverse to show trend over time

    const data = userSessions.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: item.analysis.effectivenessScore,
    }));

    setChartData(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchScores();
    window.addEventListener('feedbackUpdated', fetchScores);
    return () => window.removeEventListener('feedbackUpdated', fetchScores);
  }, [fetchScores]);

  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) {
      return [0, 10];
    }
    const scores = chartData.map(d => d.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    // Give some padding and round to nearest integer
    const yAxisMin = Math.max(0, Math.floor(minScore - 1));
    const yAxisMax = Math.min(10, Math.ceil(maxScore + 1));

    return [yAxisMin, yAxisMax];
  }, [chartData]);


  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChartIcon className="text-primary" />
          1-on-1 Quality Score Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : chartData.length > 0 ? (
          <ChartContainer
            config={{ score: { label: "Effectiveness", color: "hsl(var(--primary))" } }}
            className="h-[200px] w-full"
          >
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={yAxisDomain} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Line
                dataKey="score"
                type="monotone"
                stroke="var(--color-score)"
                strokeWidth={3}
                dot={{ r: 5, fill: "var(--color-score)", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="text-center py-8 h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">Not enough session data to display a trend.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
