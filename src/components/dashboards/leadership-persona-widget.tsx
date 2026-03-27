"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Users } from 'lucide-react';

// Mock data
const personaData = [
  { name: 'Coach', value: 45, fill: 'var(--color-coach)' },
  { name: 'Collaborator', value: 30, fill: 'var(--color-collaborator)' },
  { name: 'Commander', value: 15, fill: 'var(--color-commander)' },
  { name: 'Visionary', value: 10, fill: 'var(--color-visionary)' },
];

const chartConfig = {
  value: { label: 'Managers' },
  coach: { label: 'Coach', color: 'hsl(var(--chart-1))' },
  collaborator: { label: 'Collaborator', color: 'hsl(var(--chart-2))' },
  commander: { label: 'Commander', color: 'hsl(var(--chart-4))' },
  visionary: { label: 'Visionary', color: 'hsl(var(--chart-5))' },
};

export default function LeadershipPersonaWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="text-purple-500" />
          Leadership Persona Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart accessibilityLayer data={personaData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={80}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
