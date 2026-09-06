import { renderStars } from './renderStars';

describe('renderStars', () => {
  it('renders 1 star correctly', () => {
    expect(renderStars('1')).toBe('★☆☆');
  });

  it('renders 2 stars correctly', () => {
    expect(renderStars('2')).toBe('★★☆');
  });

  it('renders 3 stars correctly', () => {
    expect(renderStars('3')).toBe('★★★');
  });

  it('returns null for "None"', () => {
    expect(renderStars('None')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(renderStars(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(renderStars('')).toBeNull();
  });

  it('returns null for the legacy "false" string value -- the actual bug this function fixes', () => {
    // Some older notes had `star` stored as a raw boolean before the
    // schema settled on the 'None'/'1'/'2'/'3' string enum. Rendering
    // this unhandled previously displayed the literal text "false" as
    // if it were a real rating.
    expect(renderStars('false')).toBeNull();
  });

  it('returns null for a value outside the valid 1-3 range', () => {
    // Writing this test caught a real gap: the function had no upper-
    // bound check at all, so '4' would have rendered 4 stars instead
    // of null, contradicting its own documented contract. Fixed in
    // renderStars.ts alongside adding this test.
    expect(renderStars('4')).toBeNull();
    expect(renderStars('10')).toBeNull();
    expect(renderStars('0')).toBeNull();
    expect(renderStars('-1')).toBeNull();
  });

  it('returns null for non-numeric garbage', () => {
    expect(renderStars('abc')).toBeNull();
  });
});
