'use client';

import React from 'react';
import styles from './StartScreen.module.css';

interface StartScreenProps {
    onDaily: () => void;
    onJourney: () => void;
    journeyNextLevel: number;
    journeyTotalLevels: number;
    boardSize: number;
}

export default function StartScreen({ onDaily, onJourney, journeyNextLevel, journeyTotalLevels, boardSize }: StartScreenProps) {
    return (
        <div className={styles.shell}>
            <div className={styles.logoBadge}>
                <span className={styles.logoIcon}>◐</span>
            </div>
            <div className={styles.heading}>
                <div className={styles.titleLine}>
                    <h1 className={styles.brand}>Tango</h1>
                </div>
                <p className={styles.subtitle}>
                    Fill the grid with <span className={styles.dotSun} aria-label="sun token" /> and <span className={styles.dotMoon} aria-label="moon token" /> using only logic!
                </p>
            </div>
            <div className={styles.ctas}>
                <button className={`${styles.cta} ${styles.daily}`} onClick={onDaily}>
                    <span className={styles.ctaLabel}>Daily</span>
                    <span className={styles.ctaBadge}>{boardSize}x{boardSize}</span>
                </button>
                <button className={`${styles.cta} ${styles.journey}`} onClick={onJourney}>
                    <span className={styles.ctaLabel}>Journey</span>
                    <span className={styles.ctaBadge}>Level {journeyNextLevel}/{journeyTotalLevels}</span>
                </button>
            </div>
            <div className={styles.metaRow}>
                <button className={styles.metaBtn} aria-label="Statistics">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                </button>
                <button className={styles.metaBtn} aria-label="Achievements">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15 8.5 22 9.3 17 14.1 18.3 21 12 17.7 5.7 21 7 14.1 2 9.3 9 8.5 12 2" />
                    </svg>
                </button>
                <button className={styles.metaBtn} aria-label="Profile">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.3-3 4.2-5 8-5s6.7 2 8 5" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
