'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import styles from './GameHeader.module.css';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateLabel(iso: string | null): string {
    if (!iso) return 'Today';
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function Stars({ count }: { count: number }) {
    const stars = Math.min(3, Math.max(0, count));
    return (
        <div className={styles.stars} aria-label={`${stars} stars`}>
            {[0, 1, 2].map(i => (
                <svg key={i} viewBox="0 0 24 24" className={`${styles.star} ${i < stars ? styles.filled : ''}`}>
                    <path d="M12 2l3 6.6 7 .6-5.3 4.7 1.7 7.1L12 17.8 5.6 21l1.7-7.1L2 9.2l7-.6L12 2z" />
                </svg>
            ))}
        </div>
    );
}

export default function GameHeader() {
    const { state } = useGame();

    const isDaily = state.mode === 'daily';
    const title = isDaily ? 'Daily Challenge' : `Level ${state.journeyLevel ?? state.level}`;
    const subtitle = isDaily ? formatDateLabel(state.dailyDate) : state.label;

    return (
        <div className={styles.header}>
            <div className={styles.topRow}>
                <div className={styles.titles}>
                    <span className={styles.kicker}>{isDaily ? 'Daily' : 'Journey'}</span>
                    <div className={styles.titleRow}>
                        <h1 className={styles.title}>{title}</h1>
                        {!isDaily && <Stars count={state.journeyStars} />}
                    </div>
                    <p className={styles.subtitle}>{subtitle}</p>
                </div>
                <div className={styles.timerCard}>
                    <span className={styles.timerLabel}>Time</span>
                    <span className={styles.timerValue}>{formatTime(state.timer)}</span>
                </div>
            </div>
            <div className={styles.metaRow}>
                {isDaily ? (
                    <>
                        <span className={styles.badgePrimary}>Streak {state.currentStreak}</span>
                        <span className={styles.badgeMuted}>Best {state.bestStreak}</span>
                    </>
                ) : (
                    <>
                        <span className={styles.badgePrimary}>{state.label}</span>
                        {state.journeyBestTime !== null && (
                            <span className={styles.badgeMuted}>Best {formatTime(state.journeyBestTime)}</span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
