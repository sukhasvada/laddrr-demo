"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertOctagon, TrendingDown, Users } from 'lucide-react';

const warningData = [
    { team: 'Sales Team B', metric: 'Trust Score', change: -15, description: 'Significant drop following re-org.' },
    { team: 'Engineering - Platform', metric: 'Feedback Tone', change: -8, description: 'Increased negative sentiment in 1-on-1s.' },
];

export default function EarlyWarningSystemWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertOctagon className="text-destructive" />
          Early Warning System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warningData.map(item => (
          <div key={item.team} className="p-3 border rounded-lg bg-destructive/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-destructive flex items-center gap-2">
                    <Users className="h-4 w-4"/>
                    {item.team}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-destructive">
                <TrendingDown className="h-4 w-4" />
                <span>{item.change}%</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
