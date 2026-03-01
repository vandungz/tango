import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePlayerIdentity } from '@/lib/player';

const db = prisma as unknown as {
    journeyResult: any;
    journeyLevel: any;
};

const TOTAL_LEVELS = 200;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const player = await resolvePlayerIdentity(searchParams.get('sessionId'));

    if (!player) {
        return NextResponse.json({ error: 'Authentication or sessionId is required' }, { status: 401 });
    }

    const where = player.userId ? { userId: player.userId } : { sessionId: player.sessionId };

    try {
        const results = await db.journeyResult.findMany({
            where,
            orderBy: { completedAt: 'asc' },
        });

        const levelIds = [...new Set(results.map((r: { levelId: string }) => r.levelId))];
        const levels = levelIds.length
            ? await db.journeyLevel.findMany({
                where: { id: { in: levelIds } },
                select: { id: true, order: true },
            })
            : [];
        const levelMap = new Map(levels.map((l: { id: string; order: number }) => [l.id, l.order]));

        const progress = results
            .map((r: any) => {
                const levelOrder = levelMap.get(r.levelId);
                if (!Number.isFinite(levelOrder)) return null;
                return {
                    level: levelOrder,
                    stars: r.stars,
                    timeSeconds: r.timeSeconds,
                };
            })
            .filter((item: { level: number; stars: number; timeSeconds: number | null } | null): item is { level: number; stars: number; timeSeconds: number | null } => item !== null)
            .sort(
                (
                    a: { level: number; stars: number; timeSeconds: number | null },
                    b: { level: number; stars: number; timeSeconds: number | null },
                ) => a.level - b.level,
            );

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
