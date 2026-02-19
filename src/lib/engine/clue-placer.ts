// Step 2: Place "=" and "×" clues on the solved board
// Picks random neighbor pairs and checks the solution to determine clue type

import { Board, Clue, BoardSize, BOARD_CONFIGS } from './types';
import { shuffle } from './patterns';

interface CellPair {
    row: number;
    col: number;
    direction: 'h' | 'v';
}

function getAllNeighborPairs(size: number): CellPair[] {
    const pairs: CellPair[] = [];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            // Horizontal pair: (r,c) and (r,c+1)
            if (c + 1 < size) {
                pairs.push({ row: r, col: c, direction: 'h' });
            }
            // Vertical pair: (r,c) and (r+1,c)
            if (r + 1 < size) {
                pairs.push({ row: r, col: c, direction: 'v' });
            }
        }
    }

    return pairs;
}

export function placeClues(solution: Board, size: BoardSize): Clue[] {
    const config = BOARD_CONFIGS[size];
    const allPairs = shuffle(getAllNeighborPairs(size));

    // Determine number of clues: random between min and max
    const numClues = config.minClues + Math.floor(Math.random() * (config.maxClues - config.minClues + 1));

    const clues: Clue[] = [];

    for (const pair of allPairs) {
        if (clues.length >= numClues) break;

        const { row, col, direction } = pair;
        let val1 = solution[row][col];
        let val2: typeof val1;

        if (direction === 'h') {
            val2 = solution[row][col + 1];
        } else {
            val2 = solution[row + 1][col];
        }

        if (val1 === null || val2 === null) continue;

        const clueType = val1 === val2 ? '=' : 'x';

        clues.push({
            row,
            col,
            direction,
            type: clueType as '=' | 'x',
        });
    }

    return clues;
}
