/**
 * Certificate Generation Worker Startup Script
 * 
 * Run this script to start the certificate generation worker.
 * 
 * Usage:
 *   node src/lib/queue/startWorker.js
 * 
 * Or add to package.json:
 *   "worker:certificates": "node src/lib/queue/startWorker.js"
 */

import { createCertificateWorker } from './certificateWorker.js';
import { isRedisAvailable } from './redis.js';

async function startWorker() {
  console.log('Starting certificate generation worker...');

  // Check Redis availability
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.error('❌ Redis is not available. Please configure Redis to use the worker.');
    console.error('   Set REDIS_URL or REDIS_HOST in your .env file.');
    console.error('   Worker will not start.');
    process.exit(1);
  }

  // Create and start worker
  const worker = createCertificateWorker();
  if (!worker) {
    console.error('❌ Failed to create worker.');
    process.exit(1);
  }

  console.log('✅ Certificate generation worker started successfully.');
  console.log('   Listening for certificate generation jobs...');

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down worker...');
    await worker.close();
    process.exit(0);
  });
}

startWorker().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
