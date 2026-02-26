'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import styles from './ModeTabs.module.css';

export default function ModeTabs() {
    const { state, loadDaily, loadJourneyLevel, journeySummary } = useGame();

    const switchMode = (mode: 'daily' | 'journey') => {
        if (mode === 'daily') {
            loadDaily();
        } else {
            loadJourneyLevel(journeySummary.nextLevel || 1);
        }
    };

    return (
        <div className={styles.wrapper}>
            <button
                className={`${styles.tab} ${state.mode === 'daily' ? styles.active : ''}`}
                onClick={() => switchMode('daily')}
                aria-pressed={state.mode === 'daily'}
            >
                <div className={styles.tabHeader}>
                    <span className={styles.kicker}>Daily</span>
                    <span className={styles.subtle}>6×6</span>
                </div>
                <div className={styles.titleRow}>
                    <span className={styles.title}>Keep the streak</span>
                    <span className={styles.pill}>{state.currentStreak}🔥</span>
                </div>
                <p className={styles.caption}>One fresh puzzle every day. Don’t break the chain.</p>
            </button>

            <button
                className={`${styles.tab} ${state.mode === 'journey' ? styles.active : ''}`}
                onClick={() => switchMode('journey')}
                aria-pressed={state.mode === 'journey'}
            >
                <div className={styles.tabHeader}>
                    <span className={styles.kicker}>Journey</span>
                    <span className={styles.subtle}>{journeySummary.nextLevel}/{journeySummary.totalLevels}</span>
                </div>
                <div className={styles.titleRow}>
                    <span className={styles.title}>200 very hard boards</span>
                    <span className={styles.pill}>{journeySummary.starsEarned}★</span>
                </div>
                <p className={styles.caption}>Climb the gauntlet of timed challenges and collect stars.</p>
            </button>
        </div>
    );
}
