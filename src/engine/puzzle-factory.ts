// Orchestrates the full puzzle generation pipeline:
// generate → place clues → unsolve → score → hash

import { BoardSize, Puzzle, getDifficultyLabel } from './types';
import { generateSolution } from './generator';
import { placeClues } from './clue-placer';
import { solve } from './solver';
import { unsolve } from './unsolver';
import { hashPuzzle } from './hash';
import { getBasePatterns } from './patterns';

export interface GeneratedPuzzle extends Puzzle {
    hash: string;
}

export interface GeneratePuzzleOptions {
    proMode?: boolean;
    attempts?: number;
}

const GENERATION_VERSION = 'pipeline-v2';
const SOLVER_VERSION = 'rule-engine-v3';

function countGivenCells(board: (null | 'sun' | 'moon')[][]): number {
    let total = 0;
    for (const row of board) {
        for (const value of row) {
            if (value) total += 1;
        }
    }
    return total;
}

function generateSingle(size: BoardSize): GeneratedPuzzle {
    const solution = generateSolution(size);
    if (!solution) {
        throw new Error(`Failed to generate solution for size ${size}`);
    }

    const clues = placeClues(solution, size);
    const board = unsolve(solution, clues, size);

    const result = solve(board, clues, size);
    const difficulty = result.difficulty;
    const maxRuleDifficulty = result.maxRuleDifficulty;
    const label = getDifficultyLabel(difficulty, maxRuleDifficulty);
    const hash = hashPuzzle(solution, clues);
    const rulesUsed = result.rulesUsed;
    const clueCount = clues.length;
    const givensCount = countGivenCells(board);
    const baseRowPatternCount = getBasePatterns(size).length;

    return {
        board,
        solution,
        clues,
        difficulty,
        maxRuleDifficulty,
        rulesUsed,
        clueCount,
        givensCount,
        baseRowPatternCount,
        generationVersion: GENERATION_VERSION,
        solverVersion: SOLVER_VERSION,
        label,
        size,
        hash,
    };
}

export function generatePuzzle(size: BoardSize, options?: GeneratePuzzleOptions): GeneratedPuzzle {
    const proMode = Boolean(options?.proMode);
    const attempts = Math.max(1, Math.floor(options?.attempts ?? 1));

    if (!proMode || attempts <= 1) {
        return generateSingle(size);
    }

    let best = generateSingle(size);
    for (let i = 1; i < attempts; i++) {
        const candidate = generateSingle(size);
        if (candidate.difficulty > best.difficulty) {
            best = candidate;
        }
    }

    return best;
}
