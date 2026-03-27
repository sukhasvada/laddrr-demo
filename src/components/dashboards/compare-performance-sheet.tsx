
"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Rocket, X, Check, ChevronsUpDown, Bot, BarChart, Send, Loader2 } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { useRole } from "@/hooks/use-role"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { runPerformanceChat } from "@/ai/flows/performance-chat-flow"
import type { PerformanceChatInput, ChatMessage } from "@/ai/schemas/performance-chat-schemas"

const mockPeerData = [
  { value: "alexa_ray", label: "Alexa Ray" },
  { value: "ben_p", label: "Ben Parker" },
  { value: "cody_f", label: "Cody Fisher" },
  { value: "drew_h", label: "Drew Harris" },
  { value: "eva_g", label: "Eva Green" },
];

const mockPerformanceData: Record<string, Record<string, { value: number; trend: 'up' | 'down' | 'stable' }>> = {
  "You": {
    "Project Delivery Rate": { value: 92, trend: "up" },
    "Code Quality Score": { value: 85, trend: "stable" },
    "Team Collab Rating": { value: 8.8, trend: "up" },
  },
  "alexa_ray": {
    "Project Delivery Rate": { value: 88, trend: "stable" },
    "Code Quality Score": { value: 91, trend: "up" },
    "Team Collab Rating": { value: 8.5, trend: "down" },
  },
  "ben_p": {
    "Project Delivery Rate": { value: 95, trend: "up" },
    "Code Quality Score": { value: 82, trend: "down" },
    "Team Collab Rating": { value: 9.1, trend: "up" },
  },
  "cody_f": {
    "Project Delivery Rate": { value: 85, trend: "down" },
    "Code Quality Score": { value: 88, trend: "stable" },
    "Team Collab Rating": { value: 8.2, trend: "stable" },
  },
  "drew_h": {
    "Project Delivery Rate": { value: 91, trend: "up" },
    "Code Quality Score": { value: 93, trend: "up" },
    "Team Collab Rating": { value: 8.9, trend: "up" },
  },
   "eva_g": {
    "Project Delivery Rate": { value: 89, trend: "stable" },
    "Code Quality Score": { value: 85, trend: "stable" },
    "Team Collab Rating": { value: 8.6, trend: "down" },
  },
};

const aiInsight = "You’re performing above 70% of your peers in goal completion, showing strong consistency. Your project delivery score is solid, placing you in the top half of your peer group. There's an opportunity to focus on proactive communication to potentially boost your feedback score."

export function ComparePerformanceSheet() {
  const [open, setOpen] = React.useState(false)
  const [selectedPeers, setSelectedPeers] = React.useState<string[]>([])
  const { role } = useRole()
  const { toast } = useToast()
  const [isPending, startTransition] = React.useTransition()

  // Chat state
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");

  const handleSelect = (peerValue: string) => {
    setSelectedPeers(prev =>
      prev.includes(peerValue)
        ? prev.filter(p => p !== peerValue)
        : [...prev, peerValue]
    )
  }

  const comparisonData = ["You", ...selectedPeers].map(peerValue => ({
    name: peerValue === "You" ? "You" : mockPeerData.find(p => p.value === peerValue)?.label || "Unknown",
    metrics: mockPerformanceData[peerValue === "You" ? "You" : peerValue] || {}
  }))

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, newUserMessage]);
    setChatInput("");

    startTransition(async () => {
        try {
            const performanceContext = comparisonData.map(p => ({
                name: p.name,
                metrics: p.metrics
            }));

            const input: PerformanceChatInput = {
                userQuestion: chatInput,
                performanceContext,
                chatHistory,
            };
            const response = await runPerformanceChat(input);
            setChatHistory(prev => [...prev, { role: 'model', content: response.answer }]);
        } catch (e) {
            console.error("Chat failed", e);
            toast({
                variant: 'destructive',
                title: "Chat Error",
                description: "The AI coach could not respond. Please try again."
            });
            // Remove the user's message if the AI fails
            setChatHistory(prev => prev.slice(0, -1));
        }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        // Reset state on close
        setSelectedPeers([]);
        setChatHistory([]);
      }
    }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          Compare
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Compare Your Performance</SheetTitle>
          <SheetDescription>
            Select peers from your department to see a side-by-side comparison. This is private and for your development only.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  {selectedPeers.length > 0
                    ? `Comparing with ${selectedPeers.length} peer(s)`
                    : "Select peers to compare..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search peers..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                        {mockPeerData.map((peer) => {
                            const isSelected = selectedPeers.includes(peer.value)
                            return (
                            <CommandItem
                                key={peer.value}
                                onSelect={() => handleSelect(peer.value)}
                            >
                                <div
                                className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                                >
                                <Check className={cn("h-4 w-4")} />
                                </div>
                                <span>{peer.label}</span>
                            </CommandItem>
                            )
                        })}
                        </CommandGroup>
                    </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        </div>
        
        {selectedPeers.length > 0 && (
          <div className="space-y-8">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonData.length}, minmax(0, 1fr))` }}>
              {comparisonData.map((data, idx) => (
                <div key={idx} className={cn("text-center font-semibold", data.name === "You" && "text-primary")}>
                  {data.name}
                </div>
              ))}
            </div>

            {Object.keys(mockPerformanceData["You"]).map((metricName) => (
                <div key={metricName}>
                    <h4 className="font-semibold text-muted-foreground mb-3">{metricName}</h4>
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonData.length}, minmax(0, 1fr))` }}>
                        {comparisonData.map((data, idx) => {
                            const metric = data.metrics[metricName];
                            if (!metric) return <div key={idx}></div>;
                            
                            const yourMetric = comparisonData[0].metrics[metricName];
                            const isHigher = data.name !== "You" && yourMetric.value > metric.value;
                            const isLower = data.name !== "You" && yourMetric.value < metric.value;

                            return (
                                <div key={idx} className="flex flex-col items-center text-center space-y-2">
                                     <p className="text-xl font-bold">{metric.value}{metricName === "Project Delivery Rate" ? "%" : ""}</p>
                                     <Progress 
                                        value={metricName === "Team Collab Rating" ? metric.value * 10 : metric.value} 
                                        className="h-2"
                                        indicatorClassName={cn(
                                            data.name === "You" ? "bg-primary" : "bg-muted-foreground/30",
                                            isHigher && "bg-green-500",
                                            isLower && "bg-red-500",
                                        )}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}

            <div className="pt-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2"><Bot /> AI Summary</h4>
                    <p className="text-sm text-primary/90 italic">"{aiInsight}"</p>
                </div>
            </div>

            <div className="pt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Bot className="text-primary" /> Performance Coach
                </h3>
                 <div className="border rounded-lg p-4 space-y-4">
                    <ScrollArea className="h-48 pr-3">
                        <div className="space-y-4">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={cn("flex items-start gap-2", msg.role === 'user' ? 'justify-end' : '')}>
                                    {msg.role === 'model' && <Bot className="h-5 w-5 text-primary flex-shrink-0" />}
                                    <div className={cn("max-w-md rounded-lg px-3 py-2 text-sm", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isPending && (
                                <div className="flex items-start gap-2">
                                    <Bot className="h-5 w-5 text-primary flex-shrink-0" />
                                    <div className="bg-muted rounded-lg px-3 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="flex items-center gap-2 pt-2 border-t">
                        <Textarea
                            placeholder="Ask for advice, e.g., 'How can I improve my project delivery score?'"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            className="flex-1"
                            rows={1}
                            disabled={isPending}
                        />
                        <Button onClick={handleSendMessage} disabled={isPending || !chatInput.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
