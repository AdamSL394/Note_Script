const VISIT_COUNT_KEY = 'ns_pwa_visit_count';
const DISMISSED_KEY = 'ns_pwa_install_dismissed';

// Not shown on a visitor's very first load -- by the second visit
// they've actually used the app once, which is a more honest moment
// to ask than immediately on arrival.
const MIN_VISITS_BEFORE_PROMPT = 2;

export function recordVisit(): number {
  const current = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? '0');
  const next = current + 1;
  localStorage.setItem(VISIT_COUNT_KEY, String(next));
  return next;
}

export function hasEnoughVisitsForPrompt(): boolean {
  const count = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? '0');
  return count >= MIN_VISITS_BEFORE_PROMPT;
}

export function isInstallPromptDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === 'true';
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(DISMISSED_KEY, 'true');
}
