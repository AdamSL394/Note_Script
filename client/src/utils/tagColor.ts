// Curated set of hues, each with a light background tint + a readable
// text color, defined per-theme in tokens.css (--ns-tag-{hue}-bg /
// --ns-tag-{hue}-text). Returning CSS variable *names* here rather than
// resolved hex values means the actual color automatically follows
// whichever of the app's 4 themes (light/dark/sepia/forest) is active --
// no theme-awareness needed at the call site.
const TAG_HUES = ['blue', 'purple', 'teal', 'coral', 'green', 'pink', 'amber', 'slate'] as const;

export interface TagColor {
  background: string;
  text: string;
}

// A small, stable string hash (not cryptographic -- just needs to be
// deterministic and reasonably well-distributed across short tag
// names) so the same tag name always lands on the same hue, every
// time, across sessions and devices.
function hashTagName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTagColor(tagName: string): TagColor {
  const hue = TAG_HUES[hashTagName(tagName) % TAG_HUES.length];
  if (hue === 'blue') {
    return { background: 'var(--ns-blue-tint)', text: 'var(--ns-blue)' };
  }
  if (hue === 'amber') {
    return { background: 'var(--ns-amber-tint)', text: 'var(--ns-amber-dark)' };
  }
  return {
    background: `var(--ns-tag-${hue}-bg)`,
    text: `var(--ns-tag-${hue}-text)`,
  };
}
