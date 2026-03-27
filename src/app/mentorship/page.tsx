
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Handshake } from 'lucide-react';
import { roleUserMapping } from '@/lib/role-mapping';
import { getNominationsForMentor, type LeadershipNomination } from '@/services/leadership-service';
import { Progress } from '@/components/ui/progress';

function MentorDashboard() {
    const { role } = useRole();
    const [mentees, setMentees] = useState<LeadershipNomination[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMentees = useCallback(async () => {
        if (!role) return;
        setIsLoading(true);
        const assignedMentees = await getNominationsForMentor(role);
        setMentees(assignedMentees);
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchMentees();
        window.addEventListener('feedbackUpdated', fetchMentees);
        return () => window.removeEventListener('feedbackUpdated', fetchMentees);
    }, [fetchMentees]);

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="space-y-1">
                    <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3">
                        <Handshake className="h-8 w-8 text-cyan-500" />
                        Mentorship Dashboard
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Track the progress of your assigned mentees in the Leadership Development Program.
                    </CardDescription>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Mentees</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-48 w-full" /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mentee</TableHead>
                                    <TableHead>Current Module</TableHead>
                                    <TableHead>Overall Progress</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mentees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            You have not been assigned any mentees yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    mentees.map(n => (
                                        <TableRow key={n.id}>
                                            <TableCell>
                                                <div className="font-medium">{roleUserMapping[n.nomineeRole]?.name || n.nomineeRole}</div>
                                                <div className="text-sm text-muted-foreground">{n.nomineeRole} → {n.targetRole}</div>
                                            </TableCell>
                                            <TableCell>{n.modules.find(m => m.id === n.currentModuleId)?.title || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={(n.modulesCompleted / n.modules.length) * 100} className="w-24" />
                                                    <span>{Math.round((n.modulesCompleted / n.modules.length) * 100)}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{n.status}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">View Progress</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function MentorshipPage() {
  const { role, setRole, isLoading } = useRole();

  if (isLoading || !role) {
    return (
      <DashboardLayout role="Manager" onSwitchRole={() => {}}>
        <Skeleton className="w-full h-screen" />
      </DashboardLayout>
    );
  }
  
  return (
      <DashboardLayout role={role} onSwitchRole={setRole}>
          <MentorDashboard />
      </DashboardLayout>
  );
}
