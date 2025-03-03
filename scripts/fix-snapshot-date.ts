
import { pool, db } from '../server/db';
import { snapshots } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixSnapshotDate() {
  try {
    console.log('Checking for snapshot date inconsistencies...');
    
    // Get the snapshot with ID 7
    const [snapshot] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, 7));
    
    if (!snapshot) {
      console.log('Snapshot with ID 7 not found');
      return;
    }
    
    console.log('Found snapshot:', snapshot);
    
    // Get the correct date from the timestamp
    const correctDate = new Date(snapshot.timestamp).toLocaleDateString();
    const expectedDescription = `Daily snapshot - ${correctDate}`;
    
    // Check if description needs updating
    if (snapshot.description && !snapshot.description.includes(correctDate)) {
      console.log(`Fixing inconsistent date in snapshot ID 7`);
      console.log(`Current description: ${snapshot.description}`);
      console.log(`Updated description: ${expectedDescription}`);
      
      // Update the description
      await db
        .update(snapshots)
        .set({ description: expectedDescription })
        .where(eq(snapshots.id, 7));
      
      console.log('Description updated successfully');
    } else {
      console.log('Description already matches timestamp, no update needed');
    }
  } catch (error) {
    console.error('Error fixing snapshot date:', error);
  } finally {
    await pool.end();
  }
}

fixSnapshotDate();
