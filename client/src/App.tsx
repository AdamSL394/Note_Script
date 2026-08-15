import './App.css';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/index.js';
import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import Router from './router/index';
import { useAuthTokenSync } from './hooks/useAuthTokenSync';

const theme = createTheme({
    palette: {
        primary: {
            main: '#e9d8c2',
        },
        secondary: {
            main: '#f8d6c5',
        },
    },
});

function App() {
    const { isLoading } = useAuth0();
    useAuthTokenSync();

    if (isLoading) {
        return (
            <img
                id="loading"
                src="https://media2.giphy.com/media/3oEjI6SIIHBdRxXI40/200w.gif?cid=82a1493bihnamtzyz8vki1lhaho1d71gyhbf1cg4ay7wurdj&rid=200w.gif&ct=g"
                alt="Loading Gif"
            />
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