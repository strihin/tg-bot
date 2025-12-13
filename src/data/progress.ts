import * as fs from 'fs';
import * as path from 'path';

export interface UserProgress {
  userId: number;
  currentIndex: number;
  category: string;
  languageFrom: 'bg'; // Always Bulgarian as source
  languageTo: 'eng' | 'ru' | 'ua'; // Target language
}

const progressDir = path.join(__dirname, '../../data/.progress');

// Ensure progress directory exists
function ensureProgressDir(): void {
  if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
  }
}

function getProgressFile(userId: number): string {
  return path.join(progressDir, `${userId}.json`);
}

/**
 * Load user progress
 */
export function getUserProgress(userId: number): UserProgress | null {
  ensureProgressDir();

  const filePath = getProgressFile(userId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as UserProgress;
  } catch (error) {
    console.error(`❌ Error reading progress for user ${userId}:`, error);
    return null;
  }
}

/**
 * Save user progress
 */
export function saveUserProgress(progress: UserProgress): void {
  ensureProgressDir();

  const filePath = getProgressFile(progress.userId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (error) {
    console.error(`❌ Error saving progress for user ${progress.userId}:`, error);
  }
}

/**
 * Initialize user progress (first time)
 */
export function initializeUserProgress(
  userId: number,
  category: string = 'greetings',
  languageTo: 'eng' | 'ru' | 'ua' = 'eng'
): UserProgress {
  const progress: UserProgress = {
    userId,
    currentIndex: 0,
    category,
    languageFrom: 'bg',
    languageTo,
  };
  saveUserProgress(progress);
  return progress;
}

/**
 * Update user index
 */
export function updateUserIndex(userId: number, newIndex: number): void {
  const progress = getUserProgress(userId);
  if (progress) {
    progress.currentIndex = newIndex;
    saveUserProgress(progress);
  }
}

/**
 * Change target language preference for user
 */
export function changeTargetLanguage(userId: number, languageTo: 'eng' | 'ru' | 'ua'): void {
  const progress = getUserProgress(userId) || initializeUserProgress(userId);
  progress.languageTo = languageTo;
  saveUserProgress(progress);
}
