import { useEffect, useState } from 'react';

// Not a standard DOM type -- beforeinstallprompt is a Chrome-specific,
// non-standard event with no official TypeScript definition.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PwaPlatform = 'ios' | 'android' | 'other';

function detectPlatform(): PwaPlatform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "MacIntel" with no "iPad" in the UA string at
  // all -- the standard iPhone/iPod/iPad check alone misses it, so a
  // touch-capable "Mac" is treated as iOS too.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own property for this, not part of the standard DOM
    // Navigator type at all.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstallPrompt() {
  const [platform] = useState<PwaPlatform>(detectPlatform);
  const [standalone] = useState<boolean>(isStandalone);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      // Stops Chrome's own default mini-infobar so this app's own
      // banner (with its visit-count/dismissal logic) is the only
      // install prompt shown, rather than both competing.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    // A captured prompt can only be used once -- discarded either way
    // (accepted or dismissed) rather than kept around to try again.
    setDeferredPrompt(null);
  };

  return {
    platform,
    isStandalone: standalone,
    canInstall: deferredPrompt !== null,
    promptInstall,
  };
}
