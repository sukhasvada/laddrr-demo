
"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import type { Role } from '@/hooks/use-role';
import { useRole, availableRoles, availableRolesForAssignment } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Loader2, ChevronsRight, ArrowLeft, SlidersHorizontal, Briefcase, Users, UserCheck, ShieldCheck, UserCog, Lightbulb, Play, ClipboardEdit, Edit, FileClock, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NetsConversationInput, NetsMessage, NetsInitialInput, NetsAnalysisOutput } from '@/ai/schemas/nets-schemas';
import { useToast } from '@/hooks/use-toast';
import { MagicWandIcon } from '@/components/ui/magic-wand-icon';
import { roleUserMapping, formatActorName } from '@/lib/role-mapping';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateNetsSuggestion } from '@/ai/flows/generate-nets-suggestion-flow';
import { completePracticeScenario, getPracticeScenariosForUser, AssignedPracticeScenario, assignPracticeScenario } from '@/services/feedback-service';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import SimulationArena from '@/components/simulation-arena';


const difficulties = [
    { value: "friendly", label: "Friendly" },
    { value: "neutral", label: "Neutral" },
    { value: "strict", label: "Strict / Defensive" },
    { value: "aggressive", label: "Aggressive" },
];

const personaIcons: Record<string, React.ElementType> = {
    'Team Lead': Users,
    'AM': UserCog,
    'Manager': Briefcase,
    'HR Head': ShieldCheck,
    'Employee': UserCheck,
    'Candidate': User,
};


