import { Sentence, TargetLanguage } from '../../../types';
import { getLanguageEmoji, getTranslation } from '../../../utils/translation';

/**
 * Build complete lesson text with all grammar/rule explanations
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
  const langEmoji = getLanguageEmoji(languageTo);
  const translation = getTranslation(sentence, languageTo);
  const translationText = showTranslation
    ? `🎯 <b>${translation}</b>`
    : `<tg-spoiler>${translation}</tg-spoiler>`;

  let text = `<b>📚 ${category.toUpperCase()} | 🇧🇬 → ${langEmoji}</b>\n\n⏳ <b>${currentIndex + 1}/${totalSentences}</b>\n\n${sentence.bg}\n\n${translationText}`;

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

  return text;
}
