

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
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LogOut, User, BarChart, CheckSquare, Vault, Check, ListTodo, MessageSquare, ShieldQuestion, BrainCircuit, Scale } from 'lucide-react';
import type { Role } from '@/hooks/use-role';
import { useRole } from '@/hooks/use-role';
import { getAllFeedback, getOneOnOneHistory } from '@/services/feedback-service';
import { Badge } from '@/components/ui/badge';
import { roleUserMapping } from '@/lib/role-mapping';


interface MainSidebarProps {
  currentRole: Role;
  onSwitchRole: (role: Role | null) => void;
}

export default function MainSidebar({ currentRole, onSwitchRole }: MainSidebarProps) {
  const { availableRoles } = useRole();
  const currentUser = roleUserMapping[currentRole] || { name: 'User', fallback: 'U', imageHint: 'person', role: currentRole };
  const currentUserName = currentUser.name;
  const pathname = usePathname();
  const [actionItemCount, setActionItemCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [coachingCount, setCoachingCount] = useState(0);

  const fetchFeedbackCounts = useCallback(async () => {
    if (!currentRole) return;
    try {
      const feedback = await getAllFeedback();
      const history = await getOneOnOneHistory();

      // Action items count (non-1-on-1 escalations)
      let totalActionItems = 0;
      setActionItemCount(totalActionItems);


      // Messages count (only non-1-on-1 items)
      let totalMessages = 0;
      totalMessages += feedback.filter(f => {
        const isAssignedToMe = f.assignedTo?.includes(currentRole as any);
        if (!isAssignedToMe) return false;

        const isPendingAck = f.status === 'Pending Acknowledgement';
        const isIdentifiedAck = f.status === 'Pending Employee Acknowledgment' && f.submittedBy === currentRole;
        return isPendingAck || isIdentifiedAck;
      }).length;
      
      setMessageCount(totalMessages);
      
      // Coaching & Development Count
      let devCount = 0;
      // My Development (pending recommendations for me)
      history.forEach(h => {
        if (h.supervisorName === currentUserName) {
          devCount += h.analysis.coachingRecommendations.filter(rec => rec.status === 'pending').length;
        }
      });

      // Team Development (escalations for me to review)
      const recStatusesToCount: string[] = [];
      if (currentRole === 'AM') recStatusesToCount.push('pending_am_review');
      if (currentRole === 'Manager') recStatusesToCount.push('pending_manager_acknowledgement');

      if (recStatusesToCount.length > 0) {
        history.forEach(h => {
            devCount += h.analysis.coachingRecommendations.filter(rec => rec.status && recStatusesToCount.includes(rec.status)).length;
        });
      }
      setCoachingCount(devCount);

    } catch (error) {
      console.error("Failed to fetch feedback counts", error);
      setActionItemCount(0);
      setMessageCount(0);
      setCoachingCount(0);
    }
  }, [currentRole, currentUserName]);


  useEffect(() => {
    fetchFeedbackCounts();

    const handleDataUpdate = () => {
        fetchFeedbackCounts();
    };

    window.addEventListener('storage', handleDataUpdate);
    window.addEventListener('feedbackUpdated', handleDataUpdate);

    return () => {
        window.removeEventListener('storage', handleDataUpdate);
        window.removeEventListener('feedbackUpdated', handleDataUpdate);
    };
  }, [fetchFeedbackCounts]);

  const isSupervisor = ['Team Lead', 'AM', 'Manager', 'HR Head'].includes(currentRole);

  const menuItems = [
    { href: '/', icon: <BarChart />, label: 'Dashboard' },
    { href: '/1-on-1', icon: <CheckSquare />, label: '1-on-1' },
    ...(isSupervisor ? [{ href: '/coaching', icon: <BrainCircuit />, label: 'Coaching', badge: coachingCount > 0 ? coachingCount : null, badgeVariant: 'secondary' as const }] : []),
    { href: '/messages', icon: <MessageSquare />, label: 'Messages', badge: messageCount > 0 ? messageCount : null, badgeVariant: 'destructive' as const },
  ];
  
  const assigneeMenuItems = [
    { href: '/action-items', icon: <ListTodo />, label: 'Action Items', badge: actionItemCount > 0 ? actionItemCount : null, badgeVariant: 'destructive' as const }
  ]

  const renderMenuItem = (item: any) => (
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
                            <Check className="mr-2 h-4 w-4" />
                        ) : (
                            <span className="mr-2 h-4 w-4" />
                        )}
                        <span>{role}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSwitchRole(null)}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(renderMenuItem)}
          {(currentRole === 'HR Head' || currentRole === 'Manager' || currentRole === 'AM') && assigneeMenuItems.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onSwitchRole(null)}>
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
