
"use client"
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

export type Role = 'Manager' | 'Team Lead' | 'AM' | 'Employee' | 'HR Head' | 'Anonymous';

export const availableRoles: Role[] = ['Employee', 'Team Lead', 'AM', 'Manager', 'HR Head'];
export const availableRolesForAssignment: Role[] = ['AM', 'Manager', 'HR Head'];

const ROLE_STORAGE_KEY = 'accountability-os-role';
const ACTIVE_SURVEY_KEY = 'active_survey_exists';

export const useRole = () => {
    const [role, setRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSurveyExists, setActiveSurveyExists] = useState(true); // Always show the survey option
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const initializeRole = async () => {
            try {
                const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as Role;
                if (storedRole && [...availableRoles].includes(storedRole)) {
                    setRole(storedRole);
                }
                // The survey button is now always active, so we don't need to check session storage for its visibility.
            } catch (error) {
                console.error("Could not read from storage", error);
            } finally {
                setIsLoading(false);
            }
        };
        initializeRole();
    }, []);

    const setCurrentRole = useCallback(async (newRole: Role | null) => {
        setRole(newRole);
        
        try {
            if (newRole) {
                localStorage.setItem(ROLE_STORAGE_KEY, newRole);
            } else {
                localStorage.removeItem(ROLE_STORAGE_KEY);
            }
        } catch (error) {
            console.error("Could not write role to localStorage", error);
        }
    }, []);

    return { role, setRole: setCurrentRole, isLoading, availableRoles, activeSurveyExists, toast };
};
