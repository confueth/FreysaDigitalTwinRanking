/**
 * Command-line script to take a new snapshot
 * 
 * Run using: node scripts/take-snapshot.mjs [optional description]
 */

import axios from 'axios';

async function main() {
  try {
    // Get optional description from command line arguments
    const description = process.argv.length > 2 
      ? process.argv.slice(2).join(' ') 
      : `Manual snapshot - ${new Date().toISOString()}`;

    console.log('Taking new snapshot with description:', description);
    
    // Make request to local snapshot endpoint
    const response = await axios.post('http://localhost:5000/api/snapshots', {
      description
    });
    
    console.log('Snapshot created successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\nSnapshot process is running in the background.');
    console.log('Check the server logs for progress updates.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error taking snapshot:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    process.exit(1);
  }
}

main();