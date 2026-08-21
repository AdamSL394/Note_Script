import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeModeContextValue {
    mode: ThemeMode;
    toggleTheme: () => void;
}

const STORAGE_KEY = 'ns-theme';

const getInitialTheme = (): ThemeMode => {
    // localStorage isn't available during SSR/build, and a corrupted or
    // unexpected stored value shouldn't crash the app — fall back to
    // light in either case rather than letting this throw.
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored === 'dark' ? 'dark' : 'light';
    } catch (error) {
        return 'light';
    }
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
    undefined
);

// Single source of truth for the app's theme, held here rather than as
// a standalone per-component hook — App.tsx needs the current mode to
// build the MUI theme (so MUI's own components, like TextFields and
// Buttons, get correct text/background colors) and Navbar needs it to
// render and drive the toggle. A duplicated useState in each place
// would desync: toggling in the Navbar wouldn't rebuild App's MUI
// theme, which is exactly what was leaving MUI-styled text black on a
// dark background.
export const ThemeModeProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [mode, setMode] = useState<ThemeMode>(getInitialTheme);

    useEffect(() => {
        // tokens.css's [data-theme='dark'] selector reads this attribute
        // to swap the --ns-* custom properties every plain CSS/inline
        // style in the app is built from.
        document.documentElement.setAttribute('data-theme', mode);
        try {
            window.localStorage.setItem(STORAGE_KEY, mode);
        } catch (error) {
            // Storage can be unavailable (private browsing, quota) — the
            // theme still applies for this session either way.
        }
    }, [mode]);

    const toggleTheme = () => {
        setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const value = useMemo(() => ({ mode, toggleTheme }), [mode]);

    return (
        <ThemeModeContext.Provider value={value}>
            {children}
        </ThemeModeContext.Provider>
    );
};

export const useThemeMode = (): ThemeModeContextValue => {
    const context = useContext(ThemeModeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeModeProvider');
    }
    return context;
};
