/**
 * Lesson Handler - Barrel export combining all lesson-related functionality
 * 
 * This module is organized into focused files:
 * - lesson-init.ts: Lesson initialization (start button, /start command)
 * - lesson-translate.ts: Translation reveal
 * - lesson-nav.ts: Navigation (next, previous)
 * - lesson-audio.ts: Audio message updates
 * - lesson-text.ts: Shared text building utilities
 * - lesson-mastery.ts: User mastery tracking
 */

// Barrel export - re-export all lesson modules from organized folder structure
export * from './lesson/index';

