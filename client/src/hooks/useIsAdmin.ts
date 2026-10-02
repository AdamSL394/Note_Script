import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../router/noteRoutes';
import type { UserInfoResponse } from '../types';

// UX only -- this decides whether to SHOW the admin nav link, nothing
// more. Hiding it doesn't block a non-admin from navigating to
// /admin/users directly or calling the API themselves; both of those
// are enforced server-side (requireAdmin, 403) regardless of what
// this hook reports.
const ADMIN_CACHE_KEY = 'ns_isAdmin';

export function useIsAdmin(): boolean {
    const { user, isAuthenticated } = useAuth0();
    // Seeded from whatever this browser last confirmed, rather than a
    // hardcoded `false` -- previously an admin saw the Admin link pop
    // in late on every single reload, since the real check below is
    // async and the initial render always had to assume "not admin"
    // until it resolved. This is read-only UX seeding, not a trust
    // decision: the effect below always re-verifies against the
    // server and corrects it (including turning it back off) once the
    // real answer comes back.
    const [isAdmin, setIsAdmin] = useState(() => {
        try {
            return sessionStorage.getItem(ADMIN_CACHE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (!isAuthenticated || !user) {
            setIsAdmin(false);
            try {
                sessionStorage.removeItem(ADMIN_CACHE_KEY);
            } catch {
                // sessionStorage can throw (private browsing, blocked
                // storage) -- the cache is purely a UX nicety, so a
                // failed clear here is fine to ignore.
            }
            return;
        }
        const checkRole = async () => {
            const res = await NoteRoutes.getUserInfomation(user);
            if (!res) return;
            try {
                const parsed = JSON.parse(res) as UserInfoResponse;
                const confirmed = parsed?.searchedUser?.role === 'admin';
                setIsAdmin(confirmed);
                try {
                    sessionStorage.setItem(ADMIN_CACHE_KEY, String(confirmed));
                } catch {
                    // Same as above -- best-effort only.
                }
            } catch {
                setIsAdmin(false);
            }
        };
        checkRole();
    }, [isAuthenticated, user]);

    return isAdmin;
}
