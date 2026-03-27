
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getAggregatedActionItems, ActionItemWithSource } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ListTodo, Calendar, Briefcase, BrainCircuit } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const getSourceIcon = (source: ActionItemWithSource['sourceType']) => {
    switch (source) {
        case '1-on-1': return <Calendar className="h-4 w-4 text-green-500" />;
        case 'Coaching': return <BrainCircuit className="h-4 w-4 text-purple-500" />;
        case 'Training': return <Briefcase className="h-4 w-4 text-blue-500" />;
        default: return <ListTodo className="h-4 w-4" />;
    }
}

export default function NextStepsWidget() {
  const { role } = useRole();
  const [actionItems, setActionItems] = useState<ActionItemWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActionItems = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const items = await getAggregatedActionItems(role);
    setActionItems(items);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchActionItems();
    window.addEventListener('feedbackUpdated', fetchActionItems);
    return () => {
        window.removeEventListener('feedbackUpdated', fetchActionItems);
    }
  }, [fetchActionItems]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (actionItems.length === 0) {
    return null; // Don't show if there are no items
  }

  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="text-primary" />
          Next Steps & Deadlines
        </CardTitle>
        <CardDescription>
          Your upcoming action items from all areas of the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {actionItems.map(item => (
                <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50">
                    <div className="mt-1">{getSourceIcon(item.sourceType)}</div>
                    <div className="flex-1">
                        <p className="font-medium text-foreground">{item.task}</p>
                        <p className="text-xs text-muted-foreground">From: {item.source}</p>
                    </div>
                    {item.dueDate && (
                        <Badge variant="outline" className="flex-shrink-0">
                            Due {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                        </Badge>
                    )}
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
