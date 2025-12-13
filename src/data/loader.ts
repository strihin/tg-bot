import * as fs from 'fs';
import * as path from 'path';
import { Sentence } from '../types';

// Cache for loaded sentences
const sentenceCache: Record<string, Sentence[]> = {};

/**
 * Load sentences from JSON file by category
 */
export function loadSentences(category: string): Sentence[] {
  if (sentenceCache[category]) {
    return sentenceCache[category];
  }

  const filePath = path.join(__dirname, '../../data', `${category}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Sentences file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const sentences = JSON.parse(content) as Sentence[];
  sentenceCache[category] = sentences;

  return sentences;
}

/**
 * Get sentence by index from category
 */
export function getSentenceByIndex(category: string, index: number): Sentence | null {
  const sentences = loadSentences(category);
  if (index >= 0 && index < sentences.length) {
    return sentences[index];
  }
  return null;
}

/**
 * Get total sentence count for category
 */
export function getTotalSentences(category: string): number {
  const sentences = loadSentences(category);
  return sentences.length;
}

/**
 * Get available categories (by reading data folder)
 */
export function getAvailableCategories(): string[] {
  const dataDir = path.join(__dirname, '../../data');

  if (!fs.existsSync(dataDir)) {
    return [];
  }

  const files = fs.readdirSync(dataDir);
  return files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''));
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  Object.keys(sentenceCache).forEach((key) => delete sentenceCache[key]);
}
