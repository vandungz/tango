import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { journeyStarsFromTime } from '@/lib/journey-stars';
import { resolvePlayerIdentity } from '@/lib/player';
import { getActiveJourneySet } from '@/lib/journey-set';

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    journeyLevel: any;
    journeyResult: any;
};

export async function GET(request: NextRequest, context: { params: Promise<{ level: string }> }) {
    const url = new URL(request.url);
    const { searchParams } = url;
    const player = await resolvePlayerIdentity(searchParams.get('sessionId'));

    const params = await context.params;

    // Turbopack sometimes drops params in dev; fall back to parsing from the path to avoid NaN.
    const levelSegment = params?.level ?? url.pathname.split('/').filter(Boolean).pop();
    const levelNumber = Number.parseInt(levelSegment ?? '', 10);

    if (!player) {
        return NextResponse.json({ error: 'Authentication or sessionId is required' }, { status: 401 });
    }

    const activeSet = await getActiveJourneySet();
    if (!activeSet) {
        return NextResponse.json({ error: 'No active Journey set. Run rebuild first.' }, { status: 404 });
    }

    if (!Number.isFinite(levelNumber) || levelNumber < 1 || levelNumber > activeSet.totalLevels) {
        console.error('Invalid journey level request', { levelSegment, levelNumber, pathname: url.pathname });
        return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }

    try {
        const level = await db.journeyLevel.findUnique({
            where: {
                setId_order: {
                    setId: activeSet.id,
                    order: levelNumber,
                },
            },
        });

        if (!level) {
            return NextResponse.json({ error: 'Journey level not found in active set' }, { status: 404 });
        }

        const puzzle = await db.puzzle.findUnique({ where: { id: level.puzzleId } });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found for level' }, { status: 404 });
        }

        const bestWhere = player.userId
            ? { userId_levelId: { userId: player.userId, levelId: level.id } }
            : { sessionId_levelId: { sessionId: player.sessionId, levelId: level.id } };

        const best = await db.journeyResult.findUnique({
            where: bestWhere,
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
                starsFromTime: journeyStarsFromTime(best?.timeSeconds ?? null, puzzle.difficulty, puzzle.label),
            },
        });
    } catch (error) {
        console.error('Journey level error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
