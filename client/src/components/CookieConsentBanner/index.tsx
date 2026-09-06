import { useState } from 'react';
import { getConsentStatus, setConsentStatus } from '../../utils/cookieConsent';
import { initAnalytics } from '../../analytics';
import './cookieConsentBanner.css';

// Shown once, on first visit, until the user makes an explicit choice.
// Accepting starts GA4 right then (the module-load call in App.tsx
// already no-op'd if consent wasn't yet given at that time); declining
// keeps it off for this browser until the user changes their mind --
// there's no cookie tracking of any kind happening before either
// button is actually clicked.
export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(getConsentStatus() === null);

  if (!visible) {
    return null;
  }

  const handleAccept = () => {
    setConsentStatus('accepted');
    initAnalytics();
    setVisible(false);
  };

  const handleDecline = () => {
    setConsentStatus('declined');
    setVisible(false);
  };

  return (
    <div className="cookieConsentBanner" role="dialog" aria-label="Cookie consent">
      <p className="cookieConsentText">
        This app uses cookies for basic usage analytics (Google Analytics). We don&apos;t use them for
        advertising or sell any data. You can decline and keep using the app normally.
      </p>
      <div className="cookieConsentActions">
        <button type="button" className="cookieConsentDecline" onClick={handleDecline}>
          Decline
        </button>
        <button type="button" className="cookieConsentAccept" onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
};
