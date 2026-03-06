import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePuzzle } from '@/engine/puzzle-factory';
import { BoardSize } from '@/engine/types';
import { computeDailyStreak, startOfDayUtc, starsFromTime } from '@/lib/progression';
import { resolvePlayerIdentity } from '@/lib/player';

const DEFAULT_DAILY_SIZE: BoardSize = 6;
const VALID_DAILY_SIZES: BoardSize[] = [4, 6, 8, 10];
const MAX_GENERATION_ATTEMPTS = 6;
const PRO_MODE_INTERNAL_ATTEMPTS = 10;

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    dailyPuzzle: any;
    dailyResult: any;
};

function normalizeDailySize(sizeParam: string | null): BoardSize {
    const parsed = Number.parseInt(sizeParam || String(DEFAULT_DAILY_SIZE), 10);
    if (VALID_DAILY_SIZES.includes(parsed as BoardSize)) {
        return parsed as BoardSize;
    }
    return DEFAULT_DAILY_SIZE;
}

function normalizeProMode(value: string | null): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

async function ensurePuzzle(size: BoardSize, proMode: boolean) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const puzzle = generatePuzzle(size, {
            proMode,
            attempts: proMode ? PRO_MODE_INTERNAL_ATTEMPTS : 1,
        });

        const existing = await db.puzzle.findUnique({ where: { hash: puzzle.hash } });
        const puzzleRecord = existing ?? await db.puzzle.create({
            data: {
                size: puzzle.size,
                hash: puzzle.hash,
                board: JSON.stringify(puzzle.board),
                solution: JSON.stringify(puzzle.solution),
                clues: JSON.stringify(puzzle.clues),
                difficulty: puzzle.difficulty,
                maxRuleDifficulty: puzzle.maxRuleDifficulty,
                rulesUsed: JSON.stringify(puzzle.rulesUsed),
                clueCount: puzzle.clueCount,
                givensCount: puzzle.givensCount,
                baseRowPatternCount: puzzle.baseRowPatternCount,
                generationVersion: puzzle.generationVersion,
                solverVersion: puzzle.solverVersion,
                label: puzzle.label,
            },
        });

        return puzzleRecord;
    }

    throw new Error('Failed to generate a unique daily puzzle');
}

async function ensureDailyForDate(date: Date, size: BoardSize, proMode: boolean) {
    const day = startOfDayUtc(date);

    let daily = await db.dailyPuzzle.findFirst({ where: { date: day, size, proMode } });
    if (daily) return daily;

    const puzzle = await ensurePuzzle(size, proMode);

    daily = await db.dailyPuzzle.create({
        data: {
            date: day,
            size,
            proMode,
            puzzleId: puzzle.id,
        },
    });

    return daily;
}

async function getVariantProgress(date: Date, player: { userId: string | null; sessionId: string | null }) {
    const day = startOfDayUtc(date);
    const identityWhere = player.userId ? { userId: player.userId } : { sessionId: player.sessionId };

    const results = await db.dailyResult.findMany({
        where: {
            ...identityWhere,
            daily: {
                date: day,
            },
        },
        include: { daily: true },
        orderBy: { completedAt: 'asc' },
    });

    const bySize = new Map<number, { completed: boolean; durationSeconds: number | null; stars: number | null }>();

    for (const result of results) {
        const size = Number(result.daily?.size);
        if (!VALID_DAILY_SIZES.includes(size as BoardSize)) continue;
        const candidate = {
            completed: true,
            durationSeconds: result.durationSeconds ?? null,
            stars: Number.isFinite(result.stars) ? result.stars : starsFromTime(result.durationSeconds),
        };

        const existing = bySize.get(size);
        if (!existing) {
            bySize.set(size, candidate);
            continue;
        }

        const existingStars = existing.stars ?? 0;
        const candidateStars = candidate.stars ?? 0;
        const existingDuration = existing.durationSeconds ?? Number.POSITIVE_INFINITY;
        const candidateDuration = candidate.durationSeconds ?? Number.POSITIVE_INFINITY;

        const shouldReplace = candidateStars > existingStars || (candidateStars === existingStars && candidateDuration < existingDuration);
        if (shouldReplace) {
            bySize.set(size, candidate);
        }
    }

    return VALID_DAILY_SIZES.map(size => {
        const entry = bySize.get(size);
        return {
            size,
            completed: entry?.completed ?? false,
            durationSeconds: entry?.durationSeconds ?? null,
            stars: entry?.stars ?? null,
        };
    });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const player = await resolvePlayerIdentity(searchParams.get('sessionId'));
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const size = normalizeDailySize(searchParams.get('size'));
    const proMode = normalizeProMode(searchParams.get('proMode'));

    if (!player) {
        return NextResponse.json({ error: 'Authentication or sessionId is required' }, { status: 401 });
    }

    if (!Number.isFinite(targetDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    try {
        const daily = await ensureDailyForDate(targetDate, size, proMode);
        const puzzle = await db.puzzle.findUnique({ where: { id: daily.puzzleId } });

        if (!puzzle) {
            return NextResponse.json({ error: 'Puzzle not found for daily' }, { status: 404 });
        }

        const streak = await computeDailyStreak(player, targetDate);
        const variants = await getVariantProgress(targetDate, player);
        const selectedProgress = variants.find((entry) => entry.size === size) ?? null;

        return NextResponse.json({
            dailyId: daily.id,
            date: daily.date.toISOString(),
            id: puzzle.id,
            size: puzzle.size,
            proMode,
            board: JSON.parse(puzzle.board),
            clues: JSON.parse(puzzle.clues),
            difficulty: puzzle.difficulty,
            label: puzzle.label,
            dailyOptions: {
                size,
                proMode,
                variants,
            },
            progress: {
                completed: selectedProgress?.completed ?? false,
                durationSeconds: selectedProgress?.durationSeconds ?? null,
                stars: selectedProgress?.stars ?? null,
                streak: streak.current,
                bestStreak: streak.best,
            },
        });
    } catch (error) {
        console.error('Daily route error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
