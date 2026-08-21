// MUI's palette needs actual color values, not CSS custom properties —
// internally it calls `alpha()`/`decomposeColor()` to derive hover,
// disabled, and focus-ring shades from whatever you give it, and that
// math can't run on a `var(--ns-ink)` string (this is what threw
// "Unsupported `var(--ns-ink)` color" from MuiButtonRoot). Anything
// entirely hand-styled with `var(--ns-*)` in plain CSS/inline styles is
// unaffected — this file exists only for the handful of places (like
// App.tsx's MUI theme) that hand a color to MUI itself.
//
// These values must be kept in sync with tokens.css by hand — CSS
// custom properties and this module have no way to share a single
// source of truth across a .css/.ts boundary. If you change a color in
// tokens.css, update the matching entry here too.
export interface NsPalette {
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

export const NS_TOKENS: Record<'light' | 'dark', NsPalette> = {
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
        fog: '#1b1d21',
        paper: '#24272c',
        ink: '#eceef0',
        graphite: '#9aa0aa',
        blue: '#7ea3d1',
        blueTint: '#2a3542',
        amber: '#eab767',
        amberTint: '#3a2f1d',
        amberDark: '#f0c988',
        rule: '#383c42',
    },
};