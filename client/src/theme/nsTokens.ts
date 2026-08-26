// MUI's theme/palette system (and helpers like alpha()) can't resolve
// CSS custom properties — they need real hex values at theme-creation
// time. This file is a hand-kept mirror of tokens.css's --ns-* values,
// one entry per theme mode. If you change a color in tokens.css, change
// it here too, or MUI's own components (Select, Menu, etc.) will drift
// from the rest of the app's palette.
export type ThemeMode = 'light' | 'dark';

export interface NsTokenSet {
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
};
