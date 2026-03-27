"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Lightbulb, ChevronsRight } from 'lucide-react';

// Mock data
const advice = {
  title: "Focus on Empathy for Team Alpha",
  description: "Recent 1-on-1 analyses for Team Alpha show a consistent decline in 'Empathy' scores during feedback sessions. This correlates with a slight dip in their team pulse.",
  action: "Suggest a targeted micro-training on 'Active Listening' for the Team Lead.",
};

export default function AiAdvisorWidget() {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <Bot />
          AI Leadership Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <p className="font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="text-yellow-400" /> {advice.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{advice.description}</p>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-background/70 border">
            <div>
                <p className="text-sm font-medium">Recommended Action</p>
                <p className="text-sm text-muted-foreground">{advice.action}</p>
            </div>
            <Button size="sm">
                Take Action <ChevronsRight className="ml-1 h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
