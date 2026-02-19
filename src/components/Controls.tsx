'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import styles from './Controls.module.css';

export default function Controls() {
    const { undo, reset, requestHint, newGame, state } = useGame();

    return (
        <div className={styles.controls}>
            <div className={styles.row}>
                <button
                    className={`${styles.btn} ${styles.secondary}`}
                    onClick={undo}
                    disabled={state.moveIndex <= 0 || state.isWon}
                    title="Undo"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Undo
                </button>
                <button
                    className={`${styles.btn} ${styles.secondary}`}
                    onClick={reset}
                    disabled={state.isWon}
                    title="Reset"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                    Reset
                </button>
            </div>
            <div className={styles.row}>
                <button
                    className={`${styles.btn} ${styles.hint}`}
                    onClick={requestHint}
                    disabled={state.isWon}
                    title="Get Hint"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Hint
                </button>
            </div>
            {state.isWon && (
                <button
                    className={`${styles.btn} ${styles.newGame}`}
                    onClick={() => newGame()}
                >
                    Next Puzzle →
                </button>
            )}
        </div>
    );
}
