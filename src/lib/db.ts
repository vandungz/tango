// Prisma client singleton for Next.js
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaBetterSqlite3({ url: datasourceUrl });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
