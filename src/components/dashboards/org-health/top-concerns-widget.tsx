"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

const topConcerns = [
    { theme: "Work-Life Balance", mentions: 45, sentiment: "Negative" },
    { theme: "Communication Clarity", mentions: 32, sentiment: "Negative" },
    { theme: "Career Growth Opportunities", mentions: 28, sentiment: "Mixed" },
    { theme: "Recognition", mentions: 15, sentiment: "Positive" },
];

export default function TopConcernsWidget() {
    return (
        <Card>
            <CardHeader className="p-2 pt-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <AlertCircle className="text-primary" />
                    Top Themes & Concerns
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {topConcerns.map(item => (
                        <div key={item.theme} className="flex items-start justify-between">
                            <p className="text-sm font-medium mr-4">{item.theme}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-sm font-semibold w-8 text-center">{item.mentions}</span>
                                <Badge 
                                    variant={item.sentiment === "Negative" ? "destructive" : item.sentiment === "Positive" ? "success" : "secondary"}
                                >
                                    {item.sentiment}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
