import * as fs from 'fs';
import * as path from 'path';
import { connectMongoDB, disconnectMongoDB } from './mongodb';
import { SentenceModel, CategoryModel, ISentence } from './models';
import { FolderType } from '../types';
import { CATEGORIES } from '../constants';

async function migrateData(): Promise<void> {
  console.log('🚀 Starting data migration to MongoDB...');

  try {
    await connectMongoDB();

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await SentenceModel.deleteMany({});
    await CategoryModel.deleteMany({});

    const dataDir = path.join(__dirname, '../../data');
    const folders: FolderType[] = ['basic', 'middle', 'middle-slavic', 'misc', 'language-comparison', 'expressions'];

    for (const folder of folders) {
      console.log(`📁 Processing folder: ${folder}`);
      const folderPath = path.join(dataDir, folder);

      if (!fs.existsSync(folderPath)) {
        console.warn(`⚠️  Folder not found: ${folderPath}`);
        continue;
      }

      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const category = file.replace('.json', '');
        const filePath = path.join(folderPath, file);

        console.log(`📄 Processing: ${folder}/${category}`);

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);

          // Handle both array format and object with items format
          let sentences: any[];
          if (Array.isArray(parsed)) {
            sentences = parsed;
          } else if (parsed.items && Array.isArray(parsed.items)) {
            sentences = parsed.items;
          } else {
            console.warn(`⚠️  Unexpected JSON structure in ${filePath}`);
            continue;
          }

          // Prepare sentences for MongoDB
          const sentencesToInsert: Partial<ISentence>[] = sentences.map(sentence => ({
            ...sentence,
            folder,
            category
          }));

          // Insert sentences
          if (sentencesToInsert.length > 0) {
            await SentenceModel.insertMany(sentencesToInsert);
            console.log(`✅ Inserted ${sentencesToInsert.length} sentences for ${folder}/${category}`);
          }

          // Create/update category
          const categoryData = {
            id: category,
            name: CATEGORIES[category as keyof typeof CATEGORIES]?.name || category,
            emoji: CATEGORIES[category as keyof typeof CATEGORIES]?.emoji || '📚',
            folder,
            sentenceCount: sentencesToInsert.length
          };

          await CategoryModel.findOneAndUpdate(
            { folder, id: category },
            categoryData,
            { upsert: true, new: true }
          );

        } catch (error) {
          console.error(`❌ Error processing ${filePath}:`, error);
        }
      }
    }

    // Verify migration
    const totalSentences = await SentenceModel.countDocuments();
    const totalCategories = await CategoryModel.countDocuments();

    console.log('✅ Migration completed!');
    console.log(`📊 Total sentences: ${totalSentences}`);
    console.log(`📂 Total categories: ${totalCategories}`);

    // Show sample data
    const sampleSentence = await SentenceModel.findOne().limit(1);
    if (sampleSentence) {
      console.log('📝 Sample sentence:', {
        bg: sampleSentence.bg,
        eng: sampleSentence.eng,
        folder: sampleSentence.folder,
        category: sampleSentence.category
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await disconnectMongoDB();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateData };