
"use client"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Award, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ComparePerformanceSheet } from './compare-performance-sheet';
import { Button } from '../ui/button';

// Mock data representing the employee's rank
const rankData = {
  rank: 3,
  total: 25,
  percentile: 12,
  methodology: 'Bell Curve'
};

export default function RankCardWidget() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="text-yellow-500" />
          Rank
        </CardTitle>
        <ComparePerformanceSheet />
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-4">
        <div className="flex items-baseline text-6xl font-bold">
            <span className="text-primary">{rankData.rank}</span>
            <span className="text-2xl text-muted-foreground ml-1">/ {rankData.total}</span>
        </div>
         <Badge variant="secondary" className="flex items-center gap-1.5 mt-4">
            <TrendingUp className="h-3 w-3 text-green-500"/>
            Up 2 spots from last quarter
        </Badge>
      </CardContent>
    </Card>
  );
}
