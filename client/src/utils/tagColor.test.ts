import { getTagColor } from './tagColor';

describe('getTagColor', () => {
  it('is deterministic -- the same tag name always returns the same color', () => {
    const first = getTagColor('gym');
    const second = getTagColor('gym');
    expect(first).toEqual(second);
  });

  it('returns a background and text color as CSS variable references', () => {
    const result = getTagColor('read');
    expect(result.background).toMatch(/^var\(--ns-/);
    expect(result.text).toMatch(/^var\(--ns-/);
  });

  it('distributes different names across more than one hue', () => {
    // Not asserting exact hash values (an implementation detail) --
    // just confirming a reasonably varied set of tag names doesn't all
    // collapse onto a single color, which would make the tag chips
    // visually indistinguishable from each other.
    const names = ['gym', 'read', 'coffee', 'weed', 'code', 'eatOut', 'look', 'basketball', 'king', 'medal'];
    const uniqueBackgrounds = new Set(names.map((n) => getTagColor(n).background));
    expect(uniqueBackgrounds.size).toBeGreaterThan(1);
  });

  it('handles an empty string without throwing', () => {
    expect(() => getTagColor('')).not.toThrow();
  });
});
