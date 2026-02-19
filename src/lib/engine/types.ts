// Core types for the Tango puzzle engine

export type CellValue = 'sun' | 'moon' | null;
export type Board = CellValue[][];

export type ClueDirection = 'h' | 'v'; // horizontal or vertical
export type ClueType = '=' | 'x';

export interface Clue {
  row: number;
  col: number;
  direction: ClueDirection; // 'h' = between (row,col) and (row,col+1), 'v' = between (row,col) and (row+1,col)
  type: ClueType;
}

export interface SolveStep {
  row: number;
  col: number;
  value: CellValue;
  rule: string;
  difficulty: number;
}

export interface SolveResult {
  solved: boolean;
  solution: Board;
  difficulty: number;
  steps: SolveStep[];
  rulesUsed: string[];
}

export interface Puzzle {
  board: Board;       // initial board with blanks
  solution: Board;    // complete solution
  clues: Clue[];
  difficulty: number;
  label: string;      // Easy, Medium, Hard, Very Hard
  size: number;
}

export type BoardSize = 4 | 6 | 8 | 10;

export interface BoardConfig {
  size: BoardSize;
  half: number;       // size / 2
  minClues: number;
  maxClues: number;
}

export const BOARD_CONFIGS: Record<BoardSize, BoardConfig> = {
  4:  { size: 4,  half: 2,  minClues: 2,  maxClues: 4  },
  6:  { size: 6,  half: 3,  minClues: 4,  maxClues: 8  },
  8:  { size: 8,  half: 4,  minClues: 6,  maxClues: 12 },
  10: { size: 10, half: 5,  minClues: 8,  maxClues: 16 },
};

export function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 6) return 'Easy';
  if (difficulty <= 15) return 'Medium';
  if (difficulty <= 30) return 'Hard';
  return 'Very Hard';
}

export function oppositeValue(v: CellValue): CellValue {
  if (v === 'sun') return 'moon';
  if (v === 'moon') return 'sun';
  return null;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}
