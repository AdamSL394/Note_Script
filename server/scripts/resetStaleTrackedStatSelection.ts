import connectToDB from '../database/db';
import { resolveMongoUri } from '../validateEnv';
import User from '../models/user';
import { logger } from '../logger';

interface RawSetting {
    icon: string;
    name: string;
    visible: 'visible' | 'hidden';
}

// One-time cleanup for a now-fixed bug (see createNote.tsx's
// addTrackedStat): adding a new tracked stat while it was toggled on
// sent visible:'visible' to the server, and that value was never
// supposed to rest in the database at all -- the persisted copy is
// meant to represent only "this stat exists as a defined option,"
// never "was toggled on for one specific note." Every tag added
// before the fix has visible:'visible' stuck in the DB, which is why
// it shows up pre-selected the next time the user opens the app.
//
// Deliberately bypasses Mongoose's schema-aware casting (raw driver
// calls via User.collection) to match this repo's existing migration
// convention (see migrateTagsToSnapshot.ts) -- no casting layer
// between what's read and what's written.
//
// Safe to re-run: once every settings[].visible is already 'hidden',
// this finds zero matching documents and does nothing.
async function cleanup() {
    const dryRun = process.argv.includes('--dry-run');

    await connectToDB(resolveMongoUri());

    const usersToClean = await User.collection
        .find({ 'settings.visible': 'visible' } as Record<string, unknown>)
        .toArray();

    logger.info(`Found ${usersToClean.length} users with at least one tracked stat stuck as visible.`);

    let updatedCount = 0;
    let totalStatsReset = 0;

    for (const user of usersToClean) {
        const settings = (user.settings ?? []) as RawSetting[];
        const resetSettings = settings.map((s) => ({ ...s, visible: 'hidden' as const }));
        const staleCount = settings.filter((s) => s.visible === 'visible').length;

        updatedCount++;
        totalStatsReset += staleCount;

        if (dryRun) {
            logger.info(`[dry run] User ${user._id}: would reset ${staleCount} stat(s) to hidden.`);
        } else {
            await User.collection.updateOne({ _id: user._id }, { $set: { settings: resetSettings } });
        }
    }

    logger.info(
        { updatedCount, totalStatsReset, dryRun },
        `${dryRun ? 'Dry run' : 'Cleanup'} complete${dryRun ? ' -- no documents were modified' : ''}.`
    );
    process.exit(0);
}

cleanup().catch((err) => {
    logger.fatal({ err }, 'Cleanup failed');
    process.exit(1);
});
