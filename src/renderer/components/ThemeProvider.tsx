import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => {},
    isDark: true,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('produchive-theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    });

    const isDark = theme === 'dark';

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('theme-dark', 'theme-light');
        root.classList.add(`theme-${theme}`);
        localStorage.setItem('produchive-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        // Apply the transition class briefly for smooth color change
        document.documentElement.classList.add('theme-transition');
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 500);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};
