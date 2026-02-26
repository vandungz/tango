'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { CellValue, Clue, BoardSize, Board } from '@/lib/engine/types';
import { findLogicErrors } from '@/lib/engine/validation';
import {
    getSessionId, getStreak, setStreak, getBestStreak,
    incrementGamesPlayed, incrementGamesWon, getLevel, setLevel,
    getSoundOn, getSoundVolume, setSoundVolume as saveSoundVolume,
    getBoardSize, setBoardSize as saveBoardSize,
} from '@/lib/storage';
import { playClickSound, playClearSound, playHintSound, playVictorySound, setMasterVolume } from '@/lib/sound';

// — Types —

type GameMode = 'daily' | 'journey';

interface GameState {
    puzzleId: string | null;
    dailyId: string | null;
    dailyDate: string | null;
    journeyLevelId: string | null;
    board: CellValue[][];
    initialBoard: CellValue[][]; // cells that are pre-filled (locked)
    clues: Clue[];
    size: BoardSize;
    difficulty: number;
    label: string;
    level: number;
    mode: GameMode;
    journeyLevel: number | null;
    journeyStars: number;
    journeyBestTime: number | null;
    currentStreak: number;
    bestStreak: number;
    moveHistory: CellValue[][][];
    moveIndex: number;
    timer: number;
    isRunning: boolean;
    isComplete: boolean;
    isWon: boolean;
    errors: [number, number][];
    hintCell: { row: number; col: number } | null;
    loading: boolean;
}

type GameAction =
    | { type: 'LOAD_PUZZLE'; payload: { puzzleId: string; board: CellValue[][]; clues: Clue[]; size: BoardSize; difficulty: number; label: string; level: number; mode: GameMode; dailyId?: string | null; dailyDate?: string | null; journeyLevel?: number | null; journeyLevelId?: string | null; journeyStars?: number; journeyBestTime?: number | null; currentStreak?: number; bestStreak?: number } }
    | { type: 'PLACE_CELL'; row: number; col: number; value: CellValue }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'RESET' }
    | { type: 'TICK' }
    | { type: 'SET_ERRORS'; errors: [number, number][] }
    | { type: 'SET_WON' }
    | { type: 'SET_HINT'; row: number; col: number; value: CellValue }
    | { type: 'CLEAR_HINT' }
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'UPDATE_META'; payload: Partial<Pick<GameState, 'journeyStars' | 'journeyBestTime' | 'currentStreak' | 'bestStreak'>> };

function cloneBoard(b: CellValue[][]): CellValue[][] {
    return b.map(r => [...r]);
}

const initialState: GameState = {
    puzzleId: null,
    dailyId: null,
    dailyDate: null,
    journeyLevelId: null,
    board: [],
    initialBoard: [],
    clues: [],
    size: 6,
    difficulty: 0,
    label: '',
    level: 1,
    mode: 'daily',
    journeyLevel: null,
    journeyStars: 0,
    journeyBestTime: null,
    currentStreak: 0,
    bestStreak: 0,
    moveHistory: [],
    moveIndex: -1,
    timer: 0,
    isRunning: false,
    isComplete: false,
    isWon: false,
    errors: [],
    hintCell: null,
    loading: true,
};

