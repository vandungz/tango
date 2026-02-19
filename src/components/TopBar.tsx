'use client';

import React, { useState } from 'react';
import { useTheme } from '@/lib/theme';
import { useGame } from '@/lib/game-state';
import styles from './TopBar.module.css';

export default function TopBar() {
    const { theme, toggleTheme } = useTheme();
    const { soundVolume, setSoundVolume } = useGame();
    const [volumeOpen, setVolumeOpen] = useState(false);

    const sliderId = 'game-volume-slider';

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSoundVolume(parseFloat(event.target.value));
    };

    const toggleVolumePanel = () => setVolumeOpen(v => !v);

    return (
        <div className={styles.topbar}>
            <div className={styles.logo}>
                <span className={styles.logoIcon}>◐</span>
                <span className={styles.logoText}>Tango</span>
            </div>
            <div className={styles.actions} />
            <div className={styles.volumeFloating}>
                <div className={styles.volumeAnchor}>
                    <button
                        className={styles.iconBtn}
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        )}
                    </button>
                    <div className={styles.volumeControl}>
                    <button
                        className={`${styles.iconBtn} ${styles.volumeBtn}`}
                        onClick={toggleVolumePanel}
                        aria-expanded={volumeOpen}
                        aria-controls={`${sliderId}-panel`}
                        title="Điều chỉnh âm lượng"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                    </button>
                    <div
                        id={`${sliderId}-panel`}
                        className={`${styles.volumePanel} ${volumeOpen ? styles.open : ''}`}
                        aria-hidden={!volumeOpen}
                    >
                        <div className={styles.volumeHeader}>Âm lượng</div>
                        <div className={styles.volumeControls}>
                            <input
                                id={sliderId}
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={soundVolume}
                                onChange={handleVolumeChange}
                                className={styles.volumeSlider}
                                aria-label="Điều chỉnh âm lượng"
                            />
                            <span className={styles.volumeValue}>{Math.round(soundVolume * 100)}%</span>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
