
'use client';

import { v4 as uuidv4 } from 'uuid';
import type { Role } from '@/hooks/use-role';
import { addAdminLogEntry } from './admin-service';

export interface OrgCoachingItem {
    id: string;
    theme: string;
    recommendation: string;
    targetAudience: string;
    status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
    assignedAt: string;
    assignedBy: Role;
}

export const ORG_COACHING_KEY = 'org_coaching_items_v1';

const getFromStorage = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    const json = sessionStorage.getItem(key);
    return json ? JSON.parse(json) : [];
};

const saveToStorage = (key: string, data: any[]): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('feedbackUpdated'));
    window.dispatchEvent(new Event('storage'));
};

/**
 * Creates and assigns coaching tasks from the Org Health analysis.
 */
export async function assignCoachingFromOrgHealth(
    recommendations: { theme: string; recommendation: string; targetAudience: string }[],
    assignerRole: Role
): Promise<void> {
    const allItems = getFromStorage<OrgCoachingItem>(ORG_COACHING_KEY);
    const now = new Date().toISOString();

    const newItems: OrgCoachingItem[] = recommendations.map(rec => ({
        id: uuidv4(),
        theme: rec.theme,
        recommendation: rec.recommendation,
        targetAudience: rec.targetAudience,
        status: 'Assigned',
        assignedAt: now,
        assignedBy: assignerRole,
    }));

    // Add new items to the beginning of the list
    const updatedItems = [...newItems, ...allItems];
    saveToStorage(ORG_COACHING_KEY, updatedItems);

    // Log this action in the admin log
    addAdminLogEntry(assignerRole, `Assigned ${newItems.length} new coaching tasks from Org Health analysis.`);
}

/**
 * Retrieves all coaching items created from Org Health.
 */
export async function getOrgCoachingItems(): Promise<OrgCoachingItem[]> {
    return getFromStorage<OrgCoachingItem>(ORG_COACHING_KEY).sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
}
