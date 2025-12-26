import { UserProgress, FolderType, TargetLanguage } from '../types';
import { UserProgressModel } from '../db/models';

/**
 * Load user progress from MongoDB (async version - RECOMMENDED)
 */
export async function getUserProgressAsync(userId: number): Promise<UserProgress | null> {
  try {
    const doc = await UserProgressModel.findOne({ userId });
    if (!doc) {
      return null;
    }
    return {
      userId: doc.userId,
      currentIndex: doc.currentIndex,
      category: doc.category,
      folder: doc.folder,
      languageFrom: doc.languageFrom as 'bg',
      languageTo: doc.languageTo,
      lessonMessageId: doc.lessonMessageId,
      audioMessageId: doc.audioMessageId,
      menuMessageId: doc.menuMessageId,
      lessonActive: doc.lessonActive,
      translationRevealed: doc.translationRevealed,
      lastFolder: doc.lastFolder,
      lastCategory: doc.lastCategory,
      sentMessageIds: doc.sentMessageIds || [],
    };
  } catch (error) {
    console.error(`❌ Error reading progress for user ${userId}:`, error);
    return null;
  }
}

/**
 * Load user progress from MongoDB (sync wrapper - for backward compatibility)
 * WARNING: This is a synchronous wrapper and may not be reliable. Use getUserProgressAsync instead.
 */
export function getUserProgress(userId: number): UserProgress | null {
  // This returns null for sync access. Handlers should use getUserProgressAsync instead.
  console.warn('⚠️ getUserProgress called - this is synchronous and not reliable with MongoDB. Use getUserProgressAsync instead.');
  return null;
}

/**
 * Save user progress to MongoDB (async version - RECOMMENDED)
 */
export async function saveUserProgress(progress: UserProgress): Promise<void> {
  try {
    await UserProgressModel.findOneAndUpdate(
      { userId: progress.userId },
      {
        currentIndex: progress.currentIndex,
        category: progress.category,
        folder: progress.folder,
        languageFrom: progress.languageFrom,
        languageTo: progress.languageTo,
        lessonMessageId: progress.lessonMessageId,
        audioMessageId: progress.audioMessageId,
        menuMessageId: progress.menuMessageId,
        lessonActive: progress.lessonActive,
        translationRevealed: progress.translationRevealed,
        lastFolder: progress.lastFolder,
        lastCategory: progress.lastCategory,
        sentMessageIds: progress.sentMessageIds || [],
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`❌ Error saving progress for user ${progress.userId}:`, error);
  }
}

/**
 * Initialize user progress (first time)
 */
export async function initializeUserProgress(
  userId: number,
  category: string = 'greetings',
  languageTo: TargetLanguage = 'eng',
  folder: FolderType = 'basic'
): Promise<UserProgress> {
  const progress: UserProgress = {
    userId,
    currentIndex: 0,
    category,
    folder,
    languageFrom: 'bg',
    languageTo,
  };
  await saveUserProgress(progress);
  return progress;
}

/**
 * Update user index
 */
export async function updateUserIndex(userId: number, newIndex: number): Promise<void> {
  const progress = await getUserProgressAsync(userId);
  if (progress) {
    progress.currentIndex = newIndex;
    await saveUserProgress(progress);
  }
}

/**
 * Change target language preference for user
 */
export async function changeTargetLanguage(userId: number, languageTo: TargetLanguage): Promise<void> {
  let progress = await getUserProgressAsync(userId);
  if (!progress) {
    progress = await initializeUserProgress(userId);
  }
  progress.languageTo = languageTo;
  progress.currentIndex = 0;  // Reset to beginning when changing language
  progress.lessonActive = false;  // Reset lesson active state
  await saveUserProgress(progress);
  console.log(`✅ Changed language to ${languageTo} and reset progress for user ${userId}`);
}

/**
 * Clear all old progress documents except most recent
 */
export async function clearAllProgressExceptLast(): Promise<number> {
  try {
    // Get all documents sorted by updatedAt, keep only the most recent
    const docs = await UserProgressModel.find().sort({ updatedAt: -1 }).skip(1);
    
    if (docs.length === 0) return 0;

    const deletedCount = docs.length;
    for (const doc of docs) {
      await UserProgressModel.deleteOne({ _id: doc._id });
    }

    console.log(`✅ Cleared ${deletedCount} progress document(s). Kept the most recently used one`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error clearing progress documents:', error);
    return 0;
  }
}
