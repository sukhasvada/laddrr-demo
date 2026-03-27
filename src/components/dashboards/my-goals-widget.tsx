
"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target } from 'lucide-react';

// Mock data representing goals assigned to the 'Employee' role.
// In a real application, this would be fetched based on the user's role.
const myGoalsData = [
    { kpi: 'Project Delivery Rate', weightage: '50%' },
    { kpi: 'Code Quality Score', weightage: '30%' },
    { kpi: 'Team Collab Rating', weightage: '20%' },
];

export default function MyGoalsWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="text-primary" />
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="h-auto text-center">KPI</TableHead>
                    <TableHead className="text-center w-[100px] h-auto">Weightage</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {myGoalsData.map((goal, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium py-2">{goal.kpi}</TableCell>
                        <TableCell className="text-center font-semibold text-primary py-2">{goal.weightage}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

