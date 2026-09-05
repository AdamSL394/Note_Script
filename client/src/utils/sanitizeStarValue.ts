const VALID_STAR_VALUES = new Set(['None', '1', '2', '3']);

/**
 * Returns a guaranteed-valid star rating string. Some older notes have
 * `star` stored as a raw boolean (false) from before the schema
 * settled on the 'None'/'1'/'2'/'3' string enum -- editing one of
 * these without this fix would carry that stale invalid value straight
 * back out in the save payload, failing the server's validation even
 * when the star field itself was never touched.
 */
export function sanitizeStarValue(star: unknown): 'None' | '1' | '2' | '3' {
  if (typeof star === 'string' && VALID_STAR_VALUES.has(star)) {
    return star as 'None' | '1' | '2' | '3';
  }
  return 'None';
}
