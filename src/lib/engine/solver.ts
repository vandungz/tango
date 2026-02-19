// Step 4 (used by Step 3): Rule-based solver with 10 difficulty rules
// Returns solve steps for hint system and difficulty scoring

import { Board, Clue, CellValue, SolveStep, SolveResult, cloneBoard, oppositeValue } from './types';

type Rule = {
    name: string;
    difficulty: number;
    apply: (board: Board, clues: Clue[], size: number) => SolveStep[];
};

// Helper: count values in a line
function countInLine(line: CellValue[]): { sun: number; moon: number; empty: number } {
    let sun = 0, moon = 0, empty = 0;
    for (const v of line) {
        if (v === 'sun') sun++;
        else if (v === 'moon') moon++;
        else empty++;
    }
    return { sun, moon, empty };
}

// Helper: get row
function getRow(board: Board, r: number): CellValue[] {
    return board[r];
}

// Helper: get column
function getCol(board: Board, c: number, size: number): CellValue[] {
    const col: CellValue[] = [];
    for (let r = 0; r < size; r++) {
        col.push(board[r][c]);
    }
    return col;
}

// Helper: find clue between two cells
function findClue(clues: Clue[], r1: number, c1: number, r2: number, c2: number): Clue | undefined {
    return clues.find(clue => {
        if (clue.direction === 'h') {
            return clue.row === r1 && clue.col === c1 && r2 === r1 && c2 === c1 + 1;
        } else {
            return clue.row === r1 && clue.col === c1 && r2 === r1 + 1 && c2 === c1;
        }
    });
}

// Helper: get clue between two adjacent cells (checks both orders)
function getClueBetween(clues: Clue[], r1: number, c1: number, r2: number, c2: number): Clue | undefined {
    return findClue(clues, r1, c1, r2, c2) || findClue(clues, r2, c2, r1, c1);
}

// Rule 1: Clue Propagation (difficulty 1)
// If one side of "=" or "×" is filled, fill the other
function cluePropagation(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (const clue of clues) {
        const { row, col, direction, type } = clue;
        let r2 = row, c2 = col;
        if (direction === 'h') c2 = col + 1;
        else r2 = row + 1;

        const v1 = board[row][col];
        const v2 = board[r2][c2];

        if (v1 && !v2) {
            const val = type === '=' ? v1 : oppositeValue(v1);
            if (val) steps.push({ row: r2, col: c2, value: val, rule: 'Clue Propagation', difficulty: 1 });
        } else if (!v1 && v2) {
            const val = type === '=' ? v2 : oppositeValue(v2);
            if (val) steps.push({ row, col, value: val, rule: 'Clue Propagation', difficulty: 1 });
        }
    }

    return steps;
}

// Rule 2: Almost Full (difficulty 1)
// If a row/col already has max of one symbol, fill rest with other
function almostFull(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    // Check rows
    for (let r = 0; r < size; r++) {
        const row = getRow(board, r);
        const { sun, moon } = countInLine(row);

        if (sun === half) {
            for (let c = 0; c < size; c++) {
                if (!board[r][c]) steps.push({ row: r, col: c, value: 'moon', rule: 'Almost Full', difficulty: 1 });
            }
        } else if (moon === half) {
            for (let c = 0; c < size; c++) {
                if (!board[r][c]) steps.push({ row: r, col: c, value: 'sun', rule: 'Almost Full', difficulty: 1 });
            }
        }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
        const col = getCol(board, c, size);
        const { sun, moon } = countInLine(col);

        if (sun === half) {
            for (let r = 0; r < size; r++) {
                if (!board[r][c]) steps.push({ row: r, col: c, value: 'moon', rule: 'Almost Full', difficulty: 1 });
            }
        } else if (moon === half) {
            for (let r = 0; r < size; r++) {
                if (!board[r][c]) steps.push({ row: r, col: c, value: 'sun', rule: 'Almost Full', difficulty: 1 });
            }
        }
    }

    return steps;
}

