import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../router/noteRoutes';
import type { UserInfoResponse } from '../types';

// UX only -- this decides whether to SHOW the admin nav link, nothing
// more. Hiding it doesn't block a non-admin from navigating to
// /admin/users directly or calling the API themselves; both of those
// are enforced server-side (requireAdmin, 403) regardless of what
// this hook reports.
export function useIsAdmin(): boolean {
    const { user, isAuthenticated } = useAuth0();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            setIsAdmin(false);
            return;
        }
        const checkRole = async () => {
            const res = await NoteRoutes.getUserInfomation(user);
            if (!res) return;
            try {
                const parsed = JSON.parse(res) as UserInfoResponse;
                setIsAdmin(parsed?.searchedUser?.role === 'admin');
            } catch {
                setIsAdmin(false);
            }
        };
        checkRole();
    }, [isAuthenticated, user]);

    return isAdmin;
}
