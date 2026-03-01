// POST /api/puzzle/check
// Validates player's board against stored solution

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue } from '@/lib/engine/types';
import { findLogicErrors, isBoardComplete } from '@/lib/engine/validation';
import { computeDailyStreak, startOfDayUtc, starsFromTime } from '@/lib/progression';
import { resolvePlayerIdentity } from '@/lib/player';

type Mode = 'daily' | 'journey' | 'classic';

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    dailyPuzzle: any;
    dailyResult: any;
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
                    const existingWhere = player.userId
                        ? { userId_dailyPuzzleId: { userId: player.userId, dailyPuzzleId: daily.id } }
                        : { sessionId_dailyPuzzleId: { sessionId: player.sessionId, dailyPuzzleId: daily.id } };

                    const existing = await db.dailyResult.findUnique({ where: existingWhere });

                    const validExistingTime = existing && existing.durationSeconds > 0 ? existing.durationSeconds : null;
                    const bestTime = validExistingTime ? Math.min(validExistingTime, durationSeconds) : durationSeconds;
                    const baselineStars = validExistingTime ? starsFromTime(validExistingTime) : 0;
                    const bestStars = Math.max(stars, baselineStars);

                    const createData = player.userId
                        ? {
                            userId: player.userId,
                            dailyPuzzleId: daily.id,
                            durationSeconds: bestTime,
                            stars: bestStars,
                        }
                        : {
                            sessionId: player.sessionId,
                            dailyPuzzleId: daily.id,
                            durationSeconds: bestTime,
                            stars: bestStars,
                        };

                    await db.dailyResult.upsert({
                        where: existingWhere,
                        update: { durationSeconds: bestTime, stars: bestStars },
                        create: createData,
                    });

                    const streak = await computeDailyStreak(player);
                    extra.daily = { streak: streak.current, bestStreak: streak.best, stars: bestStars };
                }
            }

            if (mode === 'journey') {
                const { durationSeconds, hasDuration } = normalizeDuration(meta?.durationSeconds);
                const stars = hasDuration ? starsFromTime(durationSeconds) : 0;
                const levelId = typeof meta?.levelId === 'string' ? meta.levelId : undefined;
                const levelOrder = Number.isFinite(meta?.level as number) ? Number(meta?.level) : undefined;

                const level = levelId
                    ? await db.journeyLevel.findUnique({ where: { id: levelId } })
                    : levelOrder
                        ? await db.journeyLevel.findUnique({ where: { order: levelOrder } })
                        : await db.journeyLevel.findFirst({ where: { puzzleId } });

                if (level) {
                    const existingWhere = player.userId
                        ? { userId_levelId: { userId: player.userId, levelId: level.id } }
                        : { sessionId_levelId: { sessionId: player.sessionId, levelId: level.id } };

                    const existing = await db.journeyResult.findUnique({ where: existingWhere });

                    const validExistingTime = existing && existing.timeSeconds > 0 ? existing.timeSeconds : null;
                    const bestTime = validExistingTime ? Math.min(validExistingTime, durationSeconds) : durationSeconds;
                    const baselineStars = validExistingTime ? starsFromTime(validExistingTime) : 0;
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
