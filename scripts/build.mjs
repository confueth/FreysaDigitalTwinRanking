// This script helps to run the build process, including the prepare-deployment step
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the prepare-deployment script
console.log('Running prepare-deployment...');
try {
  // Execute the prepare-deployment script
  execSync('node scripts/prepare-deployment.mjs', { stdio: 'inherit' });
  
  // If that succeeds, continue with the build
  console.log('Running build...');
  
  // Execute the actual build command
  execSync('vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    { stdio: 'inherit' });
    
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}