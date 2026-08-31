import ReactGA from 'react-ga4';

const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;

// Only initializes if a real measurement ID is configured. Local dev
// (and any environment without REACT_APP_GA_MEASUREMENT_ID set) just
// no-ops -- avoids sending test/dev traffic into a real GA4 property,
// and avoids an error if the env var is simply absent.
export const initAnalytics = (): void => {
    if (measurementId) {
        ReactGA.initialize(measurementId);
    }
};

export const trackPageView = (path: string): void => {
    if (measurementId) {
        ReactGA.send({ hitType: 'pageview', page: path });
    }
};
