import { Sentence, TargetLanguage } from '../types';
import { LANGUAGES } from '../constants';

/**
 * Get translation from sentence based on target language code
 */
export function getTranslation(
  sentence: Sentence,
  languageTo: TargetLanguage
): string {
  const translations: Record<TargetLanguage, string> = {
    eng: sentence.eng || '',
    ru: sentence.ru || '',
    ua: sentence.ua || '',
  };
  return translations[languageTo] || sentence.eng;
}

/**
 * Get language display name
 */
export function getLanguageName(language: 'eng' | 'ru' | 'ua' | 'bg'): string {
  return LANGUAGES[language as keyof typeof LANGUAGES].name;
}

/**
 * Get language emoji
 */
export function getLanguageEmoji(language: 'eng' | 'ru' | 'ua' | 'bg'): string {
  return LANGUAGES[language as keyof typeof LANGUAGES].emoji;
}
