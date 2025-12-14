import * as fs from 'fs';
import * as path from 'path';
import { Sentence, FolderType } from '../types';

// Cache for loaded sentences
const sentenceCache: Record<string, Sentence[]> = {};

/**
 * Load sentences from JSON file by category and folder
 * Each folder is independent: basic, middle, middle-slavic, misc, language-comparison, expressions
 * Path: /data/{folder}/{category}.json
 */
export function loadSentences(category: string, folder: FolderType = 'basic'): Sentence[] {
  const cacheKey = `${folder}:${category}`;
  
  if (sentenceCache[cacheKey]) {
    return sentenceCache[cacheKey];
  }

  const filePath = path.join(__dirname, `../../data/${folder}`, `${category}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let sentences: Sentence[];
  
  try {
    const parsed = JSON.parse(content);
    
    // Handle both array format (core) and object with items format (misc, language-comparison, expressions)
    if (Array.isArray(parsed)) {
      sentences = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      sentences = parsed.items;
    } else {
      console.warn(`⚠️  Unexpected JSON structure in ${filePath}`);
      return [];
    }
  } catch (error) {
    console.warn(`⚠️  Error parsing JSON in ${filePath}:`, error);
    return [];
  }
  
  sentenceCache[cacheKey] = sentences;

  return sentences;
}

/**
 * Get sentence by index from category
 */
export function getSentenceByIndex(category: string, index: number, folder: FolderType = 'basic'): Sentence | null {
  const sentences = loadSentences(category, folder);
  if (index >= 0 && index < sentences.length) {
    return sentences[index];
  }
  return null;
}

/**
 * Get total sentence count for category
 */
export function getTotalSentences(category: string, folder: FolderType = 'basic'): number {
  const sentences = loadSentences(category, folder);
  return sentences.length;
}

/**
 * Get available categories for a specific folder
 * Each folder is independent: /data/{folder}/
 */
export function getAvailableCategories(folder: FolderType = 'basic'): string[] {
  const folderPath = path.join(__dirname, `../../data/${folder}`);

  if (!fs.existsSync(folderPath)) {
    console.warn(`⚠️  Folder not found: ${folderPath}`);
    return [];
  }

  const files = fs.readdirSync(folderPath);
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
