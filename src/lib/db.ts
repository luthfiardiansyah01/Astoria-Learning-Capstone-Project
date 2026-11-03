import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Di produksi & test jangan log setiap query (berisik + bisa membocorkan data).
const logLevels: ('query' | 'error' | 'warn')[] =
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'
    ? ['error', 'warn']
    : ['query', 'warn', 'error']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db