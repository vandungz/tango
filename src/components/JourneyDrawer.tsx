'use client';

import React from 'react';
import JourneyGrid from './JourneyGrid';
import styles from './JourneyDrawer.module.css';

interface JourneyDrawerProps {
    open: boolean;
    onClose: () => void;
    onHome: () => void;
}

export default function JourneyDrawer({ open, onClose, onHome }: JourneyDrawerProps) {
    const handleSelectLevel = () => {
        onClose();
    };

    return (
        <div className={`${styles.overlay} ${open ? styles.open : ''}`} aria-hidden={!open}>
            <aside className={styles.drawer} aria-label="Journey level picker">
                <div className={styles.topActions}>
                    <button className={styles.homeBtn} onClick={onHome}>
                        Back to home
                    </button>
                    <button className={styles.iconBtn} onClick={onClose} aria-label="Close level menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className={styles.content}>
                    <JourneyGrid onSelectLevel={handleSelectLevel} />
                </div>
            </aside>
            <div className={styles.scrim} onClick={onClose} aria-hidden />
        </div>
    );
}
