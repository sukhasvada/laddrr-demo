
"use client"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, UserMinus } from 'lucide-react';

// Mock data
const roiData = {
  investment: 25000,
  performanceIncrease: 7, // in percent
  retentionImpact: 3, // in percent
  netImpact: 52000,
};

export default function CoachingRoiWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="text-green-500" />
          Coaching ROI
        </CardTitle>
        <CardDescription>
          Estimated impact of coaching on performance and retention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/10">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-green-600" />
            <p className="font-medium text-green-700">Performance Lift</p>
          </div>
          <Badge variant="success">+{roiData.performanceIncrease}%</Badge>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-500/10">
          <div className="flex items-center gap-3">
            <UserMinus className="text-blue-600" />
            <p className="font-medium text-blue-700">Attrition Saved</p>
          </div>
          <Badge variant="default" className="bg-blue-500/20 text-blue-600">+{roiData.retentionImpact}%</Badge>
        </div>
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">Estimated Net Impact</p>
          <p className="text-3xl font-bold text-foreground">
            ${roiData.netImpact.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
