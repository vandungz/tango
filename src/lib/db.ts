// Prisma client singleton for Next.js
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const defaultUrl = process.env.VERCEL ? 'file:/tmp/tango.db' : 'file:./prisma/dev.db';
const datasourceUrl = process.env.DATABASE_URL || defaultUrl;

const adapter = new PrismaBetterSqlite3({ url: datasourceUrl });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
