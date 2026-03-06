import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const db = prisma as unknown as {
    user: {
        findUnique: (args: unknown) => Promise<{ email: string; username: string; displayName: string | null } | null>;
        update: (args: unknown) => Promise<{ email: string; username: string; displayName: string | null }>;
    };
};

function normalizeDisplayName(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
}

function isDisplayNameColumnError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('displayname') && (message.includes('column') || message.includes('unknown arg'));
}

export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.id?.trim();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const user = await db.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    username: true,
                    displayName: true,
                },
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({
                email: user.email,
                username: user.username,
                displayName: user.displayName,
            });
        } catch (error) {
            if (!isDisplayNameColumnError(error)) throw error;

            const fallbackUser = await db.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    username: true,
                },
            }) as { email: string; username: string } | null;

            if (!fallbackUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({
                email: fallbackUser.email,
                username: fallbackUser.username,
                displayName: null,
                warning: 'displayName column is missing in database',
            });
        }
    } catch (error) {
        console.error('Profile GET error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id?.trim();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: { displayName?: unknown };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const nextDisplayName = normalizeDisplayName(body.displayName);

        if (nextDisplayName.length < 2 || nextDisplayName.length > 40) {
            return NextResponse.json(
                { error: 'Display name must be between 2 and 40 characters' },
                { status: 400 },
            );
        }

        try {
            const updated = await db.user.update({
                where: { id: userId },
                data: { displayName: nextDisplayName },
                select: {
                    email: true,
                    username: true,
                    displayName: true,
                },
            });

            return NextResponse.json({
                email: updated.email,
                username: updated.username,
                displayName: updated.displayName,
            });
        } catch (error) {
            if (!isDisplayNameColumnError(error)) throw error;

            return NextResponse.json(
                { error: 'displayName column is missing in database. Run prisma db push and restart dev server.' },
                { status: 503 },
            );
        }
    } catch (error) {
        console.error('Profile PATCH error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}