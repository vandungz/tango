// Step 1: Build a complete valid solution
// Constructs a fully solved board row-by-row using valid row patterns
// with column validation and backtracking

import { Board, CellValue, BoardSize } from './types';
import { getAllPatterns, shuffle } from './patterns';

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

    // Check column uniqueness (no two columns identical so far)
    // Only check when all rows are placed
    if (rowIndex === size - 1) {
        for (let c1 = 0; c1 < size; c1++) {
            for (let c2 = c1 + 1; c2 < size; c2++) {
                let same = true;
                for (let r = 0; r < size; r++) {
                    if (board[r][c1] !== board[r][c2]) {
                        same = false;
                        break;
                    }
                }
                if (same) return false;
            }
        }
    }

    return true;
}

// Check that no two rows are identical
function areRowsUnique(board: Board, upToRow: number): boolean {
    for (let r1 = 0; r1 <= upToRow; r1++) {
        for (let r2 = r1 + 1; r2 <= upToRow; r2++) {
            if (board[r1].every((v, i) => v === board[r2][i])) {
                return false;
            }
        }
    }
    return true;
}

export function generateSolution(size: BoardSize): Board | null {
    const allPatterns = getAllPatterns(size);
    const board: Board = [];

    function backtrack(rowIndex: number): boolean {
        if (rowIndex === size) {
            return true;
        }

        const shuffled = shuffle(allPatterns);

        for (const pattern of shuffled) {
            board[rowIndex] = [...pattern];

            if (
                isColumnValid(board, rowIndex, size) &&
                areRowsUnique(board, rowIndex)
            ) {
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
