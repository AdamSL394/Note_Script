import webpush from 'web-push';
import PushSubscription, { IPushSubscription } from '../models/pushSubscription';
import User, { INotificationPreferences } from '../models/user';
import Note from '../models/notes';
import { logger } from '../logger';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails('mailto:lehreradam@yahoo.com', vapidPublicKey, vapidPrivateKey);
}

export function getVapidPublicKey(): string | undefined {
    return vapidPublicKey;
}

export async function saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
    // Upsert on endpoint, not a plain create -- a browser re-subscribing
    // (cleared storage, subscription rotation) sends the same shape
    // again, which should update the existing record rather than throw
    // on the unique index or create a duplicate.
    await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { userId, endpoint: subscription.endpoint, keys: subscription.keys },
        { upsert: true, new: true }
    );
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
    await PushSubscription.deleteOne({endpoint, userId});
}

export async function updateNotificationPreferences(
    userId: string,
    preferences: INotificationPreferences
): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { notificationPreferences: preferences } });
}

export async function getNotificationPreferences(
    userId: string
): Promise<INotificationPreferences | undefined> {
    const user = await User.findById(userId).lean();
    return user?.notificationPreferences;
}

/**
 * A user's current local hour and date string, given their stored
 * timezone offset (captured client-side via Date.getTimezoneOffset(),
 * which returns minutes to ADD to local time to reach UTC -- so
 * local = UTC - offset). Kept pure and exported separately from the
 * scheduled job built on top of it, so this arithmetic is directly
 * testable without needing a real database or a real clock.
 */
export function computeUserLocalTime(
    utcNow: Date,
    timezoneOffsetMinutes: number
): { hour: number; dateString: string } {
    const localMs = utcNow.getTime() - timezoneOffsetMinutes * 60 * 1000;
    const local = new Date(localMs);
    const hour = local.getUTCHours();
    const year = local.getUTCFullYear();
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const day = String(local.getUTCDate()).padStart(2, '0');
    return { hour, dateString: `${year}-${month}-${day}` };
}

/**
 * Checks every user with notifications enabled, and sends a reminder
 * push to anyone whose current local hour matches their chosen
 * reminderHour AND who hasn't written a note for their own local
 * "today" yet. Meant to be called on an hourly schedule (see
 * scripts/reminderScheduler.ts) -- checking hourly, rather than
 * trying to schedule an exact per-user time, is what makes arbitrary
 * per-user reminder hours possible without a separate timer per user.
 */
export async function sendDueReminders(now: Date = new Date()): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    if (!vapidPublicKey || !vapidPrivateKey) {
        logger.warn('VAPID keys not configured -- skipping reminder check entirely.');
        return { sent, failed };
    }

    const users = await User.find({ 'notificationPreferences.enabled': true }).lean();

    for (const user of users) {
        const prefs = user.notificationPreferences;
        if (!prefs) continue;

        const { hour, dateString } = computeUserLocalTime(now, prefs.timezoneOffsetMinutes);
        if (hour !== prefs.reminderHour) continue;

        const alreadyLoggedToday = await Note.exists({ userId: user._id, date: dateString });
        if (alreadyLoggedToday) continue;

        const subscriptions = await PushSubscription.find({ userId: user._id }).lean();
        for (const sub of subscriptions) {
            try {
                await sendPushToSubscription(sub);
                sent++;
            } catch (err) {
                failed++;
                // A 404/410 from the push service means this specific
                // subscription is dead (browser storage cleared,
                // notifications revoked, etc.) -- clean it up rather
                // than retry it forever on every future hourly check.
                const statusCode = (err as { statusCode?: number }).statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    await PushSubscription.deleteOne({ endpoint: sub.endpoint });
                } else {
                    logger.warn({ err, userId: user._id }, 'Failed to send reminder push');
                }
            }
        }
    }

    return { sent, failed };
}

const REMINDER_TITLES = ['Time to journal', 'Daily reminder', "Don't break your streak!"];

function pickRandomReminderTitle(): string {
    return REMINDER_TITLES[Math.floor(Math.random() * REMINDER_TITLES.length)];
}

async function sendPushToSubscription(
    sub: IPushSubscription,
    body: string = "You haven't logged today yet -- take a minute to write it down.",
    title: string = pickRandomReminderTitle()
): Promise<void> {
    const payload = JSON.stringify({ title, body });
    await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
    );
}

/**
 * Sends an immediate test push to every one of a user's subscriptions,
 * bypassing the hour/already-logged checks entirely -- this is what
 * actually lets someone verify the full delivery pipeline (server ->
 * push service -> service worker -> notification display) works right
 * now, without waiting for their chosen reminder hour to arrive or
 * needing to leave a note unwritten to trigger the real check.
 */
export async function sendTestNotification(userId: string): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    if (!vapidPublicKey || !vapidPrivateKey) {
        throw new Error('VAPID keys are not configured on this server.');
    }

    const subscriptions = await PushSubscription.find({ userId }).lean();
    if (subscriptions.length === 0) {
        throw new Error('No push subscription found -- enable notifications first.');
    }

    for (const sub of subscriptions) {
        try {
            await sendPushToSubscription(sub, 'Test notification -- if you see this, push is working!', 'Note Script');
            sent++;
        } catch (err) {
            failed++;
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
                await PushSubscription.deleteOne({ endpoint: sub.endpoint });
            } else {
                logger.warn({ err, userId }, 'Failed to send test push');
            }
        }
    }

    return { sent, failed };
}
