

import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import { Briefcase, Users, UserCheck, ShieldCheck, ShieldQuestion, UserCog, ChevronRight, Scale, Building, FileQuestion } from 'lucide-react';
import Header from './header';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface RoleSelectionProps {
  onSelectRole: (role: Role) => void;
}

const roleDetails = {
  'Employee': {
    icon: UserCheck,
    description: "Access your tasks and feedback.",
    color: "text-green-500",
  },
  'Team Lead': {
    icon: Users,
    description: "Manage your team's performance.",
     color: "text-blue-500",
  },
  'AM': {
    icon: UserCog,
    description: "Coach leads and track escalations.",
     color: "text-orange-500",
  },
  'Manager': {
    icon: Briefcase,
    description: "Oversee departmental accountability.",
     color: "text-purple-500",
  },
  'HR Head': {
    icon: ShieldCheck,
    description: "Access the vault and manage all cases.",
     color: "text-red-500",
  },
};

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const { availableRoles, activeSurveyExists } = useRole();
  const standardRoles = availableRoles;

  const RoleTile = ({ role }: { role: Role }) => {
    const details = roleDetails[role as keyof typeof roleDetails];
    if (!details) return null; // Don't render if no details exist
    const Icon = details.icon;
    return (
      <button
        onClick={() => onSelectRole(role)}
        className={cn(
          "group relative w-full text-left rounded-lg transition-all duration-300 ease-in-out overflow-hidden",
           "bg-card/50 hover:bg-card/100 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "p-4"
        )}
      >
        <div className="flex items-center gap-4">
            <Icon className={cn("h-6 w-6 transition-colors group-hover:text-primary", details.color)} />
            <div>
              <p className="font-semibold text-foreground">{role}</p>
            </div>
          </div>
      </button>
    );
  };
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 bg-transparent shadow-none md:border md:bg-card/30 md:shadow-lg">
          <CardHeader className="px-4 md:px-6 pt-4 pb-2">
            <p className="text-muted-foreground">Please select your role to continue.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4 md:p-6 pt-0">
            {standardRoles.map((role) => (
              <RoleTile key={role} role={role} />
            ))}

            
                <>
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            OR
                            </span>
                        </div>
                    </div>
                    <Link href="/survey" passHref>
                        <button
                            className={cn(
                            "group relative w-full text-left rounded-lg transition-all duration-300 ease-in-out overflow-hidden",
                            "bg-teal-500/10 hover:bg-teal-500/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/20",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            "p-4"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <FileQuestion className="h-6 w-6 text-teal-500" />
                                <div>
                                    <p className="font-semibold text-foreground">Take Active Survey</p>
                                    <p className="text-sm text-muted-foreground">Submit your anonymous response.</p>
                                </div>
                            </div>
                        </button>
                    </Link>
                </>
            
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
