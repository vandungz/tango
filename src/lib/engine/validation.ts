import { Board, CellValue, Clue } from './types';

// Shared validation helpers for both client and server.

function getClueBetween(clues: Clue[], r1: number, c1: number, r2: number, c2: number): Clue | undefined {
    return clues.find(clue => {
        if (clue.direction === 'h') {
            return (clue.row === r1 && clue.col === c1 && r2 === r1 && c2 === c1 + 1) || (clue.row === r2 && clue.col === c2 && r1 === r2 && c1 === c2 + 1);
        }
        return (clue.row === r1 && clue.col === c1 && r2 === r1 + 1 && c2 === c1) || (clue.row === r2 && clue.col === c2 && r1 === r2 + 1 && c1 === c2);
    });
}

export function findLogicErrors(board: Board, clues: Clue[], size: number): [number, number][] {
    const errors = new Set<string>();
    const half = size / 2;

    // Row count constraint
    for (let r = 0; r < size; r++) {
        const sunCells: [number, number][] = [];
        const moonCells: [number, number][] = [];

        for (let c = 0; c < size; c++) {
            if (board[r][c] === 'sun') sunCells.push([r, c]);
            else if (board[r][c] === 'moon') moonCells.push([r, c]);
        }

        if (sunCells.length > half) sunCells.forEach(([rr, cc]) => errors.add(`${rr},${cc}`));
        if (moonCells.length > half) moonCells.forEach(([rr, cc]) => errors.add(`${rr},${cc}`));
    }

    // Column count constraint
    for (let c = 0; c < size; c++) {
        const sunCells: [number, number][] = [];
        const moonCells: [number, number][] = [];

        for (let r = 0; r < size; r++) {
            if (board[r][c] === 'sun') sunCells.push([r, c]);
            else if (board[r][c] === 'moon') moonCells.push([r, c]);
        }

        if (sunCells.length > half) sunCells.forEach(([rr, cc]) => errors.add(`${rr},${cc}`));
        if (moonCells.length > half) moonCells.forEach(([rr, cc]) => errors.add(`${rr},${cc}`));
    }

    // Triple adjacency in rows/cols
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size - 2; c++) {
            const a = board[r][c];
            const b = board[r][c + 1];
            const d = board[r][c + 2];
            if (a && b && d && a === b && b === d) {
                errors.add(`${r},${c}`);
                errors.add(`${r},${c + 1}`);
                errors.add(`${r},${c + 2}`);
            }
        }
    }

    for (let c = 0; c < size; c++) {
        for (let r = 0; r < size - 2; r++) {
            const a = board[r][c];
            const b = board[r + 1][c];
            const d = board[r + 2][c];
            if (a && b && d && a === b && b === d) {
                errors.add(`${r},${c}`);
                errors.add(`${r + 1},${c}`);
                errors.add(`${r + 2},${c}`);
            }
        }
    }

    // Clue violations
    for (const clue of clues) {
        const { row, col, direction, type } = clue;
        const r2 = direction === 'h' ? row : row + 1;
        const c2 = direction === 'h' ? col + 1 : col;

        const v1 = board[row][col];
        const v2 = board[r2][c2];

        if (v1 && v2) {
            const invalid = (type === '=' && v1 !== v2) || (type === 'x' && v1 === v2);
            if (invalid) {
                errors.add(`${row},${col}`);
                errors.add(`${r2},${c2}`);
            }
        }
    }

    // Row uniqueness for complete rows
    for (let r1 = 0; r1 < size; r1++) {
        const rowComplete = board[r1].every(Boolean);
        if (!rowComplete) continue;

        for (let r2 = r1 + 1; r2 < size; r2++) {
            const otherComplete = board[r2].every(Boolean);
            if (!otherComplete) continue;

            const same = board[r1].every((v, idx) => v === board[r2][idx]);
            if (same) {
                for (let c = 0; c < size; c++) {
                    errors.add(`${r1},${c}`);
                    errors.add(`${r2},${c}`);
                }
            }
        }
    }

    // Column uniqueness for complete columns
    for (let c1 = 0; c1 < size; c1++) {
        let colComplete = true;
        for (let r = 0; r < size; r++) {
            if (!board[r][c1]) {
                colComplete = false;
                break;
            }
        }
        if (!colComplete) continue;

        for (let c2 = c1 + 1; c2 < size; c2++) {
            let otherComplete = true;
            for (let r = 0; r < size; r++) {
                if (!board[r][c2]) {
                    otherComplete = false;
                    break;
                }
            }
            if (!otherComplete) continue;

            let same = true;
            for (let r = 0; r < size; r++) {
                if (board[r][c1] !== board[r][c2]) {
                    same = false;
                    break;
                }
            }

            if (same) {
                for (let r = 0; r < size; r++) {
                    errors.add(`${r},${c1}`);
                    errors.add(`${r},${c2}`);
                }
            }
        }
    }

    return Array.from(errors).map(key => key.split(',').map(Number) as [number, number]);
}

