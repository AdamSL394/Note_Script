import ReactGA from 'react-ga4';
import { getConsentStatus } from './utils/cookieConsent';

const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;

// Only initializes if a real measurement ID is configured AND the user
// has actually accepted cookies -- local dev (and any environment
// without REACT_APP_GA_MEASUREMENT_ID set) always no-ops regardless of
// consent, and a real environment no-ops until consent is explicitly
// given. Previously ran unconditionally at module load, setting GA4's
// cookies before the user had any say in the matter at all.
export const initAnalytics = (): void => {
    if (measurementId && getConsentStatus() === 'accepted') {
        ReactGA.initialize(measurementId);
    }
};

export const trackPageView = (path: string): void => {
    if (measurementId && getConsentStatus() === 'accepted') {
        ReactGA.send({ hitType: 'pageview', page: path });
    }
};
