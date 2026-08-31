import './tokens.css';
import './App.css';
import { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/index.js';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import Router from './router/index';
import AnalyticsTracker from './components/AnalyticsTracker';
import { useAuthTokenSync } from './hooks/useAuthTokenSync';
import { ThemeModeProvider, useThemeMode } from './hooks/useThemeMode';
import { NS_TOKENS } from './theme/nsTokens';
import { initAnalytics } from './analytics';

// Runs once at module load, not per-render -- initialize() itself is a
// one-time setup call, not something that needs to re-run on every
// mount/re-render of the component tree.
initAnalytics();

// Builds MUI's theme from the current mode's real hex values (nsTokens),
// rather than tokens.css's CSS custom properties directly — MUI's
// palette system and helpers like alpha() can't parse var(--ns-*)
// strings. Recreated whenever the mode changes so MUI's own components
// (Select, Menu, etc.) stay in sync with the CSS-var-driven parts of the
// app instead of only ever reflecting the light palette.
function ThemedApp() {
    const { isLoading } = useAuth0();
    const { mode } = useThemeMode();
    useAuthTokenSync();

    const theme = useMemo(() => {
        const tokens = NS_TOKENS[mode];
        return createTheme({
            palette: {
                mode: tokens.base,
                primary: {
                    main: tokens.blue,
                },
                secondary: {
                    main: tokens.amber,
                },
                background: {
                    default: tokens.fog,
                    paper: tokens.paper,
                },
                text: {
                    primary: tokens.ink,
                    secondary: tokens.graphite,
                },
            },
        });
    }, [mode]);

    if (isLoading) {
        // Was an external Giphy GIF, centered via position:absolute + a
        // fixed negative margin - same layout hack removed everywhere
        // else in this pass, plus a network dependency and a visual
        // style with nothing to do with the rest of the app.
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
                    <AnalyticsTracker />
                    <Router />
                </BrowserRouter>
            </div>
        </ThemeProvider>
    );
}

function App() {
    return (
        <ThemeModeProvider>
            <ThemedApp />
        </ThemeModeProvider>
    );
}

export default App;
