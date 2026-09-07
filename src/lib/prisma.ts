import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cache the client on the global object in every environment, not just dev.
// On Vercel, each warm serverless container reuses this module between
// invocations — without caching here, every request instantiates a fresh
// PrismaClient (and its own connection pool), which is what was slowing
// down every page.
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;
