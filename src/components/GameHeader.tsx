'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import styles from './GameHeader.module.css';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GameHeader() {
    const { state } = useGame();

    return (
        <div className={styles.header}>
            <div className={styles.levelRow}>
                <span className={styles.levelLabel}>LEVEL</span>
                <span className={styles.levelNumber}>{state.level}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.infoRow}>
                <span className={`${styles.badge} ${styles[state.label.toLowerCase().replace(' ', '')]}`}>
                    {state.label}
                </span>
                <span className={styles.timer}>{formatTime(state.timer)}</span>
            </div>
        </div>
    );
}
