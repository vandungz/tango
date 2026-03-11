'use client';

import React from 'react';
import { useGame } from '@/contexts/game-state';
import styles from './HintInsight.module.css';

export default function HintInsight() {
    const { state } = useGame();

    if (!state.hintInsight) {
        return null;
    }

    const message = state.hintInsight.message;

    return (
        <aside className={styles.panel} aria-live="polite" aria-atomic="true">
            <p className={styles.message}>{message}</p>
        </aside>
    );
}
