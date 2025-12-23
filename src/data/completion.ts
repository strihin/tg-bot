import { SentenceModel, SentenceMasteryModel } from '../db/models';
import { FolderType } from '../types';
import { ensureMongoDBConnection } from '../db/mongodb';

/**
 * Check if a category is fully completed by a user
 * A category is completed when all sentences in it are mastered (status: 'learned' or 'known')
 */
export async function isCategoryCompleted(userId: number, folder: FolderType, category: string): Promise<boolean> {
  try {
    await ensureMongoDBConnection();

    // Get total sentences in category
    const totalSentences = await SentenceModel.countDocuments({ folder, category });
    
    if (totalSentences === 0) {
      return false; // No sentences to complete
    }

    // Get mastered sentences (learned or known)
    const masteredCount = await SentenceMasteryModel.countDocuments({
      userId,
      folder,
      category,
      status: { $in: ['learned', 'known'] }
    });

    const isCompleted = masteredCount === totalSentences;
    console.log(`📊 [COMPLETION] Category "${category}" (${folder}): ${masteredCount}/${totalSentences} mastered = ${isCompleted ? '✅ COMPLETED' : '❌ INCOMPLETE'}`);
    return isCompleted;
  } catch (error) {
    console.error(`❌ Error checking category completion: ${error}`);
    return false;
  }
}

/**
 * Check if all categories in a folder are completed
 */
export async function isFolderCompleted(userId: number, folder: FolderType): Promise<boolean> {
  try {
    await ensureMongoDBConnection();

    // Get all unique categories in this folder
    const categories = await SentenceModel.distinct('category', { folder });
    
    if (categories.length === 0) {
      return false;
    }

    console.log(`📊 [COMPLETION] Checking folder "${folder}" with ${categories.length} categories for user ${userId}`);

    // Check if all categories are completed
    for (const category of categories) {
      const completed = await isCategoryCompleted(userId, folder, category as string);
      if (!completed) {
        console.log(`📊 [COMPLETION] Folder "${folder}" NOT completed (${category} is incomplete)`);
        return false;
      }
    }

    console.log(`📊 [COMPLETION] Folder "${folder}" is ✅ FULLY COMPLETED`);
    return true;
  } catch (error) {
    console.error(`❌ Error checking folder completion: ${error}`);
    return false;
  }
}

/**
 * Get completion status for a category
 * Returns the completion percentage (0-100)
 */
export async function getCategoryCompletionPercentage(userId: number, folder: FolderType, category: string): Promise<number> {
  try {
    await ensureMongoDBConnection();

    const totalSentences = await SentenceModel.countDocuments({ folder, category });
    
    if (totalSentences === 0) {
      return 0;
    }

    const masteredCount = await SentenceMasteryModel.countDocuments({
      userId,
      folder,
      category,
      status: { $in: ['learned', 'known'] }
    });

    return Math.round((masteredCount / totalSentences) * 100);
  } catch (error) {
    console.error(`❌ Error getting category completion percentage: ${error}`);
    return 0;
  }
}
