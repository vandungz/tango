import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeDailyStreak } from '@/lib/progression';
import { resolvePlayerIdentity } from '@/lib/player';

const SUPPORTED_SIZES = [4, 6, 8, 10] as const;
const SUPPORTED_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Very Hard'] as const;

type SupportedDifficulty = (typeof SUPPORTED_DIFFICULTIES)[number];

type BestTimesBySize = {
    size: number;
    overall: number | null;
    byDifficulty: Record<SupportedDifficulty, number | null>;
};

const db = prisma as unknown as {
    dailyResult: {
        findMany: (args: unknown) => Promise<Array<{
            durationSeconds: number;
            daily: { puzzle: { size: number; label: string } | null } | null;
        }>>;
    };
    journeyResult: {
        findMany: (args: unknown) => Promise<Array<{
            timeSeconds: number;
            level: { puzzle: { size: number; label: string } | null } | null;
        }>>;
    };
};

function normalizeDifficulty(label: string | null | undefined): SupportedDifficulty | null {
    if (!label) return null;
    const normalized = label.trim().toLowerCase();

    if (normalized === 'easy') return 'Easy';
    if (normalized === 'medium') return 'Medium';
    if (normalized === 'hard') return 'Hard';
    if (normalized === 'very hard' || normalized === 'veryhard') return 'Very Hard';

    return null;
}

function applyBestTime(target: BestTimesBySize, difficulty: SupportedDifficulty | null, seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;

    target.overall = target.overall === null ? seconds : Math.min(target.overall, seconds);

    if (!difficulty) return;
    const current = target.byDifficulty[difficulty];
    target.byDifficulty[difficulty] = current === null ? seconds : Math.min(current, seconds);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const player = await resolvePlayerIdentity(searchParams.get('sessionId'));

    if (!player) {
        return NextResponse.json({ error: 'Authentication or sessionId is required' }, { status: 401 });
    }

    const where = player.userId ? { userId: player.userId } : { sessionId: player.sessionId };

    try {
        const [dailyResults, journeyResults, streak] = await Promise.all([
            db.dailyResult.findMany({
                where,
                select: {
                    durationSeconds: true,
                    daily: {
                        select: {
                            puzzle: {
                                select: {
                                    size: true,
                                    label: true,
                                },
                            },
                        },
                    },
                },
            }),
            db.journeyResult.findMany({
                where,
                select: {
                    timeSeconds: true,
                    level: {
                        select: {
                            puzzle: {
                                select: {
                                    size: true,
                                    label: true,
                                },
                            },
                        },
                    },
                },
            }),
            computeDailyStreak(player),
        ]);

        const bestTimeMap = new Map<number, BestTimesBySize>(
            SUPPORTED_SIZES.map((size) => [
                size,
                {
                    size,
                    overall: null,
                    byDifficulty: {
                        Easy: null,
                        Medium: null,
                        Hard: null,
                        'Very Hard': null,
                    },
                },
            ]),
        );

        for (const row of dailyResults) {
            const puzzle = row.daily?.puzzle;
            if (!puzzle) continue;
            const sizeBucket = bestTimeMap.get(puzzle.size);
            if (!sizeBucket) continue;

            const difficulty = normalizeDifficulty(puzzle.label);
            applyBestTime(sizeBucket, difficulty, row.durationSeconds);
        }

        for (const row of journeyResults) {
            const puzzle = row.level?.puzzle;
            if (!puzzle) continue;
            const sizeBucket = bestTimeMap.get(puzzle.size);
            if (!sizeBucket) continue;

            const difficulty = normalizeDifficulty(puzzle.label);
            applyBestTime(sizeBucket, difficulty, row.timeSeconds);
        }

        return NextResponse.json({
            puzzlesSolved: dailyResults.length + journeyResults.length,
            dailyStreak: streak.current,
            bestDailyStreak: streak.best,
            sizes: SUPPORTED_SIZES,
            difficulties: SUPPORTED_DIFFICULTIES,
            bestTimesBySize: Array.from(bestTimeMap.values()),
        });
    } catch (error) {
        console.error('Statistics route error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
