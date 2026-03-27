"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const heatmapData = [
  { program: 'Interviewer Lab', department: 'Engineering', impact: 18 },
  { program: 'Interviewer Lab', department: 'Sales', impact: 5 },
  { program: 'Leadership Dev', department: 'Engineering', impact: 12 },
  { program: 'Leadership Dev', department: 'Sales', impact: 22 },
];

const getImpactColor = (impact: number) => {
  if (impact > 20) return 'bg-green-600';
  if (impact > 15) return 'bg-green-500';
  if (impact > 10) return 'bg-green-400';
  if (impact > 5) return 'bg-yellow-400';
  return 'bg-yellow-300';
};

export default function ProgramImpactHeatmapWidget() {
  const departments = ['Engineering', 'Sales'];
  const programs = ['Interviewer Lab', 'Leadership Dev'];

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="text-orange-500" />
          Program Impact Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
            <div className="flex gap-4">
                <div className="flex flex-col gap-2 mt-8 text-sm font-medium">
                    {programs.map(p => <div key={p} className="h-10 flex items-center">{p}</div>)}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                    {departments.map(dept => (
                        <div key={dept} className="flex flex-col gap-2">
                            <div className="text-center font-medium text-sm h-8">{dept}</div>
                            {programs.map(prog => {
                                const entry = heatmapData.find(d => d.department === dept && d.program === prog);
                                const impact = entry ? entry.impact : 0;
                                return (
                                    <Tooltip key={`${dept}-${prog}`}>
                                        <TooltipTrigger asChild>
                                            <div className={cn(
                                                "h-10 w-full rounded-md flex items-center justify-center text-white font-bold text-xs",
                                                getImpactColor(impact)
                                            )}>
                                                +{impact}%
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{prog} in {dept}</p>
                                            <p>Leadership Score Impact: +{impact}%</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
