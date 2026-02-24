// Prisma client singleton for Next.js
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
}

// Neon over HTTPS (no WebSocket) for Vercel serverless/edge
const adapter = new PrismaNeonHttp(databaseUrl, {});

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ['error'], // keep client logs quiet in production
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}