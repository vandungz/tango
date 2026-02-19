'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import styles from './Cell.module.css';

interface CellProps {
    row: number;
    col: number;
}

export default function Cell({ row, col }: CellProps) {
    const { state, placeCell } = useGame();
    const value = state.board[row]?.[col];
    const isLocked = !!state.initialBoard[row]?.[col];
    const isError = state.errors.some(([r, c]) => r === row && c === col);
    const isHint = state.hintCell?.row === row && state.hintCell?.col === col;

    const handleClick = () => {
        if (isLocked || state.isWon) return;
        placeCell(row, col);
    };

    return (
        <button
            className={`${styles.cell} ${value ? styles[value] : ''} ${isLocked ? styles.locked : ''} ${isError ? styles.error : ''} ${isHint ? styles.hint : ''}`}
            onClick={handleClick}
            disabled={isLocked}
            aria-label={`Cell ${row},${col}: ${value || 'empty'}`}
        >
            {value && (
                <span className={styles.symbol}>
                    <span className={`${styles.circle} ${styles[value]}`} />
                </span>
            )}
        </button>
    );
}
