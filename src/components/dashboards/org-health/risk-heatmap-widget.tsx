
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const heatmapData = [
    { department: "Engineering", sentimentScore: 68, risk: "Medium", reason: "Sentiment is slightly down due to recent project deadline pressures, but overall engagement remains stable." },
    { department: "Sales", sentimentScore: 55, risk: "High", reason: "High attrition chatter and negative feedback regarding the new commission structure are driving a high-risk score." },
    { department: "Marketing", sentimentScore: 82, risk: "Low", reason: "Positive feedback on creative freedom and successful campaigns contributes to a high morale score." },
    { department: "Support", sentimentScore: 75, risk: "Low", reason: "Consistently high scores in team collaboration and management support keep this team in a healthy state." },
    { department: "Product", sentimentScore: 62, risk: "Medium", reason: "Some concerns about cross-functional communication clarity are pulling the score down, but team cohesion is strong." },
    { department: "HR", sentimentScore: 88, risk: "Low", reason: "Excellent internal feedback and high trust in leadership position the HR team as a low-risk group." },
];

type DepartmentData = typeof heatmapData[0];

const getRiskColor = (risk: string) => {
    switch (risk) {
        case "High": return "bg-red-500/80 hover:bg-red-500";
        case "Medium": return "bg-yellow-500/80 hover:bg-yellow-500";
        case "Low": return "bg-green-500/80 hover:bg-green-500";
        default: return "bg-gray-400";
    }
};

export default function RiskHeatmapWidget() {
    const [selectedDept, setSelectedDept] = useState<DepartmentData | null>(null);

    return (
        <>
            <Card>
                <CardHeader className="p-2 pt-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Flame className="text-destructive" />
                        Department Risk Heatmap
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                        {heatmapData.map(item => (
                             <button
                                key={item.department}
                                onClick={() => setSelectedDept(item)}
                                className={cn(
                                    "p-2 rounded-md text-center text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                    getRiskColor(item.risk)
                                )}>
                                <p className="font-bold text-sm truncate">{item.department}</p>
                                <p className="text-xs opacity-90">{item.risk}</p>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedDept} onOpenChange={(isOpen) => !isOpen && setSelectedDept(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Risk Analysis: {selectedDept?.department}</DialogTitle>
                        <DialogDescription>
                            A detailed look at the factors contributing to this department's risk score.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedDept && (
                        <div className="py-4 space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                                     <Badge 
                                        variant={selectedDept.risk === "High" ? "destructive" : selectedDept.risk === "Medium" ? "secondary" : "success"}
                                        className="text-lg"
                                    >
                                        {selectedDept.risk}
                                    </Badge>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Sentiment Score</p>
                                    <p className="text-2xl font-bold">{selectedDept.sentimentScore}<span className="text-base text-muted-foreground">/100</span></p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">AI-Generated Rationale</h4>
                                <p className="text-sm text-muted-foreground mt-1 italic">"{selectedDept.reason}"</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
