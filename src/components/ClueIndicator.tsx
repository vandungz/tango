'use client';

import React from 'react';
import { Clue } from '@/lib/engine/types';
import styles from './ClueIndicator.module.css';

interface ClueIndicatorProps {
    clue: Clue;
    cellSize: number;
    gap: number;
    padding: number;
}

export default function ClueIndicator({ clue, cellSize, gap, padding }: ClueIndicatorProps) {
    const { row, col, direction, type } = clue;

    // Position the indicator between the two cells
    let top: number;
    let left: number;

    if (direction === 'h') {
        // Between (row, col) and (row, col+1)
        top = padding + row * (cellSize + gap) + cellSize / 2;
        left = padding + (col + 1) * (cellSize + gap) - gap / 2;
    } else {
        // Between (row, col) and (row+1, col)
        top = padding + (row + 1) * (cellSize + gap) - gap / 2;
        left = padding + col * (cellSize + gap) + cellSize / 2;
    }

    return (
        <div
            className={`${styles.indicator} ${styles[type === '=' ? 'equal' : 'cross']}`}
            style={{
                top: `${top}px`,
                left: `${left}px`,
            }}
        >
            {type === '=' ? '=' : '×'}
        </div>
    );
}
