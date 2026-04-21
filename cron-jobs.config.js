/**
 * Cron Jobs Configuration
 * 
 * Configuration for all scheduled payment-related jobs
 * Can be used with Vercel Cron, GitHub Actions, or external cron services
 */

export const cronJobs = [
  {
    name: 'reconcile-settlements',
    schedule: '0 2 * * *', // Daily at 2 AM
    endpoint: '/api/jobs/reconcile-settlements',
    method: 'POST',
    description: 'Daily settlement reconciliation',
  },
  {
    name: 'compute-vendor-balances',
    schedule: '0 3 * * *', // Daily at 3 AM
    endpoint: '/api/jobs/compute-vendor-balances',
    method: 'POST',
    description: 'Compute vendor balances after hold period',
  },
  {
    name: 'process-payouts',
    schedule: '0 4 * * *', // Daily at 4 AM
    endpoint: '/api/jobs/process-payouts',
    method: 'POST',
    description: 'Process queued vendor payouts',
  },
  {
    name: 'retry-webhooks',
    schedule: '*/15 * * * *', // Every 15 minutes
    endpoint: '/api/jobs/retry-webhooks',
    method: 'POST',
    description: 'Retry failed webhook events',
  },
  {
    name: 'generate-finance-reports',
    schedule: '0 1 * * *', // Daily at 1 AM
    endpoint: '/api/jobs/generate-finance-reports',
    method: 'POST',
    body: { period: 'daily' },
    description: 'Generate daily finance reports',
  },
  {
    name: 'auto-payouts',
    schedule: '0 5 * * *', // Daily at 5 AM
    endpoint: '/api/jobs/auto-payouts',
    method: 'POST',
    description: 'Process automatic payouts based on thresholds',
  },
];

/**
 * Vercel Cron Configuration
 * Add this to vercel.json:
 * 
 * {
 *   "crons": [
 *     {
 *       "path": "/api/jobs/reconcile-settlements",
 *       "schedule": "0 2 * * *"
 *     },
 *     {
 *       "path": "/api/jobs/compute-vendor-balances",
 *       "schedule": "0 3 * * *"
 *     },
 *     {
 *       "path": "/api/jobs/process-payouts",
 *       "schedule": "0 4 * * *"
 *     },
 *     {
 *       "path": "/api/jobs/retry-webhooks",
 *       "schedule": "*/15 * * * *"
 *     },
 *     {
 *       "path": "/api/jobs/generate-finance-reports",
 *       "schedule": "0 1 * * *"
 *     },
 *     {
 *       "path": "/api/jobs/auto-payouts",
 *       "schedule": "0 5 * * *"
 *     }
 *   ]
 * }
 */

export default cronJobs;

