import { auth } from '@/lib/auth';

export type PlayerIdentity =
    | { userId: string; sessionId: string | null }
    | { userId: null; sessionId: string };

export function normalizeSessionId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function resolvePlayerIdentity(sessionIdInput?: unknown): Promise<PlayerIdentity | null> {
    let userId: string | undefined;
    try {
        const session = await auth();
        userId = session?.user?.id?.trim();
    } catch (error) {
        console.warn('Failed to resolve auth session for player identity, falling back to sessionId.', error);
    }
    const sessionId = normalizeSessionId(sessionIdInput);

    if (userId) {
        return { userId, sessionId };
    }

    if (sessionId) {
        return { userId: null, sessionId };
    }

    return null;
}