'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/theme';
import { GameProvider } from '@/lib/game-state';
import TopBar from '@/components/TopBar';
import GameHeader from '@/components/GameHeader';
import SizeSelector from '@/components/SizeSelector';
import Board from '@/components/Board';
import Controls from '@/components/Controls';
import WinModal from '@/components/WinModal';
import styles from './page.module.css';

export default function Home() {
  return (
    <ThemeProvider>
      <GameProvider>
        <main className={`${styles.main} no-select`}>
          <TopBar />
          <div className={styles.game}>
            <GameHeader />
            <SizeSelector />
            <Board />
            <Controls />
          </div>
          <WinModal />
        </main>
      </GameProvider>
    </ThemeProvider>
  );
}
