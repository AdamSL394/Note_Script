import { useEffect, useState } from 'react';
import { usePwaInstallPrompt } from '../../hooks/usePwaInstallPrompt';
import { hasConsentDecision } from '../../utils/cookieConsent';
import {
  recordVisit,
  hasEnoughVisitsForPrompt,
  isInstallPromptDismissed,
  dismissInstallPrompt,
} from '../../utils/pwaInstall';
import './installPrompt.css';

export const InstallPrompt = () => {
  const { platform, isStandalone, canInstall, promptInstall } = usePwaInstallPrompt();
  const [dismissed, setDismissed] = useState(isInstallPromptDismissed());
  const [enoughVisits, setEnoughVisits] = useState(hasEnoughVisitsForPrompt());

  useEffect(() => {
    // Counted regardless of whether the banner ends up visible this
    // load -- otherwise a visit spent dismissed/not-yet-eligible would
    // never move the counter forward.
    const count = recordVisit();
    setEnoughVisits(count >= 2);
  }, []);

  // Both this and CookieConsentBanner are fixed, bottom-of-screen
  // banners -- showing both at once would mean two competing asks
  // stacked or overlapping. Cookie consent is the more foundational
  // decision, so it goes first; this simply waits until that's settled.
  if (!hasConsentDecision()) {
    return null;
  }
  if (isStandalone || dismissed || !enoughVisits) {
    return null;
  }
  if (platform === 'other') {
    return null;
  }
  if (platform === 'android' && !canInstall) {
    // beforeinstallprompt never fired -- browser isn't Chrome/Edge, or
    // this doesn't meet installability criteria right now. Nothing to
    // show rather than a button that wouldn't do anything.
    return null;
  }

  const handleDismiss = () => {
    dismissInstallPrompt();
    setDismissed(true);
  };

  const handleInstall = async () => {
    await promptInstall();
    setDismissed(true);
    dismissInstallPrompt();
  };

  return (
    <div className="installPrompt" role="dialog" aria-label="Install this app">
      {platform === 'android' ? (
        <>
          <p className="installPromptText">
            Add Note Script to your home screen for quicker access.
          </p>
          <div className="installPromptActions">
            <button type="button" className="installPromptDismiss" onClick={handleDismiss}>
              Not now
            </button>
            <button type="button" className="installPromptAccept" onClick={handleInstall}>
              Install
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="installPromptText">
            Add Note Script to your home screen: tap the <strong>Share</strong> button in
            Safari&apos;s toolbar, then &quot;Add to Home Screen&quot;.
          </p>
          <div className="installPromptActions">
            <button type="button" className="installPromptDismiss" onClick={handleDismiss}>
              Got it
            </button>
          </div>
        </>
      )}
    </div>
  );
};
