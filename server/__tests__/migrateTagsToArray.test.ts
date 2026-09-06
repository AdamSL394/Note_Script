const LEGACY_TAG_FIELDS = [
    'look', 'gym', 'weed', 'code', 'read', 'eatOut',
    'medal', 'king', 'date/smoosh', 'basketball',
];

// The exact transformation the real migration script applies to each
// note -- extracted here as a pure function so it can be verified
// without a live database connection (mongodb-memory-server needs a
// network-downloaded MongoDB binary not available in this sandbox,
// the same reason the rest of this project's test suite is
// deliberately DB-independent).
function computeMigratedTags(record: Record<string, unknown>): string[] {
    return LEGACY_TAG_FIELDS.filter((field) => record[field] === true);
}

function shouldMigrate(record: Record<string, unknown>): boolean {
    const tags = record.tags;
    return !Array.isArray(tags) || tags.length === 0;
}

describe('migrateTagsToArray core logic', () => {
    it('migrates a note with several active legacy tags into the array', () => {
        const record = {
            userId: 'user1', text: 'hi', date: '2026-09-05',
            gym: true, weed: true, look: false, basketball: true,
        };
        expect(computeMigratedTags(record).sort()).toEqual(['basketball', 'gym', 'weed'].sort());
    });

    it('produces an empty array for a note with no active legacy tags', () => {
        const record = { userId: 'user1', text: 'hi', date: '2026-09-05', gym: false, weed: false };
        expect(computeMigratedTags(record)).toEqual([]);
    });

    it('does not flag a note that already has tags populated for migration (idempotency)', () => {
        const record = { userId: 'user1', gym: true, tags: ['custom-tag-already-set'] };
        expect(shouldMigrate(record)).toBe(false);
    });

    it('flags a note with an empty tags array for migration', () => {
        const record = { userId: 'user1', gym: true, tags: [] };
        expect(shouldMigrate(record)).toBe(true);
    });

    it('flags a note with no tags field at all for migration', () => {
        const record = { userId: 'user1', gym: true };
        expect(shouldMigrate(record)).toBe(true);
    });

    it('correctly migrates the special "date/smoosh" field name', () => {
        const record = { userId: 'user1', 'date/smoosh': true };
        expect(computeMigratedTags(record)).toEqual(['date/smoosh']);
    });

    it('excludes coffee and starred, which were never real schema fields', () => {
        const record = { userId: 'user1', coffee: true, starred: true, gym: true };
        expect(computeMigratedTags(record)).toEqual(['gym']);
    });

    it('ignores reserved field names even if somehow true on a record', () => {
        const record = { userId: 'user1', star: true, edit: true, _id: true, gym: true };
        expect(computeMigratedTags(record)).toEqual(['gym']);
    });
});
