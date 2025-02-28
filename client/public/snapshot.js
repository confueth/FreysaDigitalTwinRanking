/**
 * Utility function to create a new leaderboard snapshot
 * 
 * To use:
 * 1. Open the browser console (F12 or right-click > Inspect > Console)
 * 2. Copy and paste the following line:
 *    fetch('/snapshot.js').then(r=>r.text()).then(t=>eval(t))
 * 3. Call the function with an optional description:
 *    takeSnapshot("My custom snapshot description")
 *    or just: takeSnapshot()
 */

function takeSnapshot(description = "Manual snapshot - " + new Date().toLocaleString()) {
  console.log("Taking a new snapshot with description:", description);
  
  fetch('/api/snapshots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ description })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log("✅ Snapshot created successfully:", data);
    console.log("Refreshing page in 3 seconds...");
    
    // Give the backend a moment to complete the snapshot process
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  })
  .catch(error => {
    console.error("❌ Failed to create snapshot:", error);
  });
}

console.log("✅ Snapshot utility loaded! Use takeSnapshot() to create a new snapshot.");
console.log("Example: takeSnapshot(\"My custom description\")");

// Return the function for immediate use
takeSnapshot;