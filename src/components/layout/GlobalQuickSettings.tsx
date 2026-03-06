'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/theme';
import { getSoundVolume, setSoundVolume as saveSoundVolume } from '@/lib/storage';
import { setMasterVolume } from '@/lib/sound';
import styles from './GlobalQuickSettings.module.css';

const DEFAULT_VOLUME = 0.8;

export default function GlobalQuickSettings() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [soundVolume, setSoundVolume] = useState<number>(DEFAULT_VOLUME);

  useEffect(() => {
    const storedVolume = getSoundVolume();
    setSoundVolume(storedVolume);
    setMasterVolume(storedVolume);
  }, []);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setSoundVolume(value);
    saveSoundVolume(value);
    setMasterVolume(value);
  };

  if (pathname === '/') {
    return null;
  }

  return (
    <div className={styles.floating}>
      <div className={styles.anchor}>
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
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
            onClick={() => setVolumeOpen(v => !v)}
            aria-expanded={volumeOpen}
            aria-controls="global-volume-panel"
            title="Adjust volume"
            aria-label="Adjust volume"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>

          <div
            id="global-volume-panel"
            className={`${styles.volumePanel} ${volumeOpen ? styles.open : ''}`}
            aria-hidden={!volumeOpen}
          >
            <div className={styles.volumeHeader}>Volume</div>
            <div className={styles.volumeControls}>
              <input
                id="global-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={soundVolume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
                aria-label="Adjust volume"
              />
              <span className={styles.volumeValue}>{Math.round(soundVolume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
