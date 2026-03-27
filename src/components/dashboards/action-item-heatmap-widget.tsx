
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getTeamActionItemStatus, getActionItemsForEmployee, ActionItemWithSource } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ListChecks, AlertTriangle, Calendar, BrainCircuit, Briefcase, CheckSquare, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const getSourceIcon = (source: ActionItemWithSource['sourceType']) => {
    switch (source) {
        case '1-on-1': return <Calendar className="h-4 w-4 text-green-500" />;
        case 'Coaching': return <BrainCircuit className="h-4 w-4 text-purple-500" />;
        case 'Training': return <Briefcase className="h-4 w-4 text-blue-500" />;
        default: return <ListChecks className="h-4 w-4" />;
    }
};

export default function ActionItemHeatmapWidget() {
  const { role } = useRole();
  const [teamStatus, setTeamStatus] = useState<Record<string, { open: number, overdue: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // State for the dialog
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeActionItems, setEmployeeActionItems] = useState<ActionItemWithSource[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    const status = await getTeamActionItemStatus(role);
    setTeamStatus(status);
    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchStatus();
    window.addEventListener('feedbackUpdated', fetchStatus);
    return () => window.removeEventListener('feedbackUpdated', fetchStatus);
  }, [fetchStatus]);

  const handleEmployeeClick = async (employeeName: string) => {
    setSelectedEmployee(employeeName);
    setIsLoadingItems(true);
    const items = await getActionItemsForEmployee(employeeName);
    setEmployeeActionItems(items);
    setIsLoadingItems(false);
  };

  const getColor = (open: number, overdue: number) => {
    if (overdue > 2) return 'bg-red-500';
    if (overdue > 0) return 'bg-yellow-500';
    if (open > 5) return 'bg-yellow-400';
    if (open > 0) return 'bg-green-500';
    return 'bg-green-300';
  };
  
  const hasData = Object.keys(teamStatus).length > 0;

  return (
    <>
      <Card>
        <CardHeader className="p-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="text-primary" />
            Team Action Item Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : hasData ? (
            <div className="flex flex-wrap gap-3">
              {Object.entries(teamStatus).map(([name, { open, overdue }]) => (
                <button
                  key={name}
                  onClick={() => handleEmployeeClick(name)}
                  className="flex items-center gap-2 border rounded-full px-3 py-1.5 bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full relative flex items-center justify-center",
                      getColor(open, overdue)
                    )}
                  >
                    {overdue > 0 && 
                      <AlertTriangle className="h-3 w-3 absolute text-white" />}
                  </span>
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">({open})</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No action items found for your team.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={(isOpen) => !isOpen && setSelectedEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Action Items for {selectedEmployee}</DialogTitle>
            <DialogDescription>
              A list of all tasks assigned to this team member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
            {isLoadingItems ? (
              <Skeleton className="h-40 w-full" />
            ) : employeeActionItems.length > 0 ? (
              <div className="space-y-3">
                {employeeActionItems.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50">
                      <div className="mt-1">
                        {item.status === 'completed' ? (
                          <CheckSquare className="h-5 w-5 text-green-500" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                          <p className={cn("font-medium text-foreground", item.status === 'completed' && "line-through text-muted-foreground")}>
                            {item.task}
                          </p>
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
            ) : (
              <p className="text-center text-muted-foreground py-8">No action items for {selectedEmployee}.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
