import dotenv from 'dotenv';

dotenv.config();

export const config = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || '',
  BOT_USERNAME: process.env.BOT_USERNAME || '',
  MONGO_URI: process.env.MONGO_URI || '',
  DEEPL_API_KEY: process.env.DEEPL_API_KEY || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  WEBHOOK_MODE: process.env.WEBHOOK_MODE === 'true',
  PORT: parseInt(process.env.PORT || '3000', 10),
};

// Validate required variables
const required = ['TELEGRAM_TOKEN', 'BOT_USERNAME', 'MONGO_URI'];
const missing = required.filter((key) => !config[key as keyof typeof config]);

if (missing.length > 0) {
  throw new Error(`Missing required env variables: ${missing.join(', ')}`);
}
