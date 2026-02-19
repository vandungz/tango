// GET /api/puzzle?size=6&sessionId=xxx
// Serves an unplayed puzzle for the given session, or generates a new one

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePuzzle } from '@/lib/engine/puzzle-factory';
import { BoardSize } from '@/lib/engine/types';

const VALID_SIZES: BoardSize[] = [4, 6, 8, 10];
const MAX_GENERATION_ATTEMPTS = 5;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sizeParam = parseInt(searchParams.get('size') || '6', 10);
    const sessionId = searchParams.get('sessionId') || 'anonymous';

    if (!VALID_SIZES.includes(sizeParam as BoardSize)) {
        return NextResponse.json({ error: 'Invalid board size' }, { status: 400 });
    }

    const size = sizeParam as BoardSize;

    try {
        // 1. Try to find an unplayed puzzle for this session
        const unplayed = await prisma.puzzle.findFirst({
            where: {
                size,
                NOT: {
                    playedBy: {
                        some: { sessionId },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        if (unplayed) {
            // Mark as played
            await prisma.playedPuzzle.create({
                data: {
                    sessionId,
                    puzzleId: unplayed.id,
                },
            });

            return NextResponse.json({
                id: unplayed.id,
                size: unplayed.size,
                board: JSON.parse(unplayed.board),
                clues: JSON.parse(unplayed.clues),
                difficulty: unplayed.difficulty,
                label: unplayed.label,
            });
        }

        // 2. Generate a new puzzle
        for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
            const puzzle = generatePuzzle(size);

            // Check for duplicate
            const existing = await prisma.puzzle.findUnique({
                where: { hash: puzzle.hash },
            });

            if (existing) continue; // duplicate, try again

            // Store in DB
            const stored = await prisma.puzzle.create({
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

            // Mark as played
            await prisma.playedPuzzle.create({
                data: {
                    sessionId,
                    puzzleId: stored.id,
                },
            });

            return NextResponse.json({
                id: stored.id,
                size: stored.size,
                board: JSON.parse(stored.board),
                clues: JSON.parse(stored.clues),
                difficulty: stored.difficulty,
                label: stored.label,
            });
        }

        return NextResponse.json(
            { error: 'Failed to generate unique puzzle' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Failed to get puzzle:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
