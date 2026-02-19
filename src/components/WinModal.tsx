'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/lib/game-state';
import { getStreak, getBestStreak, getGamesPlayed, getGamesWon } from '@/lib/storage';
import styles from './WinModal.module.css';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function WinModal() {
    const { state, newGame } = useGame();
    const [stats, setStats] = useState({ streak: 0, best: 0, played: 0, won: 0 });

    useEffect(() => {
        if (state.isWon) {
            setStats({
                streak: getStreak(),
                best: getBestStreak(),
                played: getGamesPlayed(),
                won: getGamesWon(),
            });
        }
    }, [state.isWon]);

    if (!state.isWon) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.confetti}>🎉</div>
                <h2 className={styles.title}>Puzzle Solved!</h2>
                <p className={styles.time}>Time: {formatTime(state.timer)}</p>

                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{stats.streak}</span>
                        <span className={styles.statLabel}>Streak</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{stats.best}</span>
                        <span className={styles.statLabel}>Best</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{stats.won}</span>
                        <span className={styles.statLabel}>Won</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{stats.played}</span>
                        <span className={styles.statLabel}>Played</span>
                    </div>
                </div>

                <button className={styles.nextBtn} onClick={() => newGame()}>
                    Next Puzzle →
                </button>
            </div>
        </div>
    );
}
