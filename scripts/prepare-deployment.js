
#!/usr/bin/env node

// This script checks if we're properly configured for deployment
console.log('🚀 Preparing for deployment...');

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('⚠️ Warning: DATABASE_URL environment variable is not set.');
  console.error('Please set this in the Secrets tab of your Repl.');
  // Don't exit in build environment
  if (!process.env.REPL_SLUG) {
    process.exit(1);
  }
}

// Check if we're using the right port configuration
const serverFile = require('fs').readFileSync('./server/index.ts', 'utf-8');
if (!serverFile.includes('process.env.PORT')) {
  console.error('⚠️ Warning: server/index.ts is not configured to use PORT environment variable.');
  console.error('Please update your server to use: const port = process.env.PORT || 5000;');
  // Don't exit in build environment
  if (!process.env.REPL_SLUG) {
    process.exit(1);
  }
}

console.log('✅ Deployment preparation complete!');
