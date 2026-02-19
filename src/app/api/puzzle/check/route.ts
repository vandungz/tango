// POST /api/puzzle/check
// Validates player's board against stored solution

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue } from '@/lib/engine/types';
import { findLogicErrors, isBoardComplete } from '@/lib/engine/validation';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { puzzleId, board } = body as { puzzleId: string; board: CellValue[][] };

        if (!puzzleId || !board) {
            return NextResponse.json({ error: 'Missing puzzleId or board' }, { status: 400 });
        }

        const puzzle = await prisma.puzzle.findUnique({
            where: { id: puzzleId },
        });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
        }

        const clues = JSON.parse(puzzle.clues) as { row: number; col: number; direction: 'h' | 'v'; type: '=' | 'x' }[];
        const errors = findLogicErrors(board, clues, board.length);
        const complete = errors.length === 0 && isBoardComplete(board);

        return NextResponse.json({
            correct: errors.length === 0,
            complete,
            errors,
        });
    } catch (error) {
        console.error('Check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