const VALIDATION_DELAY_MS = 2300;
const DEFAULT_VOLUME = 0.8;

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'LOAD_PUZZLE': {
            const board = action.payload.board;
            return {
                ...initialState,
                puzzleId: action.payload.puzzleId,
                dailyId: action.payload.dailyId ?? null,
                dailyDate: action.payload.dailyDate ?? null,
                journeyLevel: action.payload.journeyLevel ?? null,
                journeyLevelId: action.payload.journeyLevelId ?? null,
                board: cloneBoard(board),
                initialBoard: cloneBoard(board),
                clues: action.payload.clues,
                size: action.payload.size,
                difficulty: action.payload.difficulty,
                label: action.payload.label,
                level: action.payload.level,
                mode: action.payload.mode,
                journeyStars: action.payload.journeyStars ?? 0,
                journeyBestTime: action.payload.journeyBestTime ?? null,
                currentStreak: action.payload.currentStreak ?? 0,
                bestStreak: action.payload.bestStreak ?? 0,
                moveHistory: [cloneBoard(board)],
                moveIndex: 0,
                timer: 0,
                isRunning: true,
                loading: false,
            };
        }

        case 'PLACE_CELL': {
            if (state.isComplete || state.isWon) return state;
            // Can't modify initial cells
            if (state.initialBoard[action.row][action.col]) return state;

            const newBoard = cloneBoard(state.board);
            newBoard[action.row][action.col] = action.value;

            // Truncate future history if we're mid-undo
            const newHistory = state.moveHistory.slice(0, state.moveIndex + 1);
            newHistory.push(cloneBoard(newBoard));

            return {
                ...state,
                board: newBoard,
                moveHistory: newHistory,
                moveIndex: newHistory.length - 1,
                errors: [],
                hintCell: null,
            };
        }

        case 'UNDO': {
            if (state.moveIndex <= 0) return state;
            const newIndex = state.moveIndex - 1;
            return {
                ...state,
                board: cloneBoard(state.moveHistory[newIndex]),
                moveIndex: newIndex,
                errors: [],
                hintCell: null,
            };
        }

        case 'REDO': {
            if (state.moveIndex >= state.moveHistory.length - 1) return state;
            const newIndex = state.moveIndex + 1;
            return {
                ...state,
                board: cloneBoard(state.moveHistory[newIndex]),
                moveIndex: newIndex,
                errors: [],
            };
        }

        case 'RESET': {
            return {
                ...state,
                board: cloneBoard(state.initialBoard),
                moveHistory: [cloneBoard(state.initialBoard)],
                moveIndex: 0,
                timer: 0,
                errors: [],
                hintCell: null,
                isComplete: false,
                isWon: false,
                isRunning: true,
            };
        }

        case 'TICK':
            if (!state.isRunning || state.isWon) return state;
            return { ...state, timer: state.timer + 1 };

        case 'SET_ERRORS':
            return { ...state, errors: action.errors };

        case 'SET_WON':
            return { ...state, isWon: true, isComplete: true, isRunning: false };

        case 'SET_HINT':
            return {
                ...state,
                hintCell: { row: action.row, col: action.col },
            };

        case 'CLEAR_HINT':
            return { ...state, hintCell: null };

        case 'SET_LOADING':
            return { ...state, loading: action.loading };

        case 'UPDATE_META':
            return { ...state, ...action.payload };

        default:
            return state;
    }
}

// — Context —

interface JourneyProgressItem {
    level: number;
    stars: number;
    timeSeconds: number | null;
}

interface JourneySummary {
    totalLevels: number;
    nextLevel: number;
    starsEarned: number;
}

interface GameContextType {
    state: GameState;
    placeCell: (row: number, col: number) => void;
    undo: () => void;
    redo: () => void;
    reset: () => void;
    checkSolution: () => Promise<void>;
    requestHint: () => Promise<void>;
    newGame: (size?: BoardSize) => Promise<void>;
    loadDaily: () => Promise<void>;
    loadJourneyLevel: (level?: number) => Promise<void>;
    journeyProgress: JourneyProgressItem[];
    journeySummary: JourneySummary;
    boardSize: BoardSize;
    setBoardSize: (size: BoardSize) => void;
    soundVolume: number;
    setSoundVolume: (volume: number) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const [boardSize, setBoardSizeState] = useState<BoardSize>(6);
    const [soundVolume, setSoundVolumeState] = useState<number>(DEFAULT_VOLUME);
    const [journeyProgress, setJourneyProgress] = useState<JourneyProgressItem[]>([]);
    const [journeySummary, setJourneySummary] = useState<JourneySummary>({ totalLevels: 200, nextLevel: 1, starsEarned: 0 });
    const soundOnRef = useRef(true);
    const soundVolumeRef = useRef<number>(DEFAULT_VOLUME);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastBoardKeyRef = useRef<string>('');
    const suppressErrorsUntilRef = useRef<number>(Date.now() + VALIDATION_DELAY_MS);
    const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const restartValidationDelay = useCallback(() => {
        suppressErrorsUntilRef.current = Date.now() + VALIDATION_DELAY_MS;
    }, []);

