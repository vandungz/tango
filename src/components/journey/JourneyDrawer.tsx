'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/contexts/game-state';
import { BoardSize } from '@/engine/types';
import JourneyGrid from './JourneyGrid';
import styles from './JourneyDrawer.module.css';

interface JourneyDrawerProps {
    open: boolean;
    onClose: () => void;
    onHome: () => void;
    mode: 'home' | 'journey' | 'daily';
    onDaily: () => void;
    onJourney: () => void;
}

const DAILY_SIZES: Array<{ size: BoardSize; subtitle: string }> = [
    { size: 4, subtitle: 'Easy' },
    { size: 6, subtitle: 'Classic' },
    { size: 8, subtitle: 'Challenge' },
    { size: 10, subtitle: 'Expert' },
];

export default function JourneyDrawer({ open, onClose, onHome, mode, onDaily, onJourney }: JourneyDrawerProps) {
    const router = useRouter();
    const { boardSize, setBoardSize, proMode, setProMode, dailyVariants, state } = useGame();

    const handleSelectLevel = () => {
        onClose();
    };

    const handleProfile = () => {
        onClose();
        router.push('/profile');
    };

    const handleHowToPlay = () => {
        onClose();
        router.push('/how-to-play');
    };

    const handleDaily = () => {
        onClose();
        onDaily();
    };

    const handleJourney = () => {
        onClose();
        onJourney();
    };

    const variantDoneBySize = new Map<number, boolean>(dailyVariants.map(item => [item.size, item.completed]));

    const handleSelectDailySize = (size: BoardSize, completed: boolean) => {
        if (size === boardSize || completed) return;
        setBoardSize(size);
        onClose();
    };

    const handleToggleProMode = () => {
        setProMode(!proMode);
    };

    return (
        <div className={`${styles.overlay} ${open ? styles.open : ''}`} aria-hidden={!open}>
            <aside className={styles.drawer} aria-label={mode === 'journey' ? 'Journey level picker' : mode === 'daily' ? 'Daily options' : 'Home menu'}>
                <div className={styles.topActions}>
                    {mode === 'journey' || mode === 'daily' ? (
                        <button className={styles.homeBtn} onClick={onHome}>
                            Home
                        </button>
                    ) : (
                        <div className={styles.homeTitle}>Home menu</div>
                    )}
                    <button className={styles.iconBtn} onClick={onClose} aria-label="Close menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className={styles.content}>
                    {mode === 'journey' ? (
                        <JourneyGrid onSelectLevel={handleSelectLevel} />
                    ) : mode === 'daily' ? (
                        <div className={styles.dailyOptions}>
                            <section className={styles.section} aria-label="Board size">
                                <div className={styles.sectionHeader}>
                                    <h3 className={styles.sectionTitle}>Board size</h3>
                                    <span className={styles.sectionChevron} aria-hidden>▲</span>
                                </div>
                                <div className={styles.sizeGrid}>
                                    {DAILY_SIZES.map(item => {
                                        const isActive = boardSize === item.size;
                                        const isDone = variantDoneBySize.get(item.size) ?? false;
                                        const isLocked = isDone && !isActive;

                                        return (
                                            <button
                                                key={item.size}
                                                className={`${styles.sizeCard} ${isActive ? styles.sizeCardActive : ''} ${isLocked ? styles.sizeCardDisabled : ''}`}
                                                onClick={() => handleSelectDailySize(item.size, isDone)}
                                                disabled={isLocked}
                                                aria-pressed={isActive}
                                                aria-disabled={isLocked}
                                            >
                                                <span className={styles.sizeTitle}>{item.size}×{item.size}</span>
                                                <span className={styles.sizeSubtitle}>{item.subtitle}</span>
                                                {isDone && state.dailyDate && (
                                                    <span className={styles.sizeDone}>Done</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className={styles.section} aria-label="Preferences">
                                <div className={styles.sectionHeader}>
                                    <h3 className={styles.sectionTitle}>Preferences</h3>
                                    <span className={styles.sectionChevron} aria-hidden>▲</span>
                                </div>
                                <div className={styles.preferenceRow}>
                                    <button
                                        type="button"
                                        className={`${styles.toggle} ${proMode ? styles.toggleOn : ''}`}
                                        onClick={handleToggleProMode}
                                        role="switch"
                                        aria-checked={proMode}
                                        aria-label="Pro Mode"
                                    >
                                        <span className={styles.toggleThumb} />
                                    </button>
                                    <div>
                                        <p className={styles.preferenceTitle}>Pro Mode</p>
                                        <p className={styles.preferenceCaption}>Maximum difficulty</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <nav className={styles.homeMenu} aria-label="Home navigation">
                            <button className={styles.menuItem} onClick={onHome}>Home</button>
                            <button className={styles.menuItem} onClick={handleProfile}>Profile</button>
                            <button className={styles.menuItem} onClick={handleDaily}>Daily mode</button>
                            <button className={styles.menuItem} onClick={handleJourney}>Journey mode</button>
                            <button className={styles.menuItem} onClick={handleHowToPlay}>How to play</button>
                        </nav>
                    )}
                </div>
            </aside>
            <div className={styles.scrim} onClick={onClose} aria-hidden />
        </div>
    );
}
