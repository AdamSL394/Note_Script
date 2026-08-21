import './tokens.css';
import './App.css';
import React, { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/index.js';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import Router from './router/index';
import { useAuthTokenSync } from './hooks/useAuthTokenSync';
import { ThemeModeProvider, useThemeMode } from './hooks/useThemeMode';
import { NS_TOKENS } from './theme/nsTokens';

// MUI's own components (TextField, Select, Button, unstyled
// Typography) read colors from `theme.palette`, not from tokens.css's
// CSS variables — a static theme is why, before this change, toggling
// dark mode correctly swapped the tokens (so anything hand-styled with
// var(--ns-ink) followed along) but left every plain MUI component's
// text black on a dark background. `palette.mode` additionally governs
// MUI's built-in dark-mode behavior for things this theme doesn't set
// explicitly (input outlines, hover/focus states, ripples).
//
// Palette values must be real colors (hex/rgb/hsl), not var(--ns-ink)
// strings — MUI's `alpha()` helper decomposes whatever you give it to
// derive hover/disabled/focus-ring shades, and can't run that math on
// a CSS custom property; passing var() strings throws "Unsupported
// color" at runtime the first time any component needs a derived
// shade. NS_TOKENS mirrors tokens.css's hex values for this reason.
const buildTheme = (mode: 'light' | 'dark') => {
    const colors = NS_TOKENS[mode];
    return createTheme({
        palette: {
            mode,
            primary: {
                main: colors.blue,
            },
            secondary: {
                main: colors.amber,
            },
            background: {
                default: colors.fog,
                paper: colors.paper,
            },
            text: {
                primary: colors.ink,
                secondary: colors.graphite,
            },
        },
    });
};

function AppShell() {
    const { isLoading } = useAuth0();
    const { mode } = useThemeMode();
    useAuthTokenSync();
    const theme = useMemo(() => buildTheme(mode), [mode]);

    if (isLoading) {
        return (
            <div className="loadingScreen">
                <span className="loadingLabel">loading…</span>
            </div>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <div className="App">
                <BrowserRouter basename="/">
                    <Router />
                </BrowserRouter>
            </div>
        </ThemeProvider>
    );
}

function App() {
    return (
        <ThemeModeProvider>
            <AppShell />
        </ThemeModeProvider>
    );
}

export default App;