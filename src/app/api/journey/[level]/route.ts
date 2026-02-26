import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePuzzle } from '@/lib/engine/puzzle-factory';
import { BoardSize } from '@/lib/engine/types';
import { starsFromTime } from '@/lib/progression';

const TOTAL_LEVELS = 200;
const JOURNEY_SIZE: BoardSize = 6;
const MAX_GENERATION_ATTEMPTS = 10;

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    journeyLevel: any;
    journeyResult: any;
};

async function ensureVeryHardPuzzle(size: BoardSize) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const puzzle = generatePuzzle(size);
        if (puzzle.label !== 'Very Hard') continue;

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

    throw new Error('Failed to generate very hard journey puzzle');
}

async function ensureJourneyLevel(order: number) {
    let level = await db.journeyLevel.findUnique({ where: { order } });
    if (level) return level;

    const puzzle = await ensureVeryHardPuzzle(JOURNEY_SIZE);

    level = await db.journeyLevel.create({
        data: {
            order,
            puzzleId: puzzle.id,
        },
    });

    return level;
}

export async function GET(request: NextRequest, { params }: { params: { level: string } }) {
    const url = new URL(request.url);
    const { searchParams } = url;
    const sessionId = searchParams.get('sessionId');

    // Turbopack sometimes drops params in dev; fall back to parsing from the path to avoid NaN.
    const levelSegment = params?.level ?? url.pathname.split('/').filter(Boolean).pop();
    const levelNumber = Number.parseInt(levelSegment ?? '', 10);

    if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!Number.isFinite(levelNumber) || levelNumber < 1 || levelNumber > TOTAL_LEVELS) {
        console.error('Invalid journey level request', { levelSegment, levelNumber, pathname: url.pathname });
        return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

    try {
        const level = await ensureJourneyLevel(levelNumber);
        const puzzle = await db.puzzle.findUnique({ where: { id: level.puzzleId } });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found for level' }, { status: 404 });
        }

        const best = await db.journeyResult.findUnique({
            where: {
                sessionId_levelId: {
                    sessionId,
                    levelId: level.id,
                },
            },
        });

        return NextResponse.json({
            level: level.order,
            levelId: level.id,
            id: puzzle.id,
            size: puzzle.size,
            board: JSON.parse(puzzle.board),
            clues: JSON.parse(puzzle.clues),
            difficulty: puzzle.difficulty,
            label: puzzle.label,
            progress: {
                stars: best?.stars ?? 0,
                timeSeconds: best?.timeSeconds ?? null,
                starsFromTime: starsFromTime(best?.timeSeconds ?? null),
            },
        });
    } catch (error) {
        console.error('Journey level error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