export function isBoardComplete(board: Board): boolean {
    return board.length > 0 && board.every(row => row.every(Boolean));
}

export function isBoardCompleteAndValid(board: Board, clues: Clue[], size: number): { errors: [number, number][]; complete: boolean } {
    const errors = findLogicErrors(board, clues, size);
    const complete = errors.length === 0 && isBoardComplete(board);
    return { errors, complete };
}

function violatesUniqueness(board: Board, row: number, col: number, size: number): boolean {
    const rowComplete = board[row].every(Boolean);
    if (rowComplete) {
        for (let r2 = 0; r2 < size; r2++) {
            if (r2 === row || !board[r2].every(Boolean)) continue;
            if (board[row].every((v, idx) => v === board[r2][idx])) return true;
        }
    }

    let colComplete = true;
    for (let r = 0; r < size; r++) {
        if (!board[r][col]) {
            colComplete = false;
            break;
        }
    }
    if (colComplete) {
        for (let c2 = 0; c2 < size; c2++) {
            if (c2 === col) continue;
            let otherComplete = true;
            for (let r = 0; r < size; r++) {
                if (!board[r][c2]) {
                    otherComplete = false;
                    break;
                }
            }
            if (!otherComplete) continue;

            let same = true;
            for (let r = 0; r < size; r++) {
                if (board[r][col] !== board[r][c2]) {
                    same = false;
                    break;
                }
            }

            if (same) return true;
        }
    }

    return false;
}

function isPlacementValid(board: Board, clues: Clue[], size: number, row: number, col: number, value: CellValue): boolean {
    board[row][col] = value;
    const half = size / 2;

    // Row counts and triples
    let sunRow = 0;
    let moonRow = 0;
    for (let c = 0; c < size; c++) {
        if (board[row][c] === 'sun') sunRow++;
        else if (board[row][c] === 'moon') moonRow++;
    }
    if (sunRow > half || moonRow > half) {
        board[row][col] = null;
        return false;
    }
    for (let c = Math.max(0, col - 2); c <= Math.min(size - 3, col); c++) {
        const a = board[row][c];
        const b = board[row][c + 1];
        const d = board[row][c + 2];
        if (a && b && d && a === b && b === d) {
            board[row][col] = null;
            return false;
        }
    }

    // Column counts and triples
    let sunCol = 0;
    let moonCol = 0;
    for (let r = 0; r < size; r++) {
        if (board[r][col] === 'sun') sunCol++;
        else if (board[r][col] === 'moon') moonCol++;
    }
    if (sunCol > half || moonCol > half) {
        board[row][col] = null;
        return false;
    }
    for (let r = Math.max(0, row - 2); r <= Math.min(size - 3, row); r++) {
        const a = board[r][col];
        const b = board[r + 1][col];
        const d = board[r + 2][col];
        if (a && b && d && a === b && b === d) {
            board[row][col] = null;
            return false;
        }
    }

    // Clue consistency with neighbors
    const neighbors: [number, number][] = [
        [row, col - 1],
        [row, col + 1],
        [row - 1, col],
        [row + 1, col],
    ];
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const clue = getClueBetween(clues, row, col, nr, nc);
        if (!clue) continue;

        const other = board[nr][nc];
        if (other) {
            if (clue.type === '=' && other !== value) {
                board[row][col] = null;
                return false;
            }
            if (clue.type === 'x' && other === value) {
                board[row][col] = null;
                return false;
            }
        }
    }

    // Uniqueness checks when row/col complete
    if (violatesUniqueness(board, row, col, size)) {
        board[row][col] = null;
        return false;
    }

    board[row][col] = null;
    return true;
}

export function countSolutions(board: Board, clues: Clue[], size: number, limit = 2): number {
    const working = board.map(row => [...row]);
    let solutions = 0;

    function backtrack(): void {
        if (solutions >= limit) return;

        // Find first empty cell
        let target: [number, number] | null = null;
        for (let r = 0; r < size && !target; r++) {
            for (let c = 0; c < size; c++) {
                if (!working[r][c]) {
                    target = [r, c];
                    break;
                }
            }
        }

        if (!target) {
            solutions++;
            return;
        }

        const [row, col] = target;
        for (const val of ['sun', 'moon'] as CellValue[]) {
            if (isPlacementValid(working, clues, size, row, col, val)) {
                working[row][col] = val;
                backtrack();
                working[row][col] = null;
                if (solutions >= limit) return;
            }
        }
    }

    backtrack();
    return solutions;
}