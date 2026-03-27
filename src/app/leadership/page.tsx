

"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { LeadershipIcon } from '@/components/ui/leadership-icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { roleUserMapping } from '@/lib/role-mapping';
import { PlusCircle, Loader2, BookOpen, CheckCircle, ArrowRight, ArrowLeft, MessageSquare, NotebookPen, Lock } from 'lucide-react';
import { getLeadershipNominationsForManager, getNominationForUser, type LeadershipNomination, type LeadershipModule, nominateForLeadership, completeLeadershipLesson, type LessonStep, saveLeadershipLessonAnswer, type LeadershipLesson, LEADERSHIP_COACHING_KEY, getFromStorage, saveToStorage } from '@/services/leadership-service';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import SimulationArena from '@/components/simulation-arena';
import { completePracticeScenario } from '@/services/feedback-service';


function NominateDialog({ onNomination }: { onNomination: () => void }) {
    const { role } = useRole();
    const { toast } = useToast();
    const [selectedNominee, setSelectedNominee] = useState<Role | null>(null);
    const [selectedMentor, setSelectedMentor] = useState<Role | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const getNextRole = (currentRole: Role | null): Role | null => {
        if (!currentRole) return null;
        switch (currentRole) {
            case 'Employee': return 'Team Lead';
            case 'Team Lead': return 'AM';
            case 'AM': return 'Manager';
            default: return null;
        }
    };

    const targetRole = getNextRole(selectedNominee);

    const handleNominate = async () => {
        if (!role || !selectedNominee || !targetRole || !selectedMentor) return;

        setIsSubmitting(true);
        try {
            await nominateForLeadership(role, selectedNominee, targetRole, selectedMentor);
            toast({ title: 'Nomination Submitted!', description: `${roleUserMapping[selectedNominee]?.name} has been enrolled in the Leadership Development Program.` });
            onNomination();
            setIsOpen(false);
            setSelectedNominee(null);
            setSelectedMentor(null);
        } catch (error) {
            console.error("Failed to nominate user", error);
            toast({ variant: 'destructive', title: 'Nomination Failed' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const eligibleNominees: Role[] = ['Employee', 'Team Lead', 'AM'];
    const eligibleMentors: Role[] = ['AM', 'Manager', 'HR Head'];


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" /> Nominate for Leadership
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nominate for Leadership Development</DialogTitle>
                    <DialogDescription>
                        Select an employee to enroll them in a structured program to groom them for the next level.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label>Select Nominee</Label>
                        <Select onValueChange={(value: Role) => setSelectedNominee(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an employee or team lead" />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleNominees.map(nomineeRole => (
                                    <SelectItem key={nomineeRole} value={nomineeRole}>
                                        {roleUserMapping[nomineeRole].name} ({nomineeRole})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Mentor</Label>
                        <Select onValueChange={(value: Role) => setSelectedMentor(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a mentor for the nominee" />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleMentors.map(mentorRole => (
                                    <SelectItem key={mentorRole} value={mentorRole}>
                                        {roleUserMapping[mentorRole].name} ({mentorRole})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedNominee && targetRole && (
                        <div className="flex items-center justify-center gap-4 pt-4 text-center">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Current Role</p>
                                <p className="font-semibold">{selectedNominee}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Target Role</p>
                                <p className="font-semibold text-primary">{targetRole}</p>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={!selectedNominee || !selectedMentor || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : 'Confirm Nomination'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are nominating {selectedNominee ? roleUserMapping[selectedNominee].name : '...'} for Leadership Coaching to become a {targetRole}, with {selectedMentor ? roleUserMapping[selectedMentor].name : '...'} as their mentor.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleNominate}>
                                    Confirm
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SynthesisStepComponent({ step, lesson, nominationId, onUpdate, onComplete }: { step: LessonStep, lesson: LeadershipLesson, nominationId: string, onUpdate: () => void, onComplete: () => void }) {
    const { toast } = useToast();
    const [currentReflection, setCurrentReflection] = useState<Record<string, string>>({});

    if (step.type !== 'synthesis') return null;

    const getWeekNumber = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.floor(diffDays / 7) + 1;
    };
    
    const handleSaveReflection = async (weekId: string) => {
        const reflectionText = currentReflection[weekId];
        if (!reflectionText) {
            toast({ title: "Please enter your reflection.", variant: "destructive" });
            return;
        }

        const newReflection = { text: reflectionText, date: new Date().toISOString() };

        const existingReflections = (lesson.userInputs && lesson.userInputs[weekId] ? lesson.userInputs[weekId] : []) || [];
        const updatedReflections = [...existingReflections, newReflection];
        
        await saveLeadershipLessonAnswer(nominationId, lesson.id, weekId, updatedReflections);

        setCurrentReflection(prev => ({...prev, [weekId]: ''}));
        toast({ title: `Reflection for week ${weekId.split('-')[0].toUpperCase()} saved!`, description: "You can continue to add more reflections." });
        onUpdate();
    };

    const currentProgramWeek = getWeekNumber(lesson.startDate || new Date().toISOString());
    const defaultOpenAccordion = step.weeklyPractices.find(p => currentProgramWeek >= p.startWeek && currentProgramWeek <= p.endWeek)?.id;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{step.intro}</p>

            <Accordion type="single" collapsible defaultValue={defaultOpenAccordion} className="w-full space-y-2">
                {step.weeklyPractices.map(practice => {
                    const isCurrent = currentProgramWeek >= practice.startWeek && currentProgramWeek <= practice.endWeek;
                    const weeklySavedReflections = (lesson.userInputs?.[practice.id] || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return (
                        <AccordionItem value={practice.id} key={practice.id} className={cn("border rounded-lg", isCurrent ? "bg-muted/50" : "bg-card")}>
                            <AccordionTrigger className="p-3 font-semibold text-left hover:no-underline">
                                <div className="flex justify-between items-center w-full pr-2">
                                     <span>Weeks {practice.startWeek}-{practice.endWeek}: {practice.focus}</span>
                                     {isCurrent && <Badge>This Week</Badge>}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 border-t space-y-4">
                                <ul className="list-disc pl-5 text-sm text-primary/90 space-y-1">
                                    {practice.tasks.map((task, i) => (
                                        <li key={i}>{task}</li>
                                    ))}
                                </ul>

                                {weeklySavedReflections.length > 0 && (
                                     <div className="mt-4 space-y-3 pt-4 border-t">
                                        <h5 className="font-semibold text-foreground mb-4">Your Reflection Timeline</h5>
                                        <div className="relative pl-8 space-y-6">
                                            <div className="absolute left-[7px] top-1 h-full w-0.5 bg-border -z-10"></div>
                                            {weeklySavedReflections.map((reflection: any, i: number) => (
                                                <div key={i} className="flex items-start gap-4">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-primary flex-shrink-0 mt-1">
                                                        <NotebookPen className="h-3 w-3 text-primary/80" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-medium text-muted-foreground">{new Date(reflection.date).toLocaleString()}</p>
                                                        <p className="text-sm whitespace-pre-wrap mt-1">{reflection.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mt-4 space-y-2">
                                    <Label htmlFor={`synthesis-journal-${practice.id}`}>Log your reflections for this period:</Label>
                                    <Textarea
                                        id={`synthesis-journal-${practice.id}`}
                                        value={currentReflection[practice.id] || ''}
                                        onChange={(e) => setCurrentReflection(prev => ({...prev, [practice.id]: e.target.value}))}
                                        placeholder="e.g., 'Today I gave specific credit to Sarah in the team chat...'"
                                        rows={4}
                                    />
                                    <Button onClick={() => handleSaveReflection(practice.id)} disabled={!currentReflection[practice.id]}>
                                        Save Reflection
                                    </Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
            
            <div className="mt-6 pt-4 border-t">
                 <h4 className="font-semibold">Measuring Your Progress</h4>
                 <p className="text-muted-foreground whitespace-pre-wrap">{step.outro}</p>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end">
                <Button variant="outline" onClick={onComplete}>Mark as Complete (for testing)</Button>
            </div>
        </div>
    );
}


function LessonStepComponent({ step, lesson, nominationId, onComplete, onUpdateAnswer, onUpdate, answer, onExitSimulation }: { step: LessonStep, lesson: LeadershipLesson, nominationId: string, onComplete: () => void, onUpdateAnswer: (stepId: string, answer: any) => void, onUpdate: () => void, answer?: any, onExitSimulation: (messages?: any[]) => void; }) {
    const { toast } = useToast();

    const handleQuizSubmit = () => {
        if (step.type !== 'quiz_mcq' || !answer) return;
        
        const isCorrect = answer === step.correctAnswer;
        toast({
            title: isCorrect ? "Correct!" : "Not Quite",
            description: isCorrect ? step.feedback?.correct : step.feedback?.incorrect,
            variant: isCorrect ? "success" : "destructive",
        });

        if (isCorrect) {
            onComplete();
        }
    };

    switch (step.type) {
        case 'script':
            return (
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: step.content }} />
            );
        case 'quiz_mcq':
            return (
                <div className='space-y-4'>
                    <p className="font-semibold">{step.question}</p>
                    <RadioGroup value={answer} onValueChange={(val) => onUpdateAnswer(step.id, val)}>
                        {step.options.map((opt, i) => (
                            <div key={i} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                <RadioGroupItem value={opt} id={`q-${i}`} />
                                <Label htmlFor={`q-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <Button onClick={handleQuizSubmit} disabled={!answer}>Submit Answer</Button>
                </div>
            );
        case 'activity':
             return (
                 <div className='space-y-4'>
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: step.content }} />
                    <Textarea 
                        value={answer || ''} 
                        onChange={(e) => onUpdateAnswer(step.id, e.target.value)} 
                        placeholder="Your reflections..." 
                        rows={8} 
                    />
                    <Button onClick={onComplete} disabled={!answer}>Save & Continue</Button>
                </div>
            );
        case 'synthesis':
            return <SynthesisStepComponent step={step} lesson={lesson} nominationId={nominationId} onUpdate={onUpdate} onComplete={onComplete} />;
        case 'practice':
            return <SimulationArena initialConfig={step.scenario} onExit={onExitSimulation} />;
        default:
            return null;
    }
}

function LearnerView({ initialNomination, onUpdate }: { initialNomination: LeadershipNomination, onUpdate: () => void }) {
    const [nomination, setNomination] = useState(initialNomination);
    const { toast } = useToast();
    
    const [activeLesson, setActiveLesson] = useState<{ moduleIndex: number; lesson: LeadershipLesson } | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        setNomination(initialNomination);
    }, [initialNomination]);
    
    const currentModule = activeLesson ? nomination.modules[activeLesson.moduleIndex] : null;
    const currentLesson = activeLesson?.lesson;
    const currentStep = currentLesson?.steps?.[currentStepIndex];

    const handleStartLesson = async (moduleIndex: number, lesson: LeadershipLesson) => {
        setActiveLesson({ moduleIndex, lesson });
        setCurrentStepIndex(0);
        if (lesson.id === 'l1-5' && !lesson.startDate) {
             // Special handling for Synthesis: mark its start date
            const updatedNominations = getFromStorage<LeadershipNomination>(LEADERSHIP_COACHING_KEY);
            const nomIndex = updatedNominations.findIndex(n => n.id === nomination.id);
            if(nomIndex !== -1) {
                const modIndex = updatedNominations[nomIndex].modules.findIndex(m => m.id === nomination.modules[moduleIndex].id);
                if(modIndex !== -1) {
                    const lessIndex = updatedNominations[nomIndex].modules[modIndex].lessons.findIndex(l => l.id === lesson.id);
                    if(lessIndex !== -1) {
                         updatedNominations[nomIndex].modules[modIndex].lessons[lessIndex].startDate = new Date().toISOString();
                         saveToStorage(LEADERSHIP_COACHING_KEY, updatedNominations);
                         onUpdate();
                    }
                }
            }
        }
    };

    const handleStepComplete = async () => {
        if (!currentLesson || !currentModule || activeLesson === null || !currentStep) return;
        
        const answer = currentLesson.userInputs?.[currentStep.id];
        if (answer) {
            await saveLeadershipLessonAnswer(nomination.id, currentLesson.id, currentStep.id, answer);
        }

        const nextStepIndex = currentStepIndex + 1;
        if (currentLesson.steps && nextStepIndex < currentLesson.steps.length) {
            setCurrentStepIndex(nextStepIndex);
        } else {
             await completeLeadershipLesson(nomination.id, currentModule.id, currentLesson.id);
             toast({ title: "Lesson Complete!", description: `"${currentLesson.title}" has been marked as complete.`});
             onUpdate();
             setActiveLesson(null); 
        }
    };
    
    const handleExitSimulation = async (messages?: any[]) => {
        if (!messages || messages.length === 0) {
            setActiveLesson(null); // Just exit if there's no conversation
            return;
        }

        try {
            await completePracticeScenario({
                persona: (currentStep as any).scenario.persona,
                scenario: (currentStep as any).scenario.scenario,
                difficulty: (currentStep as any).scenario.difficulty,
                history: messages
            });
            toast({
                title: "Practice Complete!",
                description: "Your session has been logged.",
            });
        } catch (e) {
             toast({
                variant: "destructive",
                title: "Practice Logging Failed",
                description: "Could not save your session data.",
            });
        } finally {
            handleStepComplete();
        }
    };

    const handleUpdateAnswer = (stepId: string, answer: any) => {
        if (!currentLesson) return;
        const updatedLesson = {
            ...currentLesson,
            userInputs: {
                ...currentLesson.userInputs,
                [stepId]: answer,
            }
        };
        setActiveLesson(prev => prev ? ({ ...prev, lesson: updatedLesson }) : null);
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(p => p - 1);
        } else {
            setActiveLesson(null);
        }
    };

    if (activeLesson && currentLesson && currentStep) {
         if (currentStep.type === 'practice') {
            return <LessonStepComponent step={currentStep} lesson={currentLesson} nominationId={nomination.id} onComplete={handleStepComplete} onUpdateAnswer={handleUpdateAnswer} onUpdate={onUpdate} answer={currentLesson.userInputs?.[currentStep.id]} onExitSimulation={handleExitSimulation} />;
        }
        return (
            <div className="p-4 md:p-8 space-y-6">
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-3 text-2xl">{currentLesson.title}</CardTitle>
                            <Button variant="ghost" onClick={() => setActiveLesson(null)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Modules
                            </Button>
                        </div>
                        <CardDescription>Module {activeLesson.moduleIndex + 1}: {currentModule?.title}</CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                        <div className="p-4 border bg-muted/50 rounded-lg min-h-[300px]">
                            <LessonStepComponent 
                                step={currentStep} 
                                lesson={currentLesson}
                                nominationId={nomination.id}
                                onComplete={handleStepComplete} 
                                onUpdateAnswer={handleUpdateAnswer}
                                onUpdate={onUpdate}
                                answer={currentLesson.userInputs?.[currentStep.id]}
                                onExitSimulation={handleExitSimulation}
                            />
                        </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-between items-center">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        
                        <p className="text-sm text-muted-foreground">
                            Step {currentStepIndex + 1} of {currentLesson.steps?.length || 1}
                        </p>
                        
                        {(currentStep.type === 'script') && (
                            <Button onClick={handleStepComplete}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3">
                        <LeadershipIcon className="h-8 w-8 text-red-500" />
                        My Leadership Journey
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        You've been nominated for the Leadership Coaching Program. Complete the modules below to grow your skills.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Progress:</span>
                        <Progress value={(nomination.modulesCompleted / nomination.modules.length) * 100} className="w-full max-w-sm" />
                        <span className="text-sm font-medium text-muted-foreground">
                            {Math.round((nomination.modulesCompleted / nomination.modules.length) * 100)}%
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Accordion type="multiple" defaultValue={[`module-${nomination.modules.findIndex(m => !m.isCompleted)}`]} className="w-full space-y-4">
                {nomination.modules.map((module, moduleIndex) => (
                    <AccordionItem key={module.id} value={`module-${moduleIndex}`} className="border rounded-lg bg-card shadow-sm">
                        <AccordionTrigger className="p-4 hover:no-underline">
                            <div className="flex-1 text-left">
                                <p className="text-lg font-semibold">{`Module ${moduleIndex + 1}: ${module.title}`}</p>
                                <p className="text-sm text-muted-foreground">{module.description}</p>
                            </div>
                            <div className="ml-4">
                                {module.isCompleted ? (
                                    <Badge variant="success">Completed</Badge>
                                ) : (
                                    <Badge variant="secondary">{nomination.currentModuleId === module.id ? 'In Progress' : 'Not Started'}</Badge>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border-t">
                            <div className="space-y-2">
                               {module.lessons.map((lesson, lessonIndex) => {
                                   const previousLesson = module.lessons[lessonIndex - 1];
                                   const isModuleLocked = moduleIndex > 0 && !nomination.modules[moduleIndex - 1].isCompleted;
                                   
                                   let isLessonLocked = false;
                                   if (previousLesson) {
                                       if (previousLesson.id === 'l1-5') { // Synthesis lesson exception
                                           isLessonLocked = !previousLesson.startDate;
                                       } else {
                                           isLessonLocked = !previousLesson.isCompleted;
                                       }
                                   }
                                   
                                   const isLocked = isModuleLocked || isLessonLocked;
                                   
                                   const hasStarted = (lesson.userInputs && Object.keys(lesson.userInputs).length > 0) || lesson.startDate;
                                   const isInProgress = hasStarted && !lesson.isCompleted;

                                   let buttonText = 'Start';
                                   if (lesson.isCompleted) {
                                       buttonText = 'Review';
                                   } else if (isInProgress) {
                                       buttonText = 'Resume';
                                   }

                                   return (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                {isLocked ? <Lock className="h-5 w-5 text-muted-foreground/50" /> : lesson.isCompleted ? <CheckCircle className="h-5 w-5 text-green-500" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
                                                <p className={cn("font-medium", isLocked && "text-muted-foreground/50")}>{lesson.title}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Badge variant="outline">Locked</Badge>}
                                                <Button 
                                                    variant={lesson.isCompleted ? "secondary" : "default"} 
                                                    size="sm"
                                                    onClick={() => handleStartLesson(moduleIndex, lesson)}
                                                    disabled={isLocked}
                                                >
                                                    {buttonText}
                                                </Button>
                                            </div>
                                        </div>
                                   )
                               })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

function ManagerView() {
    const { role } = useRole();
    const [nominations, setNominations] = useState<LeadershipNomination[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNominations = useCallback(async () => {
        if (!role) return;
        setIsLoading(true);
        const userNominations = await getLeadershipNominationsForManager(role);
        setNominations(userNominations);
        setIsLoading(false);
    }, [role]);

    useEffect(() => {
        fetchNominations();
    }, [fetchNominations]);

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="space-y-1">
                    <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3">
                        <LeadershipIcon className="h-8 w-8 text-red-500" />
                        Leadership Development
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Nominate high-potential employees and track their progress in the leadership program.
                    </CardDescription>
                </div>
                <NominateDialog onNomination={fetchNominations} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Nomination Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-48 w-full" /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Current Module</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Growth Score</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {nominations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            No employees have been nominated yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    nominations.map(n => (
                                        <TableRow key={n.id}>
                                            <TableCell>
                                                <div className="font-medium">{roleUserMapping[n.nomineeRole]?.name || n.nomineeRole}</div>
                                            </TableCell>
                                            <TableCell>{n.modules.find(m => m.id === n.currentModuleId)?.title || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={(n.modulesCompleted / n.modules.length) * 100} className="w-24" />
                                                    <span>{Math.round((n.modulesCompleted / n.modules.length) * 100)}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>7.5/10</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">View Report</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function LeadershipPage() {
  const { role, setRole, isLoading: isRoleLoading } = useRole();
  const [nomination, setNomination] = useState<LeadershipNomination | null>(null);
  const [isCheckingNomination, setIsCheckingNomination] = useState(true);

  const fetchNominationData = useCallback(async () => {
    if (!role) return;
    setIsCheckingNomination(true);
    const userNomination = await getNominationForUser(role);
    setNomination(userNomination);
    setIsCheckingNomination(false);
  }, [role]);

  useEffect(() => {
    if(role) {
        fetchNominationData();
         window.addEventListener('feedbackUpdated', fetchNominationData);
    }
     return () => {
      window.removeEventListener('feedbackUpdated', fetchNominationData);
    };
  }, [role, fetchNominationData]);

  const isLoading = isRoleLoading || isCheckingNomination;

  if (isLoading || !role) {
    return (
      <DashboardLayout role="Manager" onSwitchRole={() => {}}>
        <Skeleton className="w-full h-screen" />
      </DashboardLayout>
    );
  }
  
  const isManagerialRole = ['Manager', 'HR Head'].includes(role);
  if (isManagerialRole) {
      return (
          <DashboardLayout role={role} onSwitchRole={setRole}>
              <ManagerView />
          </DashboardLayout>
      );
  }

  if (nomination) {
    return (
        <DashboardLayout role={role} onSwitchRole={setRole}>
            <LearnerView initialNomination={nomination} onUpdate={fetchNominationData} />
        </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role} onSwitchRole={setRole}>
      <div className="p-8"><p>Access to the Leadership hub is by nomination only.</p></div>
    </DashboardLayout>
  );
}

