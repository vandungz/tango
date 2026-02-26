// POST /api/puzzle/check
// Validates player's board against stored solution

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue } from '@/lib/engine/types';
import { findLogicErrors, isBoardComplete } from '@/lib/engine/validation';
import { computeDailyStreak, startOfDayUtc, starsFromTime } from '@/lib/progression';

type Mode = 'daily' | 'journey' | 'classic';

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    dailyPuzzle: any;
    dailyResult: any;
    journeyLevel: any;
    journeyResult: any;
};

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

        if (complete && sessionId) {
            if (mode === 'daily') {
                const durationSeconds = Number(meta?.durationSeconds ?? 0);
                const stars = starsFromTime(durationSeconds);

                // locate daily puzzle by id/date/puzzleId
                const dailyId = typeof meta?.dailyId === 'string' ? meta?.dailyId : undefined;
                const date = meta?.dailyDate ? startOfDayUtc(new Date(String(meta.dailyDate))) : null;

                const daily = dailyId
                    ? await db.dailyPuzzle.findUnique({ where: { id: dailyId } })
                    : await db.dailyPuzzle.findFirst({ where: date ? { date } : { puzzleId } });

                if (daily) {
                    const existing = await db.dailyResult.findUnique({
                        where: { sessionId_dailyPuzzleId: { sessionId, dailyPuzzleId: daily.id } },
                    });

                    const bestTime = existing ? Math.min(existing.durationSeconds, durationSeconds) : durationSeconds;
                    const bestStars = Math.max(stars, existing?.stars ?? 0);

                    await db.dailyResult.upsert({
                        where: { sessionId_dailyPuzzleId: { sessionId, dailyPuzzleId: daily.id } },
                        update: { durationSeconds: bestTime, stars: bestStars },
                        create: {
                            sessionId,
                            dailyPuzzleId: daily.id,
                            durationSeconds: bestTime,
                            stars: bestStars,
                        },
                    });

                    const streak = await computeDailyStreak(sessionId);
                    extra.daily = { streak: streak.current, bestStreak: streak.best, stars: bestStars };
                }
            }

            if (mode === 'journey') {
                const durationSeconds = Number(meta?.durationSeconds ?? 0);
                const stars = starsFromTime(durationSeconds);
                const levelId = typeof meta?.levelId === 'string' ? meta.levelId : undefined;
                const levelOrder = Number.isFinite(meta?.level as number) ? Number(meta?.level) : undefined;

                const level = levelId
                    ? await db.journeyLevel.findUnique({ where: { id: levelId } })
                    : levelOrder
                        ? await db.journeyLevel.findUnique({ where: { order: levelOrder } })
                        : await db.journeyLevel.findFirst({ where: { puzzleId } });

                if (level) {
                    const existing = await db.journeyResult.findUnique({
                        where: { sessionId_levelId: { sessionId, levelId: level.id } },
                    });

                    const bestStars = Math.max(stars, existing?.stars ?? 0);
                    const bestTime = existing ? Math.min(existing.timeSeconds, durationSeconds) : durationSeconds;

                    await db.journeyResult.upsert({
                        where: { sessionId_levelId: { sessionId, levelId: level.id } },
                        update: { timeSeconds: bestTime, stars: bestStars },
                        create: {
                            sessionId,
                            levelId: level.id,
                            timeSeconds: bestTime,
                            stars: bestStars,
                        },
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
