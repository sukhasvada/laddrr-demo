

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar, SidebarMenuButton } from '@/components/ui/sidebar';
import { LogOut, User, BarChart, Check, ListTodo, MessageSquare, BrainCircuit, MessagesSquare, FlaskConical, Handshake, Scale, HeartPulse } from 'lucide-react';
import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import { getAllFeedback, getOneOnOneHistory } from '@/services/feedback-service';
import { getNominationForUser as getInterviewerNominationForUser } from '@/services/interviewer-lab-service';
import { getNominationForUser as getLeadershipNominationForUser, getNominationsForMentor } from '@/services/leadership-service';
import { Badge } from '@/components/ui/badge';
import { roleUserMapping } from '@/lib/role-mapping';
import { cn } from '@/lib/utils';
import { LeadershipIcon } from './ui/leadership-icon';
import { InterviewerLabIcon } from './ui/interviewer-lab-icon';
import { OneOnOneIcon } from './ui/one-on-one-icon';


interface MainSidebarProps {
  currentRole: Role;
  onSwitchRole: (role: Role | null) => void;
}

export default function MainSidebar({ currentRole, onSwitchRole }: MainSidebarProps) {
  const { availableRoles } = useRole();
  const currentUser = roleUserMapping[currentRole] || { name: 'User', fallback: 'U', imageHint: 'person', role: currentRole };
  const currentUserName = currentUser.name;
  const pathname = usePathname();
  const [messageCount, setMessageCount] = useState(0);
  const [oneOnOneCount, setOneOnOneCount] = useState(0);
  const [coachingCount, setCoachingCount] = useState(0);
  const [isInterviewerNominee, setIsInterviewerNominee] = useState(false);
  const [isLeadershipNominee, setIsLeadershipNominee] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);
  const { state: sidebarState } = useSidebar();
  

  const fetchData = useCallback(async () => {
    if (!currentRole) return;
    try {
      // Fetch all data sources
      const feedback = await getAllFeedback();
      const history = await getOneOnOneHistory();

      // --- Calculate 1-on-1 Notifications (Critical Insights) ---
      let criticalInsightsCount = 0;
      const actionableInsightStatuses: string[] = [];
      if (currentRole === 'Employee') actionableInsightStatuses.push('pending_employee_acknowledgement');
      if (currentRole === 'Team Lead') {
          actionableInsightStatuses.push('open'); 
          actionableInsightStatuses.push('pending_supervisor_retry');
      }
      if (currentRole === 'AM') actionableInsightStatuses.push('pending_am_review');
      if (currentRole === 'Manager') actionableInsightStatuses.push('pending_manager_review');
      if (currentRole === 'HR Head') {
          actionableInsightStatuses.push('pending_hr_review');
          actionableInsightStatuses.push('pending_final_hr_action');
      }
      
      history.forEach(h => {
          const insight = h.analysis.criticalCoachingInsight;
          const isMyTurn = (h.supervisorName === currentUserName && (insight?.status === 'open' || insight?.status === 'pending_supervisor_retry')) ||
                           (h.employeeName === currentUserName && insight?.status === 'pending_employee_acknowledgement') ||
                           (insight && insight.status && actionableInsightStatuses.includes(insight.status) && h.assignedTo?.includes(currentRole));

          if (insight && insight.status && isMyTurn && actionableInsightStatuses.includes(insight.status)) {
              criticalInsightsCount++;
          }
      });
      setOneOnOneCount(criticalInsightsCount);

      // --- Calculate General Messages (non-1-on-1 related) ---
      let generalMessageCount = 0;
      generalMessageCount += feedback.filter(f => {
        const isAssignedToMe = f.assignedTo?.includes(currentRole as any);
        if (!isAssignedToMe) return false;
        const isPendingAck = f.status === 'Pending Acknowledgement';
        const isIdentifiedAck = f.status === 'Pending Employee Acknowledgment' && f.submittedBy === currentRole;
        return isPendingAck || isIdentifiedAck;
      }).length;
      setMessageCount(generalMessageCount);

      // --- Calculate Coaching Notifications ---
      let devCount = 0;
      history.forEach(h => {
        if (h.supervisorName === currentUserName) {
          devCount += h.analysis.coachingRecommendations.filter(rec => rec.status === 'pending').length;
        }
      });
      const recStatusesToCount: string[] = [];
      if (currentRole === 'AM') recStatusesToCount.push('pending_am_review');
      if (currentRole === 'Manager') recStatusesToCount.push('pending_manager_acknowledgement');
      if (recStatusesToCount.length > 0) {
        history.forEach(h => {
            devCount += h.analysis.coachingRecommendations.filter(rec => rec.status && recStatusesToCount.includes(rec.status)).length;
        });
      }
      setCoachingCount(devCount);

      // --- Check Nomination Statuses ---
      const [interviewerNomination, leadershipNomination, mentorNominations] = await Promise.all([
        getInterviewerNominationForUser(currentRole),
        getLeadershipNominationForUser(currentRole),
        getNominationsForMentor(currentRole)
      ]);
      setIsInterviewerNominee(!!interviewerNomination);
      setIsLeadershipNominee(!!leadershipNomination);
      setIsMentor(mentorNominations.length > 0);

    } catch (error) {
      console.error("Failed to fetch sidebar data", error);
      setMessageCount(0);
      setOneOnOneCount(0);
      setCoachingCount(0);
      setIsInterviewerNominee(false);
      setIsLeadershipNominee(false);
      setIsMentor(false);
    }
  }, [currentRole, currentUserName]);

  // Menu items are now defined within the component body to access state
  const menuItems = [
    { href: '/', icon: <BarChart className="text-blue-500"/>, label: 'Dashboard' },
    { href: '/1-on-1', icon: <OneOnOneIcon className="text-green-500 size-5 flex-shrink-0"/>, label: '1-on-1', badge: oneOnOneCount > 0 ? oneOnOneCount : null, badgeVariant: 'destructive' as const },
    { href: '/nets', icon: <MessagesSquare className="text-indigo-500"/>, label: 'Nets' },
    ...(['Team Lead', 'AM', 'Manager', 'HR Head'].includes(currentRole) ? [{ href: '/coaching', icon: <BrainCircuit className="text-purple-500"/>, label: 'Coaching', badge: coachingCount > 0 ? coachingCount : null, badgeVariant: 'secondary' as const }] : []),
    ...(isMentor ? [{ href: '/mentorship', icon: <Handshake className="text-cyan-500"/>, label: 'Mentorship' }] : []),
    ...(['Manager'].includes(currentRole) ? [{ href: '/goals', icon: <Scale className="text-rose-500"/>, label: 'Goals' }] : []),
    ...(['HR Head'].includes(currentRole) ? [{ href: '/org-health', icon: <HeartPulse className="text-pink-500"/>, label: 'Org Health' }] : []),
    ...(['Manager', 'HR Head'].includes(currentRole) ? [{ 
        href: '/managers-lab', 
        icon: <FlaskConical className="text-orange-500"/>, 
        label: "Manager's Lab",
        children: [
           { href: '/interviewer-lab', icon: <InterviewerLabIcon className="text-teal-500 size-4"/>, label: "Interviewer Lab" },
           { href: '/leadership', icon: <LeadershipIcon className="text-red-500 size-4"/>, label: "Leadership" }
        ]
    }] : []),
    ...(!['Manager', 'HR Head'].includes(currentRole) && isInterviewerNominee ? [{ href: '/interviewer-lab', icon: <InterviewerLabIcon className="text-teal-500"/>, label: "Interviewer Lab" }] : []),
    ...(!['Manager', 'HR Head'].includes(currentRole) && isLeadershipNominee ? [{ href: '/leadership', icon: <LeadershipIcon className="text-red-500 size-4"/>, label: "Leadership" }] : []),
    { href: '/messages', icon: <MessageSquare className="text-yellow-500"/>, label: 'Messages', badge: messageCount > 0 ? messageCount : null, badgeVariant: 'destructive' as const },
  ];

  useEffect(() => {
    const activeSubMenu = menuItems.find(item => 
      item.children?.some(child => pathname.startsWith(child.href))
    );
    if (activeSubMenu && !openSubMenus.includes(activeSubMenu.label)) {
      setOpenSubMenus(prev => [...prev, activeSubMenu.label]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (sidebarState === 'collapsed') {
      setOpenSubMenus([]);
    }
  }, [sidebarState]);

  useEffect(() => {
    fetchData();

    const handleDataUpdate = () => {
        fetchData();
    };

    window.addEventListener('storage', handleDataUpdate);
    window.addEventListener('feedbackUpdated', handleDataUpdate);

    return () => {
        window.removeEventListener('storage', handleDataUpdate);
        window.removeEventListener('feedbackUpdated', handleDataUpdate);
    };
  }, [fetchData]);
  
  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  }

  const renderMenuItem = (item: any) => {
     if (item.children) {
      const isParentActive = item.children.some((child: any) => pathname.startsWith(child.href));
      const isSubMenuOpen = openSubMenus.includes(item.label);

      return (
        <SidebarMenuItem key={item.label} className="flex flex-col">
            <SidebarMenuButton 
                asChild={false}
                isActive={isParentActive && !isSubMenuOpen}
                onClick={() => toggleSubMenu(item.label)}
                className="w-full"
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                </div>
              </div>
            </SidebarMenuButton>
            {isSubMenuOpen && (
              <SidebarMenuSub className="mt-1">
                {item.children.map((child: any) => (
                  <SidebarMenuSubItem key={child.href}>
                     <Link href={child.href} passHref>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith(child.href)}>
                          <div className="flex items-center gap-2">
                             {child.icon}
                             <span>{child.label}</span>
                          </div>
                      </SidebarMenuSubButton>
                    </Link>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
        </SidebarMenuItem>
      )
    }

    return (
     <SidebarMenuItem key={item.href}>
        <Link href={item.href} passHref>
          <SidebarMenuButton asChild isActive={pathname === item.href}>
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge ? (
                  <Badge variant={item.badgeVariant} className="h-6 w-6 flex items-center justify-center p-0 rounded-full">
                  {item.badge}
                </Badge>
              ) : null}
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://placehold.co/100x100.png`} alt={currentUser.name} data-ai-hint={`${currentUser.imageHint} avatar`} />
                <AvatarFallback>{currentUser.fallback}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg text-sidebar-foreground">{currentUser.name}</span>
                <span className="text-sm text-muted-foreground">{currentRole}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 ml-4">
            <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                {availableRoles.map(role => (
                    <DropdownMenuItem key={role} onClick={() => onSwitchRole(role)}>
                         {currentRole === role ? (
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                            <span className="mr-2 h-4 w-4" />
                        )}
                        <span>{role}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSwitchRole(null)}>
              <LogOut className="mr-2 h-4 w-4 text-destructive" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onSwitchRole(null)}>
              <LogOut className="text-destructive"/>
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


