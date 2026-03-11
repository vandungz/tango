// POST /api/puzzle/hint
// Returns the next easiest hint step for the current board state

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CellValue, Clue } from '@/engine/types';
import { getNextHint } from '@/engine/solver';
import { findLogicErrors } from '@/engine/validation';

type HintMode = 'daily' | 'journey';

function getHintBudget(mode: HintMode) {
    // Journey prioritizes low latency to protect star-timing gameplay.
    if (mode === 'journey') {
        return { maxMs: 120, maxRuleDifficulty: 9 };
    }

    return { maxMs: 240, maxRuleDifficulty: 10 };
}

function isSameBoardShape(board: CellValue[][], size: number): boolean {
    return Array.isArray(board) && board.length === size && board.every(row => Array.isArray(row) && row.length === size);
}

function findFirstMismatch(
    currentBoard: CellValue[][],
    solution: CellValue[][],
    initialBoard: CellValue[][],
): { row: number; col: number; value: CellValue } | null {
    const size = solution.length;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const locked = Boolean(initialBoard[row]?.[col]);
            if (locked) continue;

            const current = currentBoard[row]?.[col] ?? null;
            const expected = solution[row]?.[col] ?? null;
            if (expected && current !== expected) {
                return { row, col, value: expected };
            }
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { puzzleId, currentBoard, mode } = body as {
            puzzleId: string;
            currentBoard: CellValue[][];
            mode?: HintMode;
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
        const initialBoard = JSON.parse(puzzle.board) as CellValue[][];
        const clues = JSON.parse(puzzle.clues) as Clue[];
        const size = solution.length;
        const safeMode: HintMode = mode === 'journey' ? 'journey' : 'daily';
        const budget = getHintBudget(safeMode);
        const analysisStartedAt = Date.now();

        if (!isSameBoardShape(currentBoard, size)) {
            return NextResponse.json({ error: 'Invalid board shape' }, { status: 400 });
        }

        // Priority 1: if board currently violates rules, guide player to fix a conflicting cell first.
        const logicErrors = findLogicErrors(currentBoard, clues, size);
        if (logicErrors.length > 0) {
            const mismatchInErrors = logicErrors
                .map(([row, col]) => {
                    const expected = solution[row]?.[col] ?? null;
                    const current = currentBoard[row]?.[col] ?? null;
                    const locked = Boolean(initialBoard[row]?.[col]);
                    if (!expected || locked || current === expected) return null;
                    return { row, col, value: expected };
                })
                .find(Boolean);

            if (mismatchInErrors) {
                return NextResponse.json({
                    hint: {
                        row: mismatchInErrors.row,
                        col: mismatchInErrors.col,
                        value: mismatchInErrors.value,
                        rule: 'Conflict Recovery',
                        difficulty: 1,
                    },
                    metrics: {
                        analysisMs: Date.now() - analysisStartedAt,
                        mode: safeMode,
                        budgetMs: budget.maxMs,
                    },
                });
            }
        }

        // Priority 2: infer the next step from the current board using the rule engine.
        const nextStep = getNextHint(currentBoard, clues, size, budget);
        if (nextStep) {
            return NextResponse.json({
                hint: {
                    row: nextStep.row,
                    col: nextStep.col,
                    value: nextStep.value,
                    rule: nextStep.rule,
                    difficulty: nextStep.difficulty,
                },
                metrics: {
                    analysisMs: Date.now() - analysisStartedAt,
                    mode: safeMode,
                    budgetMs: budget.maxMs,
                },
            });
        }

        // Priority 3: deterministic fallback when no rule can be applied from current state.
        const hintCell = findFirstMismatch(currentBoard, solution, initialBoard);

        if (!hintCell) {
            return NextResponse.json({
                hint: null,
                message: 'Board already matches solution',
                metrics: {
                    analysisMs: Date.now() - analysisStartedAt,
                    mode: safeMode,
                    budgetMs: budget.maxMs,
                },
            });
        }

        return NextResponse.json({
            hint: {
                row: hintCell.row,
                col: hintCell.col,
                value: hintCell.value,
                rule: 'Deterministic Recovery',
                difficulty: 10,
            },
            metrics: {
                analysisMs: Date.now() - analysisStartedAt,
                mode: safeMode,
                budgetMs: budget.maxMs,
            },
        });
    } catch (error) {
        console.error('Hint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
