import { useCallback, useEffect, useState } from 'react';
import NotificationRoutes, { NotificationPreferences } from '../router/notificationRoutes';

// Converts a base64url-encoded VAPID public key (what the server
// provides) into the raw Uint8Array PushManager.subscribe() actually
// requires. Standard, well-established conversion for this exact
// purpose -- verified directly against the real generated key before
// trusting it (65 bytes, correct P-256 uncompressed-point marker).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// navigator.serviceWorker.ready never resolves at all if no service
// worker is ever registered for this page -- true by design in local
// dev mode (see serviceWorkerRegistration.ts, which explicitly skips
// registration outside production builds). Without a timeout, that
// meant enable()/disable() would hang forever with zero feedback: no
// error shown, no state change, the toggle just silently doing
// nothing rather than failing clearly.
async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            'No active service worker found. Push notifications only work on the real deployed site (or a production build), not local dev mode.'
          )
        ),
      5000
    )
  );
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

export const isPushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

interface UsePushNotificationsResult {
  supported: boolean;
  preferences: NotificationPreferences;
  loading: boolean;
  error: string;
  enable: (reminderHour: number) => Promise<void>;
  disable: () => Promise<void>;
  updateReminderHour: (reminderHour: number) => Promise<void>;
}

// Manages the full subscribe/unsubscribe/preferences lifecycle for
// reminder notifications. Kept as one hook rather than spread across
// components, since enabling/disabling genuinely touches three
// things together every time (the browser's own subscription, the
// server's copy of it, and the user's stored preferences) -- keeping
// them in one place is what makes it hard to accidentally update one
// without the others.
export function usePushNotifications(): UsePushNotificationsResult {
  const supported = isPushSupported();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    reminderHour: 20,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    NotificationRoutes.getPreferences()
      .then(setPreferences)
      .finally(() => setLoading(false));
  }, [supported]);

  const subscribeInBrowser = useCallback(async (): Promise<PushSubscription> => {
    const registration = await getReadyRegistration();
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    const publicKey = await NotificationRoutes.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('Push notifications are not configured on the server.');
    }
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }, []);

  const enable = useCallback(
    async (reminderHour: number) => {
      setError('');
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('Notifications were not allowed -- check your browser/site settings.');
          return;
        }
        const subscription = await subscribeInBrowser();
        await NotificationRoutes.subscribe(subscription.toJSON() as PushSubscriptionJSON);
        const newPreferences: NotificationPreferences = {
          enabled: true,
          reminderHour,
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        };
        await NotificationRoutes.setPreferences(newPreferences);
        setPreferences(newPreferences);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not enable notifications.');
      }
    },
    [subscribeInBrowser]
  );

  const disable = useCallback(async () => {
    setError('');
    try {
      const registration = await getReadyRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await NotificationRoutes.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      const newPreferences: NotificationPreferences = { ...preferences, enabled: false };
      await NotificationRoutes.setPreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable notifications.');
    }
  }, [preferences]);

  const updateReminderHour = useCallback(
    async (reminderHour: number) => {
      const newPreferences: NotificationPreferences = {
        ...preferences,
        reminderHour,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      };
      await NotificationRoutes.setPreferences(newPreferences);
      setPreferences(newPreferences);
    },
    [preferences]
  );

  return { supported, preferences, loading, error, enable, disable, updateReminderHour };
}
