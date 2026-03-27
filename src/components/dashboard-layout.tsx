import type { ReactNode } from 'react';
import type { Role } from '@/hooks/use-role';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import MainSidebar from '@/components/main-sidebar';
import Dashboard from '@/components/dashboard';
import Header from './header';

interface DashboardLayoutProps {
  role: Role;
  onSwitchRole: (role: Role | null) => void;
  children?: ReactNode;
}

export default function DashboardLayout({ role, onSwitchRole, children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <MainSidebar currentRole={role} onSwitchRole={onSwitchRole} />
      <SidebarInset>
        <Header />
        {children || <Dashboard role={role} />}
      </SidebarInset>
    </SidebarProvider>
  );
}
