'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { useGame } from '@/lib/game-state';
import Cell from './Cell';
import ClueIndicator from './ClueIndicator';
import styles from './Board.module.css';

export default function Board() {
    const { state } = useGame();
    const boardRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState(60);
    const gap = 6;
    const boardPadding = 12;

    useLayoutEffect(() => {
        if (!boardRef.current) return;

        const updateSize = () => {
            const container = boardRef.current;
            if (!container) return;

            const containerWidth = container.getBoundingClientRect().width || container.clientWidth || 500;
            const viewportSafeWidth = typeof window !== 'undefined' ? window.innerWidth - 24 : containerWidth;
            const maxWidth = Math.min(containerWidth, viewportSafeWidth, 520);
            const totalGap = (state.size - 1) * gap;
            const available = Math.max(maxWidth - boardPadding * 2 - totalGap, 120);

            setCellSize(Math.floor(available / state.size));
        };

        const resizeObserver = new ResizeObserver(() => updateSize());

        updateSize();
        resizeObserver.observe(boardRef.current);
        window.addEventListener('resize', updateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, [state.size]);

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

    const totalSize = state.size * cellSize + (state.size - 1) * gap + boardPadding * 2;

    const boardStyle: React.CSSProperties & { '--board-padding'?: string } = {
        display: 'grid',
        gridTemplateColumns: `repeat(${state.size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${state.size}, ${cellSize}px)`,
        gap: `${gap}px`,
        position: 'relative',
        width: `${totalSize}px`,
        height: `${totalSize}px`,
        padding: `${boardPadding}px`,
        '--board-padding': `${boardPadding}px`,
    };

    return (
        <div className={styles.boardContainer} ref={boardRef}>
            <div className={styles.board} style={boardStyle}>
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
                        cellSize={cellSize}
                        gap={gap}
                        padding={boardPadding}
                    />
                ))}
            </div>
        </div>
    );
}
