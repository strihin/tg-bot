/**
 * Learning folder type - unified definition used throughout the project
 */
export type FolderType = 'basic' | 'middle' | 'middle-slavic' | 'misc' | 'language-comparison' | 'expressions';

/**
 * Target language type - unified definition used throughout the project
 */
export type TargetLanguage = 'eng' | 'kharkiv' | 'ua';

export interface Sentence {
  _id?: string;             // MongoDB ObjectId
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
  audioUrl?: string;        // Base64 audio data URL for Telegram
  audioGenerated?: boolean; // Flag indicating audio was generated
}

export interface UserProgress {
  userId: number;
  currentIndex: number;
  category: string;
  folder: FolderType;  // Selected folder
  languageFrom: 'bg';
  languageTo: TargetLanguage;
  lessonMessageId?: number; // Message ID of current lesson for editing
  audioMessageId?: number;  // Message ID of audio sent as reply (for current sentence)
  menuMessageId?: number;   // Message ID of category/folder menu for editing
  lessonActive?: boolean;   // Track if user is in active lesson
  translationRevealed?: boolean; // Track if current sentence translation is revealed
  lastFolder?: FolderType;  // Remember last used folder for quick resume
  lastCategory?: string;    // Remember last used category for quick resume
  sentMessageIds?: number[]; // Track all message IDs sent to user for cleanup
}

export interface BotMessage {
  chatId: number;
  text: string;
  messageId?: number;
}