function AssignPracticeDialog({ onAssign }: { onAssign: () => void }) {
    const { role } = useRole();
    const { toast } = useToast();
    const [selectedUser, setSelectedUser] = useState<Role | null>(null);
    const [scenario, setScenario] = useState('');
    const [persona, setPersona] = useState<Role | null>(null);
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // AMs and above can assign tasks to Team Leads and Employees
    const assignableUsers = Object.keys(roleUserMapping).filter(r => ['Team Lead', 'Employee'].includes(r)) as Role[];

    const handleSubmit = async () => {
        if (!role || !selectedUser || !scenario || !persona || !dueDate) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please fill out all fields."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await assignPracticeScenario(role, selectedUser, scenario, persona, dueDate);
            toast({
                title: "Practice Scenario Assigned!",
                description: `${roleUserMapping[selectedUser].name} has been assigned a new practice scenario.`
            });
            // Reset form and close dialog
            setSelectedUser(null);
            setScenario('');
            setPersona(null);
            setDueDate(undefined);
            setIsOpen(false);
            onAssign(); // Notify parent to re-fetch
        } catch (error) {
            console.error("Failed to assign practice scenario", error);
            toast({ variant: 'destructive', title: "Assignment Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Assign
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="text-primary" />
              Assign Practice Scenario
            </DialogTitle>
            <DialogDescription>
              Assign a specific conversation scenario to a team member for them to practice.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assign-user" className="text-right">Assign To</Label>
                  <div className="col-span-3">
                    <Select
                        value={selectedUser ?? ''}
                        onValueChange={(value) => setSelectedUser(value as Role)}
                    >
                        <SelectTrigger id="assign-user">
                            <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                        <SelectContent>
                            {assignableUsers.map(memberRole => (
                                <SelectItem key={memberRole} value={memberRole}>
                                    {roleUserMapping[memberRole].name} - ({memberRole})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="assign-scenario">Scenario to Practice</Label>
                  <Textarea
                      id="assign-scenario"
                      placeholder="e.g., Practice delivering the Q3 project update to the leadership team..."
                      rows={3}
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                  />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assign-persona" className="text-right">Persona</Label>
                   <div className="col-span-3">
                    <Select
                        value={persona ?? ''}
                        onValueChange={(value) => setPersona(value as Role)}
                    >
                        <SelectTrigger id="assign-persona">
                            <SelectValue placeholder="Select the AI persona" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(personaIcons).map(p => (
                               <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assign-date" className="text-right">Complete By</Label>
                  <div className="col-span-3">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="assign-date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => {
                            setDueDate(date);
                            setIsDatePickerOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedUser || !scenario || !persona || !dueDate}>
                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                Assign Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}

function SetupView({ onStart, role, assignedScenarios, onAssign }: { onStart: (config: NetsInitialInput, assignedScenarioId?: string) => void, role: Role, assignedScenarios: AssignedPracticeScenario[], onAssign: () => void }) {
    const [selectedPersona, setSelectedPersona] = useState<Role | null>(null);
    const [scenario, setScenario] = useState('');
    const [difficulty, setDifficulty] = useState('neutral');
    const [isSuggesting, startSuggestion] = useTransition();
    const { toast } = useToast();

    const handleStart = (assignedScenarioId?: string) => {
        if (!selectedPersona || !scenario) return;
        onStart({
            persona: selectedPersona,
            scenario: scenario,
            difficulty: difficulty,
        }, assignedScenarioId);
    };

    const handleGetSuggestion = () => {
        startSuggestion(async () => {
            try {
                const result = await generateNetsSuggestion({ forRole: role });
                setScenario(result.suggestedScenario);
                toast({
                    title: "Scenario Suggested!",
                    description: "A practice scenario has been generated for you based on your recent activity."
                });
            } catch (e) {
                console.error("Failed to get suggestion", e);
                toast({
                    variant: "destructive",
                    title: "Suggestion Failed",
                    description: "Could not generate a suggestion at this time."
                });
            }
        });
    };

    const handleStartAssigned = (assigned: AssignedPracticeScenario) => {
        // Pre-fill the setup for the assigned scenario
        setSelectedPersona(assigned.persona as Role);
        setScenario(assigned.scenario);
        // Start simulation immediately
        onStart({
            persona: assigned.persona,
            scenario: assigned.scenario,
            difficulty: 'neutral', // default difficulty for assigned
        }, assigned.id);
    };

    if (!selectedPersona) {
        return (
             <div className="w-full max-w-4xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold font-headline">
                         Nets – Practice Arena
                    </h1>
                     <div className="flex items-center gap-2">
                         <Button variant="outline" asChild>
                            <Link href="/nets/scorecard">Scorecard</Link>
                        </Button>
                        {availableRolesForAssignment.includes(role) && <AssignPracticeDialog onAssign={onAssign} />}
                     </div>
                </div>

                <p className="text-lg text-muted-foreground text-center mb-6">
                    Choose a persona to practice your conversation with.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availableRoles.filter(r => r !== 'Anonymous').map(r => {
                         const roleDetails = roleUserMapping[r] || { name: r, fallback: r.substring(0,1), imageHint: 'person', role: r };
                         const Icon = personaIcons[r] || Briefcase;
                         return (
                            <button
                                key={r}
                                onClick={() => setSelectedPersona(r)}
                                className="group flex flex-col items-center justify-center gap-2 py-4 transition-transform duration-200 ease-in-out hover:scale-110 hover:-translate-y-1"
                            >
                                <Icon className="h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                                <span className="font-semibold text-foreground">{r}</span>
                            </button>
                         )
                    })}
                </div>
                
                {assignedScenarios.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <ClipboardEdit className="h-5 w-5 text-purple-500" />
                            Assigned for Practice
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assignedScenarios.map(s => (
                                <Card key={s.id} className="bg-purple-500/5">
                                    <CardHeader className="pb-3">
                                        <CardDescription>
                                            Assigned by {formatActorName(s.assignedBy)} {formatDistanceToNow(new Date(s.assignedAt), { addSuffix: true })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-medium text-foreground-primary">{s.scenario}</p>
                                        <p className="text-sm text-muted-foreground mt-1">Persona: {s.persona}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => handleStartAssigned(s)}>
                                            <Play className="mr-2" /> Start Practice
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    const Icon = personaIcons[selectedPersona] || Briefcase;

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                 <div className="flex items-start justify-between">
                     <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2 text-3xl font-bold font-headline">
                             Configure Simulation
                        </CardTitle>
                        <CardDescription className="text-lg flex items-center gap-2">
                             Practicing with: <Icon className="h-5 w-5 text-primary" /> <span className="font-bold text-primary">{selectedPersona}</span>
                        </CardDescription>
                    </div>
                    <Button variant="ghost" onClick={() => setSelectedPersona(null)}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="scenario">Describe the scenario to practice</Label>
                        <Button variant="ghost" size="sm" onClick={handleGetSuggestion} disabled={isSuggesting}>
                            {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />}
                            Get Suggestion
                        </Button>
                    </div>
                    <Textarea 
                        id="scenario" 
                        placeholder="e.g., Giving tough feedback about missed deadlines to a good performer."
                        rows={4}
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="difficulty">Set AI Demeanor</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger id="difficulty">
                            <SelectValue placeholder="Select a difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            {difficulties.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" size="lg" onClick={() => handleStart()} disabled={!scenario}>
                    Start Practice <ChevronsRight className="ml-2" />
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function NetsPage() {
    const { role, setRole, isLoading: isRoleLoading } = useRole();
    const router = useRouter();
    const { toast } = useToast();
    const [config, setConfig] = useState<NetsInitialInput | null>(null);
    const [assignedScenarioId, setAssignedScenarioId] = useState<string | undefined>();
    const [assignedScenarios, setAssignedScenarios] = useState<AssignedPracticeScenario[]>([]);
    const [isAnalyzing, startAnalysis] = useTransition();
    
    const fetchAssignedScenarios = useCallback(async () => {
        if (!role) return;
        const scenarios = await getPracticeScenariosForUser(role);
        setAssignedScenarios(scenarios);
    }, [role]);

    useEffect(() => {
        fetchAssignedScenarios();

        window.addEventListener('feedbackUpdated', fetchAssignedScenarios);
        return () => {
            window.removeEventListener('feedbackUpdated', fetchAssignedScenarios);
        };
    }, [fetchAssignedScenarios]);

    const handleStartSimulation = (newConfig: NetsInitialInput, scenarioId?: string) => {
        setConfig(newConfig);
        setAssignedScenarioId(scenarioId);
        toast({ title: "Simulation Started", description: "The AI will begin the conversation." });
    };

    const handleExitSimulation = (messages?: NetsMessage[]) => {
        if (!messages || messages.length === 0) {
            setConfig(null); // Just exit if there's no conversation
            return;
        }

        startAnalysis(async () => {
            try {
                const analysisInput: NetsConversationInput = {
                    ...config!,
                    history: messages,
                };
                await completePracticeScenario(analysisInput, assignedScenarioId);
                
                toast({
                    title: "Simulation Complete!",
                    description: "Your scorecard has been updated with the results.",
                });

                setConfig(null);
                setAssignedScenarioId(undefined);
                fetchAssignedScenarios();
                router.push('/nets/scorecard');

            } catch(e) {
                console.error("Failed to analyze conversation", e);
                toast({ variant: 'destructive', title: "Analysis Failed", description: "Could not generate a scorecard for this session." });
                setConfig(null);
            }
        });
    };
    
    if (isRoleLoading || !role) {
        return <DashboardLayout role="Employee" onSwitchRole={() => {}}><Skeleton className="w-full h-screen" /></DashboardLayout>;
    }

    return (
        <DashboardLayout role={role} onSwitchRole={setRole}>
            <div className="p-4 md:p-8 flex items-center justify-center">
                 {config ? (
                    <SimulationArena 
                        initialConfig={config} 
                        onExit={handleExitSimulation} 
                    />
                ) : (
                    <SetupView onStart={handleStartSimulation} role={role} assignedScenarios={assignedScenarios} onAssign={fetchAssignedScenarios} />
                )}
            </div>
        </DashboardLayout>
    );
}
