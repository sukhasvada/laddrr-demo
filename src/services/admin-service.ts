

'use client';

import { v4 as uuidv4 } from 'uuid';
import { type Role } from '@/hooks/use-role';
import { roleUserMapping } from '@/lib/role-mapping';
import { OrgCoachingItem } from './org-coaching-service';

export interface AdminLogEntry {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    caseId?: string;
}

const ADMIN_LOG_KEY = 'admin_audit_log';

const getAdminLogFromStorage = (): AdminLogEntry[] => {
    if (typeof window === 'undefined') return [];
    const json = sessionStorage.getItem(ADMIN_LOG_KEY);
    return json ? JSON.parse(json) : [];
};

const saveAdminLogToStorage = (log: AdminLogEntry[]): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ADMIN_LOG_KEY, JSON.stringify(log));
};


export const addAdminLogEntry = (actor: string, action: string, caseId?: string) => {
    const log = getAdminLogFromStorage();
    const newEntry: AdminLogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        actor,
        action,
        caseId,
    };
    log.unshift(newEntry);
    saveAdminLogToStorage(log);
};

export async function getAdminAuditLog(): Promise<AdminLogEntry[]> {
    return getAdminLogFromStorage().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAllUsers(): Promise<{ all: Role[] }> {
    const allUserRoles = Object.keys(roleUserMapping).filter(r => r !== 'Anonymous') as Role[];
    return { all: allUserRoles };
}
