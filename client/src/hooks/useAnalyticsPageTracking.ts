import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../analytics';

export function useAnalyticsPageTracking(): void {
    const location = useLocation();

    useEffect(() => {
        trackPageView(location.pathname + location.search);
        // location itself is a new object on every navigation, but its
        // pathname/search are the actual values that matter -- depending
        // on the whole object would fire identically either way here,
        // this is just being explicit about what actually drives it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, location.search]);
}
