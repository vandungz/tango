'use client';

import React, { useMemo } from 'react';
import { useGame } from '@/lib/game-state';
import styles from './JourneyGrid.module.css';

type JourneyGridProps = {
    onSelectLevel?: (level: number) => void;
};

function StarRow({ count }: { count: number }) {
    const stars = Math.min(3, Math.max(0, count));
    return (
        <div className={styles.stars} aria-label={`${stars} stars`}>
            {[0, 1, 2].map(i => (
                <svg
                    key={i}
                    viewBox="0 0 24 24"
                    className={`${styles.star} ${i < stars ? styles.filled : ''}`}
                    aria-hidden
                >
                    <path d="M12 2l3 6.6 7 .6-5.3 4.7 1.7 7.1L12 17.8 5.6 21l1.7-7.1L2 9.2l7-.6L12 2z" />
                </svg>
            ))}
        </div>
    );
}

export default function JourneyGrid({ onSelectLevel }: JourneyGridProps) {
    const { journeyProgress, journeySummary, loadJourneyLevel, state } = useGame();

    const progressMap = useMemo(() => {
        const map = new Map<number, { stars: number; timeSeconds: number | null }>();
        journeyProgress.forEach(p => map.set(p.level, { stars: p.stars, timeSeconds: p.timeSeconds }));
        return map;
    }, [journeyProgress]);

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <p className={styles.label}>Journey</p>
                    <h3 className={styles.heading}>Select a level</h3>
                </div>
                <div className={styles.meta}>Next up: {journeySummary.nextLevel}/{journeySummary.totalLevels}</div>
            </div>
            <div className={styles.grid}>
                {Array.from({ length: journeySummary.totalLevels }, (_, i) => {
                    const level = i + 1;
                    const record = progressMap.get(level);
                    const locked = level > journeySummary.nextLevel;
                    const active = state.mode === 'journey' && state.journeyLevel === level;

                    const handleClick = () => {
                        if (locked) return;
                        loadJourneyLevel(level);
                        if (onSelectLevel) onSelectLevel(level);
                    };

                    return (
                        <button
                            key={level}
                            className={`${styles.card} ${locked ? styles.locked : ''} ${active ? styles.active : ''}`}
                            onClick={handleClick}
                            disabled={locked}
                            aria-label={`Level ${level}${locked ? ' locked' : ''}`}
                        >
                            <span className={styles.levelNumber}>{String(level).padStart(2, '0')}</span>
                            <StarRow count={record?.stars ?? 0} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
