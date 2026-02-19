'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import { BoardSize } from '@/lib/engine/types';
import styles from './SizeSelector.module.css';

const SIZES: { size: BoardSize; label: string }[] = [
    { size: 4, label: '4×4' },
    { size: 6, label: '6×6' },
    { size: 8, label: '8×8' },
    { size: 10, label: '10×10' },
];

export default function SizeSelector() {
    const { boardSize, setBoardSize } = useGame();

    return (
        <div className={styles.selector}>
            {SIZES.map(({ size, label }) => (
                <button
                    key={size}
                    className={`${styles.pill} ${boardSize === size ? styles.active : ''}`}
                    onClick={() => setBoardSize(size)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
