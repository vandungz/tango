'use client';

import React from 'react';
import { useGame } from '@/lib/game-state';
import Cell from './Cell';
import ClueIndicator from './ClueIndicator';
import styles from './Board.module.css';

const BOARD_GAP = 6;

export default function Board() {
    const { state } = useGame();

    if (state.loading || !state.board.length) {
        return (
            <div className={styles.boardContainer}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Generating puzzle...</p>
                </div>
            </div>
        );
    }

    const gridStyle = {
        '--board-size': state.size,
        '--board-gap': `${BOARD_GAP}px`,
    } as React.CSSProperties;

    return (
        <div className={styles.boardContainer}>
            <div className={styles.board}>
                <div className={styles.grid} style={gridStyle}>
                    {state.board.map((row, r) =>
                        row.map((_, c) => (
                            <Cell key={`${r}-${c}`} row={r} col={c} />
                        ))
                    )}

                    {/* Clue indicators */}
                    {state.clues.map((clue, i) => (
                        <ClueIndicator
                            key={i}
                            clue={clue}
                            size={state.size}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
