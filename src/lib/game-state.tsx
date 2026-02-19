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

interface GameState {
    puzzleId: string | null;
    board: CellValue[][];
    initialBoard: CellValue[][]; // cells that are pre-filled (locked)
    clues: Clue[];
    size: BoardSize;
    difficulty: number;
    label: string;
    level: number;
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
    | { type: 'LOAD_PUZZLE'; payload: { puzzleId: string; board: CellValue[][]; clues: Clue[]; size: BoardSize; difficulty: number; label: string; level: number } }
    | { type: 'PLACE_CELL'; row: number; col: number; value: CellValue }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'RESET' }
    | { type: 'TICK' }
    | { type: 'SET_ERRORS'; errors: [number, number][] }
    | { type: 'SET_WON' }
    | { type: 'SET_HINT'; row: number; col: number; value: CellValue }
    | { type: 'CLEAR_HINT' }
    | { type: 'SET_LOADING'; loading: boolean };

function cloneBoard(b: CellValue[][]): CellValue[][] {
    return b.map(r => [...r]);
}

const initialState: GameState = {
    puzzleId: null,
    board: [],
    initialBoard: [],
    clues: [],
    size: 6,
    difficulty: 0,
    label: '',
    level: 1,
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
                board: cloneBoard(board),
                initialBoard: cloneBoard(board),
                clues: action.payload.clues,
                size: action.payload.size,
                difficulty: action.payload.difficulty,
                label: action.payload.label,
                level: action.payload.level,
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

        default:
            return state;
    }
}

// — Context —

interface GameContextType {
    state: GameState;
    placeCell: (row: number, col: number) => void;
    undo: () => void;
    redo: () => void;
    reset: () => void;
    checkSolution: () => Promise<void>;
    requestHint: () => Promise<void>;
    newGame: (size?: BoardSize) => Promise<void>;
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

    const fetchPuzzle = useCallback(async (size: BoardSize) => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const sessionId = getSessionId();
            const res = await fetch(`/api/puzzle?size=${size}&sessionId=${sessionId}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            const level = getLevel();
            restartValidationDelay();
            cancelPendingHint(true);

            dispatch({
                type: 'LOAD_PUZZLE',
                payload: {
                    puzzleId: data.id,
                    board: data.board,
                    clues: data.clues,
                    size: data.size,
                    difficulty: data.difficulty,
                    label: data.label,
                    level,
                },
            });
        } catch (error) {
            console.error('Failed to fetch puzzle:', error);
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    }, [cancelPendingHint, restartValidationDelay]);

    // Load initial puzzle
    useEffect(() => {
        fetchPuzzle(boardSize);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

        try {
            const res = await fetch('/api/puzzle/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puzzleId: state.puzzleId, board: boardToCheck }),
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
            } else if (data.errors?.length > 0) {
                dispatch({ type: 'SET_ERRORS', errors: data.errors });
            }
        } catch (error) {
            console.error('Check failed:', error);
        }
    }, [state.puzzleId, state.board, state.level]);

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
        const s = size || boardSize;
        incrementGamesPlayed();
        cancelPendingHint(true);
        await fetchPuzzle(s);
    }, [boardSize, cancelPendingHint, fetchPuzzle]);

    const setBoardSize = useCallback((size: BoardSize) => {
        setBoardSizeState(size);
        saveBoardSize(size);
        cancelPendingHint(true);
        fetchPuzzle(size);
    }, [cancelPendingHint, fetchPuzzle]);

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
