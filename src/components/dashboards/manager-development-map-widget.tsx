
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getManagerDevelopmentMapData, DevelopmentMapNode } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Map, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { roleUserMapping } from '@/lib/role-mapping';

export default function ManagerDevelopmentMapWidget() {
  const { role } = useRole();
  const [mapData, setMapData] = useState<DevelopmentMapNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const data = await getManagerDevelopmentMapData(role);
    setMapData(data);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchData();
    window.addEventListener('feedbackUpdated', fetchData);
    return () => window.removeEventListener('feedbackUpdated', fetchData);
  }, [fetchData]);

  const getTrajectoryIcon = (trajectory: 'positive' | 'negative' | 'stable') => {
    switch (trajectory) {
        case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
        case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="text-primary" />
          Manager Development Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : mapData.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            {mapData.map(node => (
              <TooltipProvider key={node.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 cursor-pointer">
                      <Avatar className="h-16 w-16 border-2 border-primary/50">
                        <AvatarFallback className="text-xl bg-muted">{roleUserMapping[node.role as keyof typeof roleUserMapping]?.fallback}</AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{node.name}</span>
                        {getTrajectoryIcon(node.trajectory)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{node.name} ({node.role})</p>
                    <p>Leadership Score: {node.leadershipScore.toFixed(1)}</p>
                    <p>Trajectory: {node.trajectory}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No team lead data to display.</p>
        )}
      </CardContent>
    </Card>
  );
}
