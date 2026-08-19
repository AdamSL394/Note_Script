import './tokens.css';
import './App.css';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/index.js';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import Router from './router/index';
import { useAuthTokenSync } from './hooks/useAuthTokenSync';

// Matches the field-notebook palette (see tokens.css) rather than the
// original tan/pink pair - anything using MUI's default theme colors
// (rather than an explicit override) now lands in the right family
// instead of clashing with the rest of the app.
const theme = createTheme({
    palette: {
        primary: {
            main: '#3d5a80',
        },
        secondary: {
            main: '#e8a33d',
        },
    },
});

function App() {
    const { isLoading } = useAuth0();
    useAuthTokenSync();

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
                    <Router />
                </BrowserRouter>
            </div>
        </ThemeProvider>
    );
}

export default App;