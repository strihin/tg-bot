/**
 * Learning folder type - unified definition used throughout the project
 */
export type FolderType = 'basic' | 'middle' | 'middle-slavic' | 'misc' | 'language-comparison' | 'expressions';

/**
 * Target language type - unified definition used throughout the project
 */
export type TargetLanguage = 'eng' | 'kharkiv' | 'ua';

export interface Sentence {
  bg: string;
  eng: string;
  ru: string;
  ua: string;
  source: string;
  grammar?: string[];       // Grammar tags (e.g., ['past_tense', 'perfective'])
  explanation?: string;     // Short grammar explanation (1-2 lines)
  tag?: string;             // Content tag (e.g., 'false-friend')
  ruleEng?: string;         // Rule explanation in English
  ruleRu?: string;          // Rule explanation in Russian
  ruleUA?: string;          // Rule explanation in Ukrainian
  comparison?: string;      // Comparison with other languages
  falseFriend?: string;     // False friend note
}

export interface UserProgress {
  userId: number;
  currentIndex: number;
  category: string;
  folder: FolderType;  // Selected folder
  languageFrom: 'bg';
  languageTo: TargetLanguage;
  lessonMessageId?: number; // Message ID of current lesson for editing
  lessonActive?: boolean;   // Track if user is in active lesson
}

export interface BotMessage {
  chatId: number;
  text: string;
  messageId?: number;
}
