import fetch from 'node-fetch';
import { config } from '../config';

interface ElevenlabsVoice {
  voice_id: string;
  name: string;
}

// Default voice - George (male, warm, captivating storyteller)
// Verified working on free tier
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George - free tier compatible
export class ElevenlabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voiceId: string = DEFAULT_VOICE_ID;

  constructor() {
    if (!config.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }
    this.apiKey = config.ELEVENLABS_API_KEY;
  }

  /**
   * List all available voices
   */
  async listVoices(): Promise<ElevenlabsVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.voices || [];
    } catch (error) {
      console.error('❌ Error listing voices:', error);
      throw error;
    }
  }

  /**
   * Set voice by voice_id
   */
  setVoiceId(voiceId: string): void {
    this.voiceId = voiceId;
    console.log(`🎤 Voice set to: ${voiceId}`);
  }

  /**
   * Generate audio for Bulgarian text
   * Returns a base64 encoded audio string
   */
  async generateAudio(text: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            language_code: 'bg',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      const audioBuffer = await response.buffer();
      const base64Audio = audioBuffer.toString('base64');
      
      return `data:audio/mpeg;base64,${base64Audio}`;
    } catch (error) {
      console.error('❌ Error generating audio with ElevenLabs:', error);
      throw error;
    }
  }

  /**
   * Generate audio and upload to a cloud storage (or store as data URL)
   * For now, returns base64 data URL that can be stored in MongoDB
   */
  async generateAndStoreAudio(text: string): Promise<string> {
    try {
      console.log(`🎙️  Generating audio for: "${text.substring(0, 50)}..."`);
      const audioDataUrl = await this.generateAudio(text);
      console.log(`✅ Audio generated (${audioDataUrl.length} bytes)`);
      return audioDataUrl;
    } catch (error) {
      console.error('❌ Failed to generate audio:', error);
      throw error;
    }
  }

  /**
   * Check API usage and quota
   */
  async checkQuota(): Promise<{ character_count: number; character_limit: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check quota: ${response.status}`);
      }

      const data = await response.json() as any;
      return {
        character_count: data.subscription.character_count,
        character_limit: data.subscription.character_limit,
      };
    } catch (error) {
      console.error('❌ Error checking quota:', error);
      throw error;
    }
  }
}

export const elevenlabsService = new ElevenlabsService();
