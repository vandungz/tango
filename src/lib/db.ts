// Prisma client singleton for Next.js
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

// Neon/Postgres uses the default Prisma driver (no adapter needed)
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ['error'], // satisfy required options param and keep noise low
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
