import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePuzzle } from '@/lib/engine/puzzle-factory';
import { BoardSize } from '@/lib/engine/types';
import { computeDailyStreak, startOfDayUtc, starsFromTime } from '@/lib/progression';

const DAILY_SIZE: BoardSize = 6;
const MAX_GENERATION_ATTEMPTS = 6;

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    dailyPuzzle: any;
    dailyResult: any;
};

async function ensurePuzzle(size: BoardSize) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const puzzle = generatePuzzle(size);

        const existing = await db.puzzle.findUnique({ where: { hash: puzzle.hash } });
        const puzzleRecord = existing ?? await db.puzzle.create({
            data: {
                size: puzzle.size,
                hash: puzzle.hash,
                board: JSON.stringify(puzzle.board),
                solution: JSON.stringify(puzzle.solution),
                clues: JSON.stringify(puzzle.clues),
                difficulty: puzzle.difficulty,
                label: puzzle.label,
            },
        });

        return puzzleRecord;
    }

    throw new Error('Failed to generate a unique daily puzzle');
}

async function ensureDailyForDate(date: Date) {
    const day = startOfDayUtc(date);

    let daily = await db.dailyPuzzle.findUnique({ where: { date: day } });
    if (daily) return daily;

    const puzzle = await ensurePuzzle(DAILY_SIZE);

    daily = await db.dailyPuzzle.create({
        data: {
            date: day,
            puzzleId: puzzle.id,
        },
    });

    return daily;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || 'anonymous';
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    try {
        const daily = await ensureDailyForDate(targetDate);
        const puzzle = await db.puzzle.findUnique({ where: { id: daily.puzzleId } });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found for daily' }, { status: 404 });
        }

        const streak = await computeDailyStreak(sessionId, targetDate);
        const result = await db.dailyResult.findUnique({
            where: {
                sessionId_dailyPuzzleId: {
                    sessionId,
                    dailyPuzzleId: daily.id,
                },
            },
        });

        return NextResponse.json({
            dailyId: daily.id,
            date: daily.date.toISOString(),
            id: puzzle.id,
            size: puzzle.size,
            board: JSON.parse(puzzle.board),
            clues: JSON.parse(puzzle.clues),
            difficulty: puzzle.difficulty,
            label: puzzle.label,
            progress: {
                completed: Boolean(result),
                durationSeconds: result?.durationSeconds ?? null,
                stars: result?.stars ?? (result ? starsFromTime(result?.durationSeconds ?? 0) : null),
                streak: streak.current,
                bestStreak: streak.best,
            },
        });
    } catch (error) {
        console.error('Daily route error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
