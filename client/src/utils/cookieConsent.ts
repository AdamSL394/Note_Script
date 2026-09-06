const CONSENT_STORAGE_KEY = 'ns_cookie_consent';

export type ConsentStatus = 'accepted' | 'declined' | null;

/**
 * Reads the user's stored cookie consent choice. Returns null when
 * they haven't decided yet (first visit, or storage was cleared) --
 * callers should treat null the same as "not accepted" for anything
 * gated on consent, and use it specifically to decide whether to show
 * the banner at all.
 */
export function getConsentStatus(): ConsentStatus {
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  return stored === 'accepted' || stored === 'declined' ? stored : null;
}

export function setConsentStatus(status: 'accepted' | 'declined'): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, status);
}

export function hasConsentDecision(): boolean {
  return getConsentStatus() !== null;
}
