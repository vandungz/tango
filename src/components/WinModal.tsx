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

function starsFromTime(seconds: number): number {
    if (!Number.isFinite(seconds)) return 1;
    if (seconds <= 120) return 3;
    if (seconds <= 240) return 2;
    return 1;
}

export default function WinModal() {
    const { state, newGame } = useGame();
    const [stats, setStats] = useState({ streak: 0, best: 0, played: 0, won: 0 });

    const isJourney = state.mode === 'journey';
    const stars = isJourney ? Math.max(state.journeyStars, starsFromTime(state.timer)) : 0;

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
                <h2 className={styles.title}>{isJourney ? 'Level cleared!' : 'Daily solved!'}</h2>
                <p className={styles.time}>Time: {formatTime(state.timer)}</p>

                {isJourney ? (
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{stars}★</span>
                            <span className={styles.statLabel}>Earned</span>
                        </div>
                        {state.journeyBestTime !== null && (
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{formatTime(state.journeyBestTime)}</span>
                                <span className={styles.statLabel}>Best</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{state.currentStreak}</span>
                            <span className={styles.statLabel}>Streak</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{state.bestStreak}</span>
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
                )}

                <button className={styles.nextBtn} onClick={() => newGame()}>
                    {isJourney ? 'Next Level →' : 'Replay Daily'}
                </button>
            </div>
        </div>
    );
}
