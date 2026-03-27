

import type { Role } from '@/hooks/use-role';

export const roleUserMapping: Record<Role, { name: string; fallback: string; imageHint: string, role: Role }> = {
  'Manager': { name: 'Alex Smith', fallback: 'AS', imageHint: 'manager', role: 'Manager' },
  'Team Lead': { name: 'Ben Carter', fallback: 'BC', imageHint: 'leader', role: 'Team Lead' },
  'AM': { name: 'Ashley Miles', fallback: 'AM', imageHint: 'assistant manager', role: 'AM' },
  'Employee': { name: 'Casey Day', fallback: 'CD', imageHint: 'employee', role: 'Employee' },
  'HR Head': { name: 'Dana Evans', fallback: 'DE', imageHint: 'hr head', role: 'HR Head' },
  'Anonymous': { name: 'Anonymous', fallback: '??', imageHint: 'anonymous person', role: 'Anonymous' }
};

export const getRoleByName = (name: string): Role | undefined => {
    for (const key in roleUserMapping) {
        if (roleUserMapping[key as Role].name === name) {
            return key as Role;
        }
    }
    return undefined;
}

export const formatActorName = (actor: Role | string | undefined): string => {
    if (!actor) return 'System';

    if (actor === 'Anonymous') return 'Anonymous';
    
    // Check if actor is a valid role first
    if (Object.keys(roleUserMapping).includes(actor as string)) {
        const user = roleUserMapping[actor as Role];
        if (user.role === 'Anonymous') return 'Anonymous';
        return `${user.name} - ${user.role}`;
    }

    // Check if actor is a name
    const role = getRoleByName(actor as string);
    if (role) {
        return `${actor} - ${role}`;
    }

    // Fallback for simple strings like 'System'
    return actor as string;
};
