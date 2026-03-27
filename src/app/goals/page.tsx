
"use client";

import { useState, useEffect } from 'react';
import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import DashboardLayout from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Scale, Target, ArrowRight, BookCopy, LineChart, Users, ArrowLeft, Database, RefreshCw, Wand2, ShieldCheck, Settings, FileInput, Download, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { roleUserMapping } from '@/lib/role-mapping';
import { Badge } from '@/components/ui/badge';

const frameworks = [
  { id: 'bell-curve', title: 'Bell Curve', description: 'Traditional ranking distribution.', icon: LineChart },
  { id: '9-box', title: '9-Box Grid', description: 'Performance vs. Potential matrix.', icon: BookCopy },
  { id: 'okr', title: 'OKR-based System', description: 'Objectives and Key Results.', icon: Target },
  { id: 'custom', title: 'Custom Framework', description: 'Create your own weighted scoring system.', icon: Scale },
];

const reviewFrequencies = ['Monthly', 'Quarterly', 'Annually'];
const trackingLevels = ['Site', 'Department', 'Location', 'Role', 'Team'];
const kpiCategories = ['1', '2', '3', '4', '5'];
const uploadMethods = ['Manual entry', 'Excel upload'];
const uploadFrequencies = ['Monthly', 'Quarterly'];
const roleChangeOptions = ['Realign KPIs', 'Reset Scores'];

type SetupStep = 'framework' | 'reviewGroup' | 'dataCollection' | 'roleChange' | 'setupAssistance';

