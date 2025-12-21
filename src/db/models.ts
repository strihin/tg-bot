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
  falseFriend: { type: String }
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
  lessonActive?: boolean;
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
    lessonActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Create indexes
// Note: userId is already set as unique in the field definition, so we don't need a separate index

export const UserProgressModel = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);