// Rule 3: Triple Prevention (difficulty 1)
// Two adjacent identical symbols force the neighbors to be opposite
function triplePrevention(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    // Check rows
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size - 1; c++) {
            const a = board[r][c];
            const b = board[r][c + 1];
            if (a && b && a === b) {
                // Cell before pair
                if (c > 0 && !board[r][c - 1]) {
                    steps.push({ row: r, col: c - 1, value: oppositeValue(a)!, rule: 'Triple Prevention', difficulty: 1 });
                }
                // Cell after pair
                if (c + 2 < size && !board[r][c + 2]) {
                    steps.push({ row: r, col: c + 2, value: oppositeValue(a)!, rule: 'Triple Prevention', difficulty: 1 });
                }
            }
        }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
        for (let r = 0; r < size - 1; r++) {
            const a = board[r][c];
            const b = board[r + 1][c];
            if (a && b && a === b) {
                if (r > 0 && !board[r - 1][c]) {
                    steps.push({ row: r - 1, col: c, value: oppositeValue(a)!, rule: 'Triple Prevention', difficulty: 1 });
                }
                if (r + 2 < size && !board[r + 2][c]) {
                    steps.push({ row: r + 2, col: c, value: oppositeValue(a)!, rule: 'Triple Prevention', difficulty: 1 });
                }
            }
        }
    }

    return steps;
}

// Rule 4: Gap Fill (difficulty 2)
// Two identical symbols with one blank between them force the blank to be opposite
function gapFill(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    // Check rows
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size - 2; c++) {
            const a = board[r][c];
            const b = board[r][c + 1];
            const cc = board[r][c + 2];
            if (a && !b && cc && a === cc) {
                steps.push({ row: r, col: c + 1, value: oppositeValue(a)!, rule: 'Gap Fill', difficulty: 2 });
            }
        }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
        for (let r = 0; r < size - 2; r++) {
            const a = board[r][c];
            const b = board[r + 1][c];
            const cc = board[r + 2][c];
            if (a && !b && cc && a === cc) {
                steps.push({ row: r + 1, col: c, value: oppositeValue(a)!, rule: 'Gap Fill', difficulty: 2 });
            }
        }
    }

    return steps;
}

// Rule 5: Touching Pair (difficulty 4)
// A blank "=" next to a filled cell determines both blanks
function touchingPair(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (const clue of clues) {
        if (clue.type !== '=') continue;

        const { row, col, direction } = clue;
        let r2 = row, c2 = col;
        if (direction === 'h') c2 = col + 1;
        else r2 = row + 1;

        const v1 = board[row][col];
        const v2 = board[r2][c2];

        if (v1 || v2) continue; // at least one must be filled for rule 1, here both blank

        // Check adjacent cells to determine what the pair must be
        // If pair is horizontal: check cells to the left and right
        if (direction === 'h') {
            // Check: if cell before col has same-direction pair
            if (col > 0 && board[row][col - 1]) {
                const adj = board[row][col - 1];
                // If adj-adj also equals adj, the pair can't be adj (triple)
                if (col > 1 && board[row][col - 2] === adj) {
                    const val = oppositeValue(adj)!;
                    steps.push({ row, col, value: val, rule: 'Touching Pair', difficulty: 4 });
                    steps.push({ row, col: c2, value: val, rule: 'Touching Pair', difficulty: 4 });
                }
            }
            if (c2 + 1 < size && board[row][c2 + 1]) {
                const adj = board[row][c2 + 1];
                if (c2 + 2 < size && board[row][c2 + 2] === adj) {
                    const val = oppositeValue(adj)!;
                    steps.push({ row, col, value: val, rule: 'Touching Pair', difficulty: 4 });
                    steps.push({ row, col: c2, value: val, rule: 'Touching Pair', difficulty: 4 });
                }
            }
        } else {
            if (row > 0 && board[row - 1][col]) {
                const adj = board[row - 1][col];
                if (row > 1 && board[row - 2][col] === adj) {
                    const val = oppositeValue(adj)!;
                    steps.push({ row, col, value: val, rule: 'Touching Pair', difficulty: 4 });
                    steps.push({ row: r2, col, value: val, rule: 'Touching Pair', difficulty: 4 });
                }
            }
            if (r2 + 1 < size && board[r2 + 1][col]) {
                const adj = board[r2 + 1][col];
                if (r2 + 2 < size && board[r2 + 2][col] === adj) {
                    const val = oppositeValue(adj)!;
                    steps.push({ row, col, value: val, rule: 'Touching Pair', difficulty: 4 });
                    steps.push({ row: r2, col, value: val, rule: 'Touching Pair', difficulty: 4 });
                }
            }
        }
    }

    return steps;
}

