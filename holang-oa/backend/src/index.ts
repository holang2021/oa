import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from './app';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 HOLANG CRM Backend Server running on port ${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/v1`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default server;
