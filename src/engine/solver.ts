import { Board, Clue, CellValue, SolveStep, SolveResult, cloneBoard, oppositeValue } from './types';

type Rule = {
    name: string;
    difficulty: number;
    apply: (board: Board, clues: Clue[], size: number) => SolveStep[];
};

type LineKind = 'row' | 'col';

function countInLine(line: CellValue[]): { sun: number; moon: number; empty: number } {
    let sun = 0;
    let moon = 0;
    let empty = 0;

    for (const value of line) {
        if (value === 'sun') sun += 1;
        else if (value === 'moon') moon += 1;
        else empty += 1;
    }

    return { sun, moon, empty };
}

function getRow(board: Board, row: number): CellValue[] {
    return board[row];
}

function getCol(board: Board, col: number, size: number): CellValue[] {
    const values: CellValue[] = [];
    for (let row = 0; row < size; row++) values.push(board[row][col]);
    return values;
}

function isInside(size: number, row: number, col: number): boolean {
    return row >= 0 && row < size && col >= 0 && col < size;
}

function getClueEndpoints(clue: Clue): [[number, number], [number, number]] {
    const a: [number, number] = [clue.row, clue.col];
    const b: [number, number] = clue.direction === 'h' ? [clue.row, clue.col + 1] : [clue.row + 1, clue.col];
    return [a, b];
}

function getClueBetween(clues: Clue[], r1: number, c1: number, r2: number, c2: number): Clue | undefined {
    return clues.find(clue => {
        const [[aRow, aCol], [bRow, bCol]] = getClueEndpoints(clue);
        return (aRow === r1 && aCol === c1 && bRow === r2 && bCol === c2) || (aRow === r2 && aCol === c2 && bRow === r1 && bCol === c1);
    });
}

function pushStep(steps: SolveStep[], row: number, col: number, value: CellValue, rule: string, difficulty: number): void {
    if (!value) return;
    steps.push({ row, col, value, rule, difficulty });
}

function addLineSteps(
    steps: SolveStep[],
    board: Board,
    line: CellValue[],
    lineKind: LineKind,
    lineIndex: number,
    valueForEmpty: CellValue,
    rule: string,
    difficulty: number,
): void {
    for (let offset = 0; offset < line.length; offset++) {
        if (line[offset]) continue;
        const row = lineKind === 'row' ? lineIndex : offset;
        const col = lineKind === 'row' ? offset : lineIndex;
        if (!board[row][col]) {
            pushStep(steps, row, col, valueForEmpty, rule, difficulty);
        }
    }
}

function getLineCell(lineKind: LineKind, lineIndex: number, offset: number): [number, number] {
    return lineKind === 'row' ? [lineIndex, offset] : [offset, lineIndex];
}

function hasTripleInArray(values: CellValue[]): boolean {
    for (let index = 0; index <= values.length - 3; index++) {
        const a = values[index];
        const b = values[index + 1];
        const c = values[index + 2];
        if (a && b && c && a === b && b === c) return true;
    }

    return false;
}

function canPlace(board: Board, clues: Clue[], size: number, row: number, col: number, value: CellValue): boolean {
    if (!value) return false;
    if (!isInside(size, row, col)) return false;
    if (board[row][col]) return board[row][col] === value;

    const half = size / 2;

    const test = cloneBoard(board);
    test[row][col] = value;

    const rowValues = getRow(test, row);
    const rowCount = countInLine(rowValues);
    if (rowCount.sun > half || rowCount.moon > half) return false;

    const colValues = getCol(test, col, size);
    const colCount = countInLine(colValues);
    if (colCount.sun > half || colCount.moon > half) return false;

    for (let c = Math.max(0, col - 2); c <= Math.min(size - 3, col); c++) {
        const a = test[row][c];
        const b = test[row][c + 1];
        const d = test[row][c + 2];
        if (a && b && d && a === b && b === d) return false;
    }

    for (let r = Math.max(0, row - 2); r <= Math.min(size - 3, row); r++) {
        const a = test[r][col];
        const b = test[r + 1][col];
        const d = test[r + 2][col];
        if (a && b && d && a === b && b === d) return false;
    }

    const neighbors: [number, number][] = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
    ];

    for (const [nr, nc] of neighbors) {
        if (!isInside(size, nr, nc)) continue;

        const clue = getClueBetween(clues, row, col, nr, nc);
        if (!clue) continue;

        const other = test[nr][nc];
        if (!other) continue;

        if (clue.type === '=' && other !== value) return false;
        if (clue.type === 'x' && other === value) return false;
    }

    return true;
}