    const cancelPendingHint = useCallback((clearHighlight: boolean) => {
        if (hintTimeoutRef.current) {
            clearTimeout(hintTimeoutRef.current);
            hintTimeoutRef.current = null;
        }
        if (clearHighlight && state.hintCell) {
            dispatch({ type: 'CLEAR_HINT' });
        }
    }, [state.hintCell]);

    useEffect(() => {
        soundOnRef.current = getSoundOn();
        const storedVolume = getSoundVolume();
        soundVolumeRef.current = storedVolume;
        setSoundVolumeState(storedVolume);
        setMasterVolume(storedVolume);
        setBoardSizeState(getBoardSize());
    }, []);

    useEffect(() => {
        soundVolumeRef.current = soundVolume;
        setMasterVolume(soundVolume);
    }, [soundVolume]);

    // Timer
    useEffect(() => {
        if (!state.isRunning || state.isWon) return;
        const interval = setInterval(() => dispatch({ type: 'TICK' }), 1000);
        return () => clearInterval(interval);
    }, [state.isRunning, state.isWon]);

    const refreshJourneyProgress = useCallback(async () => {
        try {
            const sessionId = getSessionId();
            const res = await fetch(`/api/journey?sessionId=${sessionId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setJourneyProgress(data.progress || []);
            setJourneySummary({
                totalLevels: data.totalLevels || 200,
                nextLevel: data.nextLevel || 1,
                starsEarned: data.starsEarned || 0,
            });
        } catch (error) {
            console.error('Failed to load journey progress:', error);
        }
    }, []);

    const loadDaily = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const sessionId = getSessionId();
            const res = await fetch(`/api/daily?sessionId=${sessionId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            restartValidationDelay();
            cancelPendingHint(true);
            setBoardSizeState(data.size);

            dispatch({
                type: 'LOAD_PUZZLE',
                payload: {
                    puzzleId: data.id,
                    board: data.board,
                    clues: data.clues,
                    size: data.size,
                    difficulty: data.difficulty,
                    label: data.label || 'Daily',
                    level: 0,
                    mode: 'daily',
                    dailyId: data.dailyId,
                    dailyDate: data.date,
                    currentStreak: data.progress?.streak ?? 0,
                    bestStreak: data.progress?.bestStreak ?? 0,
                },
            });
        } catch (error) {
            console.error('Failed to load daily puzzle:', error);
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    }, [cancelPendingHint, restartValidationDelay]);

    const loadJourneyLevel = useCallback(async (level?: number) => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const sessionId = getSessionId();
            const rawTarget = level ?? journeySummary.nextLevel ?? 1;
            const targetNumber = Number(rawTarget);
            const safeTarget = Number.isFinite(targetNumber)
                ? Math.min(Math.max(1, targetNumber), journeySummary.totalLevels || 200)
                : 1; // clamp/guard invalid levels before calling API
            const res = await fetch(`/api/journey/${safeTarget}?sessionId=${sessionId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            restartValidationDelay();
            cancelPendingHint(true);
            setBoardSizeState(data.size);

            dispatch({
                type: 'LOAD_PUZZLE',
                payload: {
                    puzzleId: data.id,
                    board: data.board,
                    clues: data.clues,
                    size: data.size,
                    difficulty: data.difficulty,
                    label: data.label || 'Very Hard',
                    level: data.level,
                    mode: 'journey',
                    journeyLevel: data.level,
                    journeyLevelId: data.levelId,
                    journeyStars: data.progress?.stars ?? 0,
                    journeyBestTime: data.progress?.timeSeconds ?? null,
                },
            });
        } catch (error) {
            console.error('Failed to load journey level:', error);
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    }, [cancelPendingHint, journeySummary.nextLevel, restartValidationDelay]);

    // Load initial data
    useEffect(() => {
        loadDaily();
        refreshJourneyProgress();
    }, [loadDaily, refreshJourneyProgress]);

    const placeCell = useCallback((row: number, col: number) => {
        if (state.initialBoard[row]?.[col]) return;

        const current = state.board[row]?.[col];
        let next: CellValue;
        const soundEnabled = soundOnRef.current && soundVolumeRef.current > 0;

        if (!current) {
            next = 'moon';
            if (soundEnabled) playClickSound();
        } else if (current === 'moon') {
            next = 'sun';
            if (soundEnabled) playClickSound();
        } else {
            next = null;
            if (soundEnabled) playClearSound();
        }

        restartValidationDelay();
        cancelPendingHint(true);
        dispatch({ type: 'PLACE_CELL', row, col, value: next });
    }, [cancelPendingHint, restartValidationDelay, state.board, state.initialBoard]);

    const undo = useCallback(() => {
        restartValidationDelay();
        cancelPendingHint(true);
        dispatch({ type: 'UNDO' });
    }, [cancelPendingHint, restartValidationDelay]);

    const redo = useCallback(() => {
        restartValidationDelay();
        cancelPendingHint(true);
        dispatch({ type: 'REDO' });
    }, [cancelPendingHint, restartValidationDelay]);

    const reset = useCallback(() => {
        restartValidationDelay();
        cancelPendingHint(true);
        dispatch({ type: 'RESET' });
    }, [cancelPendingHint, restartValidationDelay]);

    const checkSolution = useCallback(async (boardOverride?: Board, boardKey?: string) => {
        if (!state.puzzleId) return;

        const boardToCheck = boardOverride ? cloneBoard(boardOverride) : state.board;

        const meta = state.mode === 'daily'
            ? { dailyId: state.dailyId, dailyDate: state.dailyDate, durationSeconds: state.timer }
            : state.mode === 'journey'
                ? { levelId: state.journeyLevelId, level: state.journeyLevel, durationSeconds: state.timer }
                : {};

        try {
            const res = await fetch('/api/puzzle/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puzzleId: state.puzzleId,
                    board: boardToCheck,
                    sessionId: getSessionId(),
                    mode: state.mode,
                    meta,
                }),
            });
            const data = await res.json();

            // Ignore responses for boards that are no longer current (user changed the board meanwhile).
            if (boardKey && lastBoardKeyRef.current !== boardKey) return;

            if (data.complete) {
                dispatch({ type: 'SET_WON' });
                if (soundOnRef.current && soundVolumeRef.current > 0) playVictorySound();

                // Update stats
                incrementGamesPlayed();
                incrementGamesWon();
                const newStreak = getStreak() + 1;
                setStreak(newStreak);
                setLevel(state.level + 1);

                if (data.daily) {
                    dispatch({
                        type: 'UPDATE_META',
                        payload: {
                            currentStreak: data.daily.streak ?? state.currentStreak,
                            bestStreak: data.daily.bestStreak ?? state.bestStreak,
                        },
                    });
                }

                if (data.journey) {
                    dispatch({
                        type: 'UPDATE_META',
                        payload: {
                            journeyStars: data.journey.stars ?? state.journeyStars,
                            journeyBestTime: data.journey.timeSeconds ?? state.journeyBestTime,
                        },
                    });
                    refreshJourneyProgress();
                }
            } else if (data.errors?.length > 0) {
                dispatch({ type: 'SET_ERRORS', errors: data.errors });
            }
        } catch (error) {
            console.error('Check failed:', error);
        }
    }, [refreshJourneyProgress, state.board, state.bestStreak, state.currentStreak, state.dailyDate, state.dailyId, state.journeyBestTime, state.journeyLevel, state.journeyLevelId, state.journeyStars, state.mode, state.puzzleId, state.timer, state.level]);

    const requestHint = useCallback(async () => {
        if (!state.puzzleId) return;

        try {
            cancelPendingHint(true);

            const res = await fetch('/api/puzzle/hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puzzleId: state.puzzleId, currentBoard: state.board }),
            });
            const data = await res.json();

            if (data.hint) {
                dispatch({ type: 'SET_HINT', row: data.hint.row, col: data.hint.col, value: data.hint.value });
                if (soundOnRef.current && soundVolumeRef.current > 0) playHintSound();

                // Auto-place after showing hint highlight
                const requestBoardKey = JSON.stringify(state.board);
                hintTimeoutRef.current = setTimeout(() => {
                    hintTimeoutRef.current = null;
                    if (lastBoardKeyRef.current !== requestBoardKey) return;
                    restartValidationDelay();
                    dispatch({ type: 'PLACE_CELL', row: data.hint.row, col: data.hint.col, value: data.hint.value });
                    dispatch({ type: 'CLEAR_HINT' });
                }, 600);
            }
        } catch (error) {
            console.error('Hint failed:', error);
        }
    }, [cancelPendingHint, restartValidationDelay, state.board, state.puzzleId]);

    // Auto-validate: detect errors immediately but surface them after a short delay; win check runs instantly when board is full and clean.
    useEffect(() => {
        if (state.loading || !state.board.length || state.isWon) return;

        if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
        }

        const boardSnapshot = cloneBoard(state.board);
        const boardKey = JSON.stringify(boardSnapshot);
        lastBoardKeyRef.current = boardKey;

        const logicErrors = findLogicErrors(boardSnapshot, state.clues, state.size);
        const isBoardComplete = logicErrors.length === 0 && boardSnapshot.every(row => row.every(Boolean));

        if (logicErrors.length === 0) {
            // Clear any previously shown errors right away.
            if (state.errors.length > 0) {
                dispatch({ type: 'SET_ERRORS', errors: [] });
            }

            // If board is complete and clean, check immediately for win.
            if (isBoardComplete) {
                checkSolution(boardSnapshot, boardKey);
            }
            return;
        }

        // Delay showing errors to avoid flicker while player is still placing.
        const remainingDelay = Math.max(0, suppressErrorsUntilRef.current - Date.now());

        validationTimeoutRef.current = setTimeout(() => {
            if (lastBoardKeyRef.current !== boardKey) return; // a newer move occurred
            dispatch({ type: 'SET_ERRORS', errors: logicErrors });
        }, remainingDelay || VALIDATION_DELAY_MS);

        return () => {
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
        };
    }, [state.board, state.clues, state.size, state.isWon, state.loading, state.errors.length, checkSolution]);

    const newGame = useCallback(async (size?: BoardSize) => {
        incrementGamesPlayed();
        cancelPendingHint(true);

        if (state.mode === 'journey') {
            const target = size || (state.journeyLevel ? state.journeyLevel + 1 : journeySummary.nextLevel);
            await loadJourneyLevel(Math.min(target, journeySummary.totalLevels));
            await refreshJourneyProgress();
            return;
        }

        await loadDaily();
    }, [cancelPendingHint, journeySummary.nextLevel, journeySummary.totalLevels, loadDaily, loadJourneyLevel, refreshJourneyProgress, state.journeyLevel, state.mode]);

    const setBoardSize = useCallback((size: BoardSize) => {
        setBoardSizeState(size);
        saveBoardSize(size);
        cancelPendingHint(true);
        loadDaily();
    }, [cancelPendingHint, loadDaily]);

    const setSoundVolume = useCallback((volume: number) => {
        const clamped = Math.min(1, Math.max(0, volume));
        soundVolumeRef.current = clamped;
        setSoundVolumeState(clamped);
        saveSoundVolume(clamped);
        setMasterVolume(clamped);
    }, []);

    return (
        <GameContext.Provider value={{
            state, placeCell, undo, redo, reset, checkSolution, requestHint, newGame,
            loadDaily, loadJourneyLevel, journeyProgress, journeySummary,
            boardSize, setBoardSize, soundVolume, setSoundVolume,
        }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within GameProvider');
    return ctx;
}
