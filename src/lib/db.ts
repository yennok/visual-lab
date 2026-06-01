// Prisma client singleton. Survives Next.js hot-reload in dev by stashing the
// instance on globalThis. Generated client lives in node_modules/@prisma/client
// after `npx prisma generate`.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Neon (our Postgres host) auto-suspends the database when it's idle. The first
// connection after that cold start can take several seconds to wake the compute
// — longer than Prisma's default 10s pool / 5s connect timeout, which surfaces
// as "Timed out fetching a new connection from the connection pool". Give the
// wake-up a longer leash so it doesn't lose the race on the first request.
function withColdStartTimeouts(url?: string): string | undefined {
  if (!url) return url;
  const extra: string[] = [];
  if (!/[?&]connect_timeout=/.test(url)) extra.push("connect_timeout=30");
  if (!/[?&]pool_timeout=/.test(url)) extra.push("pool_timeout=30");
  if (extra.length === 0) return url;
  return url + (url.includes("?") ? "&" : "?") + extra.join("&");
}

const datasourceUrl = withColdStartTimeouts(process.env.POSTGRES_PRISMA_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