function applyCandidate(board: Board, clues: Clue[], size: number, row: number, col: number, value: CellValue): boolean {
    if (!value) return false;
    if (board[row][col]) return board[row][col] === value;
    if (!canPlace(board, clues, size, row, col, value)) return false;
    board[row][col] = value;
    return true;
}

function cluePropagation(board: Board, clues: Clue[]): SolveStep[] {
    const steps: SolveStep[] = [];

    for (const clue of clues) {
        const [[r1, c1], [r2, c2]] = getClueEndpoints(clue);
        const left = board[r1][c1];
        const right = board[r2][c2];

        if (left && !right) {
            pushStep(steps, r2, c2, clue.type === '=' ? left : oppositeValue(left), 'Clue Propagation', 1);
        } else if (!left && right) {
            pushStep(steps, r1, c1, clue.type === '=' ? right : oppositeValue(right), 'Clue Propagation', 1);
        }
    }

    return steps;
}

function almostFull(board: Board, _clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;

    for (let row = 0; row < size; row++) {
        const line = getRow(board, row);
        const { sun, moon } = countInLine(line);
        if (sun === half) addLineSteps(steps, board, line, 'row', row, 'moon', 'Almost Full', 1);
        if (moon === half) addLineSteps(steps, board, line, 'row', row, 'sun', 'Almost Full', 1);
    }

    for (let col = 0; col < size; col++) {
        const line = getCol(board, col, size);
        const { sun, moon } = countInLine(line);
        if (sun === half) addLineSteps(steps, board, line, 'col', col, 'moon', 'Almost Full', 1);
        if (moon === half) addLineSteps(steps, board, line, 'col', col, 'sun', 'Almost Full', 1);
    }

    return steps;
}

function triplePrevention(board: Board, _clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 1; col++) {
            const a = board[row][col];
            const b = board[row][col + 1];
            if (!a || !b || a !== b) continue;

            const opposite = oppositeValue(a);
            if (col > 0 && !board[row][col - 1]) pushStep(steps, row, col - 1, opposite, 'Triple Prevention', 1);
            if (col + 2 < size && !board[row][col + 2]) pushStep(steps, row, col + 2, opposite, 'Triple Prevention', 1);
        }
    }

    for (let col = 0; col < size; col++) {
        for (let row = 0; row < size - 1; row++) {
            const a = board[row][col];
            const b = board[row + 1][col];
            if (!a || !b || a !== b) continue;

            const opposite = oppositeValue(a);
            if (row > 0 && !board[row - 1][col]) pushStep(steps, row - 1, col, opposite, 'Triple Prevention', 1);
            if (row + 2 < size && !board[row + 2][col]) pushStep(steps, row + 2, col, opposite, 'Triple Prevention', 1);
        }
    }

    return steps;
}

function gapFill(board: Board, _clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 2; col++) {
            const left = board[row][col];
            const mid = board[row][col + 1];
            const right = board[row][col + 2];

            if (left && right && !mid && left === right) {
                pushStep(steps, row, col + 1, oppositeValue(left), 'Gap Fill', 2);
            }
        }
    }

    for (let col = 0; col < size; col++) {
        for (let row = 0; row < size - 2; row++) {
            const top = board[row][col];
            const mid = board[row + 1][col];
            const bottom = board[row + 2][col];

            if (top && bottom && !mid && top === bottom) {
                pushStep(steps, row + 1, col, oppositeValue(top), 'Gap Fill', 2);
            }
        }
    }

    return steps;
}

