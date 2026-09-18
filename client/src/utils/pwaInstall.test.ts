import {
  recordVisit,
  hasEnoughVisitsForPrompt,
  isInstallPromptDismissed,
  dismissInstallPrompt,
} from './pwaInstall';

describe('pwaInstall', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not have enough visits before any have been recorded', () => {
    expect(hasEnoughVisitsForPrompt()).toBe(false);
  });

  it('is not enough after a single visit', () => {
    recordVisit();
    expect(hasEnoughVisitsForPrompt()).toBe(false);
  });

  it('is enough from the second visit onward', () => {
    recordVisit();
    recordVisit();
    expect(hasEnoughVisitsForPrompt()).toBe(true);
  });

  it('keeps counting visits past the threshold', () => {
    recordVisit();
    recordVisit();
    recordVisit();
    expect(hasEnoughVisitsForPrompt()).toBe(true);
  });

  it('returns the running count from recordVisit itself', () => {
    expect(recordVisit()).toBe(1);
    expect(recordVisit()).toBe(2);
    expect(recordVisit()).toBe(3);
  });

  it('is not dismissed before dismissInstallPrompt is ever called', () => {
    expect(isInstallPromptDismissed()).toBe(false);
  });

  it('persists a dismissal', () => {
    dismissInstallPrompt();
    expect(isInstallPromptDismissed()).toBe(true);
  });
});
