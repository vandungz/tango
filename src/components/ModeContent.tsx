'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import styles from './ModeContent.module.css';

function DailyCard() {
    const { state } = useGame();
    const best = Math.max(state.bestStreak, state.currentStreak, 1);
    const pct = Math.min(100, Math.round((state.currentStreak / best) * 100));

    return (
        <div className={styles.dailyCard}>
            <div>
                <p className={styles.label}>Daily streak</p>
                <div className={styles.valueRow}>
                    <span className={styles.primary}>{state.currentStreak} days</span>
                    <span className={styles.badge}>Best {state.bestStreak}</span>
                </div>
                <p className={styles.caption}>Finish today’s puzzle to keep the chain alive.</p>
                <div className={styles.progress} aria-label={`Current streak ${pct}%`}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
            </div>
        </div>
    );
}

export default function ModeContent() {
    const { state } = useGame();

    if (state.mode === 'journey') {
        return (
            <div className={styles.dailyCard}>
                <p className={styles.label}>Journey</p>
                <div className={styles.valueRow}>
                    <span className={styles.primary}>Level {state.journeyLevel ?? state.level}</span>
                    <span className={styles.badge}>Stars {state.journeyStars}</span>
                </div>
                <p className={styles.caption}>Use the menu to pick another level without leaving your run.</p>
            </div>
        );
    }

    return <DailyCard />;
}
