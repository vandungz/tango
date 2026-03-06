'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import { useToast } from '@/components/feedback/ToastProvider';

type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Very Hard';

interface StatsBucket {
    size: number;
    overall: number | null;
    byDifficulty: Record<Difficulty, number | null>;
}

interface StatisticsResponse {
    puzzlesSolved: number;
    dailyStreak: number;
    bestDailyStreak: number;
    sizes: number[];
    difficulties: Difficulty[];
    bestTimesBySize: StatsBucket[];
}

function formatDuration(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    if (remain === 0) return `${minutes}m`;
    return `${minutes}m ${remain}s`;
}

export default function StatisticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const toast = useToast();

    const [stats, setStats] = useState<StatisticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<number>(6);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/statistics');
        }
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;

        let cancelled = false;

        async function loadStats() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/statistics', { cache: 'no-store' });
                const data = (await response.json()) as StatisticsResponse | { error?: string };

                if (!response.ok) {
                    throw new Error((data as { error?: string }).error || 'Failed to load statistics');
                }

                if (cancelled) return;

                const typed = data as StatisticsResponse;
                setStats(typed);

                const firstWithData = typed.bestTimesBySize.find((bucket) => bucket.overall !== null)?.size;
                const preferred = firstWithData ?? (typed.sizes.includes(6) ? 6 : typed.sizes[0]);
                if (preferred) setSelectedSize(preferred);
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Failed to load statistics';
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadStats();

        return () => {
            cancelled = true;
        };
    }, [status, toast]);

    const selectedBucket = useMemo(() => {
        if (!stats) return null;
        return stats.bestTimesBySize.find((item) => item.size === selectedSize) ?? null;
    }, [stats, selectedSize]);

    if (status === 'loading' || loading) {
        return (
            <main className={styles.page}>
                <div className={styles.panel}>Loading statistics...</div>
            </main>
        );
    }

    if (!session?.user) {
        return null;
    }

    if (error || !stats || !selectedBucket) {
        return (
            <main className={styles.page}>
                <section className={styles.panel}>
                    <h1 className={styles.title}>Statistics</h1>
                    <p className={styles.subtitle}>Could not load your statistics.</p>
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
                        <h1 className={styles.title}>Statistics</h1>
                        <p className={styles.subtitle}>Personal progress for {session.user.username || session.user.email}</p>
                    </div>
                    <Link href="/" className={styles.backLink}>
                        ← Back
                    </Link>
                </div>

                <div className={styles.summaryGrid}>
                    <article className={styles.summaryCard}>
                        <p className={styles.summaryLabel}>Puzzles solved</p>
                        <p className={styles.summaryValue}>{stats.puzzlesSolved}</p>
                    </article>
                    <article className={styles.summaryCard}>
                        <p className={styles.summaryLabel}>Daily streak</p>
                        <p className={styles.summaryValue}>{stats.dailyStreak}</p>
                        <p className={styles.summarySub}>Best: {stats.bestDailyStreak}</p>
                    </article>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Best times</h2>
                    <div className={styles.sizeTabs}>
                        {stats.sizes.map((size) => (
                            <button
                                key={size}
                                type="button"
                                className={`${styles.sizeTab} ${selectedSize === size ? styles.sizeTabActive : ''}`}
                                onClick={() => setSelectedSize(size)}
                            >
                                {size}×{size}
                            </button>
                        ))}
                    </div>

                    <div className={styles.timesList}>
                        <div className={styles.timeRow}>
                            <span>Best (overall)</span>
                            <strong>{formatDuration(selectedBucket.overall)}</strong>
                        </div>
                        <div className={`${styles.timeRow} ${styles.easy}`}>
                            <span>Easy</span>
                            <strong>{formatDuration(selectedBucket.byDifficulty.Easy)}</strong>
                        </div>
                        <div className={`${styles.timeRow} ${styles.medium}`}>
                            <span>Medium</span>
                            <strong>{formatDuration(selectedBucket.byDifficulty.Medium)}</strong>
                        </div>
                        <div className={`${styles.timeRow} ${styles.hard}`}>
                            <span>Hard</span>
                            <strong>{formatDuration(selectedBucket.byDifficulty.Hard)}</strong>
                        </div>
                        <div className={`${styles.timeRow} ${styles.veryHard}`}>
                            <span>Very Hard</span>
                            <strong>{formatDuration(selectedBucket.byDifficulty['Very Hard'])}</strong>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
