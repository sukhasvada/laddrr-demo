"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Mock data
const riskData = [
    { team: 'Alpha', risk: 75, manager: 'Ben Carter' },
    { team: 'Bravo', risk: 40, manager: 'Sarah Jones' },
    { team: 'Charlie', risk: 20, manager: 'Mike Lee' },
];

export default function AttritionRiskWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="text-destructive" />
          Predictive Attrition Risk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {riskData.map(item => (
            <div key={item.team} className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                    <p className="text-sm font-medium">{item.team} Team</p>
                    <p className="text-sm font-bold text-destructive">{item.risk}% Risk</p>
                </div>
                <Progress value={item.risk} className="h-2 [&>div]:bg-destructive" />
                <p className="text-xs text-muted-foreground">Lead: {item.manager}</p>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
