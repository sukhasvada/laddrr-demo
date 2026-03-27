"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart } from 'lucide-react';

const maturityData = [
  { level: 'Emerging', value: 25, color: 'bg-yellow-400' },
  { level: 'Developing', value: 45, color: 'bg-blue-400' },
  { level: 'Mature', value: 20, color: 'bg-green-400' },
  { level: 'Exemplary', value: 10, color: 'bg-purple-400' },
];

export default function LeadershipMaturityCurveWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart className="text-primary" />
          Leadership Maturity Curve
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {maturityData.map(item => (
            <div key={item.level} className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                    <p className="text-sm font-medium">{item.level}</p>
                    <p className="text-sm font-bold text-primary">{item.value}%</p>
                </div>
                <Progress value={item.value} className="h-2" indicatorClassName={item.color} />
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
