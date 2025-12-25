// Barrel export - aggregates all lesson modules
export { handleStartLessonButton, handleLessonStart } from './init';
export { handleShowTranslation } from './translate';
export { handleNext, handlePrevious } from './nav';
export { updateAudioMessageSmooth, updateTextMessageSmooth, sendFallbackMessage } from './audio';
export { buildLessonText } from './text';
export { markSentenceAsLearned } from './mastery';
