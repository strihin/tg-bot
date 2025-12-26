import { Sentence, TargetLanguage } from '../../../types';
import { getLanguageEmoji, getTranslation } from '../../../utils/translation';

/**
 * Force max-width rendering for messages by calculating needed padding
 * Counts text symbols and adds only the spaces needed to reach 150 total width
 * Uses zero-width joiner Unicode character for invisibility
 * Makes buttons stretch to full chat width and prevents any width shifting
 * Properly handles emojis (including flags and sequences) and HTML tags
 */
export function applyMaxWidth(text: string): string {
  const targetWidth = 150;
  // Remove HTML tags
  const textWithoutTags = text.replace(/<[^>]*>/g, '');
  
  // For multi-line text, pad based on the longest line for proper Telegram rendering
  const lines = textWithoutTags.split('\n');
  let maxLineLength = 0;
  
  for (const line of lines) {
    // Count visible characters properly using Array.from() which handles emoji sequences
    const charArray = Array.from(line);
    maxLineLength = Math.max(maxLineLength, charArray.length);
  }
  
  // Pad based on the longest line
  const currentLength = maxLineLength;
  const neededPadding = Math.max(0, targetWidth - currentLength);
  const padding = ' '.repeat(neededPadding);
  return `${text}${padding}\u200D`;
}

/**
 * Build complete lesson text with all grammar/rule explanations
 * Adds padding and zero-width joiner to force max width for buttons
 */
export function buildLessonText(
  sentence: Sentence,
  category: string,
  currentIndex: number,
  totalSentences: number,
  languageTo: TargetLanguage,
  folder: string,
  showTranslation: boolean = false
): string {
  const translation = getTranslation(sentence, languageTo);
  const translationText = showTranslation
    ? `🎯 <b>${translation}</b>`
    : `<tg-spoiler>${translation}</tg-spoiler>`;

  let text = `<b>📚 ${category.toUpperCase()} | ⏳ ${currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n${translationText}`;

  // Add grammar explanation if available (middle level)
  if (folder === 'middle' && sentence.grammar && sentence.explanation) {
    const grammarTags = sentence.grammar.map(tag => `#${tag}`).join(' ');
    text += `\n\n📝 <b>Grammar:</b> ${grammarTags}\n💡 <i>${sentence.explanation}</i>`;
  }

  // Add Slavic-specific explanations (middle-slavic level)
  if (folder === 'middle-slavic') {
    if (sentence.tag === 'false-friend' && sentence.falseFriend) {
      text += `\n\n⚠️ <b>FALSE FRIEND!</b>\n🔴 <i>${sentence.falseFriend}</i>`;
    }
    if (sentence.comparison) {
      text += `\n\n🔗 <b>Slavic Bridge:</b> <i>${sentence.comparison}</i>`;
    }
  }

  // Add language-specific rules
  if (['language-comparison', 'misc', 'expressions'].includes(folder)) {
    const ruleKey = languageTo === 'kharkiv' ? 'ruleRu' : languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof Sentence]) {
      text += `\n\n📖 <i>${sentence[ruleKey as keyof Sentence]}</i>`;
    }
  }

  // Also add rules for middle-slavic if present
  if (folder === 'middle-slavic') {
    const ruleKey = languageTo === 'kharkiv' ? 'ruleRu' : languageTo === 'ua' ? 'ruleUA' : 'ruleEng';
    if (sentence[ruleKey as keyof Sentence]) {
      text += `\n\n📖 <i>${sentence[ruleKey as keyof Sentence]}</i>`;
    }
  }

  return applyMaxWidth(text);
}
