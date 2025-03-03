
import { pool, db } from '../server/db';
import { snapshots } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixSnapshotDates() {
  try {
    console.log('Checking for snapshot date inconsistencies...');
    
    // Get all snapshots
    const allSnapshots = await db
      .select()
      .from(snapshots);
    
    console.log(`Found ${allSnapshots.length} snapshots to check`);
    
    let updatedCount = 0;
    
    for (const snapshot of allSnapshots) {
      // Get the correct date from the timestamp
      const correctDate = new Date(snapshot.timestamp).toLocaleDateString();
      const snapshotDate = snapshot.description?.includes('-') ? 
        snapshot.description.split('-')[1].trim() : null;
      
      console.log(`Snapshot #${snapshot.id}: timestamp date ${correctDate}, description date ${snapshotDate || 'unknown'}`);
      
      // Check if description exists and needs updating
      if (snapshot.description && snapshotDate && snapshotDate !== correctDate) {
        console.log(`Fixing inconsistent date in snapshot ID ${snapshot.id}`);
        console.log(`Current description: ${snapshot.description}`);
        
        // Generate new description maintaining the prefix
        const prefix = snapshot.description.split('-')[0].trim();
        const newDescription = `${prefix} - ${correctDate}`;
        console.log(`Updated description: ${newDescription}`);
        
        // Update the description
        await db
          .update(snapshots)
          .set({ description: newDescription })
          .where(eq(snapshots.id, snapshot.id));
        
        updatedCount++;
        console.log(`Description updated successfully`);
      }
    }
    
    if (updatedCount === 0) {
      console.log('All snapshot descriptions already match their timestamps');
    } else {
      console.log(`Updated ${updatedCount} snapshot descriptions to match timestamps`);
    }
  } catch (error) {
    console.error('Error fixing snapshot dates:', error);
  } finally {
    await pool.end();
  }
}

fixSnapshotDates();
