"use client";

import { useRole } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

function ManagerLabContent() {
  return (
    <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3">
                    <FlaskConical className="h-8 w-8 text-primary" />
                    Manager's Lab
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                    A space for managerial experiments and new tools.
                </CardDescription>
            </CardHeader>
        </Card>
    </div>
  );
}


export default function ManagerLabPage() {
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
      <ManagerLabContent />
    </DashboardLayout>
  );
}