// Rule 6: Edge Pair / Big Gap (difficulty 6)
function edgePairBigGap(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    // Check rows - if count of one symbol is half-1 and there's a pattern forcing placement
    for (let r = 0; r < size; r++) {
        const row = getRow(board, r);
        const { sun, moon, empty } = countInLine(row);

        if (empty <= 1) continue;

        // Edge pattern: if first or last two cells form a pattern
        // Two same at edges with stuff between
        if (row[0] && row[size - 1] && row[0] === row[size - 1]) {
            const val = row[0];
            const count = val === 'sun' ? sun : moon;
            if (count === half) continue; // already full

            // Check if there's a gap pattern
            if (!row[1] && row[0] === val) {
                // Edge cell matches, check if placing same would cause triple
                // If row[2] is also val, then row[1] must be opposite
                if (row[2] === val) {
                    steps.push({ row: r, col: 1, value: oppositeValue(val)!, rule: 'Edge Pair', difficulty: 6 });
                }
            }
            if (!row[size - 2] && row[size - 1] === val) {
                if (row[size - 3] === val) {
                    steps.push({ row: r, col: size - 2, value: oppositeValue(val)!, rule: 'Edge Pair', difficulty: 6 });
                }
            }
        }
    }

    // Same for columns
    for (let c = 0; c < size; c++) {
        const col = getCol(board, c, size);
        const { sun, moon, empty } = countInLine(col);

        if (empty <= 1) continue;

        if (col[0] && col[size - 1] && col[0] === col[size - 1]) {
            const val = col[0];
            const count = val === 'sun' ? sun : moon;
            if (count === half) continue;

            if (!col[1] && col[0] === val) {
                if (col[2] === val) {
                    steps.push({ row: 1, col: c, value: oppositeValue(val)!, rule: 'Edge Pair', difficulty: 6 });
                }
            }
            if (!col[size - 2] && col[size - 1] === val) {
                if (col[size - 3] === val) {
                    steps.push({ row: size - 2, col: c, value: oppositeValue(val)!, rule: 'Edge Pair', difficulty: 6 });
                }
            }
        }
    }

    return steps;
}

// Rule 7: Equal-Gap (difficulty 7)
function equalGap(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    for (const clue of clues) {
        if (clue.type !== '=') continue;

        const { row, col, direction } = clue;
        let r2 = row, c2 = col;
        if (direction === 'h') c2 = col + 1;
        else r2 = row + 1;

        const v1 = board[row][col];
        const v2 = board[r2][c2];

        if (v1 || v2) continue; // both must be blank

        // Check if being on one end constrains the value
        if (direction === 'h') {
            const rowLine = getRow(board, row);
            const { sun, moon } = countInLine(rowLine);

            // If sun is half-1, these two can only both be sun or would overflow if moon
            if (sun === half - 1 && moon === half - 1) {
                // The pair is equal, so both same. If we have half-1 of each, either works
                // But we need additional constraint from adjacent
                continue;
            }
            if (sun === half) {
                // Both must be moon
                steps.push({ row, col, value: 'moon', rule: 'Equal-Gap', difficulty: 7 });
                steps.push({ row: r2, col: c2, value: 'moon', rule: 'Equal-Gap', difficulty: 7 });
            } else if (moon === half) {
                steps.push({ row, col, value: 'sun', rule: 'Equal-Gap', difficulty: 7 });
                steps.push({ row: r2, col: c2, value: 'sun', rule: 'Equal-Gap', difficulty: 7 });
            } else if (sun === half - 1) {
                // If equal pair is sun, that makes sun=half. Otherwise moon would be half+1 in remaining?
                // Not enough info on its own, skip
            }
        } else {
            const colLine = getCol(board, col, size);
            const { sun, moon } = countInLine(colLine);

            if (sun === half) {
                steps.push({ row, col, value: 'moon', rule: 'Equal-Gap', difficulty: 7 });
                steps.push({ row: r2, col: c2, value: 'moon', rule: 'Equal-Gap', difficulty: 7 });
            } else if (moon === half) {
                steps.push({ row, col, value: 'sun', rule: 'Equal-Gap', difficulty: 7 });
                steps.push({ row: r2, col: c2, value: 'sun', rule: 'Equal-Gap', difficulty: 7 });
            }
        }
    }

    return steps;
}

