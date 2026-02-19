// POST /api/puzzle/hint
// Returns the next easiest hint step for the current board state

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue } from '@/lib/engine/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { puzzleId, currentBoard } = body as {
            puzzleId: string;
            currentBoard: CellValue[][];
        };

        if (!puzzleId || !currentBoard) {
            return NextResponse.json({ error: 'Missing puzzleId or currentBoard' }, { status: 400 });
        }

        const puzzle = await prisma.puzzle.findUnique({
            where: { id: puzzleId },
        });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
        }

        const solution = JSON.parse(puzzle.solution) as CellValue[][];

        let hintCell: { row: number; col: number; value: CellValue } | null = null;

        for (let r = 0; r < solution.length; r++) {
            for (let c = 0; c < solution[r].length; c++) {
                const target = solution[r][c];
                const current = currentBoard[r]?.[c] ?? null;

                if (current !== target) {
                    hintCell = { row: r, col: c, value: target };
                    break;
                }
            }
            if (hintCell) break;
        }

        if (!hintCell) {
            return NextResponse.json({ hint: null, message: 'Board already matches solution' });
        }

        return NextResponse.json({
            hint: {
                row: hintCell.row,
                col: hintCell.col,
                value: hintCell.value,
                rule: 'Solution cell',
            },
        });
    } catch (error) {
        console.error('Hint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
