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
  level: 'basic' | 'middle' | 'middle-slavic';  // Learning level
  languageFrom: 'bg';
  languageTo: 'eng' | 'ru' | 'ua';
  lessonMessageId?: number; // Message ID of current lesson for editing
  lessonActive?: boolean;   // Track if user is in active lesson
}

export interface BotMessage {
  chatId: number;
  text: string;
  messageId?: number;
}
