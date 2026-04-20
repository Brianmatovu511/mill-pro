const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful shutdown — release connections cleanly on process exit
process.on('beforeExit', async () => { await prisma.$disconnect(); });

module.exports = prisma;
