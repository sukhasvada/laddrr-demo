"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Map, Zap, BrainCircuit, Users } from 'lucide-react';

// Mock data representing skill clusters and their growth
const skillClusters = [
  { name: 'Technical Leadership', growth: 12, icon: <Zap className="text-blue-500" /> },
  { name: 'Product Strategy', growth: 8, icon: <BrainCircuit className="text-green-500" /> },
  { name: 'Cross-functional Communication', growth: -5, icon: <Users className="text-yellow-500" /> },
];

export default function OrganizationalLearningMapWidget() {
  return (
    <Card>
      <CardHeader className="p-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="text-primary" />
          Organizational Learning Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {skillClusters.map(cluster => (
            <div key={cluster.name} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-background">
                  {cluster.icon}
                </div>
                <p className="font-semibold">{cluster.name}</p>
              </div>
              <div className={`text-lg font-bold ${cluster.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {cluster.growth > 0 ? '+' : ''}{cluster.growth}%
              </div>
            </div>
          ))}
          <p className="text-xs text-center text-muted-foreground pt-2">Data is illustrative. A real implementation would use a graph visualization library.</p>
        </div>
      </CardContent>
    </Card>
  );
}
