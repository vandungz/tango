'use client';

import React, { useState } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { GameProvider, useGame } from '@/lib/game-state';
import TopBar from '@/components/TopBar';
import GameHeader from '@/components/GameHeader';
import Board from '@/components/Board';
import Controls from '@/components/Controls';
import WinModal from '@/components/WinModal';
import StartScreen from '@/components/StartScreen';
import JourneyDrawer from '@/components/JourneyDrawer';
import styles from './page.module.css';

export default function Home() {
  return (
    <ThemeProvider>
      <GameProvider>
        <HomeContent />
      </GameProvider>
    </ThemeProvider>
  );
}

function HomeContent() {
  const { state, loadDaily, loadJourneyLevel, journeySummary, boardSize, goHome } = useGame();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showGame = state.hasChosenMode && (state.loading || state.board.length > 0);

  const startDaily = () => {
    setDrawerOpen(false);
    loadDaily();
  };

  const startJourney = () => {
    setDrawerOpen(false);
    loadJourneyLevel(journeySummary.nextLevel || 1);
  };

  const handleGoHome = () => {
    setDrawerOpen(false);
    goHome();
  };

  return (
    <main className={`${styles.main} no-select`}>
      <TopBar onMenuClick={() => setDrawerOpen(true)} />

      {showGame ? (
        <div className={styles.game}>
          <GameHeader />
          <Board />
          <Controls />
        </div>
      ) : (
        <div className={styles.landing}>
          <StartScreen
            onDaily={startDaily}
            onJourney={startJourney}
            journeyNextLevel={journeySummary.nextLevel}
            journeyTotalLevels={journeySummary.totalLevels}
            boardSize={boardSize}
          />
        </div>
      )}

      <JourneyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onHome={handleGoHome} />
      <WinModal />
    </main>
  );
}
