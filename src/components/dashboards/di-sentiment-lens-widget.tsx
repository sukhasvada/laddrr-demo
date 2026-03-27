"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Smile, Frown, Users } from 'lucide-react';

const diData = [
  { metric: 'Positive Feedback Tone', value: 'Balanced', delta: '+2% vs. org avg' },
  { metric: 'Critical Insight Escalations', value: 'Slightly High (Sales)', delta: '-5% vs. org avg' },
  { metric: 'Coaching Plan Adoption', value: 'Balanced', delta: '+0% vs. org avg' },
];

export default function DiSentimentLensWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="text-teal-500" />
          D&I Sentiment Lens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {diData.map(item => (
            <div key={item.metric} className="p-3 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{item.metric}</p>
                <div className="flex items-center justify-between mt-1">
                    <Badge variant={item.value === 'Balanced' ? 'success' : 'destructive'}>
                        {item.value}
                    </Badge>
                    <p className="text-xs font-semibold text-muted-foreground">{item.delta}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