function FrameworkStep({ onNext }: { onNext: () => void }) {
    const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
    const [reviewFrequency, setReviewFrequency] = useState<string | null>(null);
    const [trackingLevel, setTrackingLevel] = useState<string | null>(null);

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3"><Scale className="h-8 w-8 text-primary" />Set Up Your Performance Framework</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Step 1: Choose Evaluation Methodology</Label>
                    <RadioGroup value={selectedFramework ?? ''} onValueChange={setSelectedFramework} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {frameworks.map((framework) => (
                            <Label key={framework.id} htmlFor={framework.id} className={cn("flex flex-col items-start p-4 border-2 rounded-lg cursor-pointer transition-all", selectedFramework === framework.id ? "border-primary bg-primary/5 shadow-lg" : "border-muted hover:border-primary/50")}>
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-3">
                                        <framework.icon className={cn("h-6 w-6", selectedFramework === framework.id ? "text-primary" : "text-muted-foreground")} />
                                        <span className="font-bold text-lg text-foreground">{framework.title}</span>
                                    </div>
                                    <RadioGroupItem value={framework.id} id={framework.id} className="h-5 w-5" />
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 ml-9">{framework.description}</p>
                            </Label>
                        ))}
                    </RadioGroup>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="review-frequency">How often is performance reviewed?</Label>
                        <Select onValueChange={setReviewFrequency}><SelectTrigger id="review-frequency"><SelectValue placeholder="Select frequency..." /></SelectTrigger><SelectContent>{reviewFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tracking-level">At what level is performance tracked?</Label>
                        <Select onValueChange={setTrackingLevel}><SelectTrigger id="tracking-level"><SelectValue placeholder="Select level..." /></SelectTrigger><SelectContent>{trackingLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={onNext} disabled={!selectedFramework || !reviewFrequency || !trackingLevel} size="lg">Next: Define Review Group <ArrowRight className="ml-2" /></Button>
            </CardFooter>
        </Card>
    );
}

function ReviewGroupStep({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
    const [kpiRows, setKpiRows] = useState([{ id: 1, name: '', weightage: '', thresholds: { poor: '', average: '', good: '', excellent: '' } }]);

    const addKpiRow = () => {
        setKpiRows([...kpiRows, { id: kpiRows.length + 1, name: '', weightage: '', thresholds: { poor: '', average: '', good: '', excellent: '' } }]);
    };
    
    const availableRoles = Object.keys(roleUserMapping).filter(r => r !== 'Anonymous') as Role[];

    return (
        <Card className="max-w-5xl mx-auto">
            <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-3xl font-bold font-headline flex items-center gap-3"><Users className="h-8 w-8 text-primary" />Define Review Group</CardTitle></div><Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button></div></CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="review-role">Employee Group</Label>
                        <Select>
                            <SelectTrigger id="review-role"><SelectValue placeholder="Select a role..." /></SelectTrigger>
                            <SelectContent>
                                {availableRoles.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 lg:col-span-1"><Label htmlFor="headcount">Headcount for this Group</Label><Input id="headcount" type="number" placeholder="e.g., 25" /></div>
                    <div className="space-y-2 lg:col-span-1"><Label htmlFor="kpi-categories">Number of KPI Categories</Label><Select><SelectTrigger id="kpi-categories"><SelectValue placeholder="Select number..." /></SelectTrigger><SelectContent>{kpiCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Assign KPIs for this Role</Label>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead className="w-[250px]">KPI Name</TableHead><TableHead className="w-[100px]">Weightage (%)</TableHead><TableHead colSpan={4}>Thresholds</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {kpiRows.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell><Input placeholder="e.g., Customer Satisfaction" className="h-8" /></TableCell>
                                        <TableCell><Input type="number" placeholder="e.g., 20" className="h-8" /></TableCell>
                                        <TableCell><Input placeholder="Poor" className="h-8 text-xs" /></TableCell>
                                        <TableCell><Input placeholder="Average" className="h-8 text-xs" /></TableCell>
                                        <TableCell><Input placeholder="Good" className="h-8 text-xs" /></TableCell>
                                        <TableCell><Input placeholder="Excellent" className="h-8 text-xs" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Button variant="outline" size="sm" onClick={addKpiRow} className="mt-2">Add KPI</Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={onBack}>Back</Button>
                <Button onClick={onNext} size="lg">Next: Data Collection <ArrowRight className="ml-2" /></Button>
            </CardFooter>
        </Card>
    );
}

function DataCollectionStep({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
    return (
        <Card className="max-w-4xl mx-auto">
             <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-3xl font-bold font-headline flex items-center gap-3"><Database className="h-8 w-8 text-primary" />Data Collection & Delegation</CardTitle></div><Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button></div></CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="upload-method">How will KPI data be uploaded?</Label><Select><SelectTrigger id="upload-method"><SelectValue placeholder="Select method..." /></SelectTrigger><SelectContent>{uploadMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="upload-frequency">How frequently will data be uploaded?</Label><Select><SelectTrigger id="upload-frequency"><SelectValue placeholder="Select frequency..." /></SelectTrigger><SelectContent>{uploadFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label htmlFor="data-delegate">Assign Data Delegate (Optional)</Label><Select><SelectTrigger id="data-delegate"><SelectValue placeholder="Select a team member..." /></SelectTrigger><SelectContent><SelectItem value="user1">Ben Carter</SelectItem><SelectItem value="user2">Casey Day</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">This user will be able to upload KPI data on your behalf.</p></div>
            </CardContent>
            <CardFooter className="flex justify-between">
                 <Button variant="ghost" onClick={onBack}>Back</Button>
                <Button onClick={onNext} size="lg">Next: Role Change Management <ArrowRight className="ml-2" /></Button>
            </CardFooter>
        </Card>
    )
}

function RoleChangeStep({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-3xl font-bold font-headline flex items-center gap-3"><RefreshCw className="h-8 w-8 text-primary" />Role Change Management</CardTitle></div><Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button></div></CardHeader>
            <CardContent className="space-y-4 pt-4">
                <p className="text-base font-semibold">If an employee changes roles, which actions should be taken?</p>
                <div className="space-y-2 rounded-md border p-4">
                    {roleChangeOptions.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                            <Checkbox id={option} />
                            <Label htmlFor={option} className="font-normal">{option}</Label>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">The system will prompt you to confirm these actions whenever a role change is detected for an employee in this review group.</p>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={onBack}>Back</Button>
                <Button onClick={onNext} size="lg">Next: Setup Assistance <ArrowRight className="ml-2" /></Button>
            </CardFooter>
        </Card>
    );
}

function SetupAssistanceStep({ onBack, onFinish }: { onBack: () => void, onFinish: () => void }) {
    
    return (
         <Card className="max-w-4xl mx-auto">
            <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-3xl font-bold font-headline flex items-center gap-3"><Wand2 className="h-8 w-8 text-primary" />Setup Assistance</CardTitle></div><Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2" /> Back</Button></div></CardHeader>
            <CardContent className="space-y-6 pt-4">
                <p className="text-base font-semibold">Would you like Laddrr to pre-configure this system for you?</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <Card className="hover:bg-primary/5 hover:border-primary/50 transition-colors">
                        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="text-primary" /> Yes, use Guided Wizard</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">Laddrr will pre-populate KPIs, weights, and thresholds based on role & appraisal history. You can edit these later.</p></CardContent>
                        <CardFooter><Button className="w-full" onClick={onFinish}>Finish with Guided Setup</Button></CardFooter>
                    </Card>
                     <Card className="hover:bg-primary/5 hover:border-primary/50 transition-colors">
                        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="text-primary" /> No, I'll set it up manually</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">You will configure all KPIs, weights, and thresholds from scratch. Support will be available if you need it.</p></CardContent>
                        <CardFooter><Button className="w-full" onClick={onFinish}>Finish and Configure Manually</Button></CardFooter>
                    </Card>
                </div>
            </CardContent>
             <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={onBack}>Back</Button>
            </CardFooter>
        </Card>
    );
}

function GoalsSetup({ onSetupComplete }: { onSetupComplete: () => void }) {
  const [setupStep, setSetupStep] = useState<SetupStep>('framework');

  const renderStep = () => {
      switch (setupStep) {
          case 'framework': return <FrameworkStep onNext={() => setSetupStep('reviewGroup')} />;
          case 'reviewGroup': return <ReviewGroupStep onBack={() => setSetupStep('framework')} onNext={() => setSetupStep('dataCollection')} />;
          case 'dataCollection': return <DataCollectionStep onBack={() => setSetupStep('reviewGroup')} onNext={() => setSetupStep('roleChange')} />;
          case 'roleChange': return <RoleChangeStep onBack={() => setSetupStep('dataCollection')} onNext={() => setSetupStep('setupAssistance')} />;
          case 'setupAssistance': return <SetupAssistanceStep onBack={() => setSetupStep('roleChange')} onFinish={onSetupComplete} />;
          default: return <FrameworkStep onNext={() => setSetupStep('reviewGroup')} />;
      }
  }

  return (
    <div className="p-4 md:p-8">
        {renderStep()}
    </div>
  );
}

const mockFrameworkData = [
    { role: 'Employee', kpi: 'Project Delivery Rate', weightage: '50%', methodology: 'Custom' },
    { role: 'Employee', kpi: 'Code Quality Score', weightage: '30%', methodology: 'Custom' },
    { role: 'Employee', kpi: 'Team Collaboration Rating', weightage: '20%', methodology: 'Custom' },
    { role: 'Team Lead', kpi: 'Team Performance Index', weightage: '60%', methodology: 'Bell Curve' },
    { role: 'Team Lead', kpi: 'Leadership Score Growth', weightage: '40%', methodology: 'Bell Curve' },
];

function GoalsDashboard() {
    const { toast } = useToast();
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [selectedUploadRole, setSelectedUploadRole] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFileName(file.name);
        }
    };
    
    const handleDownloadSample = () => {
        toast({
            title: "Sample File Downloaded",
            description: "A sample CSV template has been downloaded."
        });
    };

    const handleUpload = () => {
        if (!selectedFileName) {
             toast({
                variant: 'destructive',
                title: "No File Selected",
                description: "Please choose a file to upload."
            });
            return;
        }
        toast({
            title: "Upload Successful",
            description: `${selectedFileName} has been uploaded for processing.`,
            variant: 'success'
        });
        setSelectedFileName(null);
    }
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3"><Target className="h-8 w-8 text-primary" />Goals & KPI Framework</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role</TableHead>
                                <TableHead>KPI Name</TableHead>
                                <TableHead>Weightage (%)</TableHead>
                                <TableHead>Evaluation Methodology</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockFrameworkData.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.role}</TableCell>
                                    <TableCell>{item.kpi}</TableCell>
                                    <TableCell>{item.weightage}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{item.methodology}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Upload Performance Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Select Role</Label>
                             <RadioGroup value={selectedUploadRole ?? ''} onValueChange={setSelectedUploadRole} className="flex gap-4 pt-1">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Employee" id="role-employee" />
                                    <Label htmlFor="role-employee">Employee</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Team Lead" id="role-team-lead" />
                                    <Label htmlFor="role-team-lead">Team Lead</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>Sample File</Label>
                            <button onClick={handleDownloadSample} className="w-full text-left text-sm font-medium text-primary underline-offset-4 hover:underline flex items-center gap-2 p-2 rounded-md hover:bg-muted -mx-2">
                                <Download className="h-4 w-4" />
                                Download Sample Template
                            </button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex items-center gap-2">
                         <Button className="w-full md:w-auto" onClick={handleUpload} disabled={!selectedFileName}>Upload Data</Button>
                         <Label htmlFor="file-upload" className="cursor-pointer text-muted-foreground hover:text-primary">
                            <Paperclip className="h-5 w-5" />
                         </Label>
                         <Input id="file-upload" type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
                         {selectedFileName && <span className="text-sm text-muted-foreground">{selectedFileName}</span>}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function GoalsPage() {
  const { role, setRole, isLoading } = useRole();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check session storage to see if setup was already completed
    const setupStatus = sessionStorage.getItem('goalsSetupComplete');
    if (setupStatus === 'true') {
      setIsSetupComplete(true);
    }
    setIsCheckingSetup(false);
  }, []);

  const handleFinishSetup = () => {
    toast({
        title: "Setup Complete!",
        description: "Your performance framework has been saved.",
        variant: 'success'
    });
    // Save state to session storage to persist across reloads
    sessionStorage.setItem('goalsSetupComplete', 'true');
    setIsSetupComplete(true);
  };

  if (isLoading || isCheckingSetup || !role) {
    return (
      <DashboardLayout role="Manager" onSwitchRole={() => {}}>
        <Skeleton className="w-full h-screen" />
      </DashboardLayout>
    );
  }
  
  if (role !== 'Manager') {
      return (
         <DashboardLayout role={role} onSwitchRole={setRole}>
            <div className="p-8 text-center">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground mt-2">The Goals &amp; KPI Management feature is only available for the Manager role.</p>
            </div>
          </DashboardLayout>
      )
  }

  return (
    <DashboardLayout role={role} onSwitchRole={setRole}>
      {isSetupComplete ? <GoalsDashboard /> : <GoalsSetup onSetupComplete={handleFinishSetup} />}
    </DashboardLayout>
  );
}
