import { NextRequest, NextResponse } from 'next/server';
import { auditActiveJourneySet, rebuildJourneySet } from '@/lib/journey-set';

function asBoolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return defaultValue;
}

function readAdminToken(request: NextRequest) {
    return request.headers.get('x-admin-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
}

function isAuthorized(request: NextRequest) {
    const expected = process.env.JOURNEY_ADMIN_TOKEN;
    if (!expected) {
        return { ok: false, status: 503, message: 'JOURNEY_ADMIN_TOKEN is not configured' };
    }

    const received = readAdminToken(request);
    if (!received || received !== expected) {
        return { ok: false, status: 401, message: 'Unauthorized' };
    }

    return { ok: true as const };
}

export async function GET(request: NextRequest) {
    const auth = isAuthorized(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    try {
        const report = await auditActiveJourneySet();
        return NextResponse.json(report);
    } catch (error) {
        console.error('Journey audit failed', error);
        return NextResponse.json({ error: 'Failed to audit Journey set' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = isAuthorized(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    try {
        const body = await request.json().catch(() => ({} as Record<string, unknown>));

        const result = await rebuildJourneySet({
            setKey: typeof body.setKey === 'string' ? body.setKey : undefined,
            setLabel: typeof body.setLabel === 'string' ? body.setLabel : undefined,
            description: typeof body.description === 'string' ? body.description : undefined,
            totalLevels: Number.isFinite(body.totalLevels as number) ? Number(body.totalLevels) : undefined,
            dryRun: asBoolean(body.dryRun, true),
            force: asBoolean(body.force, false),
            maxAttemptsPerLevel: Number.isFinite(body.maxAttemptsPerLevel as number) ? Number(body.maxAttemptsPerLevel) : undefined,
            perPuzzleAttempts: Number.isFinite(body.perPuzzleAttempts as number) ? Number(body.perPuzzleAttempts) : undefined,
            purgePreviousSets: asBoolean(body.purgePreviousSets, false),
            resetPreviousProgress: asBoolean(body.resetPreviousProgress, false),
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Journey rebuild failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to rebuild Journey set' },
            { status: 500 },
        );
    }
}