function touchingPair(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (const clue of clues) {
        if (clue.type !== '=') continue;

        const [[r1, c1], [r2, c2]] = getClueEndpoints(clue);
        if (board[r1][c1] || board[r2][c2]) continue;

        if (clue.direction === 'h') {
            if (c1 - 1 >= 0 && board[r1][c1 - 1]) {
                const forced = oppositeValue(board[r1][c1 - 1]);
                pushStep(steps, r1, c1, forced, 'Touching Pair', 4);
                pushStep(steps, r2, c2, forced, 'Touching Pair', 4);
            }

            if (c2 + 1 < size && board[r2][c2 + 1]) {
                const forced = oppositeValue(board[r2][c2 + 1]);
                pushStep(steps, r1, c1, forced, 'Touching Pair', 4);
                pushStep(steps, r2, c2, forced, 'Touching Pair', 4);
            }
        } else {
            if (r1 - 1 >= 0 && board[r1 - 1][c1]) {
                const forced = oppositeValue(board[r1 - 1][c1]);
                pushStep(steps, r1, c1, forced, 'Touching Pair', 4);
                pushStep(steps, r2, c2, forced, 'Touching Pair', 4);
            }

            if (r2 + 1 < size && board[r2 + 1][c2]) {
                const forced = oppositeValue(board[r2 + 1][c2]);
                pushStep(steps, r1, c1, forced, 'Touching Pair', 4);
                pushStep(steps, r2, c2, forced, 'Touching Pair', 4);
            }
        }
    }

    return steps;
}

function edgePairBigGap(board: Board, _clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (let row = 0; row < size; row++) {
        const line = getRow(board, row);

        if (line[0] && line[size - 1] && line[0] === line[size - 1]) {
            const opposite = oppositeValue(line[0]);
            if (size === 6) {
                if (!line[1]) pushStep(steps, row, 1, opposite, 'Edge Pair / Big Gap', 6);
                if (!line[size - 2]) pushStep(steps, row, size - 2, opposite, 'Edge Pair / Big Gap', 6);
            }
        }

        if (size >= 8 && line[0] && line[1] && line[2] && line[0] === line[1] && line[1] === line[2] && !line[size - 2]) {
            pushStep(steps, row, size - 2, oppositeValue(line[0]), 'Edge Pair / Big Gap', 6);
        }

        if (size >= 8 && line[size - 1] && line[size - 2] && line[size - 3] && line[size - 1] === line[size - 2] && line[size - 2] === line[size - 3] && !line[1]) {
            pushStep(steps, row, 1, oppositeValue(line[size - 1]), 'Edge Pair / Big Gap', 6);
        }
    }

    for (let col = 0; col < size; col++) {
        const line = getCol(board, col, size);

        if (line[0] && line[size - 1] && line[0] === line[size - 1]) {
            const opposite = oppositeValue(line[0]);
            if (size === 6) {
                if (!line[1]) pushStep(steps, 1, col, opposite, 'Edge Pair / Big Gap', 6);
                if (!line[size - 2]) pushStep(steps, size - 2, col, opposite, 'Edge Pair / Big Gap', 6);
            }
        }

        if (size >= 8 && line[0] && line[1] && line[2] && line[0] === line[1] && line[1] === line[2] && !line[size - 2]) {
            pushStep(steps, size - 2, col, oppositeValue(line[0]), 'Edge Pair / Big Gap', 6);
        }

        if (size >= 8 && line[size - 1] && line[size - 2] && line[size - 3] && line[size - 1] === line[size - 2] && line[size - 2] === line[size - 3] && !line[1]) {
            pushStep(steps, 1, col, oppositeValue(line[size - 1]), 'Edge Pair / Big Gap', 6);
        }
    }

    return steps;
}

