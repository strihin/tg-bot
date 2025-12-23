import { connectMongoDB, disconnectMongoDB } from './mongodb';
import { SentenceModel } from './models';
import { elevenlabsService } from '../services/elevenlabs';
import { FolderType } from '../types';

/**
 * Generate audio for Bulgarian sentences using ElevenLabs API
 * Can target a specific folder or all sentences
 * 
 * Usage:
 *   npm run generate-audio              # All folders (limit 50)
 *   npm run generate-audio -- basic     # Only 'basic' folder
 *   npm run generate-audio -- middle    # Only 'middle' folder
 */
async function generateAudioForAllSentences(): Promise<void> {
  try {
    // Get folder from command line argument
    const targetFolder = process.argv[2] as FolderType | undefined;
    const query: any = { audioGenerated: false };
    
    if (targetFolder) {
      query.folder = targetFolder;
    }

    await connectMongoDB();
    
    console.log('🎙️  Checking ElevenLabs quota...');
    const quota = await elevenlabsService.checkQuota();
    console.log(`   Characters used: ${quota.character_count} / ${quota.character_limit}`);
    console.log(`   Available: ${quota.character_limit - quota.character_count} characters\n`);
    
    console.log(`🔍 Query: ${JSON.stringify(query)}`);
    const sentencesWithoutAudio = await SentenceModel.find(query); // Process all matching sentences per run
    console.log(`📝 Found ${sentencesWithoutAudio.length} sentences matching query`);
    
    if (sentencesWithoutAudio.length === 0) {
      const folderText = targetFolder ? ` in ${targetFolder}` : '';
      console.log(`✅ All sentences${folderText} already have audio!`);
      await disconnectMongoDB();
      return;
    }

    const folderText = targetFolder ? ` in folder: ${targetFolder}` : '';
    console.log(`📊 Generating audio for ${sentencesWithoutAudio.length} sentences${folderText}...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const sentence of sentencesWithoutAudio) {
      try {
        console.log(`[${successCount + errorCount + 1}/${sentencesWithoutAudio.length}] ${sentence.folder}/${sentence.category} - "${sentence.bg.substring(0, 40)}..."`);
        
        const audioDataUrl = await elevenlabsService.generateAndStoreAudio(sentence.bg);
        
        // Update sentence with audio URL
        sentence.audioUrl = audioDataUrl;
        sentence.audioGenerated = true;
        await sentence.save();
        
        successCount++;
        
        // Rate limiting: ElevenLabs free tier has limits
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
      } catch (error) {
        console.error(`   ❌ Failed: ${error}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Audio generation complete!`);
    console.log(`   ✅ Generated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    const remaining = await SentenceModel.countDocuments(query);
    const remainingText = targetFolder ? ` in ${targetFolder}` : '';
    console.log(`   📊 Remaining${remainingText}: ${remaining} sentences without audio`);
    
    await disconnectMongoDB();
  } catch (error) {
    console.error('❌ Audio generation failed:', error);
    process.exit(1);
  }
}

generateAudioForAllSentences();
