// Step 1: Build a complete valid solution
// Constructs a fully solved board row-by-row using valid row patterns
// with column validation and backtracking

import { Board, BoardSize } from './types';
import { getBasePatterns, getPatternVariations, shuffle } from './patterns';

// Check if placing a row at rowIndex keeps all columns valid
function isColumnValid(board: Board, rowIndex: number, size: number): boolean {
    const half = size / 2;

    for (let col = 0; col < size; col++) {
        let sunCount = 0;
        let moonCount = 0;

        // Check count constraint
        for (let row = 0; row <= rowIndex; row++) {
            if (board[row][col] === 'sun') sunCount++;
            else if (board[row][col] === 'moon') moonCount++;
        }

        // If count exceeds half, invalid
        if (sunCount > half || moonCount > half) return false;

        // Check triple adjacency in column
        if (rowIndex >= 2) {
            const a = board[rowIndex - 2][col];
            const b = board[rowIndex - 1][col];
            const c = board[rowIndex][col];
            if (a && b && c && a === b && b === c) return false;
        }
    }

    return true;
}

export function generateSolution(size: BoardSize): Board | null {
    const basePatterns = getBasePatterns(size);
    const allPatterns = basePatterns.flatMap(pattern => getPatternVariations(pattern));
    const board: Board = [];

    function backtrack(rowIndex: number): boolean {
        if (rowIndex === size) {
            return true;
        }

        const shuffled = shuffle(allPatterns);

        for (const pattern of shuffled) {
            board[rowIndex] = [...pattern];

            if (isColumnValid(board, rowIndex, size)) {
                if (backtrack(rowIndex + 1)) {
                    return true;
                }
            }
        }

        board.length = rowIndex; // remove the row
        return false;
    }

    if (backtrack(0)) {
        return board;
    }

    return null;
}
