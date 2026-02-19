// localStorage wrapper for persistence

import { BoardSize } from './engine/types';

const KEYS = {
    SESSION_ID: 'tango_session_id',
    STREAK: 'tango_streak',
    BEST_STREAK: 'tango_best_streak',
    GAMES_PLAYED: 'tango_games_played',
    GAMES_WON: 'tango_games_won',
    THEME: 'tango_theme',
    BOARD_SIZE: 'tango_board_size',
    SOUND_ON: 'tango_sound_on',
    SOUND_VOLUME: 'tango_sound_volume',
    LEVEL: 'tango_level',
};

function getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
}

function setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
}

// Session ID
export function getSessionId(): string {
    let id = getItem(KEYS.SESSION_ID);
    if (!id) {
        id = crypto.randomUUID();
        setItem(KEYS.SESSION_ID, id);
    }
    return id;
}

// Streak
export function getStreak(): number {
    return parseInt(getItem(KEYS.STREAK) || '0', 10);
}

export function setStreak(val: number): void {
    setItem(KEYS.STREAK, String(val));
    const best = getBestStreak();
    if (val > best) setItem(KEYS.BEST_STREAK, String(val));
}

export function getBestStreak(): number {
    return parseInt(getItem(KEYS.BEST_STREAK) || '0', 10);
}

// Games
export function getGamesPlayed(): number {
    return parseInt(getItem(KEYS.GAMES_PLAYED) || '0', 10);
}

export function incrementGamesPlayed(): void {
    setItem(KEYS.GAMES_PLAYED, String(getGamesPlayed() + 1));
}

export function getGamesWon(): number {
    return parseInt(getItem(KEYS.GAMES_WON) || '0', 10);
}

export function incrementGamesWon(): void {
    setItem(KEYS.GAMES_WON, String(getGamesWon() + 1));
}

// Theme
export function getTheme(): 'light' | 'dark' {
    return (getItem(KEYS.THEME) as 'light' | 'dark') || 'light';
}

export function setTheme(theme: 'light' | 'dark'): void {
    setItem(KEYS.THEME, theme);
}

// Board size
export function getBoardSize(): BoardSize {
    return (parseInt(getItem(KEYS.BOARD_SIZE) || '6', 10) as BoardSize);
}

export function setBoardSize(size: BoardSize): void {
    setItem(KEYS.BOARD_SIZE, String(size));
}

// Sound
export function getSoundOn(): boolean {
    const val = getItem(KEYS.SOUND_ON);
    return val !== 'false'; // default true
}

export function setSoundOn(on: boolean): void {
    setItem(KEYS.SOUND_ON, String(on));
}

export function getSoundVolume(): number {
    const raw = parseFloat(getItem(KEYS.SOUND_VOLUME) || '');
    if (Number.isFinite(raw)) {
        return Math.min(1, Math.max(0, raw));
    }
    return 0.8;
}

export function setSoundVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    setItem(KEYS.SOUND_VOLUME, String(clamped));
}

// Level
export function getLevel(): number {
    return parseInt(getItem(KEYS.LEVEL) || '1', 10);
}

export function setLevel(level: number): void {
    setItem(KEYS.LEVEL, String(level));
}
