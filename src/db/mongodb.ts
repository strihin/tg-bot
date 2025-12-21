import mongoose from 'mongoose';
import { config } from '../config';

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) {
    return; // Already connected
  }

  try {
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