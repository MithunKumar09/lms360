/**
 * Certificate Generation Job Queue
 * 
 * Manages background jobs for certificate PDF/image generation using BullMQ.
 * Falls back to immediate processing if Redis is not available.
 */

import { Queue } from 'bullmq';
import { getRedisClient } from './redis.js';

const QUEUE_NAME = 'certificate-generation';

let certificateQueue = null;

/**
 * Get or create certificate generation queue
 * @returns {Queue|null} BullMQ queue or null if Redis unavailable
 */
export function getCertificateQueue() {
  if (certificateQueue) {
    return certificateQueue;
  }

  const redis = getRedisClient();
  if (!redis) {
    console.warn('Redis not available. Certificate generation will process immediately (no queue).');
    return null;
  }

  certificateQueue = new Queue(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2s delay, exponential backoff
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  return certificateQueue;
}

/**
 * Add certificate generation job to queue
 * @param {Object} jobData - Job data
 * @param {string} jobData.certificateId - Certificate template ID
 * @param {string} jobData.studentId - Student ID
 * @param {string} jobData.issuedCertificateId - Issued certificate record ID
 * @param {string} jobData.format - Format: 'pdf' or 'image'
 * @returns {Promise<string>} Job ID
 */
export async function queueCertificateGeneration(jobData) {
  const queue = getCertificateQueue();
  
  if (!queue) {
    // Fallback: process immediately (for development without Redis)
    throw new Error('Queue not available. Please configure Redis or use immediate processing.');
  }

  const job = await queue.add('generate-certificate', jobData, {
    jobId: `cert-${jobData.issuedCertificateId}-${Date.now()}`,
    priority: 1, // Normal priority
  });

  return job.id;
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Job status or null if not found
 */
export async function getJobStatus(jobId) {
  const queue = getCertificateQueue();
  if (!queue) {
    return null;
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress || 0;
  const returnvalue = job.returnvalue || null;
  const failedReason = job.failedReason || null;

  return {
    id: job.id,
    name: job.name,
    state,
    progress,
    data: job.data,
    returnvalue,
    failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Close queue connection
 */
export async function closeCertificateQueue() {
  if (certificateQueue) {
    await certificateQueue.close();
    certificateQueue = null;
  }
}

export default {
  getCertificateQueue,
  queueCertificateGeneration,
  getJobStatus,
  closeCertificateQueue,
};
