import { buildTagLookup, resolveTagDisplay, getActiveNoteTags } from './resolveNoteTags';
import type { Note, TrackedStat } from '../types';

describe('buildTagLookup', () => {
  it('includes every built-in NOTE_TAG_FIELDS entry', () => {
    const lookup = buildTagLookup([]);
    expect(lookup.get('basketball')).toEqual({ field: 'basketball', icon: expect.any(String), label: 'Basketball' });
    expect(lookup.get('read')).toBeDefined();
    expect(lookup.get('coffee')).toBeDefined();
  });

  it('adds custom tracked stats not already covered by a built-in', () => {
    const trackedStats: TrackedStat[] = [{ name: 'meditation', icon: '🧘', visible: 'visible' }];
    const lookup = buildTagLookup(trackedStats);
    expect(lookup.get('meditation')).toEqual({ field: 'meditation', icon: '🧘', label: 'meditation' });
  });

  it('does not let a tracked stat override a built-in field of the same name', () => {
    // A user could in principle have a stale trackedStat named 'read' with
    // a different icon -- the built-in definition should still win, since
    // it's checked first and buildTagLookup only fills in gaps.
    const trackedStats: TrackedStat[] = [{ name: 'read', icon: '🔥', visible: 'visible' }];
    const lookup = buildTagLookup(trackedStats);
    expect(lookup.get('read')?.icon).not.toBe('🔥');
  });
});

describe('resolveTagDisplay', () => {
  it('resolves a built-in tag name', () => {
    const result = resolveTagDisplay('coffee', []);
    expect(result.field).toBe('coffee');
    expect(result.label).toBe('Coffee');
  });

  it('resolves a custom tag name from trackedStats', () => {
    const trackedStats: TrackedStat[] = [{ name: 'weights', icon: '🏋️', visible: 'visible' }];
    const result = resolveTagDisplay('weights', trackedStats);
    expect(result).toEqual({ field: 'weights', icon: '🏋️', label: 'weights' });
  });

  it('falls back to a generic tag icon for a name found nowhere', () => {
    // e.g. a tag used on an old note that the user has since deleted
    // from their own settings.
    const result = resolveTagDisplay('some-deleted-tag', []);
    expect(result).toEqual({ field: 'some-deleted-tag', icon: '🏷️', label: 'some-deleted-tag' });
  });
});

describe('getActiveNoteTags', () => {
  const baseNote: Note = {
    _id: '1',
    userId: 'u1',
    text: 't',
    date: '2026-01-01',
    star: 'None',
    edit: false,
    updatedAt: '2026-01-01',
  };

  it('returns an empty array when tags is undefined', () => {
    expect(getActiveNoteTags(baseNote)).toEqual([]);
  });

  it('returns an empty array when tags is an empty array', () => {
    expect(getActiveNoteTags({ ...baseNote, tags: [] })).toEqual([]);
  });

  it('reads the icon directly from each tag snapshot, not any external lookup', () => {
    // This is the actual point of the snapshot design: the icon comes
    // from the note's own data, so it stays correct even if the user
    // later renames or deletes the tag from their settings -- there's
    // no trackedStats parameter here at all to cross-reference.
    const note: Note = {
      ...baseNote,
      tags: [
        { name: 'gym', icon: '💪🏼' },
        { name: 'a-tag-that-no-longer-exists-anywhere-else', icon: '🎨' },
      ],
    };
    expect(getActiveNoteTags(note)).toEqual([
      { field: 'gym', icon: '💪🏼', label: 'gym' },
      { field: 'a-tag-that-no-longer-exists-anywhere-else', icon: '🎨', label: 'a-tag-that-no-longer-exists-anywhere-else' },
    ]);
  });
});
