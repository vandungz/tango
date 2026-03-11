'use client';

import React, { useState } from 'react';
import { GameProvider, useGame } from '@/contexts/game-state';
import TopBar from '@/components/layout/TopBar';
import GameHeader from '@/components/game/GameHeader';
import Board from '@/components/game/Board';
import Controls from '@/components/game/Controls';
import HintInsight from '@/components/game/HintInsight';
import WinModal from '@/components/game/WinModal';
import StartScreen from '@/components/layout/StartScreen';
import JourneyDrawer from '@/components/journey/JourneyDrawer';
import styles from './page.module.css';

export default function Home() {
  return (
    <GameProvider>
      <HomeContent />
    </GameProvider>
  );
}

function HomeContent() {
  const { state, loadDaily, loadJourneyLevel, journeySummary, boardSize, goHome } = useGame();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showGame = state.hasChosenMode && (state.loading || state.board.length > 0);
  const drawerMode = showGame ? state.mode : 'home';

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
          <HintInsight />
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

      <JourneyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onHome={handleGoHome}
        mode={drawerMode}
        onDaily={startDaily}
        onJourney={startJourney}
      />
      <WinModal />
    </main>
  );
}