function equalGap(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    if (size !== 6) return steps;

    for (const clue of clues) {
        if (clue.type !== '=') continue;

        const [[r1, c1], [r2, c2]] = getClueEndpoints(clue);
        if (board[r1][c1] || board[r2][c2]) continue;

        if (clue.direction === 'h') {
            const isLeftEdge = c1 === 0 && c2 === 1;
            const isRightEdge = c1 === size - 2 && c2 === size - 1;
            if (!isLeftEdge && !isRightEdge) continue;

            const farCol = isLeftEdge ? size - 1 : 0;
            const farValue = board[r1][farCol];
            if (!farValue) continue;

            const forced = oppositeValue(farValue);
            pushStep(steps, r1, c1, forced, 'Equal-Gap', 7);
            pushStep(steps, r2, c2, forced, 'Equal-Gap', 7);
        } else {
            const isTopEdge = r1 === 0 && r2 === 1;
            const isBottomEdge = r1 === size - 2 && r2 === size - 1;
            if (!isTopEdge && !isBottomEdge) continue;

            const farRow = isTopEdge ? size - 1 : 0;
            const farValue = board[farRow][c1];
            if (!farValue) continue;

            const forced = oppositeValue(farValue);
            pushStep(steps, r1, c1, forced, 'Equal-Gap', 7);
            pushStep(steps, r2, c2, forced, 'Equal-Gap', 7);
        }
    }

    return steps;
}

function oppositeInference(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];
    const half = size / 2;
    const analyzedLines = new Set<string>();

    function collectForcedFromLine(
        lineKind: LineKind,
        lineIndex: number,
        xEndpoints: [number, number],
    ): SolveStep[] {
        const line = lineKind === 'row' ? getRow(board, lineIndex) : getCol(board, lineIndex, size);
        const empties = line.reduce<number[]>((indices, value, index) => {
            if (!value) indices.push(index);
            return indices;
        }, []);

        if (empties.length < 3 || empties.length > 6) return [];

        const counts = countInLine(line);
        if (counts.sun > half || counts.moon > half) return [];
        if (size - (counts.sun + counts.moon) > 6) return [];

        const [x1, x2] = xEndpoints;
        if (!empties.includes(x1) || !empties.includes(x2)) return [];

        const assignments = new Map<number, CellValue[]>();
        const working = cloneBoard(board);
        const emptiesSet = new Set(empties);
        const assignmentLimit = 128;
        let assignmentCount = 0;

        function walk(position: number): void {
            if (assignmentCount >= assignmentLimit) return;

            if (position === empties.length) {
                const values = line.map((_, offset) => {
                    const [row, col] = getLineCell(lineKind, lineIndex, offset);
                    return working[row][col];
                });

                const finalCount = countInLine(values);
                if (finalCount.sun !== half || finalCount.moon !== half) return;
                if (hasTripleInArray(values)) return;

                for (let offset = 0; offset < size; offset++) {
                    if (!emptiesSet.has(offset)) continue;
                    const [row, col] = getLineCell(lineKind, lineIndex, offset);
                    const value = working[row][col];
                    if (!value) continue;
                    const list = assignments.get(offset) ?? [];
                    list.push(value);
                    assignments.set(offset, list);
                }

                assignmentCount += 1;
                return;
            }

            const offset = empties[position];
            const [row, col] = getLineCell(lineKind, lineIndex, offset);

            for (const value of ['sun', 'moon'] as CellValue[]) {
                if (offset === x1) {
                    const [otherRow, otherCol] = getLineCell(lineKind, lineIndex, x2);
                    const other = working[otherRow][otherCol];
                    if (other && other === value) continue;
                }

                if (offset === x2) {
                    const [otherRow, otherCol] = getLineCell(lineKind, lineIndex, x1);
                    const other = working[otherRow][otherCol];
                    if (other && other === value) continue;
                }

                if (!applyCandidate(working, clues, size, row, col, value)) continue;

                const partial = line.map((_, lineOffset) => {
                    const [lineRow, lineCol] = getLineCell(lineKind, lineIndex, lineOffset);
                    return working[lineRow][lineCol];
                });

                const partialCount = countInLine(partial);
                if (partialCount.sun <= half && partialCount.moon <= half && !hasTripleInArray(partial)) {
                    walk(position + 1);
                }

                working[row][col] = null;
            }
        }

        walk(0);
        if (assignmentCount < 2) return [];

        const forced: SolveStep[] = [];
        for (const offset of empties) {
            const values = assignments.get(offset) ?? [];
            if (values.length !== assignmentCount) continue;

            const only = values[0];
            if (!only || !values.every(value => value === only)) continue;

            const [row, col] = getLineCell(lineKind, lineIndex, offset);
            if (!board[row][col]) {
                pushStep(forced, row, col, only, 'Opposite Inference', 9);
            }
        }

        return forced;
    }

    for (const clue of clues) {
        if (clue.type !== 'x') continue;

        const [[r1, c1], [r2, c2]] = getClueEndpoints(clue);
        const v1 = board[r1][c1];
        const v2 = board[r2][c2];

        if (v1 || v2) continue;

        if (clue.direction === 'h') {
            const key = `row:${r1}`;
            if (analyzedLines.has(key)) continue;
            analyzedLines.add(key);

            const row = getRow(board, r1);
            const { sun, moon } = countInLine(row);
            if (sun > half || moon > half) continue;

            const forced = collectForcedFromLine('row', r1, [c1, c2]);
            for (const step of forced) steps.push(step);
        } else {
            const key = `col:${c1}`;
            if (analyzedLines.has(key)) continue;
            analyzedLines.add(key);

            const col = getCol(board, c1, size);
            const { sun, moon } = countInLine(col);
            if (sun > half || moon > half) continue;

            const forced = collectForcedFromLine('col', c1, [r1, r2]);
            for (const step of forced) steps.push(step);
        }
    }

    return steps;
}