// Rule 8: Opposite Inference (difficulty 9)
function oppositeInference(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    for (const clue of clues) {
        if (clue.type !== 'x') continue;

        const { row, col, direction } = clue;
        let r2 = row, c2 = col;
        if (direction === 'h') c2 = col + 1;
        else r2 = row + 1;

        const v1 = board[row][col];
        const v2 = board[r2][c2];

        if (v1 || v2) continue;

        // Check row/col counts to infer
        if (direction === 'h') {
            const rowLine = getRow(board, row);
            const { sun, moon, empty } = countInLine(rowLine);

            // If only 2 empty and these are the × pair, we know they're different
            if (empty === 2 && sun === half - 1 && moon === half - 1) {
                // Need one sun and one moon among the two
                // Check which goes where using column constraints
                for (const tryVal of ['sun', 'moon'] as CellValue[]) {
                    const oppVal = oppositeValue(tryVal);
                    // Try val at (row, col), oppVal at (r2, c2)
                    const colA = getCol(board, col, size);
                    const colB = getCol(board, c2, size);
                    const countA = tryVal === 'sun' ? countInLine(colA).sun : countInLine(colA).moon;
                    const countB = oppVal === 'sun' ? countInLine(colB).sun : countInLine(colB).moon;

                    if (countA >= half || countB >= half) {
                        // This assignment would overflow, so the opposite must be true
                        steps.push({ row, col, value: oppVal!, rule: 'Opposite Inference', difficulty: 9 });
                        steps.push({ row: r2, col: c2, value: tryVal!, rule: 'Opposite Inference', difficulty: 9 });
                        break;
                    }
                }
            }
        } else {
            const colLine = getCol(board, col, size);
            const { sun, moon, empty } = countInLine(colLine);

            if (empty === 2 && sun === half - 1 && moon === half - 1) {
                for (const tryVal of ['sun', 'moon'] as CellValue[]) {
                    const oppVal = oppositeValue(tryVal);
                    const rowA = getRow(board, row);
                    const rowB = getRow(board, r2);
                    const countA = tryVal === 'sun' ? countInLine(rowA).sun : countInLine(rowA).moon;
                    const countB = oppVal === 'sun' ? countInLine(rowB).sun : countInLine(rowB).moon;

                    if (countA >= half || countB >= half) {
                        steps.push({ row, col, value: oppVal!, rule: 'Opposite Inference', difficulty: 9 });
                        steps.push({ row: r2, col: c2, value: tryVal!, rule: 'Opposite Inference', difficulty: 9 });
                        break;
                    }
                }
            }
        }
    }

    return steps;
}

// Rule 9: Inverse Big Gap (difficulty 9)
function inverseBigGap(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    // Check rows for rare edge pattern
    for (let r = 0; r < size; r++) {
        const row = getRow(board, r);
        const { sun, moon, empty } = countInLine(row);
        if (empty < 2) continue;

        // Pattern: filled-blank-blank-filled where outer cells are same
        for (let c = 0; c < size - 3; c++) {
            const a = row[c];
            const b = row[c + 1];
            const cc = row[c + 2];
            const d = row[c + 3];
            if (a && !b && !cc && d && a === d) {
                // The two blanks must have one of each (since a===d, having both same as a would make triple possible)
                const val = a;
                const count = val === 'sun' ? sun : moon;
                if (count === half - 1) {
                    // Only one more of val allowed, so exactly one blank is val and one is opposite
                    // But the blank next to val can't be val (would make triple with a)
                    steps.push({ row: r, col: c + 1, value: oppositeValue(val)!, rule: 'Inverse Big Gap', difficulty: 9 });
                    steps.push({ row: r, col: c + 2, value: val!, rule: 'Inverse Big Gap', difficulty: 9 });
                }
            }
        }
    }

    // Same for columns
    for (let c = 0; c < size; c++) {
        const col = getCol(board, c, size);
        const { sun, moon, empty } = countInLine(col);
        if (empty < 2) continue;

        for (let r = 0; r < size - 3; r++) {
            const a = col[r];
            const b = col[r + 1];
            const cc = col[r + 2];
            const d = col[r + 3];
            if (a && !b && !cc && d && a === d) {
                const val = a;
                const count = val === 'sun' ? sun : moon;
                if (count === half - 1) {
                    steps.push({ row: r + 1, col: c, value: oppositeValue(val)!, rule: 'Inverse Big Gap', difficulty: 9 });
                    steps.push({ row: r + 2, col: c, value: val!, rule: 'Inverse Big Gap', difficulty: 9 });
                }
            }
        }
    }

    return steps;
}

// Rule 10: Constraint Enumeration (difficulty 10)
// When overlapping clue groups exist, enumerate all valid assignments
function constraintEnumeration(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    // Find all empty cells
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!board[r][c]) emptyCells.push([r, c]);
        }
    }

    if (emptyCells.length === 0 || emptyCells.length > 12) return steps; // too many to enumerate

    // Try each empty cell: check if it must be a specific value
    for (const [er, ec] of emptyCells) {
        let mustBeSun = true;
        let mustBeMoon = true;

        for (const tryVal of ['sun', 'moon'] as CellValue[]) {
            const testBoard = cloneBoard(board);
            testBoard[er][ec] = tryVal;

            if (!isValidPartial(testBoard, clues, size)) {
                if (tryVal === 'sun') mustBeSun = false;
                else mustBeMoon = false;
            }
        }

        if (mustBeSun && !mustBeMoon) {
            steps.push({ row: er, col: ec, value: 'sun', rule: 'Constraint Enumeration', difficulty: 10 });
        } else if (mustBeMoon && !mustBeSun) {
            steps.push({ row: er, col: ec, value: 'moon', rule: 'Constraint Enumeration', difficulty: 10 });
        }
    }

    return steps;
}

