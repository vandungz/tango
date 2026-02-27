// Server-side helpers for daily streaks and journey stars
import { prisma } from '@/lib/db';

const db = prisma as unknown as {
    dailyResult: any;
};

export function startOfDayUtc(date: Date = new Date()): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDaysUtc(date: Date, days: number): Date {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
}

export function starsFromTime(seconds: number | null | undefined): number {
    if (!Number.isFinite(seconds) || seconds === null || seconds === undefined) return 0;
    if (seconds <= 120) return 3;
    if (seconds <= 240) return 2;
    return 0;
}

export async function computeDailyStreak(sessionId: string, referenceDate: Date = new Date()) {
    const today = startOfDayUtc(referenceDate);

    const results = await db.dailyResult.findMany({
        where: { sessionId },
        include: { daily: true },
        orderBy: { daily: { date: 'desc' } },
    });

    // Current streak counting backward from today
    let current = 0;
    let expected = today;

    for (const res of results) {
        const played = startOfDayUtc(new Date(res.daily.date));
        const diff = played.getTime() - expected.getTime();

        if (diff === 0) {
            current += 1;
            expected = addDaysUtc(expected, -1);
        } else if (diff < 0) {
            break; // streak broken
        } else {
            continue; // future date should not happen, skip
        }
    }

    // Best streak across history (ascending scan)
    const ascending = [...results].reverse();
    let best = 0;
    let streak = 0;
    let prev: Date | null = null;

    for (const res of ascending) {
        const played = startOfDayUtc(new Date(res.daily.date));

        if (!prev) {
            streak = 1;
        } else if (played.getTime() === addDaysUtc(prev, 1).getTime()) {
            streak += 1;
        } else if (played.getTime() === prev.getTime()) {
            // duplicate day shouldn't occur because of unique constraint, but guard
        } else {
            streak = 1;
        }

        prev = played;
        if (streak > best) best = streak;
    }

    best = Math.max(best, current);

    return { current, best };
}