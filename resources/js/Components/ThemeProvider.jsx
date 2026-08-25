import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * Hook pour accéder au thème actuel et à la fonction de bascule.
 * @returns {{ theme: 'light'|'dark', setTheme: (t: 'light'|'dark') => void, toggleTheme: () => void }}
 */
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}

/**
 * ThemeProvider – gère le mode clair/sombre.
 *
 * Le thème initial est lu depuis localStorage (clé "theme").
 * Si aucune valeur n'est stockée, le mode sombre est utilisé par défaut
 * (pour conserver le comportement actuel de l'application).
 *
 * La classe "dark" est synchronisée sur <html> pour piloter les CSS custom properties.
 */
export default function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        // Le script inline dans le Blade template a déjà appliqué la classe .dark
        // On lit la même source (localStorage) pour rester synchronisé
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Synchronise la classe .dark sur <html>
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
