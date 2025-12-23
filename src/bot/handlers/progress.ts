import TelegramBot from 'node-telegram-bot-api';
import { getUserProgressAsync } from '../../data/progress';
import { getTotalSentences, getAvailableCategories } from '../../data/loader';
import { LEVELS, CATEGORIES } from '../../constants';
import { getUIText } from '../../utils/uiTranslation';
import { TargetLanguage, FolderType } from '../../types';
import { SentenceMasteryModel } from '../../db/models';

/**
 * Handle /progress command
 * Shows completion percentage per category/level
 */
export async function handleProgressCommand(
  msg: TelegramBot.Message,
  bot: TelegramBot
): Promise<void> {
  try {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }

    console.log(`📊 Progress command from user ${userId}`);

    // Get user progress
    const userProgress = await getUserProgressAsync(userId);
    if (!userProgress) {
      await bot.sendMessage(
        chatId,
        '📚 No progress yet. Start a lesson with /start to begin learning!'
      );
      return;
    }

    const language = userProgress.languageTo as TargetLanguage;
    const headerText = getUIText('progress_title', language);
    const noProgressText = getUIText('progress_no_lessons', language);

    // Collect stats for all folders
    let progressReport = `${headerText}\n\n`;
    let hasAnyProgress = false;

    for (const [folderKey, levelInfo] of Object.entries(LEVELS)) {
      const folder = folderKey as FolderType;
      progressReport += `${levelInfo.emoji} **${levelInfo.name}**\n`;

      try {
        // Get available categories for this folder
        const categories = await getAvailableCategories(folder);

        if (categories.length === 0) {
          progressReport += `  ℹ️ No categories available\n\n`;
          continue;
        }

        for (const category of categories) {
          const categoryEmoji = CATEGORIES[category as keyof typeof CATEGORIES]?.emoji || '📝';
          const categoryName = CATEGORIES[category as keyof typeof CATEGORIES]?.name || category;

          try {
            const totalSentences = await getTotalSentences(category, folder);

            if (totalSentences === 0) {
              continue;
            }

            // Get actual mastery records from database
            const masteredCount = await SentenceMasteryModel.countDocuments({
              userId,
              folder,
              category,
              status: { $in: ['learned', 'known'] }
            });

            const completedPercentage = Math.round((masteredCount / totalSentences) * 100);
            const isCompleted = masteredCount === totalSentences;
            const completionEmoji = isCompleted ? '✅' : '  ';

            // Create progress bar
            const progressBar = createProgressBar(completedPercentage);

            progressReport += `${completionEmoji} ${categoryEmoji} ${categoryName.padEnd(20)} ${progressBar} ${completedPercentage}% (${masteredCount}/${totalSentences})\n`;
            
            if (masteredCount > 0) {
              hasAnyProgress = true;
            }
          } catch (error) {
            console.error(`Error getting stats for ${folder}/${category}:`, error);
          }
        }
        progressReport += '\n';
      } catch (error) {
        console.error(`Error processing folder ${folder}:`, error);
      }
    }

    if (!hasAnyProgress) {
      progressReport += `\n${noProgressText}`;
    }

    // Add legend
    progressReport += '\n📍 = Currently learning | ▓ = Completed | ░ = Not started';

    await bot.sendMessage(chatId, progressReport, { parse_mode: 'Markdown' });
    console.log(`✅ Progress report sent to user ${userId}`);
  } catch (error) {
    console.error(`❌ Error in handleProgressCommand:`, error);
    await bot.sendMessage(msg.chat.id, '❌ Error generating progress report.');
  }
}

/**
 * Create a visual progress bar
 * @param percentage - 0-100
 * @returns Progress bar string
 */
function createProgressBar(percentage: number): string {
  const totalBlocks = 10;
  const filledBlocks = Math.round((percentage / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;

  const filled = '▓'.repeat(filledBlocks);
  const empty = '░'.repeat(emptyBlocks);

  return `[${filled}${empty}]`;
}