function inverseBigGap(board: Board, _clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    for (let row = 0; row < size; row++) {
        const line = getRow(board, row);
        for (let col = 0; col < size - 3; col++) {
            const left = line[col];
            const gap1 = line[col + 1];
            const gap2 = line[col + 2];
            const right = line[col + 3];

            if (!left || !right || left !== right || gap1 || gap2) continue;

            const opposite = oppositeValue(left);
            pushStep(steps, row, col + 1, opposite, 'Inverse Big Gap', 9);
            pushStep(steps, row, col + 2, left, 'Inverse Big Gap', 9);
        }
    }

    for (let col = 0; col < size; col++) {
        const line = getCol(board, col, size);
        for (let row = 0; row < size - 3; row++) {
            const top = line[row];
            const gap1 = line[row + 1];
            const gap2 = line[row + 2];
            const bottom = line[row + 3];

            if (!top || !bottom || top !== bottom || gap1 || gap2) continue;

            const opposite = oppositeValue(top);
            pushStep(steps, row + 1, col, opposite, 'Inverse Big Gap', 9);
            pushStep(steps, row + 2, col, top, 'Inverse Big Gap', 9);
        }
    }

    return steps;
}

function collectConstrainedEmptyCells(board: Board, clues: Clue[], size: number): [number, number][] {
    const cells = new Set<string>();

    for (const clue of clues) {
        const [[r1, c1], [r2, c2]] = getClueEndpoints(clue);
        if (!board[r1][c1]) cells.add(`${r1},${c1}`);
        if (!board[r2][c2]) cells.add(`${r2},${c2}`);
    }

    if (cells.size === 0) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (!board[row][col]) cells.add(`${row},${col}`);
            }
        }
    }

    return Array.from(cells).map(item => {
        const [row, col] = item.split(',').map(Number);
        return [row, col] as [number, number];
    });
}

function enumerateAssignments(
    board: Board,
    clues: Clue[],
    size: number,
    targets: [number, number][],
    limit: number,
): CellValue[][] {
    const results: CellValue[][] = [];
    const working = cloneBoard(board);

    function walk(index: number): void {
        if (results.length >= limit) return;

        if (index === targets.length) {
            const assignment = targets.map(([row, col]) => working[row][col]);
            results.push(assignment);
            return;
        }

        const [row, col] = targets[index];
        if (working[row][col]) {
            walk(index + 1);
            return;
        }

        for (const value of ['sun', 'moon'] as CellValue[]) {
            if (!applyCandidate(working, clues, size, row, col, value)) continue;
            walk(index + 1);
            working[row][col] = null;
        }
    }

    walk(0);
    return results;
}

