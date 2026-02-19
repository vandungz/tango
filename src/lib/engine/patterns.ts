// Generate all valid row patterns for a given board size.
// A valid row has exactly half suns and half moons and contains no 3-in-a-row.

import { CellValue, BoardSize } from './types';

type RawPattern = number[];

function hasTriple(values: RawPattern): boolean {
    for (let i = 0; i < values.length - 2; i++) {
        const a = values[i];
        if (a === values[i + 1] && a === values[i + 2]) {
            return true;
        }
    }
    return false;
}

function rawToCells(pattern: RawPattern): CellValue[] {
    return pattern.map(v => (v === 0 ? 'sun' : 'moon'));
}

function generateValidPatterns(size: BoardSize): CellValue[][] {
    const half = size / 2;
    const patterns: CellValue[][] = [];
    const maxMask = 1 << size; // size <= 10 so this is small (<= 1024)

    for (let mask = 0; mask < maxMask; mask++) {
        const raw: RawPattern = [];
        let moons = 0;

        for (let i = 0; i < size; i++) {
            const bit = (mask >> i) & 1;
            if (bit === 1) moons += 1;
            raw.push(bit);
        }

        if (moons !== half) continue; // must be balanced
        if (hasTriple(raw)) continue;  // no 3 identical in a row

        patterns.push(rawToCells(raw));
    }

    return patterns;
}

const PATTERN_CACHE: Partial<Record<BoardSize, CellValue[][]>> = {};

export function getAllPatterns(size: BoardSize): CellValue[][] {
    if (!PATTERN_CACHE[size]) {
        PATTERN_CACHE[size] = generateValidPatterns(size);
    }
    return PATTERN_CACHE[size] as CellValue[][];
}

// Shuffle array in-place (Fisher-Yates)
export function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
