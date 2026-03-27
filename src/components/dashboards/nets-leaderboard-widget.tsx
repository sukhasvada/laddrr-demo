
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { getTeamNetsScores, getCompletedPracticeScenariosForUser } from '@/services/feedback-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomSwitch } from '@/components/ui/custom-switch';
import { Label } from '@/components/ui/label';
import { MessagesSquare, User, Users } from 'lucide-react';
import { roleUserMapping } from '@/lib/role-mapping';
import { cn } from '@/lib/utils';

export default function NetsLeaderboardWidget() {
  const { role } = useRole();
  const [showTeam, setShowTeam] = useState(true);
  const [teamScores, setTeamScores] = useState<Record<string, { average: number, sessions: number }>>({});
  const [myScores, setMyScores] = useState<{ average: number, sessions: number }>({ average: 0, sessions: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    if (!role) return;
    setIsLoading(true);

    // Fetch team scores
    const teamData = await getTeamNetsScores(role);
    setTeamScores(teamData);

    // Fetch personal scores
    const myCompleted = getCompletedPracticeScenariosForUser(role);
    if (myCompleted.length > 0) {
      const total = myCompleted.reduce((sum, s) => sum + (s.analysis?.scores.overall || 0), 0);
      setMyScores({
        average: total / myCompleted.length,
        sessions: myCompleted.length,
      });
    } else {
      setMyScores({ average: 0, sessions: 0 });
    }

    setIsLoading(false);
  }, [role]);

  useEffect(() => {
    fetchScores();
    window.addEventListener('feedbackUpdated', fetchScores);
    return () => window.removeEventListener('feedbackUpdated', fetchScores);
  }, [fetchScores]);

  const sortedTeamScores = Object.entries(teamScores).sort(([, a], [, b]) => b.average - a.average);

  const renderContent = () => {
    if (isLoading) {
      return <Skeleton className="h-48 w-full" />;
    }

    if (showTeam) {
      return sortedTeamScores.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead className="text-center">Avg Score</TableHead>
              <TableHead className="text-center">Sessions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeamScores.map(([name, data]) => (
              <TableRow key={name}>
                <TableCell className="font-medium py-1">{name}</TableCell>
                <TableCell className="text-center font-semibold text-primary py-1">{data.average.toFixed(1)}</TableCell>
                <TableCell className="text-center py-1">{data.sessions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center text-muted-foreground py-4">No practice data available for your team yet.</p>
      );
    }

    return myScores.sessions > 0 ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Your Stats</TableHead>
            <TableHead className="text-center">Avg Score</TableHead>
            <TableHead className="text-center">Sessions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium py-1">{roleUserMapping[role!]?.name}</TableCell>
            <TableCell className="text-center font-semibold text-primary py-1">{myScores.average.toFixed(1)}</TableCell>
            <TableCell className="text-center py-1">{myScores.sessions}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ) : (
      <p className="text-center text-muted-foreground py-4">You haven't completed any practice sessions yet.</p>
    );
  };

  return (
    <Card>
      <CardHeader className="p-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessagesSquare className="text-indigo-500" />
              Nets Skill Leaderboard
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="view-toggle" className={cn(!showTeam && "text-primary font-semibold")}>
              <User className="h-5 w-5" />
            </Label>
            <CustomSwitch
              id="view-toggle"
              checked={showTeam}
              onCheckedChange={setShowTeam}
            />
            <Label htmlFor="view-toggle" className={cn(showTeam && "text-primary font-semibold")}>
              <Users className="h-5 w-5" />
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
