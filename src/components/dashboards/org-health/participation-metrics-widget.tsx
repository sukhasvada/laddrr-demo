
"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, FileCheck, UserX } from 'lucide-react';

const metrics = {
    participationRate: 78,
    submissionCount: 156,
    optOutRate: 5,
};

export default function ParticipationMetricsWidget() {
    return (
        <Card className="h-full">
            <CardHeader className="p-2 pt-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Users className="text-primary" />
                    Survey Engagement
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Participation Rate</p>
                        <p className="text-xs text-muted-foreground">Percentage of users who responded.</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{metrics.participationRate}%</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                        <p className="text-xs text-muted-foreground">The total number of survey responses.</p>
                    </div>
                    <p className="text-2xl font-bold">{metrics.submissionCount}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Opt-Out Rate</p>
                        <p className="text-xs text-muted-foreground">Users who chose not to participate.</p>
                    </div>
                    <p className="text-2xl font-bold">{metrics.optOutRate}%</p>
                </div>
            </CardContent>
        </Card>
    );
}
