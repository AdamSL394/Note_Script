import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setAuthToken } from '../router/client';

// Called once near the app root. Keeps client.ts's copy of the access
// token in sync with Auth0's — fetches it on mount/login, clears it on
// logout, and re-fetches periodically since access tokens are
// short-lived (getAccessTokenSilently transparently uses the refresh
// token to get a new one when needed, via cacheLocation="localstorage" +
// useRefreshTokens set on Auth0Provider).
export const useAuthTokenSync = (): void => {
    const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();

    useEffect(() => {
        // Auth0 is still processing the post-login redirect / restoring
        // the session — attempting a token fetch this early can fail
        // even for a genuinely authenticated user, since Auth0 hasn't
        // finished settling yet. Wait for it to say it's done first.
        if (isLoading) {
            return;
        }

        if (!isAuthenticated) {
            setAuthToken(null);
            return;
        }

        let cancelled = false;

        const syncToken = async () => {
            try {
                const token = await getAccessTokenSilently();
                if (!cancelled) {
                    setAuthToken(token);
                }
            } catch (error) {
                console.log('Failed to get access token', error);
                if (!cancelled) {
                    setAuthToken(null);
                }
            }
        };

        syncToken();
        const interval = setInterval(syncToken, 5 * 60 * 1000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isAuthenticated, isLoading, getAccessTokenSilently]);
};