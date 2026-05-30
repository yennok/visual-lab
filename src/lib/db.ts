// Prisma client singleton. Survives Next.js hot-reload in dev by stashing the
// instance on globalThis. Generated client lives in node_modules/@prisma/client
// after `npx prisma generate`.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
