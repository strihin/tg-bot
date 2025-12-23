import { Sentence, FolderType } from '../types';
import { SentenceModel, CategoryModel } from '../db/models';
import { ensureMongoDBConnection } from '../db/mongodb';
import * as fs from 'fs';
import * as path from 'path';

// Cache for loaded sentences
const sentenceCache: Record<string, Sentence[]> = {};

/**
 * Load sentences from JSON files as fallback
 */
function loadSentencesFromJSON(category: string, folder: FolderType = 'basic'): Sentence[] {
  try {
    const filePath = path.join(__dirname, `../../data/${folder}/${category}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  JSON file not found: ${filePath}`);
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let data = JSON.parse(content);

    // Handle both array format and object with items format
    let sentences = Array.isArray(data) ? data : (data.items || []);

    return sentences as Sentence[];
  } catch (error) {
    console.error(`❌ Error loading JSON for ${folder}/${category}:`, error);
    return [];
  }
}

/**
 * Load sentences from MongoDB by category and folder
 * Each folder is independent: basic, middle, middle-slavic, misc, language-comparison, expressions
 * Data stored in MongoDB collections
 */
export async function loadSentences(category: string, folder: FolderType = 'basic'): Promise<Sentence[]> {
  const cacheKey = `${folder}:${category}`;

  if (sentenceCache[cacheKey]) {
    console.log(`📦 [LOADER] Returning cached sentences for ${cacheKey} (${sentenceCache[cacheKey].length} sentences, audioUrl: ${!!sentenceCache[cacheKey][0]?.audioUrl})`);
    return sentenceCache[cacheKey];
  }

  try {
    await ensureMongoDBConnection();

    const sentences = await SentenceModel.find({ folder, category }).lean();

    console.log(`🔍 [LOADER] Fetched ${sentences.length} sentences from MongoDB for ${folder}/${category}`);
    if (sentences.length > 0) {
      console.log(`   - First sentence has audioUrl: ${!!sentences[0].audioUrl}, audioGenerated: ${sentences[0].audioGenerated}`);
    }

    // Convert MongoDB documents to Sentence interface
    const formattedSentences: Sentence[] = sentences.map(doc => ({
      _id: doc._id?.toString(),
      bg: doc.bg,
      eng: doc.eng,
      ru: doc.ru,
      ua: doc.ua,
      source: doc.source,
      grammar: doc.grammar,
      explanation: doc.explanation,
      tag: doc.tag,
      ruleEng: doc.ruleEng,
      ruleRu: doc.ruleRu,
      ruleUA: doc.ruleUA,
      comparison: doc.comparison,
      falseFriend: doc.falseFriend,
      audioUrl: doc.audioUrl,
      audioGenerated: doc.audioGenerated
    }));

    // If MongoDB returned empty, try JSON fallback
    if (formattedSentences.length === 0) {
      console.log(`📄 MongoDB empty for ${folder}/${category}, falling back to JSON...`);
      const jsonSentences = loadSentencesFromJSON(category, folder);
      sentenceCache[cacheKey] = jsonSentences;
      return jsonSentences;
    }

    sentenceCache[cacheKey] = formattedSentences;
    return formattedSentences;

  } catch (error) {
    console.error(`❌ Error loading from MongoDB for ${folder}/${category}, falling back to JSON:`, error);
    const jsonSentences = loadSentencesFromJSON(category, folder);
    sentenceCache[cacheKey] = jsonSentences;
    return jsonSentences;
  }
}

/**
 * Get sentence by index from category (async version)
 */
export async function getSentenceByIndex(category: string, index: number, folder: FolderType = 'basic'): Promise<Sentence | null> {
  const sentences = await loadSentences(category, folder);
  if (index >= 0 && index < sentences.length) {
    return sentences[index];
  }
  return null;
}

/**
 * Get total sentence count for category (async version)
 */
export async function getTotalSentences(category: string, folder: FolderType = 'basic'): Promise<number> {
  const sentences = await loadSentences(category, folder);
  return sentences.length;
}

/**
 * Get available categories for a specific folder from MongoDB
 * Each folder is independent: basic, middle, middle-slavic, misc, language-comparison, expressions
 */
export async function getAvailableCategories(folder: FolderType = 'basic'): Promise<string[]> {
  try {
    await ensureMongoDBConnection();

    const categories = await CategoryModel.find({ folder }).sort({ id: 1 }).lean();
    return categories.map(cat => cat.id);

  } catch (error) {
    console.error(`❌ Error loading categories for ${folder}:`, error);
    return [];
  }
}

/**
 * Get category info including name and emoji
 */
export async function getCategoryInfo(folder: FolderType, categoryId: string) {
  try {
    await ensureMongoDBConnection();

    const category = await CategoryModel.findOne({ folder, id: categoryId }).lean();
    return category ? {
      id: category.id,
      name: category.name,
      emoji: category.emoji,
      sentenceCount: category.sentenceCount
    } : null;

  } catch (error) {
    console.error(`❌ Error loading category info for ${folder}/${categoryId}:`, error);
    return null;
  }
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  Object.keys(sentenceCache).forEach((key) => delete sentenceCache[key]);
}
