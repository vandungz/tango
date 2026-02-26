'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/theme';
import { GameProvider } from '@/lib/game-state';
import TopBar from '@/components/TopBar';
import GameHeader from '@/components/GameHeader';
import Board from '@/components/Board';
import Controls from '@/components/Controls';
import WinModal from '@/components/WinModal';
import ModeTabs from '@/components/ModeTabs';
import ModeContent from '@/components/ModeContent';
import styles from './page.module.css';

export default function Home() {
  return (
    <ThemeProvider>
      <GameProvider>
        <main className={`${styles.main} no-select`}>
          <TopBar />
          <div className={styles.game}>
            <ModeTabs />
            <GameHeader />
            <ModeContent />
            <Board />
            <Controls />
          </div>
          <WinModal />
        </main>
      </GameProvider>
    </ThemeProvider>
  );
}
