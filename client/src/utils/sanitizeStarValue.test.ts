import { sanitizeStarValue } from './sanitizeStarValue';

describe('sanitizeStarValue', () => {
  it('passes through each valid value unchanged', () => {
    expect(sanitizeStarValue('None')).toBe('None');
    expect(sanitizeStarValue('1')).toBe('1');
    expect(sanitizeStarValue('2')).toBe('2');
    expect(sanitizeStarValue('3')).toBe('3');
  });

  it('returns "None" for the legacy raw boolean false -- the actual bug this function fixes', () => {
    // Some older notes had `star` stored as a raw boolean from before
    // the schema settled on the string enum. Editing one of these
    // without this sanitization would carry the invalid `false` value
    // straight back out in the save payload.
    expect(sanitizeStarValue(false)).toBe('None');
  });

  it('returns "None" for undefined', () => {
    expect(sanitizeStarValue(undefined)).toBe('None');
  });

  it('returns "None" for null', () => {
    expect(sanitizeStarValue(null)).toBe('None');
  });

  it('returns "None" for an out-of-range numeric string', () => {
    expect(sanitizeStarValue('4')).toBe('None');
    expect(sanitizeStarValue('0')).toBe('None');
  });

  it('returns "None" for an arbitrary garbage string', () => {
    expect(sanitizeStarValue('banana')).toBe('None');
  });

  it('returns "None" for a non-string type like a number', () => {
    expect(sanitizeStarValue(1)).toBe('None');
  });
});
