import { request, requestJson } from './client';

export interface NotificationPreferences {
  enabled: boolean;
  reminderHour: number;
  timezoneOffsetMinutes: number;
}

const NotificationRoutes = {
  getVapidPublicKey: async (): Promise<string | null> => {
    const result = await requestJson<{ publicKey: string }>('/notifications/vapid-public-key');
    return result?.publicKey ?? null;
  },

  subscribe: (subscription: PushSubscriptionJSON) =>
    request('/notifications/subscribe', { method: 'POST', body: subscription }),

  unsubscribe: (endpoint: string) =>
    request('/notifications/unsubscribe', { method: 'POST', body: { endpoint } }),

  getPreferences: async (): Promise<NotificationPreferences> => {
    const result = await requestJson<NotificationPreferences>('/notifications/preferences');
    return result ?? { enabled: false, reminderHour: 20, timezoneOffsetMinutes: 0 };
  },

  setPreferences: (preferences: NotificationPreferences) =>
    request('/notifications/preferences', { method: 'POST', body: preferences }),
};

export default NotificationRoutes;
