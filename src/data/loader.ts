import * as fs from 'fs';
import * as path from 'path';
import { Sentence } from '../types';

// Cache for loaded sentences
const sentenceCache: Record<string, Sentence[]> = {};

/**
 * Load sentences from JSON file by category and level
 * Fallback chain: level-specific → middle → basic → root
 */
export function loadSentences(category: string, level: 'basic' | 'middle' | 'middle-slavic' = 'basic'): Sentence[] {
  const cacheKey = `${level}:${category}`;
  
  if (sentenceCache[cacheKey]) {
    return sentenceCache[cacheKey];
  }

  let filePath: string | null = null;

  // Try level-specific directory first
  const tryPaths = [
    path.join(__dirname, '../../data', level, `${category}.json`),
  ];

  // For middle-slavic, try fallback to middle, then basic
  if (level === 'middle-slavic') {
    tryPaths.push(path.join(__dirname, '../../data/middle', `${category}.json`));
    tryPaths.push(path.join(__dirname, '../../data/basic', `${category}.json`));
  }

  // For middle, try fallback to basic
  if (level === 'middle') {
    tryPaths.push(path.join(__dirname, '../../data/basic', `${category}.json`));
  }

  // Always try root for backward compatibility
  tryPaths.push(path.join(__dirname, '../../data', `${category}.json`));

  // Find first existing file
  for (const tryPath of tryPaths) {
    if (fs.existsSync(tryPath)) {
      filePath = tryPath;
      break;
    }
  }

  if (!filePath) {
    console.warn(`⚠️  Sentences file not found for ${category} at level ${level}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const sentences = JSON.parse(content) as Sentence[];
  sentenceCache[cacheKey] = sentences;

  return sentences;
}

/**
 * Get sentence by index from category
 */
export function getSentenceByIndex(category: string, index: number, level: 'basic' | 'middle' | 'middle-slavic' = 'basic'): Sentence | null {
  const sentences = loadSentences(category, level);
  if (index >= 0 && index < sentences.length) {
    return sentences[index];
  }
  return null;
}

/**
 * Get total sentence count for category
 */
export function getTotalSentences(category: string, level: 'basic' | 'middle' | 'middle-slavic' = 'basic'): number {
  const sentences = loadSentences(category, level);
  return sentences.length;
}

/**
 * Get available categories for a specific level (strictly, no fallbacks)
 */
export function getAvailableCategories(level: 'basic' | 'middle' | 'middle-slavic' = 'basic'): string[] {
  let levelDir: string;
  
  if (level === 'middle-slavic') {
    levelDir = path.join(__dirname, '../../data/middle-slavic');
  } else if (level === 'middle') {
    levelDir = path.join(__dirname, '../../data/middle');
  } else {
    levelDir = path.join(__dirname, '../../data/basic');
  }

  if (!fs.existsSync(levelDir)) {
    console.warn(`⚠️  Directory not found: ${levelDir}`);
    return [];
  }

  const files = fs.readdirSync(levelDir);
  return files
    .filter((file) => file.endsWith('.json') && file !== '.DS_Store')
    .map((file) => file.replace('.json', ''))
    .sort();
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  Object.keys(sentenceCache).forEach((key) => delete sentenceCache[key]);
}
