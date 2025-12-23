import express from 'express';
import { getUserProgressAsync, initializeUserProgress, updateUserIndex, changeTargetLanguage } from './data/progress';
import { getRecentActivity } from './utils/logger';
import { LEVELS } from './constants';
import { getAvailableCategories, getSentenceByIndex, getTotalSentences, getCategoryInfo } from './data/loader';
import { TargetLanguage, FolderType } from './types';
import { config } from './config';

const app = express();
const PORT = config.PORT;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    levels: LEVELS,
    message: 'Bulgarian Learning Bot is running! Web learning available at / and Telegram bot active.'
  });
});

app.get('/api/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const progress = await getUserProgressAsync(userId);

  if (!progress) {
    return res.json({ userId, progress: null, message: 'No progress found' });
  }

  res.json({ userId, progress });
});

app.post('/api/user/:userId/reset', (req, res) => {
  const userId = parseInt(req.params.userId);
  // This would simulate clearing progress
  res.json({ userId, message: 'Progress reset (simulated)' });
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = getRecentActivity(limit);
  res.json({ logs, count: logs.length });
});

app.get('/api/categories/:folder', async (req, res) => {
  const folder = req.params.folder as keyof typeof LEVELS;
  const categories = await getAvailableCategories(folder);

  res.json({
    folder,
    level: LEVELS[folder],
    categories: await Promise.all(categories.map(async (cat) => {
      const categoryInfo = await getCategoryInfo(folder, cat);
      return {
        id: cat,
        name: categoryInfo?.name || cat,
        emoji: categoryInfo?.emoji || '📚',
        sentenceCount: categoryInfo?.sentenceCount || 0
      };
    }))
  });
});

// Learning API endpoints
app.post('/api/learn/init', async (req, res) => {
  const { userId, category, languageTo, folder } = req.body;

  if (!userId || !category || !languageTo || !folder) {
    return res.status(400).json({ error: 'Missing required fields: userId, category, languageTo, folder' });
  }

  try {
    const progress = await initializeUserProgress(userId, category, languageTo as TargetLanguage, folder as FolderType);
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize progress' });
  }
});

app.get('/api/learn/:userId/next', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const progress = await getUserProgressAsync(userId);

  if (!progress) {
    return res.status(404).json({ error: 'User progress not found. Please initialize first.' });
  }

  const sentence = await getSentenceByIndex(progress.category, progress.currentIndex, progress.folder);
  const totalSentences = await getTotalSentences(progress.category, progress.folder);

  if (!sentence) {
    return res.json({
      progress,
      sentence: null,
      totalSentences,
      message: 'No more sentences in this category'
    });
  }

  res.json({
    progress,
    sentence: {
      bg: sentence.bg,
      translation: sentence[progress.languageTo === 'kharkiv' ? 'ru' : progress.languageTo] || sentence.eng,
      source: sentence.source,
      grammar: sentence.grammar,
      explanation: sentence.explanation,
      tag: sentence.tag,
      rule: sentence[`rule${progress.languageTo === 'kharkiv' ? 'Ru' : progress.languageTo.toUpperCase()}` as keyof typeof sentence] || sentence.ruleEng,
      comparison: sentence.comparison,
      falseFriend: sentence.falseFriend
    },
    totalSentences,
    currentIndex: progress.currentIndex,
    hasNext: progress.currentIndex < totalSentences - 1,
    hasPrevious: progress.currentIndex > 0
  });
});

app.post('/api/learn/:userId/next', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const progress = await getUserProgressAsync(userId);

  if (!progress) {
    return res.status(404).json({ error: 'User progress not found' });
  }

  const totalSentences = await getTotalSentences(progress.category, progress.folder);
  const newIndex = Math.min(progress.currentIndex + 1, totalSentences - 1);

  await updateUserIndex(userId, newIndex);

  res.json({
    success: true,
    newIndex,
    hasNext: newIndex < totalSentences - 1
  });
});

app.post('/api/learn/:userId/previous', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const progress = await getUserProgressAsync(userId);

  if (!progress) {
    return res.status(404).json({ error: 'User progress not found' });
  }

  const newIndex = Math.max(progress.currentIndex - 1, 0);
  await updateUserIndex(userId, newIndex);

  res.json({
    success: true,
    newIndex,
    hasPrevious: newIndex > 0
  });
});

app.post('/api/learn/:userId/language', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { languageTo } = req.body;

  if (!languageTo || !['eng', 'kharkiv', 'ua'].includes(languageTo)) {
    return res.status(400).json({ error: 'Invalid language. Must be eng, kharkiv, or ua' });
  }

  try {
    await changeTargetLanguage(userId, languageTo as TargetLanguage);
    res.json({ success: true, languageTo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change language' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🌐 Web testing interface running at http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET  /api/status`);
  console.log(`   GET  /api/user/:userId`);
  console.log(`   POST /api/user/:userId/reset`);
  console.log(`   GET  /api/categories/:folder`);
  console.log(`   POST /api/learn/init`);
  console.log(`   GET  /api/learn/:userId/next`);
  console.log(`   POST /api/learn/:userId/next`);
  console.log(`   POST /api/learn/:userId/previous`);
  console.log(`   POST /api/learn/:userId/language`);

});



export function getExpressApp(): express.Application {
  return app;
}