// Helper: check if a partial board is still valid (no rule violations)
function isValidPartial(board: Board, clues: Clue[], size: number): boolean {
    const half = size / 2;

    for (let r = 0; r < size; r++) {
        const row = getRow(board, r);
        const { sun, moon } = countInLine(row);
        if (sun > half || moon > half) return false;

        // Check triple in row
        for (let c = 0; c < size - 2; c++) {
            if (row[c] && row[c + 1] && row[c + 2] && row[c] === row[c + 1] && row[c + 1] === row[c + 2]) {
                return false;
            }
        }
    }

    for (let c = 0; c < size; c++) {
        const col = getCol(board, c, size);
        const { sun, moon } = countInLine(col);
        if (sun > half || moon > half) return false;

        for (let r = 0; r < size - 2; r++) {
            if (col[r] && col[r + 1] && col[r + 2] && col[r] === col[r + 1] && col[r + 1] === col[r + 2]) {
                return false;
            }
        }
    }

    // Check clues
    for (const clue of clues) {
        const { row, col, direction, type } = clue;
        let r2 = row, c2 = col;
        if (direction === 'h') c2 = col + 1;
        else r2 = row + 1;

        const v1 = board[row][col];
        const v2 = board[r2][c2];

        if (v1 && v2) {
            if (type === '=' && v1 !== v2) return false;
            if (type === 'x' && v1 === v2) return false;
        }
    }

    return true;
}

// All rules in order of difficulty
const RULES: Rule[] = [
    { name: 'Clue Propagation', difficulty: 1, apply: cluePropagation },
    { name: 'Almost Full', difficulty: 1, apply: almostFull },
    { name: 'Triple Prevention', difficulty: 1, apply: triplePrevention },
    { name: 'Gap Fill', difficulty: 2, apply: gapFill },
    { name: 'Touching Pair', difficulty: 4, apply: touchingPair },
    { name: 'Edge Pair', difficulty: 6, apply: edgePairBigGap },
    { name: 'Equal-Gap', difficulty: 7, apply: equalGap },
    { name: 'Opposite Inference', difficulty: 9, apply: oppositeInference },
    { name: 'Inverse Big Gap', difficulty: 9, apply: inverseBigGap },
    { name: 'Constraint Enumeration', difficulty: 10, apply: constraintEnumeration },
];

// Main solver function
export function solve(initialBoard: Board, clues: Clue[], size: number): SolveResult {
    const board = cloneBoard(initialBoard);
    const allSteps: SolveStep[] = [];
    const rulesUsed = new Set<string>();
    let totalDifficulty = 0;

    let changed = true;
    while (changed) {
        changed = false;

        for (const rule of RULES) {
            const steps = rule.apply(board, clues, size);

            // Filter steps to only unfilled cells
            const validSteps = steps.filter(s => !board[s.row][s.col] && s.value);

            // Deduplicate
            const seen = new Set<string>();
            const uniqueSteps: SolveStep[] = [];
            for (const step of validSteps) {
                const key = `${step.row},${step.col}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueSteps.push(step);
                }
            }

            if (uniqueSteps.length > 0) {
                for (const step of uniqueSteps) {
                    board[step.row][step.col] = step.value;
                    allSteps.push(step);
                    rulesUsed.add(step.rule);
                    totalDifficulty += step.difficulty;
                }
                changed = true;
                break; // restart from easiest rule
            }
        }
    }

    // Check if solved
    let solved = true;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!board[r][c]) {
                solved = false;
                break;
            }
        }
        if (!solved) break;
    }

    return {
        solved,
        solution: board,
        difficulty: totalDifficulty,
        steps: allSteps,
        rulesUsed: Array.from(rulesUsed),
    };
}

// Get next hint: given current board state, find the next easiest step
export function getNextHint(currentBoard: Board, clues: Clue[], size: number): SolveStep | null {
    const board = cloneBoard(currentBoard);

    for (const rule of RULES) {
        const steps = rule.apply(board, clues, size);
        const validSteps = steps.filter(s => !board[s.row][s.col] && s.value);

        if (validSteps.length > 0) {
            return validSteps[0];
        }
    }

    return null;
}
