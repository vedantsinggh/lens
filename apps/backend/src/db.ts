import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error']
});

let isConnected = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isConnected = true;
    return true;
  } catch (error) {
    console.warn('[Database] Database connection check failed:', error instanceof Error ? error.message : error);
    isConnected = false;
    return false;
  }
}

export function isDatabaseHealthy(): boolean {
  return isConnected;
}
