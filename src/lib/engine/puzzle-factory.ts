// Orchestrates the full puzzle generation pipeline:
// generate → place clues → unsolve → score → hash

import { BoardSize, Puzzle, getDifficultyLabel } from './types';
import { generateSolution } from './generator';
import { placeClues } from './clue-placer';
import { solve } from './solver';
import { unsolve } from './unsolver';
import { hashPuzzle } from './hash';

export interface GeneratedPuzzle extends Puzzle {
    hash: string;
}

export function generatePuzzle(size: BoardSize): GeneratedPuzzle {
    // Step 1: Generate complete solution
    const solution = generateSolution(size);
    if (!solution) {
        throw new Error(`Failed to generate solution for size ${size}`);
    }

    // Step 2: Place clues
    const clues = placeClues(solution, size);

    // Step 3: Remove cells (unsolve)
    const board = unsolve(solution, clues, size);

    // Step 4: Score difficulty
    const result = solve(board, clues, size);
    const difficulty = result.difficulty;
    const label = getDifficultyLabel(difficulty);

    // Compute hash for deduplication
    const hash = hashPuzzle(solution, clues);

    return {
        board,
        solution,
        clues,
        difficulty,
        label,
        size,
        hash,
    };
}
