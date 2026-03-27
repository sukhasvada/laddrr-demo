
"use client"

import { useMemo, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from "recharts"
import { TrendingUp, Save } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

// Mock data representing performance over different time periods
const generateData = (numPoints: number, period: 'day' | 'week' | 'month') => {
    let data = [];
    const baseDate = new Date(2023, 0, 1);
    for (let i = 0; i < numPoints; i++) {
        let date;
        if (period === 'day') {
            date = new Date(baseDate.getTime());
            date.setDate(baseDate.getDate() + i);
        } else if (period === 'week') {
            date = new Date(baseDate.getTime());
            date.setDate(baseDate.getDate() + (i * 7));
        } else { // month
            date = new Date(baseDate.getTime());
            date.setMonth(baseDate.getMonth() + i);
        }
        
        const overall = 75 + (i * (period === 'month' ? 1.5 : period === 'week' ? 0.3 : 0.1)) + (Math.random() * 5 - 2.5);
        const projectDelivery = overall + (Math.random() * 3 - 1.5);
        const codeQuality = overall - (Math.random() * 3 - 1.5);
        const collaboration = overall + (Math.random() * 2 - 1);
        const rank = Math.max(1, 25 - Math.floor(overall / 4));
        
        data.push({
            date,
            overall: parseFloat(overall.toFixed(1)),
            projectDelivery: parseFloat(projectDelivery.toFixed(1)),
            codeQuality: parseFloat(codeQuality.toFixed(1)),
            collaboration: parseFloat(collaboration.toFixed(1)),
            rank: rank,
        });
    }
    return data;
}

const monthlyData = generateData(12, 'month');
const weeklyData = generateData(52, 'week');
const dailyData = generateData(365, 'day');

const allPerformanceData = {
    M: monthlyData,
    W: weeklyData,
    D: dailyData
};

const kpis = [
    { key: 'overall', label: 'Overall' },
    { key: 'projectDelivery', label: 'Project Delivery' },
    { key: 'codeQuality', label: 'Code Quality' },
    { key: 'collaboration', label: 'Collaboration' },
    { key: 'rank', label: 'Rank' },
] as const;

type KpiKey = typeof kpis[number]['key'];
type TimePeriod = 'D' | 'W' | 'M';

const STORAGE_KEY = 'performanceTrendDefaultView';

export default function PerformanceTrendWidget() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('M');
  const [range, setRange] = useState<number[]>([0, 11]); 
  const [selectedKpis, setSelectedKpis] = useState<KpiKey[]>(['overall']);
  const { toast } = useToast();

  // Load saved view from localStorage on initial render
  useEffect(() => {
    const savedViewJSON = localStorage.getItem(STORAGE_KEY);
    if (savedViewJSON) {
      try {
        const savedView = JSON.parse(savedViewJSON);
        // We set timePeriod first, so that the subsequent range update has the correct data length
        if (savedView.timePeriod) {
            setTimePeriod(savedView.timePeriod);
        }
        if (savedView.selectedKpis) {
            setSelectedKpis(savedView.selectedKpis);
        }
        if (savedView.range) {
            setRange(savedView.range);
        }
      } catch (e) {
        console.error("Failed to parse saved view:", e);
      }
    }
  }, []);

  const currentData = useMemo(() => allPerformanceData[timePeriod], [timePeriod]);

  // Reset range when time period changes, unless we are initializing from storage
   useEffect(() => {
    const savedViewJSON = localStorage.getItem(STORAGE_KEY);
    if (savedViewJSON) {
        const savedView = JSON.parse(savedViewJSON);
        if (savedView.timePeriod === timePeriod) {
            return; // Don't reset if we are loading the saved period
        }
    }
    
    // For daily view, show a 3-month (approx 90 days) window by default
    if (timePeriod === 'D') {
      setRange([0, 89]);
    } else {
      setRange([0, currentData.length - 1]);
    }
  }, [timePeriod, currentData]);

  const visibleData = useMemo(() => {
    return currentData.slice(range[0], range[1] + 1);
  }, [range, currentData]);

  const handleRangeChange = (newRange: number[]) => {
    if (newRange[1] - newRange[0] < 1) {
      if (newRange[0] > 0) {
        setRange([newRange[0] - 1, newRange[0]]);
      } else {
        setRange([newRange[1], newRange[1] + 1]);
      }
    } else {
      setRange(newRange);
    }
  };

  const handleKpiToggle = (kpiKey: KpiKey) => {
    setSelectedKpis(prev => {
      // If "Rank" is clicked, it becomes the only selected KPI.
      if (kpiKey === 'rank') {
        return ['rank'];
      }

      // If another KPI is clicked...
      const isCurrentlySelected = prev.includes(kpiKey);
      const isRankSelected = prev.includes('rank');

      // If rank is currently selected, and we click something else, start a new selection.
      if (isRankSelected) {
        return [kpiKey];
      }

      // Standard multi-select logic for other KPIs.
      if (isCurrentlySelected) {
        if (prev.length === 1) return prev; // Don't allow deselecting the last one
        return prev.filter(k => k !== kpiKey);
      } else {
        return [...prev, kpiKey];
      }
    });
  };

  const handleSaveView = () => {
    const viewToSave = {
      timePeriod,
      range,
      selectedKpis,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewToSave));
    toast({
      title: "View Saved",
      description: "Your current view has been set as the default.",
    });
  };

  const chartConfig: ChartConfig = {
    overall: { label: "Overall", color: "hsl(var(--chart-1))" },
    projectDelivery: { label: "Project Delivery", color: "hsl(var(--chart-2))" },
    codeQuality: { label: "Code Quality", color: "hsl(var(--chart-3))" },
    collaboration: { label: "Collaboration", color: "hsl(var(--chart-4))" },
    rank: { label: "Rank", color: "hsl(var(--chart-5))" },
  };

  const formatLabel = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return ''; // Return empty string for invalid dates
    }
    switch (timePeriod) {
        case 'D': return format(date, 'MMM d');
        case 'W': return `W${format(date, 'w')}`;
        case 'M': return format(date, 'MMM');
    }
  }

  // Defensive check to prevent accessing out-of-bounds index
  const isRangeValid = currentData && currentData.length > 0 && range[0] < currentData.length && range[1] < currentData.length;

  const yAxisDomain = useMemo(() => {
    if (!visibleData || visibleData.length === 0 || selectedKpis.length === 0) {
      return ['auto', 'auto'];
    }
    const allValues = visibleData.flatMap(d => selectedKpis.map(kpi => d[kpi]));
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    const padding = (maxValue - minValue) * 0.1;

    return [Math.max(0, Math.floor(minValue - padding)), Math.ceil(maxValue + padding)];
  }, [visibleData, selectedKpis]);


  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="text-primary" />
                    Performance Trend
                </CardTitle>
            </div>
            <div className="w-full sm:w-64 pt-2 sm:pt-0">
                <Slider
                    value={range}
                    min={0}
                    max={currentData.length - 1}
                    step={1}
                    onValueChange={handleRangeChange}
                    aria-label="Date Range Slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    {isRangeValid ? (
                        <>
                            <span>{formatLabel(currentData[range[0]].date)}</span>
                            <span>{formatLabel(currentData[range[1]].date)}</span>
                        </>
                    ) : (
                        <>
                            <span></span>
                            <span></span>
                        </>
                    )}
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
             <div className="flex flex-wrap gap-2">
                {kpis.map(kpi => {
                    const isSelected = selectedKpis.includes(kpi.key);
                    return (
                        <Button
                            key={kpi.key}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleKpiToggle(kpi.key)}
                            style={{'--color-indicator': chartConfig[kpi.key].color } as React.CSSProperties}
                            className="flex items-center gap-2"
                        >
                            <span className={cn('h-2 w-2 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-[var(--color-indicator)]')}></span>
                            {kpi.label}
                        </Button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                    {(['D', 'W', 'M'] as TimePeriod[]).map(period => (
                        <Button
                            key={period}
                            variant={timePeriod === period ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5"
                            onClick={() => setTimePeriod(period)}
                        >
                            {period}
                        </Button>
                    ))}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveView}>
                    <Save className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Save default view</span>
                </Button>
            </div>
        </div>
        <div className="h-[250px] w-full mb-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart
                data={visibleData}
                margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    tickFormatter={(value) => formatLabel(new Date(value))}
                />
                <YAxis
                    domain={yAxisDomain}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    reversed={selectedKpis.includes('rank')}
                    allowDecimals={false}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" labelFormatter={(value) => formatLabel(new Date(value))} />}
                />
                {selectedKpis.map(kpiKey => (
                    <Line
                        key={kpiKey}
                        dataKey={kpiKey}
                        type="monotone"
                        stroke={chartConfig[kpiKey]?.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 7 }}
                        name={chartConfig[kpiKey]?.label}
                    />
                ))}
              </LineChart>
            </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

    

    