import connectToDB from '../database/db';
import { resolveMongoUri } from '../validateEnv';
import Note from '../models/notes';
import { logger } from '../logger';

// The exact legacy flat-field tag names this app has ever used.
// 'starred' and 'coffee' are deliberately excluded -- they were never
// actually added to the Mongoose schema, so no existing document has
// real data under those field names to migrate (Mongoose's default
// strict mode silently stripped them on every save).
const LEGACY_TAG_FIELDS = [
    'look',
    'gym',
    'weed',
    'code',
    'read',
    'eatOut',
    'medal',
    'king',
    'date/smoosh',
    'basketball',
];

async function migrate() {
    const dryRun = process.argv.includes('--dry-run');
    await connectToDB(resolveMongoUri());

    // Only notes that don't already have a populated tags array --
    // makes this safe to run more than once without double-processing
    // anything, or overwriting tags a note may have already been
    // given directly under the new format.
    const notesToMigrate = await Note.find({
        $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }],
    });

    logger.info(`Found ${notesToMigrate.length} notes with no tags array populated.`);

    let updatedCount = 0;
    let totalTagsMigrated = 0;

    for (const note of notesToMigrate) {
        const record = note as unknown as Record<string, unknown>;
        const migratedTags = LEGACY_TAG_FIELDS.filter((field) => record[field] === true);

        if (migratedTags.length === 0) {
            continue;
        }

        totalTagsMigrated += migratedTags.length;
        updatedCount += 1;

        if (dryRun) {
            logger.info(`[dry run] Note ${note._id}: would set tags = ${JSON.stringify(migratedTags)}`);
        } else {
            note.tags = migratedTags;
            await note.save();
        }
    }

    logger.info(
        { updatedCount, totalTagsMigrated, dryRun },
        dryRun
            ? 'Dry run complete -- no documents were modified.'
            : 'Migration complete.'
    );

    process.exit(0);
}

migrate().catch((err) => {
    logger.fatal({ err }, 'Migration failed');
    process.exit(1);
});
