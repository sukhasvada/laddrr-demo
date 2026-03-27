
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getReadinessPipelineData, ReadinessPipelineData } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Rocket, User, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ReadinessPipelineWidget() {
  const { role } = useRole();
  const [pipelineData, setPipelineData] = useState<ReadinessPipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const data = await getReadinessPipelineData(role);
    setPipelineData(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchData();
    window.addEventListener('feedbackUpdated', fetchData);
    return () => window.removeEventListener('feedbackUpdated', fetchData);
  }, [fetchData]);

  const renderPipelineStage = (label: string, icon: React.ReactNode, percentage: number) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            <span>{label}</span>
        </div>
        <div className="flex items-center gap-3">
            <Progress value={percentage} className="h-2"/>
            <span className="font-semibold text-primary">{percentage.toFixed(0)}%</span>
        </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="text-blue-500" />
          Readiness Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : pipelineData ? (
          <div className="space-y-6">
            {renderPipelineStage("Employee → Team Lead", <User className="h-4 w-4 text-gray-500"/>, pipelineData.employeeToLead)}
            {renderPipelineStage("Team Lead → AM", <Users className="h-4 w-4 text-gray-500"/>, pipelineData.leadToAm)}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Insufficient data to build readiness pipeline.</p>
        )}
      </CardContent>
    </Card>
  );
}
