// POST /api/puzzle/hint
// Returns the next easiest hint step for the current board state

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue, Clue } from '@/engine/types';

interface HintCandidate {
    row: number;
    col: number;
    value: CellValue;
    score: number;
}

function getClueCells(clue: Clue): [{ row: number; col: number }, { row: number; col: number }] {
    if (clue.direction === 'h') {
        return [
            { row: clue.row, col: clue.col },
            { row: clue.row, col: clue.col + 1 },
        ];
    }

    return [
        { row: clue.row, col: clue.col },
        { row: clue.row + 1, col: clue.col },
    ];
}

function selectSmartHintCell(currentBoard: CellValue[][], solution: CellValue[][], clues: Clue[]): HintCandidate | null {
    const size = solution.length;

    const rowFilledCounts = Array.from({ length: size }, (_, row) => (
        currentBoard[row]?.reduce((count, cell) => count + (cell ? 1 : 0), 0) ?? 0
    ));

    const colFilledCounts = Array.from({ length: size }, (_, col) => {
        let count = 0;
        for (let row = 0; row < size; row++) {
            if (currentBoard[row]?.[col]) count += 1;
        }
        return count;
    });

    const cluePressureByCell = new Map<string, number>();

    for (const clue of clues) {
        const [first, second] = getClueCells(clue);
        const firstCurrent = currentBoard[first.row]?.[first.col] ?? null;
        const secondCurrent = currentBoard[second.row]?.[second.col] ?? null;
        const firstTarget = solution[first.row]?.[first.col] ?? null;
        const secondTarget = solution[second.row]?.[second.col] ?? null;

        const unresolved = firstCurrent !== firstTarget || secondCurrent !== secondTarget;
        if (!unresolved) continue;

        const firstKey = `${first.row}:${first.col}`;
        const secondKey = `${second.row}:${second.col}`;
        cluePressureByCell.set(firstKey, (cluePressureByCell.get(firstKey) ?? 0) + 1);
        cluePressureByCell.set(secondKey, (cluePressureByCell.get(secondKey) ?? 0) + 1);
    }

    const candidates: HintCandidate[] = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const target = solution[row]?.[col] ?? null;
            const current = currentBoard[row]?.[col] ?? null;

            if (!target || current === target) continue;

            const isWrongFilled = current !== null && current !== target;
            const rowCompletion = rowFilledCounts[row] / size;
            const colCompletion = colFilledCounts[col] / size;
            const cluePressure = cluePressureByCell.get(`${row}:${col}`) ?? 0;

            let nearbyMismatch = 0;
            if (row > 0 && currentBoard[row - 1]?.[col] !== solution[row - 1]?.[col]) nearbyMismatch += 1;
            if (row < size - 1 && currentBoard[row + 1]?.[col] !== solution[row + 1]?.[col]) nearbyMismatch += 1;
            if (col > 0 && currentBoard[row]?.[col - 1] !== solution[row]?.[col - 1]) nearbyMismatch += 1;
            if (col < size - 1 && currentBoard[row]?.[col + 1] !== solution[row]?.[col + 1]) nearbyMismatch += 1;

            const score =
                (isWrongFilled ? 5 : 2) +
                (rowCompletion + colCompletion) * 2 +
                cluePressure * 1.5 +
                nearbyMismatch * 0.6 +
                Math.random() * 1.25;

            candidates.push({ row, col, value: target, score });
        }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    const poolSize = Math.min(Math.max(4, Math.ceil(candidates.length * 0.5)), candidates.length);
    const topPool = candidates.slice(0, poolSize);

    const totalWeight = topPool.reduce((sum, candidate) => sum + candidate.score, 0);
    if (totalWeight <= 0) {
        return topPool[Math.floor(Math.random() * topPool.length)] ?? null;
    }

    let pick = Math.random() * totalWeight;
    for (const candidate of topPool) {
        pick -= candidate.score;
        if (pick <= 0) return candidate;
    }

    return topPool[topPool.length - 1] ?? null;
}

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
        const clues = JSON.parse(puzzle.clues) as Clue[];

        const hintCell = selectSmartHintCell(currentBoard, solution, clues);

        if (!hintCell) {
            return NextResponse.json({ hint: null, message: 'Board already matches solution' });
        }

        return NextResponse.json({
            hint: {
                row: hintCell.row,
                col: hintCell.col,
                value: hintCell.value,
                rule: 'Smart random solution cell',
            },
        });
    } catch (error) {
        console.error('Hint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
