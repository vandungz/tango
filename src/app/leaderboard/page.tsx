'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { getSessionId } from '@/lib/storage';
import { useToast } from '@/components/feedback/ToastProvider';

type Mode = 'daily';
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Very Hard';

interface LeaderboardEntry {
    rank: number;
    displayName: string;
    avatarInitial: string;
    bestSeconds: number;
    solvedCount: number;
    isViewer: boolean;
}

interface LeaderboardResponse {
    mode: Mode;
    size: number | null;
    difficulty: Difficulty | null;
    totalParticipants: number;
    filters: {
        modes: Mode[];
        sizes: number[];
        difficulties: Difficulty[];
    };
    leaderboard: LeaderboardEntry[];
    viewer: {
        rank: number;
        displayName: string;
        avatarInitial: string;
        bestSeconds: number;
        solvedCount: number;
    } | null;
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    if (remain === 0) return `${minutes}m`;
    return `${minutes}m ${remain}s`;
}

export default function LeaderboardPage() {
    const toast = useToast();
    const [size, setSize] = useState<number | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadLeaderboard() {
            setLoading(true);
            setError(null);

            try {
                const sessionId = getSessionId();
                const params = new URLSearchParams();
                params.set('mode', 'daily');
                params.set('sessionId', sessionId);
                if (size) params.set('size', String(size));
                if (difficulty) params.set('difficulty', difficulty);

                const response = await fetch(`/api/leaderboard?${params.toString()}`, { cache: 'no-store' });
                const payload = (await response.json()) as LeaderboardResponse | { error?: string };

                if (!response.ok) {
                    throw new Error((payload as { error?: string }).error || 'Failed to load leaderboard');
                }

                if (cancelled) return;

                const typed = payload as LeaderboardResponse;
                setData(typed);

                if (size === null && typed.filters.sizes.length > 0) {
                    setSize(typed.filters.sizes.includes(6) ? 6 : typed.filters.sizes[0]);
                } else if (size !== null && !typed.filters.sizes.includes(size)) {
                    setSize(typed.filters.sizes[0] ?? null);
                }

                if (difficulty === null && typed.filters.difficulties.length > 0) {
                    setDifficulty(typed.filters.difficulties[0]);
                } else if (difficulty !== null && !typed.filters.difficulties.includes(difficulty)) {
                    setDifficulty(typed.filters.difficulties[0] ?? null);
                }
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadLeaderboard();

        return () => {
            cancelled = true;
        };
    }, [size, difficulty, toast]);

    const viewerOutsideTop = useMemo(() => {
        if (!data?.viewer) return null;
        const existsInTop = data.leaderboard.some((entry) => entry.rank === data.viewer?.rank);
        return existsInTop ? null : data.viewer;
    }, [data]);

    const podiumEntries = useMemo(() => {
        if (!data?.leaderboard?.length) return [];
        const top = data.leaderboard.slice(0, 3);
        const order = [2, 1, 3];
        return order
            .map((rank) => top.find((entry) => entry.rank === rank))
            .filter((entry): entry is LeaderboardEntry => Boolean(entry));
    }, [data]);

    const listEntries = useMemo(() => {
        if (!data?.leaderboard?.length) return [];
        return data.leaderboard.slice(3);
    }, [data]);

    if (loading) {
        return (
            <main className={styles.page}>
                <section className={styles.panel}>Loading leaderboard...</section>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className={styles.page}>
                <section className={styles.panel}>
                    <h1 className={styles.title}>Leaderboard</h1>
                    <p className={styles.subtitle}>Could not load leaderboard.</p>
                    <Link href="/" className={styles.backLink}>
                        Back to home
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <section className={styles.panel}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.title}>Daily Leaderboard</h1>
                        <p className={styles.subtitle}>Rankings by puzzle type, size and difficulty</p>
                    </div>
                    <Link href="/" className={styles.backLink}>
                        ← Back
                    </Link>
                </div>

                <div className={styles.filters}>
                    <div className={styles.filterGroup}>
                        {data.filters.sizes.map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`${styles.filterBtn} ${size === item ? styles.filterBtnActive : ''}`}
                                onClick={() => setSize(item)}
                            >
                                {item}×{item}
                            </button>
                        ))}
                    </div>

                    <div className={styles.filterGroup}>
                        {data.filters.difficulties.map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`${styles.filterBtn} ${difficulty === item ? styles.filterBtnActive : ''}`}
                                onClick={() => setDifficulty(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.metaLine}>Total players: {data.totalParticipants}</div>

                {podiumEntries.length > 0 && (
                    <section className={styles.podium} aria-label="Top players">
                        {podiumEntries.map((entry) => (
                            <article
                                key={`podium-${entry.rank}-${entry.displayName}`}
                                className={`${styles.podiumCard} ${entry.rank === 1 ? styles.podiumFirst : ''} ${entry.isViewer ? styles.podiumViewer : ''}`}
                            >
                                <span className={styles.podiumRank}>{entry.rank}</span>
                                <div className={styles.podiumAvatar}>{entry.avatarInitial}</div>
                                <p className={styles.podiumName}>{entry.isViewer ? `You · ${entry.displayName}` : entry.displayName}</p>
                                <p className={styles.podiumMeta}>{formatDuration(entry.bestSeconds)}</p>
                            </article>
                        ))}
                    </section>
                )}

                <div className={styles.list}>
                    {data.leaderboard.length === 0 ? (
                        <div className={styles.emptyState}>No records yet for this filter.</div>
                    ) : (
                        listEntries.map((entry) => (
                            <article
                                key={`${entry.rank}-${entry.displayName}`}
                                className={`${styles.row} ${entry.isViewer ? styles.rowViewer : ''}`}
                            >
                                <div className={styles.indexCol}>{entry.rank}</div>

                                <div className={styles.profileCol}>
                                    <div className={styles.avatar}>{entry.avatarInitial}</div>
                                    <div>
                                        <p className={styles.name}>{entry.isViewer ? `You · ${entry.displayName}` : entry.displayName}</p>
                                        <p className={styles.detail}>Solved in {formatDuration(entry.bestSeconds)}</p>
                                    </div>
                                </div>

                                <div className={styles.rankCol}>
                                    <span className={styles.scoreBadge}>{formatDuration(entry.bestSeconds)}</span>
                                </div>
                            </article>
                        ))
                    )}
                </div>

                {viewerOutsideTop && (
                    <article className={`${styles.row} ${styles.rowViewer}`}>
                        <div className={styles.profileCol}>
                            <div className={styles.avatar}>{viewerOutsideTop.avatarInitial}</div>
                            <div>
                                <p className={styles.name}>You · {viewerOutsideTop.displayName}</p>
                                <p className={styles.detail}>Solved in {formatDuration(viewerOutsideTop.bestSeconds)}</p>
                            </div>
                        </div>

                        <div className={styles.rankCol}>
                            <span className={styles.rankBadge}>{viewerOutsideTop.rank}</span>
                        </div>
                    </article>
                )}
            </section>
        </main>
    );
}