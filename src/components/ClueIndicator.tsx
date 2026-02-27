'use client';

import React from 'react';
import { Clue } from '@/lib/engine/types';
import styles from './ClueIndicator.module.css';

interface ClueIndicatorProps {
    clue: Clue;
    size: number;
}

export default function ClueIndicator({ clue, size }: ClueIndicatorProps) {
    const { row, col, direction, type } = clue;

    // Now 100% = grid area (no padding involved)
    // Cell size = (100% - (size-1)*gap) / size
    const cellSize = `(100% - ${size - 1} * var(--board-gap)) / ${size}`;
    const cellWithGap = `(${cellSize} + var(--board-gap))`;

    let top: string;
    let left: string;

    if (direction === 'h') {
        // Between (row, col) and (row, col+1) - horizontal clue
        top = `calc(${row} * ${cellWithGap} + ${cellSize} / 2)`;
        left = `calc(${col + 1} * ${cellWithGap} - var(--board-gap) / 2)`;
    } else {
        // Between (row, col) and (row+1, col) - vertical clue
        top = `calc(${row + 1} * ${cellWithGap} - var(--board-gap) / 2)`;
        left = `calc(${col} * ${cellWithGap} + ${cellSize} / 2)`;
    }

    return (
        <div
            className={`${styles.indicator} ${styles[type === '=' ? 'equal' : 'cross']}`}
            style={{ top, left }}
        >
            {type === '=' ? '=' : '×'}
        </div>
    );
}