function constraintEnumeration(board: Board, clues: Clue[], size: number): SolveStep[] {
    const steps: SolveStep[] = [];

    const targets = collectConstrainedEmptyCells(board, clues, size);
    if (targets.length === 0 || targets.length > 14) return steps;

    const assignments = enumerateAssignments(board, clues, size, targets, 2048);
    if (assignments.length === 0) return steps;

    for (let index = 0; index < targets.length; index++) {
        const values = new Set(assignments.map(assignment => assignment[index]));
        if (values.size !== 1) continue;

        const [row, col] = targets[index];
        const only = assignments[0][index];
        if (!board[row][col] && only) {
            pushStep(steps, row, col, only, 'Constraint Enumeration', 10);
        }
    }

    return steps;
}

const RULES: Rule[] = [
    { name: 'Clue Propagation', difficulty: 1, apply: cluePropagation },
    { name: 'Almost Full', difficulty: 1, apply: almostFull },
    { name: 'Triple Prevention', difficulty: 1, apply: triplePrevention },
    { name: 'Gap Fill', difficulty: 2, apply: gapFill },
    { name: 'Touching Pair', difficulty: 4, apply: touchingPair },
    { name: 'Edge Pair / Big Gap', difficulty: 6, apply: edgePairBigGap },
    { name: 'Equal-Gap', difficulty: 7, apply: equalGap },
    { name: 'Opposite Inference', difficulty: 9, apply: oppositeInference },
    { name: 'Inverse Big Gap', difficulty: 9, apply: inverseBigGap },
    { name: 'Constraint Enumeration', difficulty: 10, apply: constraintEnumeration },
];

function dedupeAndValidateSteps(board: Board, clues: Clue[], size: number, steps: SolveStep[]): SolveStep[] {
    const unique = new Map<string, SolveStep>();

    for (const step of steps) {
        if (!step.value) continue;
        if (!isInside(size, step.row, step.col)) continue;
        if (board[step.row][step.col]) continue;

        const key = `${step.row},${step.col}`;
        const existing = unique.get(key);

        if (existing && existing.value !== step.value) {
            if (step.difficulty < existing.difficulty) unique.set(key, step);
            continue;
        }

        if (!existing || step.difficulty < existing.difficulty) {
            unique.set(key, step);
        }
    }

    return Array.from(unique.values()).filter(step => canPlace(board, clues, size, step.row, step.col, step.value));
}

export function solve(initialBoard: Board, clues: Clue[], size: number): SolveResult {
    const board = cloneBoard(initialBoard);

    const steps: SolveStep[] = [];
    const rulesUsed = new Set<string>();

    let solvedDifficulty = 0;
    let maxRuleDifficulty = 0;

    let progress = true;
    while (progress) {
        progress = false;

        for (const rule of RULES) {
            const proposed = rule.apply(board, clues, size);
            const valid = dedupeAndValidateSteps(board, clues, size, proposed);
            if (valid.length === 0) continue;

            for (const step of valid) {
                const applied = applyCandidate(board, clues, size, step.row, step.col, step.value);
                if (!applied) continue;

                steps.push(step);
                rulesUsed.add(step.rule);
                solvedDifficulty += step.difficulty;
                maxRuleDifficulty = Math.max(maxRuleDifficulty, step.difficulty);
            }

            progress = true;
            break;
        }
    }

    const solved = board.every(line => line.every(Boolean));

    return {
        solved,
        solution: board,
        difficulty: solvedDifficulty,
        maxRuleDifficulty,
        steps,
        rulesUsed: Array.from(rulesUsed),
    };
}

export function getNextHint(currentBoard: Board, clues: Clue[], size: number): SolveStep | null {
    const board = cloneBoard(currentBoard);

    for (const rule of RULES) {
        const proposed = rule.apply(board, clues, size);
        const valid = dedupeAndValidateSteps(board, clues, size, proposed);
        if (valid.length > 0) {
            return valid[0];
        }
    }

    return null;
}
