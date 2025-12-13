export interface Sentence {
  bg: string;
  eng: string;
  ru: string;
  ua: string;
  source: string;
}

export interface UserProgress {
  userId: number;
  currentIndex: number;
  category: string;
  languageFrom: 'bg';
  languageTo: 'eng' | 'ru' | 'ua';
}

export interface BotMessage {
  chatId: number;
  text: string;
  messageId?: number;
}
