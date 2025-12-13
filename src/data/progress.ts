import * as fs from 'fs';
import * as path from 'path';
import { UserProgress } from '../types';

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
  languageTo: 'eng' | 'ru' | 'ua' = 'eng',
  level: 'basic' | 'middle' | 'middle-slavic' = 'basic'
): UserProgress {
  const progress: UserProgress = {
    userId,
    currentIndex: 0,
    category,
    level,
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

/**
 * Clear all progress files except the most recently modified one
 */
export function clearAllProgressExceptLast(): number {
  ensureProgressDir();

  try {
    const files = fs.readdirSync(progressDir).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) return 0;

    // Get file stats and find the most recently modified
    const fileStats = files.map(f => ({
      name: f,
      path: path.join(progressDir, f),
      mtime: fs.statSync(path.join(progressDir, f)).mtime.getTime(),
    }));

    fileStats.sort((a, b) => b.mtime - a.mtime);
    const mostRecent = fileStats[0];

    // Delete all except the most recent
    let deletedCount = 0;
    for (let i = 1; i < fileStats.length; i++) {
      try {
        fs.unlinkSync(fileStats[i].path);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${fileStats[i].name}:`, error);
      }
    }

    console.log(`✅ Cleared ${deletedCount} progress file(s). Kept: ${mostRecent.name}`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error clearing progress files:', error);
    return 0;
  }
}
