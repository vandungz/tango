import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePlayerIdentity } from '@/lib/player';

const SUPPORTED_SIZES = [4, 6, 8, 10] as const;
const SUPPORTED_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Very Hard'] as const;
const SUPPORTED_MODES = ['daily'] as const;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type LeaderboardMode = (typeof SUPPORTED_MODES)[number];
type SupportedDifficulty = (typeof SUPPORTED_DIFFICULTIES)[number];

interface Candidate {
    displayName: string;
    avatarInitial: string;
    bestSeconds: number;
    solvedCount: number;
    userId: string | null;
    sessionId: string | null;
}

const db = prisma as unknown as {
    dailyResult: {
        findMany: (args: unknown) => Promise<Array<{
            durationSeconds: number;
            userId: string | null;
            sessionId: string | null;
            user: { username: string } | null;
            daily: { puzzle: { size: number; label: string } | null } | null;
        }>>;
    };
    journeyResult: {
        findMany: (args: unknown) => Promise<Array<{
            timeSeconds: number;
            userId: string | null;
            sessionId: string | null;
            user: { username: string } | null;
            level: { puzzle: { size: number; label: string } | null } | null;
        }>>;
    };
};

function toMode(): LeaderboardMode {
    return 'daily';
}

function toSize(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const size = Math.round(parsed);
    return SUPPORTED_SIZES.includes(size as (typeof SUPPORTED_SIZES)[number]) ? size : null;
}

function normalizeDifficulty(label: string | null | undefined): SupportedDifficulty | null {
    if (!label) return null;
    const normalized = label.trim().toLowerCase();

    if (normalized === 'easy') return 'Easy';
    if (normalized === 'medium') return 'Medium';
    if (normalized === 'hard') return 'Hard';
    if (normalized === 'very hard' || normalized === 'veryhard') return 'Very Hard';

    return null;
}

function toDifficulty(value: string | null): SupportedDifficulty | null {
    return normalizeDifficulty(value ?? null);
}

function toLimit(value: string | null): number {
    if (value === null || value.trim() === '') return DEFAULT_LIMIT;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, Math.max(1, Math.round(parsed)));
}

function toGuestName(sessionId: string): string {
    const adjectives = ['Swift', 'Calm', 'Bright', 'Bold', 'Happy', 'Nimble', 'Rapid', 'Tender'];
    const animals = ['Bear', 'Eagle', 'Wolf', 'Seal', 'Whale', 'Hawk', 'Fox', 'Otter'];
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
        hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
    }
    const adjective = adjectives[hash % adjectives.length];
    const animal = animals[Math.floor(hash / adjectives.length) % animals.length];
    return `${adjective} ${animal}`;
}

function addCandidate(target: Map<string, Candidate>, row: {
    userId: string | null;
    sessionId: string | null;
    username: string | null;
    seconds: number;
}) {
    if (!Number.isFinite(row.seconds) || row.seconds <= 0) return;

    const key = row.userId ? `user:${row.userId}` : row.sessionId ? `session:${row.sessionId}` : null;
    if (!key) return;

    const fallbackGuest = row.sessionId ? toGuestName(row.sessionId) : 'Guest';
    const displayName = row.username?.trim() || fallbackGuest;
    const avatarInitial = displayName[0]?.toUpperCase() ?? 'U';

    const existing = target.get(key);
    if (!existing) {
        target.set(key, {
            displayName,
            avatarInitial,
            bestSeconds: row.seconds,
            solvedCount: 1,
            userId: row.userId,
            sessionId: row.sessionId,
        });
        return;
    }

    existing.bestSeconds = Math.min(existing.bestSeconds, row.seconds);
    existing.solvedCount += 1;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = toMode();
    const selectedSize = toSize(searchParams.get('size'));
    const selectedDifficulty = toDifficulty(searchParams.get('difficulty'));
    const limit = toLimit(searchParams.get('limit'));
    const player = await resolvePlayerIdentity(searchParams.get('sessionId'));

    try {
        const candidateMap = new Map<string, Candidate>();

        const rows = await db.dailyResult.findMany({
            select: {
                durationSeconds: true,
                userId: true,
                sessionId: true,
                user: { select: { username: true } },
                daily: {
                    select: {
                        puzzle: {
                            select: {
                                size: true,
                                label: true,
                            },
                        },
                    },
                },
            },
        });

        for (const row of rows) {
            const puzzle = row.daily?.puzzle;
            if (!puzzle) continue;

            const difficulty = normalizeDifficulty(puzzle.label);

            if (selectedSize && puzzle.size !== selectedSize) continue;
            if (selectedDifficulty && difficulty !== selectedDifficulty) continue;

            addCandidate(candidateMap, {
                userId: row.userId,
                sessionId: row.sessionId,
                username: row.user?.username ?? null,
                seconds: row.durationSeconds,
            });
        }

        const ranked = Array.from(candidateMap.values())
            .sort((a, b) => {
                if (a.bestSeconds !== b.bestSeconds) return a.bestSeconds - b.bestSeconds;
                if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
                return a.displayName.localeCompare(b.displayName);
            })
            .map((item, index) => ({
                rank: index + 1,
                displayName: item.displayName,
                avatarInitial: item.avatarInitial,
                bestSeconds: item.bestSeconds,
                solvedCount: item.solvedCount,
                userId: item.userId,
                sessionId: item.sessionId,
            }));

        const viewer = player
            ? ranked.find((entry) => (player.userId ? entry.userId === player.userId : entry.sessionId === player.sessionId))
            : null;

        const topEntries = ranked.slice(0, limit).map((entry) => ({
            rank: entry.rank,
            displayName: entry.displayName,
            avatarInitial: entry.avatarInitial,
            bestSeconds: entry.bestSeconds,
            solvedCount: entry.solvedCount,
            isViewer: viewer ? entry.rank === viewer.rank : false,
        }));

        return NextResponse.json({
            mode,
            size: selectedSize,
            difficulty: selectedDifficulty,
            totalParticipants: ranked.length,
            filters: {
                modes: SUPPORTED_MODES,
                sizes: SUPPORTED_SIZES,
                difficulties: SUPPORTED_DIFFICULTIES,
            },
            leaderboard: topEntries,
            viewer: viewer
                ? {
                    rank: viewer.rank,
                    displayName: viewer.displayName,
                    avatarInitial: viewer.avatarInitial,
                    bestSeconds: viewer.bestSeconds,
                    solvedCount: viewer.solvedCount,
                }
                : null,
        });
    } catch (error) {
        console.error('Leaderboard route error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}