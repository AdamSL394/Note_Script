// MUI's theme/palette system (and helpers like alpha()) can't resolve
// CSS custom properties — they need real hex values at theme-creation
// time. This file is a hand-kept mirror of tokens.css's --ns-* values,
// one entry per theme. If you change a color in tokens.css, change it
// here too, or MUI's own components (Select, Menu, etc.) will drift
// from the rest of the app's palette.
export type ThemeMode = 'light' | 'dark' | 'sepia' | 'forest';

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'sepia', 'forest'];

export interface NsTokenSet {
  // MUI's palette.mode only understands 'light' | 'dark' — it drives
  // built-in contrast/hover-opacity calculations that our custom themes
  // still benefit from. 'sepia' and 'forest' are both bright themes, so
  // they use 'light' here even though they're not literally called that.
  base: 'light' | 'dark';
  label: string;
  fog: string;
  paper: string;
  ink: string;
  graphite: string;
  blue: string;
  blueTint: string;
  amber: string;
  amberTint: string;
  amberDark: string;
  rule: string;
}

export const NS_TOKENS: Record<ThemeMode, NsTokenSet> = {
  light: {
    base: 'light',
    label: 'Light',
    fog: '#f1f2f4',
    paper: '#fbfbfa',
    ink: '#23262b',
    graphite: '#5b6069',
    blue: '#3d5a80',
    blueTint: '#eaf0f6',
    amber: '#e8a33d',
    amberTint: '#fbf1de',
    amberDark: '#8a5a0f',
    rule: '#d8dbe0',
  },
  dark: {
    base: 'dark',
    label: 'Dark',
    fog: '#17181b',
    paper: '#212327',
    ink: '#e8e9eb',
    graphite: '#9199a3',
    blue: '#7fa8d9',
    blueTint: '#263241',
    amber: '#f0b25c',
    amberTint: '#3a2f1a',
    amberDark: '#f0c98a',
    rule: '#35383e',
  },
  // Warm, aged-paper palette — leans into the "field notebook" branding
  // more literally than the neutral light theme.
  sepia: {
    base: 'light',
    label: 'Sepia',
    fog: '#ede4d3',
    paper: '#faf5ea',
    ink: '#3a2f22',
    graphite: '#7a6a54',
    blue: '#a15c38',
    blueTint: '#f0e2d0',
    amber: '#c9942f',
    amberTint: '#f7ecd3',
    amberDark: '#6b4a12',
    rule: '#d9c7a8',
  },
  // Cool, muted green — a nature-journal alternative to the neutral
  // light theme, still bright rather than dark.
  forest: {
    base: 'light',
    label: 'Forest',
    fog: '#eef1ee',
    paper: '#f8faf8',
    ink: '#232b26',
    graphite: '#5c6b60',
    blue: '#3d7a5c',
    blueTint: '#e5f0ea',
    amber: '#c98a3d',
    amberTint: '#f7ecd8',
    amberDark: '#7a4f10',
    rule: '#d3ddd6',
  },
};
