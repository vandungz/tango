// POST /api/puzzle/check
// Validates player's board against stored solution

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue } from '@/engine/types';
import { findLogicErrors, isBoardComplete } from '@/engine/validation';
import { journeyStarsFromTime } from '@/lib/journey-stars';
import { computeDailyStreak, startOfDayUtc, starsFromTime } from '@/lib/progression';
import { resolvePlayerIdentity } from '@/lib/player';
import { getActiveJourneySet } from '@/lib/journey-set';

type Mode = 'daily' | 'journey' | 'classic';

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    dailyPuzzle: any;
    dailyResult: any;
    journeySet: any;
    journeyLevel: any;
    journeyResult: any;
};

const FALLBACK_DURATION_SECONDS = 999_999; // avoids zero-duration runs from earning max stars

function normalizeDuration(raw: unknown) {
    const parsed = Number(raw);
    const isValid = Number.isFinite(parsed) && parsed > 0;
    return {
        durationSeconds: isValid ? Math.round(parsed) : FALLBACK_DURATION_SECONDS,
        hasDuration: isValid,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { puzzleId, board, mode = 'classic', sessionId, meta } = body as {
            puzzleId: string;
            board: CellValue[][];
            mode?: Mode;
            sessionId?: string;
            meta?: Record<string, unknown>;
        };
        const player = await resolvePlayerIdentity(sessionId);

        if (!puzzleId || !board) {
            return NextResponse.json({ error: 'Missing puzzleId or board' }, { status: 400 });
        }

        const puzzle = await db.puzzle.findUnique({
            where: { id: puzzleId },
        });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
        }

        const clues = JSON.parse(puzzle.clues) as { row: number; col: number; direction: 'h' | 'v'; type: '=' | 'x' }[];
        const errors = findLogicErrors(board, clues, board.length);
        const complete = errors.length === 0 && isBoardComplete(board);

        const extra: Record<string, unknown> = {};

        if (complete && player) {
            if (mode === 'daily') {
                const { durationSeconds, hasDuration } = normalizeDuration(meta?.durationSeconds);
                const stars = hasDuration ? starsFromTime(durationSeconds) : 0;

                // locate daily puzzle by id/date/puzzleId
                const dailyId = typeof meta?.dailyId === 'string' ? meta?.dailyId : undefined;
                const date = meta?.dailyDate ? startOfDayUtc(new Date(String(meta.dailyDate))) : null;

                const daily = dailyId
                    ? await db.dailyPuzzle.findUnique({ where: { id: dailyId } })
                    : await db.dailyPuzzle.findFirst({ where: date ? { date } : { puzzleId } });

                if (daily) {
                    const identityWhere = player.userId
                        ? { userId: player.userId }
                        : { sessionId: player.sessionId };

                    const existing = await db.dailyResult.findFirst({
                        where: {
                            ...identityWhere,
                            daily: {
                                date: daily.date,
                                size: daily.size,
                            },
                        },
                        include: { daily: true },
                        orderBy: { completedAt: 'asc' },
                    });

                    let savedTime = durationSeconds;
                    let savedStars = stars;

                    if (!existing) {
                        const createData = player.userId
                            ? {
                                userId: player.userId,
                                dailyPuzzleId: daily.id,
                                durationSeconds,
                                stars,
                            }
                            : {
                                sessionId: player.sessionId,
                                dailyPuzzleId: daily.id,
                                durationSeconds,
                                stars,
                            };

                        await db.dailyResult.create({ data: createData });
                    } else {
                        savedTime = existing.durationSeconds;
                        savedStars = Number.isFinite(existing.stars) ? existing.stars : starsFromTime(existing.durationSeconds);
                    }

                    const streak = await computeDailyStreak(player);
                    extra.daily = { streak: streak.current, bestStreak: streak.best, stars: savedStars, durationSeconds: savedTime };
                }
            }

            if (mode === 'journey') {
                const { durationSeconds, hasDuration } = normalizeDuration(meta?.durationSeconds);
                const stars = hasDuration ? journeyStarsFromTime(durationSeconds, puzzle.difficulty, puzzle.label) : 0;
                const levelId = typeof meta?.levelId === 'string' ? meta.levelId : undefined;
                const levelOrder = Number.isFinite(meta?.level as number) ? Number(meta?.level) : undefined;
                const activeSet = await getActiveJourneySet();

                if (!activeSet) {
                    return NextResponse.json({ error: 'No active Journey set' }, { status: 404 });
                }

                const level = levelId
                    ? await db.journeyLevel.findFirst({ where: { id: levelId, setId: activeSet.id } })
                    : levelOrder
                        ? await db.journeyLevel.findUnique({ where: { setId_order: { setId: activeSet.id, order: levelOrder } } })
                        : await db.journeyLevel.findFirst({ where: { puzzleId, setId: activeSet.id } });

                if (level) {
                    const existingWhere = player.userId
                        ? { userId_levelId: { userId: player.userId, levelId: level.id } }
                        : { sessionId_levelId: { sessionId: player.sessionId, levelId: level.id } };

                    const existing = await db.journeyResult.findUnique({ where: existingWhere });

                    const validExistingTime = existing && existing.timeSeconds > 0 ? existing.timeSeconds : null;
                    const bestTime = validExistingTime ? Math.min(validExistingTime, durationSeconds) : durationSeconds;
                    const baselineStars = validExistingTime ? journeyStarsFromTime(validExistingTime, puzzle.difficulty, puzzle.label) : 0;
                    const bestStars = Math.max(stars, baselineStars);

                    const createData = player.userId
                        ? {
                            userId: player.userId,
                            levelId: level.id,
                            timeSeconds: bestTime,
                            stars: bestStars,
                        }
                        : {
                            sessionId: player.sessionId,
                            levelId: level.id,
                            timeSeconds: bestTime,
                            stars: bestStars,
                        };

                    await db.journeyResult.upsert({
                        where: existingWhere,
                        update: { timeSeconds: bestTime, stars: bestStars },
                        create: createData,
                    });

                    extra.journey = {
                        level: level.order,
                        stars: bestStars,
                        timeSeconds: bestTime,
                    };
                }
            }
        }

        return NextResponse.json({
            correct: errors.length === 0,
            complete,
            errors,
            ...extra,
        });
    } catch (error) {
        console.error('Check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
