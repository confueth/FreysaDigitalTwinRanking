/**
 * Scheduler for automated data collection tasks
 * Uses node-cron to schedule periodic tasks like taking daily snapshots
 */

import cron from 'node-cron';
import { log } from './vite';
import { execSync } from 'child_process';

// Define schedule patterns
const DAILY_SNAPSHOT_SCHEDULE = '0 0 * * *'; // Run at midnight every day

/**
 * Initialize the scheduler
 */
export function initializeScheduler() {
  log('Initializing task scheduler...', 'scheduler');

  // Schedule daily snapshot task
  cron.schedule(DAILY_SNAPSHOT_SCHEDULE, () => {
    try {
      log('Running scheduled daily snapshot task', 'scheduler');
      execSync('node scripts/daily-snapshot.js', { stdio: 'inherit' });
      log('Daily snapshot completed successfully', 'scheduler');
    } catch (error) {
      log(`Error running daily snapshot: ${error}`, 'scheduler');
    }
  });

  log('Task scheduler initialized successfully', 'scheduler');
}