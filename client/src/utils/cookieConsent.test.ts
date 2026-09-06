import { getConsentStatus, setConsentStatus, hasConsentDecision } from './cookieConsent';

describe('cookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no decision has ever been made', () => {
    expect(getConsentStatus()).toBeNull();
    expect(hasConsentDecision()).toBe(false);
  });

  it('persists an accepted decision', () => {
    setConsentStatus('accepted');
    expect(getConsentStatus()).toBe('accepted');
    expect(hasConsentDecision()).toBe(true);
  });

  it('persists a declined decision', () => {
    setConsentStatus('declined');
    expect(getConsentStatus()).toBe('declined');
    expect(hasConsentDecision()).toBe(true);
  });

  it('treats unexpected stored values the same as no decision', () => {
    // Guards against a corrupted or manually-edited localStorage value
    // being treated as a valid consent choice.
    localStorage.setItem('ns_cookie_consent', 'garbage');
    expect(getConsentStatus()).toBeNull();
  });

  it('allows changing a decision', () => {
    setConsentStatus('declined');
    setConsentStatus('accepted');
    expect(getConsentStatus()).toBe('accepted');
  });
});
