import mongoose from 'mongoose';
import { config } from '../config';

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) {
    return; // Already connected
  }

  try {
    // Extract username from URI for logging
    const uriMatch = config.MONGO_URI.match(/mongodb\+srv:\/\/([^:]+):/);
    const username = uriMatch ? decodeURIComponent(uriMatch[1]) : 'unknown';
    const clusterMatch = config.MONGO_URI.match(/@([^/?]+)/);
    const cluster = clusterMatch ? clusterMatch[1] : 'unknown';
    
    console.log('');
    console.log('=== MongoDB Connection Attempt ===');
    console.log(`🔐 Connecting to MongoDB`);
    console.log(`   Username: ${username}`);
    console.log(`   Cluster: ${cluster}`);
    console.log(`   Full URI starts with: ${config.MONGO_URI.substring(0, 60)}...`);
    console.log('===================================');
    console.log('');
    
    await mongoose.connect(config.MONGO_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) {
    return; // Not connected
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
}

export async function ensureMongoDBConnection(): Promise<void> {
  await connectMongoDB();
}