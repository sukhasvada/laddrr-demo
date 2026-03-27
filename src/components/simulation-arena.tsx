
"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { useRole } from '@/hooks/use-role';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Loader2, ArrowLeft, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { runNetsConversation } from '@/ai/flows/nets-flow';
import type { NetsConversationInput, NetsMessage, NetsInitialInput } from '@/ai/schemas/nets-schemas';
import { useToast } from '@/hooks/use-toast';
import { generateNetsNudge } from '@/ai/flows/generate-nets-nudge-flow';


const Avatar = ({ icon }: { icon: React.ReactNode }) => (
    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        {icon}
    </div>
);


export default function SimulationArena({
    initialConfig,
    onExit,
    arenaTitle = "Practice Arena",
}: {
    initialConfig: NetsInitialInput,
    onExit: (messages?: NetsMessage[]) => void,
    arenaTitle?: string
}) {
    const [isPending, startTransition] = useTransition();
    const [isGettingNudge, startNudgeTransition] = useTransition();
    const [messages, setMessages] = useState<NetsMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const handleExit = () => {
        // Pass the final message history back to the parent component
        onExit(messages.filter(m => m.role !== 'system'));
    };

    useEffect(() => {
        const startSimulation = () => {
            const initialSystemMessage: NetsMessage = {
                role: 'system',
                content: `Simulation started. The AI is playing the role of a ${initialConfig.persona}.`
            };
            const currentMessages = [initialSystemMessage];
            setMessages(currentMessages);

            startTransition(async () => {
                try {
                    const input: NetsConversationInput = {
                        ...initialConfig,
                        history: [], // History is empty for the first turn
                    };
                    const aiResponse = await runNetsConversation(input);
                    setMessages(prev => [...prev, aiResponse]);
                } catch (error) {
                    console.error("AI simulation failed on start", error);
                    toast({ variant: 'destructive', title: "Simulation Error", description: "The AI could not start the conversation. Please try again." });
                    onExit(); // Exit if the start fails
                }
            });
        };

        startSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialConfig, toast]);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (!userInput.trim()) return;

        const newUserMessage: NetsMessage = { role: 'user', content: userInput };
        const currentMessages = [...messages, newUserMessage];
        setMessages(currentMessages);
        setUserInput('');

        startTransition(async () => {
            try {
                const input: NetsConversationInput = {
                    ...initialConfig,
                    history: currentMessages.filter(m => m.role !== 'system'),
                };
                const aiResponse = await runNetsConversation(input);
                setMessages(prev => [...prev, aiResponse]);
            } catch (error) {
                console.error("AI simulation failed", error);
                toast({ variant: 'destructive', title: "Simulation Error", description: "The AI could not respond. Please try again." });
                setMessages(prev => prev.slice(0, -1));
            }
        });
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isPending) {
                handleSendMessage();
            }
        }
    };
    
    const handleGetNudge = () => {
        startNudgeTransition(async () => {
            try {
                const input: NetsConversationInput = {
                    ...initialConfig,
                    history: messages.filter(m => m.role !== 'system'),
                };
                const result = await generateNetsNudge(input);
                toast({
                    title: "Coach's Nudge",
                    description: result.nudge,
                    duration: 8000,
                });
            } catch (error) {
                console.error("Failed to get nudge", error);
                toast({ variant: 'destructive', title: "Nudge Failed", description: "Could not get a hint at this time." });
            }
        });
    };

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-2xl shadow-primary/10">
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        {arenaTitle}
                    </CardTitle>
                     <Button variant="ghost" onClick={handleExit}>
                        <ArrowLeft className="mr-2" /> End Session
                    </Button>
                </div>
                <CardDescription>
                    You are in a simulation with a <span className="font-semibold text-primary">{initialConfig.persona}</span>.
                    The scenario is: <span className="font-semibold text-primary">{initialConfig.scenario}</span>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[50vh] w-full border rounded-lg p-4 space-y-4" ref={scrollAreaRef}>
                    {messages.map((msg, index) => (
                        <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                             {msg.role === 'model' && <Avatar icon={<Bot className="text-primary" />} />}
                             {msg.role === 'system' ? (
                                <div className="text-center text-xs text-muted-foreground italic w-full py-4">{msg.content}</div>
                             ) : (
                                <div className={cn("max-w-[75%] rounded-lg px-4 py-2", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                             )}
                            {msg.role === 'user' && <Avatar icon={<User />} />}
                        </div>
                    ))}
                    {isPending && messages.length > 0 && (
                        <div className="flex items-start gap-3 justify-start">
                            <Avatar icon={<Bot className="text-primary" />} />
                            <div className="bg-muted rounded-lg px-4 py-3">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter>
                 <div className="flex w-full items-center gap-2 relative">
                    <Button variant="ghost" size="icon" onClick={handleGetNudge} disabled={isGettingNudge || isPending} className="absolute left-2 top-1/2 -translate-y-1/2">
                         {isGettingNudge ? <Loader2 className="animate-spin text-yellow-400" /> : <Lightbulb className="text-yellow-400" />}
                    </Button>
                    <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your response here..."
                        className="pl-14 pr-12"
                        rows={1}
                        disabled={isPending}
                    />
                    <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={isPending || !userInput.trim()}
                        className="absolute right-2"
                    >
                        <Send />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
