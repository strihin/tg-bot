import mongoose, { Schema, Document } from 'mongoose';
import { FolderType, TargetLanguage } from '../types';

export interface ISentence extends Document {
  bg: string;
  eng: string;
  ru: string;
  ua: string;
  source: string;
  folder: FolderType;
  category: string;
  grammar?: string[];
  explanation?: string;
  tag?: string;
  ruleEng?: string;
  ruleRu?: string;
  ruleUA?: string;
  comparison?: string;
  falseFriend?: string;
  audioUrl?: string;  // URL to ElevenLabs audio
  audioGenerated?: boolean;  // Whether audio has been generated
}

const SentenceSchema = new Schema<ISentence>({
  bg: { type: String, required: true },
  eng: { type: String, required: true },
  ru: { type: String, required: true },
  ua: { type: String, required: true },
  source: { type: String, required: true },
  folder: { type: String, required: true, enum: ['basic', 'middle', 'middle-slavic', 'misc', 'language-comparison', 'expressions'] },
  category: { type: String, required: true },
  grammar: [{ type: String }],
  explanation: { type: String },
  tag: { type: String },
  ruleEng: { type: String },
  ruleRu: { type: String },
  ruleUA: { type: String },
  comparison: { type: String },
  falseFriend: { type: String },
  audioUrl: { type: String },
  audioGenerated: { type: Boolean, default: false }
});

// Create indexes for efficient queries
SentenceSchema.index({ folder: 1, category: 1 });
SentenceSchema.index({ folder: 1, category: 1, bg: 1 });

export const SentenceModel = mongoose.model<ISentence>('Sentence', SentenceSchema);

export interface ICategory extends Document {
  id: string;
  name: string;
  emoji: string;
  folder: FolderType;
  sentenceCount: number;
}

const CategorySchema = new Schema<ICategory>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  emoji: { type: String, required: true },
  folder: { type: String, required: true, enum: ['basic', 'middle', 'middle-slavic', 'misc', 'language-comparison', 'expressions'] },
  sentenceCount: { type: Number, default: 0 }
});

// Create indexes
CategorySchema.index({ folder: 1 });
CategorySchema.index({ folder: 1, id: 1 }, { unique: true });

export const CategoryModel = mongoose.model<ICategory>('Category', CategorySchema);

export interface IUserProgress extends Document {
  userId: number;
  currentIndex: number;
  category: string;
  folder: FolderType;
  languageFrom: string;
  languageTo: TargetLanguage;
  lessonMessageId?: number;
  audioMessageId?: number;
  lessonActive?: boolean;
  sentMessageIds?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema<IUserProgress>(
  {
    userId: { type: Number, required: true, unique: true },
    currentIndex: { type: Number, default: 0 },
    category: { type: String, default: 'greetings' },
    folder: { type: String, default: 'basic', enum: ['basic', 'middle', 'middle-slavic', 'misc', 'language-comparison', 'expressions'] },
    languageFrom: { type: String, default: 'bg' },
    languageTo: { type: String, default: 'eng', enum: ['eng', 'kharkiv', 'ua'] },
    lessonMessageId: { type: Number },
    audioMessageId: { type: Number },
    lessonActive: { type: Boolean, default: false },
    sentMessageIds: { type: [Number], default: [] },
  },
  { timestamps: true }
);

// Create indexes
// Note: userId is already set as unique in the field definition, so we don't need a separate index

export const UserProgressModel = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);

export interface ISentenceMastery extends Document {
  userId: number;
  sentenceId: string;  // MongoDB ObjectId of the sentence
  folder: FolderType;
  category: string;
  status: 'new' | 'learning' | 'learned' | 'known';  // new=not touched, learning=attempted, learned=mastered, known=already knew
  reviewCount: number;  // How many times reviewed
  lastReviewedAt?: Date;
  masteredAt?: Date;  // When marked as learned/known
}

const SentenceMasterySchema = new Schema<ISentenceMastery>(
  {
    userId: { type: Number, required: true },
    sentenceId: { type: String, required: true },
    folder: { type: String, required: true },
    category: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['new', 'learning', 'learned', 'known'],
      default: 'new'
    },
    reviewCount: { type: Number, default: 0 },
    lastReviewedAt: { type: Date },
    masteredAt: { type: Date },
  },
  { timestamps: true }
);

// Create indexes for efficient queries
SentenceMasterySchema.index({ userId: 1, folder: 1, category: 1 });
SentenceMasterySchema.index({ userId: 1, sentenceId: 1 }, { unique: true });
SentenceMasterySchema.index({ userId: 1, status: 1 });

export const SentenceMasteryModel = mongoose.model<ISentenceMastery>('SentenceMastery', SentenceMasterySchema);

export interface IFavourite extends Document {
  userId: number;
  sentenceId: string;  // MongoDB ObjectId of the sentence
  folder: FolderType;
  category: string;
  bg: string;  // Cache Bulgarian text for quick access
  eng: string;  // Cache English text
  ru: string;
  ua: string;
  audioUrl?: string;  // Base64 audio data
  addedAt: Date;
}

const FavouriteSchema = new Schema<IFavourite>(
  {
    userId: { type: Number, required: true },
    sentenceId: { type: String, required: true },
    folder: { type: String, required: true },
    category: { type: String, required: true },
    bg: { type: String, required: true },
    eng: { type: String, required: true },
    ru: { type: String, required: true },
    ua: { type: String, required: true },
    audioUrl: { type: String, default: null },
    addedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Create indexes for efficient queries
FavouriteSchema.index({ userId: 1 });
FavouriteSchema.index({ userId: 1, sentenceId: 1 }, { unique: true });
FavouriteSchema.index({ userId: 1, folder: 1, category: 1 });

export const FavouriteModel = mongoose.model<IFavourite>('Favourite', FavouriteSchema);