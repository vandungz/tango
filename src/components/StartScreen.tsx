'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './StartScreen.module.css';

interface StartScreenProps {
    onDaily: () => void;
    onJourney: () => void;
    journeyNextLevel: number;
    journeyTotalLevels: number;
    boardSize: number;
}

export default function StartScreen({ onDaily, onJourney, journeyNextLevel, journeyTotalLevels, boardSize }: StartScreenProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileClick = () => {
        if (status === 'loading') return;
        
        if (session?.user) {
            setShowProfileMenu(!showProfileMenu);
        } else {
            router.push('/auth/login');
        }
    };

    const handleLogout = async () => {
        setShowProfileMenu(false);
        await signOut({ redirect: false });
    };

    return (
        <div className={styles.shell}>
            <div className={styles.logoBadge}>
                <span className={styles.logoIcon}>◐</span>
            </div>
            <div className={styles.heading}>
                <div className={styles.titleLine}>
                    <h1 className={styles.brand}>Tango</h1>
                </div>
                <p className={styles.subtitle}>
                    Fill the grid with <span className={styles.dotSun} aria-label="sun token" /> and <span className={styles.dotMoon} aria-label="moon token" /> using only logic!
                </p>
            </div>
            <div className={styles.ctas}>
                <button className={`${styles.cta} ${styles.daily}`} onClick={onDaily}>
                    <span className={styles.ctaLabel}>Daily</span>
                    <span className={styles.ctaBadge}>{boardSize}x{boardSize}</span>
                </button>
                <button className={`${styles.cta} ${styles.journey}`} onClick={onJourney}>
                    <span className={styles.ctaLabel}>Journey</span>
                    <span className={styles.ctaBadge}>Level {journeyNextLevel}/{journeyTotalLevels}</span>
                </button>
            </div>
            <div className={styles.metaRow}>
                <button className={styles.metaBtn} aria-label="Statistics">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                </button>
                <button className={styles.metaBtn} aria-label="Achievements">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15 8.5 22 9.3 17 14.1 18.3 21 12 17.7 5.7 21 7 14.1 2 9.3 9 8.5 12 2" />
                    </svg>
                </button>
                <div className={styles.profileWrapper} ref={menuRef}>
                    <button 
                        className={`${styles.metaBtn} ${session?.user ? styles.metaBtnActive : ''}`} 
                        aria-label="Profile"
                        onClick={handleProfileClick}
                    >
                        {session?.user ? (
                            <span className={styles.avatarInitial}>
                                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c1.3-3 4.2-5 8-5s6.7 2 8 5" />
                            </svg>
                        )}
                    </button>
                    {showProfileMenu && session?.user && (
                        <div className={styles.profileMenu}>
                            <div className={styles.profileInfo}>
                                <span className={styles.profileName}>{session.user.name || 'User'}</span>
                                <span className={styles.profileEmail}>{session.user.email}</span>
                            </div>
                            <div className={styles.profileDivider} />
                            <button className={styles.profileMenuItem} onClick={() => router.push('/profile')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c1.3-3 4.2-5 8-5s6.7 2 8 5" />
                                </svg>
                                Hồ sơ
                            </button>
                            <button className={styles.profileMenuItem} onClick={handleLogout}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
