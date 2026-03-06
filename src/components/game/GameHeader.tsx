'use client';

import React from 'react';
import { useGame } from '@/contexts/game-state';
import { journeyStarsFromTime, journeyStarThresholds } from '@/lib/journey-stars';
import styles from './GameHeader.module.css';

function formatDateLabel(iso: string | null): string {
    if (!iso) return 'Today';
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function GameHeader() {
    const { state } = useGame();

    const isDaily = state.mode === 'daily';
    const title = isDaily ? 'Daily' : `Level ${state.journeyLevel ?? state.level}`;
    const difficulty = isDaily ? formatDateLabel(state.dailyDate) : state.label;
    const meta = isDaily ? `Streak ${state.currentStreak} | Best ${state.bestStreak}` : `Stars ${state.journeyStars}`;

    const { threeStar, twoStar, maxTime } = journeyStarThresholds(state.difficulty, state.label);
    const starCount = journeyStarsFromTime(state.timer, state.difficulty, state.label);
    const elapsed = Math.min(state.timer, maxTime);
    const remaining = Math.max(0, maxTime - elapsed);
    const remainingPct = (remaining / maxTime) * 100;

    const markerThreePct = Math.min(100, Math.max(0, ((maxTime - threeStar) / maxTime) * 100));
    const markerTwoPct = Math.min(100, Math.max(0, ((maxTime - twoStar) / maxTime) * 100));
    const markers = [
        { id: 3, pct: markerThreePct },
        { id: 2, pct: markerTwoPct },
        { id: 1, pct: 0 },
    ];

    const fillTone = starCount === 3 ? '#19c58c' : starCount === 2 ? '#f3a53d' : '#e45656';
    const fillGradient =
        starCount === 3
            ? 'linear-gradient(90deg, #1ad194 0%, #0fad74 100%)'
            : starCount === 2
            ? 'linear-gradient(90deg, #f7b347 0%, #eb9631 100%)'
            : 'linear-gradient(90deg, #ee5e5e 0%, #d64545 100%)';
    const fillShadow =
        starCount === 3
            ? '0 8px 18px rgba(26, 209, 148, 0.25)'
            : starCount === 2
            ? '0 8px 18px rgba(247, 179, 71, 0.22)'
            : '0 8px 18px rgba(238, 94, 94, 0.2)';

    return (
        <div className={styles.header}>
            <div className={styles.titleBlock}>
                <span className={styles.kicker}>{isDaily ? 'Daily' : 'Journey'}</span>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>{title}</h1>
                    <span className={styles.pill}>{difficulty}</span>
                </div>
            </div>
            {!isDaily && (
                <div className={styles.timeline} aria-label="Journey star timeline">
                    <div className={styles.trackWrapper}>
                        <div className={styles.track}>
                            <div
                                className={styles.fill}
                                style={{
                                    width: `${remainingPct}%`,
                                    background: fillGradient,
                                    boxShadow: fillShadow,
                                    ['--fill-tone' as string]: fillTone,
                                }}
                            />
                            <div className={styles.markers} aria-hidden>
                                {markers.map(marker => {
                                    const isActive = starCount >= marker.id;
                                    return (
                                        <div
                                            key={marker.id}
                                            className={`${styles.marker} ${isActive ? styles.markerActive : styles.markerInactive}`}
                                            style={{ left: `${marker.pct}%` }}
                                        >
                                            <svg viewBox="0 0 24 24" className={styles.markerIcon}>
                                                <path d="M12 2l3 6.6 7 .6-5.3 4.7 1.7 7.1L12 17.8 5.6 21l1.7-7.1L2 9.2l7-.6L12 2z" />
                                            </svg>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
