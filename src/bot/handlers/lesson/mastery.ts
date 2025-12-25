import { SentenceMasteryModel } from '../../../db/models';

/**
 * Mark a sentence as learned when user moves to next/previous
 */
export async function markSentenceAsLearned(
  userId: number,
  sentenceId: string | undefined,
  folder: string,
  category: string
): Promise<void> {
  if (!sentenceId) return;

  try {
    await SentenceMasteryModel.findOneAndUpdate(
      { userId, sentenceId },
      {
        $set: {
          userId,
          sentenceId,
          folder,
          category,
          status: 'learned',
          masteredAt: new Date(),
          lastReviewedAt: new Date(),
        },
        $inc: { reviewCount: 1 },
      },
      { upsert: true, new: true }
    );
    console.log(`✅ [MASTERY] Marked sentence ${sentenceId} as learned for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error marking sentence as learned: ${error}`);
  }
}
