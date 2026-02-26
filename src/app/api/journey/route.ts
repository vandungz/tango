import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const db = prisma as unknown as {
    journeyResult: any;
};

const TOTAL_LEVELS = 200;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    try {
        const results = await db.journeyResult.findMany({
            where: { sessionId },
            include: { level: true },
            orderBy: { level: { order: 'asc' } },
        });

        const progress = results.map((r: any) => ({
            level: r.level.order,
            stars: r.stars,
            timeSeconds: r.timeSeconds,
        }));

        const completed = new Set(progress.map((p: { level: number }) => p.level));
        let nextLevel = TOTAL_LEVELS;
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            if (!completed.has(i)) {
                nextLevel = i;
                break;
            }
        }

        const starsEarned = progress.reduce((sum: number, p: { stars: number }) => sum + p.stars, 0);

        return NextResponse.json({
            totalLevels: TOTAL_LEVELS,
            nextLevel,
            starsEarned,
            progress,
        });
    } catch (error) {
        console.error('Journey progress error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
