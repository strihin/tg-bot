import { MongoClient, Db, Collection } from 'mongodb';
import { UserProgress } from '../types';
import { config } from '../config';

let dbInstance: Db | null = null;

async function getDb(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }

  const client = new MongoClient(config.MONGO_URI);
  await client.connect();
  dbInstance = client.db('bg_bot');
  return dbInstance;
}

export async function getUserProgress(userId: number): Promise<UserProgress | null> {
  try {
    const db = await getDb();
    const collection: Collection<UserProgress> = db.collection('user_progress');
    const progress = await collection.findOne({ userId });
    return progress;
  } catch (error) {
    console.error(`❌ Error reading progress for user ${userId}:`, error);
    return null;
  }
}

export async function saveUserProgress(progress: UserProgress): Promise<void> {
  try {
    const db = await getDb();
    const collection: Collection<UserProgress> = db.collection('user_progress');
    await collection.updateOne({ userId: progress.userId }, { $set: progress }, { upsert: true });
  } catch (error) {
    console.error(`❌ Error saving progress for user ${progress.userId}:`, error);
  }
}

export async function clearAllProgressExceptLast(): Promise<number> {
  try {
    const db = await getDb();
    const collection: Collection<UserProgress> = db.collection('user_progress');
    
    // Get all progress, sort by lastModified, keep the most recent
    const allProgress = await collection
      .find()
      .sort({ lastModified: -1 })
      .toArray();
    
    if (allProgress.length <= 1) {
      return 0;
    }

    const keep = allProgress[0];
    const deleteIds = allProgress.slice(1).map((p: UserProgress) => p.userId);
    
    const result = await collection.deleteMany({ userId: { $in: deleteIds } });
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error clearing progress:', error);
    return 0;
  }
}
