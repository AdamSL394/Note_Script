import connectToDB from '../database/db';
import { resolveMongoUri } from '../validateEnv';
import Note from '../models/notes';
import User from '../models/user';
import { logger } from '../logger';

// Every name that was ever a built-in suggestion at some point in this
// app's history (not just the 3 current ones) -- these have fixed,
// known icons that never varied per-user, unlike a custom tag.
const BUILT_IN_ICONS: Record<string, string> = {
    look: '👀',
    gym: '💪🏼',
    weed: '🍁',
    code: '👨🏻\u200d💻',
    read: '📚',
    eatOut: '🍕',
    basketball: '⛹🏻\u200d♂️',
    king: '🤴🏻',
    medal: '🥇',
    'date/smoosh': '👫',
    starred: '🌟',
    coffee: '☕️',
};

const GENERIC_FALLBACK_ICON = '🏷️';

interface RawTagSnapshot {
    name: string;
    icon: string;
}

// Migrates tags from the first migration's format (string[]) to a
// real snapshot ({name, icon}[]) -- the icon now travels with the
// note itself, so it stays stable even if the user later renames or
// deletes that tag from their own settings.
//
// Deliberately bypasses Mongoose's schema-aware casting on both read
// and write (using Note.collection, the raw MongoDB driver, rather
// than the Note model directly): the model's schema now expects
// objects in `tags`, so reading via the model risks unpredictable
// casting behavior against documents that still have the old string
// format on disk. Working with raw driver calls means we see and
// write exactly the actual bytes, with no casting layer in between.
async function migrate() {
    const dryRun = process.argv.includes('--dry-run');

    await connectToDB(resolveMongoUri());

    // Only matches notes whose tags array's first element is still a
    // string -- once migrated, every element is an object, and this
    // condition no longer matches, which is what makes re-running this
    // script safe.
    const notesToMigrate = await Note.collection
        .find({ 'tags.0': { $type: 'string' } })
        .toArray();

    logger.info(`Found ${notesToMigrate.length} notes with tags still in the old string format.`);

    // Custom tag icons live in each user's own settings -- cached per
    // userId so a user with many notes only costs one lookup, not one
    // per note.
    const userIconCache = new Map<string, Map<string, string>>();

    async function resolveIconForUser(userId: string, tagName: string): Promise<string> {
        if (BUILT_IN_ICONS[tagName]) {
            return BUILT_IN_ICONS[tagName];
        }
        if (!userIconCache.has(userId)) {
            const userDoc = await User.collection.findOne({ _id: userId } as Record<string, unknown>);
            const settingsMap = new Map<string, string>();
            const settings = (userDoc?.settings ?? []) as { name: string; icon: string }[];
            for (const setting of settings) {
                settingsMap.set(setting.name, setting.icon);
            }
            userIconCache.set(userId, settingsMap);
        }
        return userIconCache.get(userId)?.get(tagName) ?? GENERIC_FALLBACK_ICON;
    }

    let updatedCount = 0;
    let totalTagsMigrated = 0;

    for (const note of notesToMigrate) {
        const oldTags = (note.tags ?? []) as string[];
        const newTags: RawTagSnapshot[] = [];
        for (const tagName of oldTags) {
            const icon = await resolveIconForUser(note.userId, tagName);
            newTags.push({ name: tagName, icon });
        }

        updatedCount++;
        totalTagsMigrated += newTags.length;

        if (dryRun) {
            logger.info(`[dry run] Note ${note._id}: would set tags = ${JSON.stringify(newTags)}`);
        } else {
            await Note.collection.updateOne({ _id: note._id }, { $set: { tags: newTags } });
        }
    }

    logger.info(
        { updatedCount, totalTagsMigrated, dryRun },
        `${dryRun ? 'Dry run' : 'Migration'} complete${dryRun ? ' -- no documents were modified' : ''}.`
    );
    process.exit(0);
}

migrate().catch((err) => {
    logger.fatal({ err }, 'Migration failed');
    process.exit(1);
});
