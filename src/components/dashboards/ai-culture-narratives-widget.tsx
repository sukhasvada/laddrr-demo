"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Bot, Quote } from 'lucide-react';

const narrative = "For Q2, the organization showed a 12% improvement in 'Accountability' and 'Clarity' scores, largely driven by the Engineering department's adoption of structured 1-on-1s. However, 'Empathy' scores saw a slight 3% decline in Sales, suggesting a potential area for targeted coaching intervention. Overall, a positive trend towards a more direct and responsible feedback culture is emerging.";

export default function AiCultureNarrativesWidget() {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <Bot />
          AI Culture Narrative
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
            <Quote className="absolute -left-2 -top-1 h-8 w-8 text-primary/10" />
            <p className="text-foreground/90 italic pl-4 border-l-2 border-primary/20">
                {narrative}
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
