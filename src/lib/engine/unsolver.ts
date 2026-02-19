// Step 3: Remove cells while maintaining unique solvability
// "Unsolve to maximum" approach: remove cells one at a time, verify solvability

import { Board, Clue, CellValue, cloneBoard } from './types';
import { solve } from './solver';
import { countSolutions } from './validation';
import { shuffle } from './patterns';

interface CellPosition {
    row: number;
    col: number;
}

function getAllFilledCells(board: Board, size: number): CellPosition[] {
    const cells: CellPosition[] = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c]) {
                cells.push({ row: r, col: c });
            }
        }
    }
    return cells;
}

function boardsEqual(a: Board, b: Board, size: number): boolean {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (a[r][c] !== b[r][c]) return false;
        }
    }
    return true;
}

export function unsolve(solution: Board, clues: Clue[], size: number): Board {
    const board = cloneBoard(solution);

    // Shuffle cell order for randomized removal
    const cells = shuffle(getAllFilledCells(board, size));

    for (const { row, col } of cells) {
        const savedValue = board[row][col];

        // Temporarily blank out this cell
        board[row][col] = null;

        // Run the solver on the puzzle
        const result = solve(board, clues, size);
        const solutions = countSolutions(board, clues, size, 2);

        if (!(result.solved && boardsEqual(result.solution, solution, size) && solutions === 1)) {
            // Put it back — removing this cell makes puzzle unsolvable/ambiguous
            board[row][col] = savedValue;
        }
    }

    return board;
}
