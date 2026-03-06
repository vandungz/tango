'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getTheme, setTheme as saveTheme } from '@/lib/storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setThemeState(getTheme());
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        document.documentElement.setAttribute('data-theme', theme);
        saveTheme(theme);
    }, [theme, mounted]);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
