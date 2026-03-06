// SHA-256 hash of solution + clues for deduplication
import { Board, Clue } from './types';
import { createHash } from 'crypto';

export function hashPuzzle(solution: Board, clues: Clue[]): string {
    const data = JSON.stringify({ solution, clues });
    return createHash('sha256').update(data).digest('hex');
}
