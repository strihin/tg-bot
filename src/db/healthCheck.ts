import { connectMongoDB, disconnectMongoDB } from './mongodb';
import { elevenlabsService } from '../services/elevenlabs';

/**
 * Health check for ElevenLabs audio generation
 * Tests with a single Bulgarian word to verify API connection
 * 
 * Usage:
 *   npm run health-check              # Use default voice
 *   npm run health-check -- voice_id  # Use specific voice ID
 */
async function healthCheck(): Promise<void> {
  try {
    const voiceId = process.argv[2];
    
    console.log('🏥 ElevenLabs Health Check\n');
    
    // Check quota
    console.log('📊 Checking quota...');
    const quota = await elevenlabsService.checkQuota();
    console.log(`   Characters used: ${quota.character_count} / ${quota.character_limit}`);
    console.log(`   Available: ${quota.character_limit - quota.character_count} characters\n`);

    // List available voices
    console.log('🎤 Fetching available voices...');
    const voices = await elevenlabsService.listVoices();
    console.log(`   Found ${voices.length} voices:\n`);
    
    voices.forEach(v => {
      console.log(`   - ${v.name.padEnd(20)} (${v.voice_id})`);
    });

    // Set custom voice if provided
    if (voiceId) {
      const voiceExists = voices.some(v => v.voice_id === voiceId);
      if (!voiceExists) {
        console.log(`\n❌ Voice ID not found: ${voiceId}`);
        process.exit(1);
      }
      elevenlabsService.setVoiceId(voiceId);
    }

    // Test with a Bulgarian word
    console.log('\n🎙️  Testing audio generation with Bulgarian word: "здравей"...');
    const audioDataUrl = await elevenlabsService.generateAndStoreAudio('здравей');
    const audioSize = audioDataUrl.length;
    console.log(`✅ Audio generated successfully!`);
    console.log(`   Size: ${(audioSize / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ Health check passed! Ready for batch generation.');
    console.log(`\nNext steps:`);
    console.log(`1. Update voice ID in src/services/elevenlabs.ts if needed`);
    console.log(`2. Run: npm run generate-audio -- basic`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

healthCheck();
