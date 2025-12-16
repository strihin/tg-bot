import express, { Express, Request, Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';

const PORT = process.env.PORT || 3000;
const VPS_IP = process.env.VPS_IP || 'localhost';
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://${VPS_IP}:${PORT}`;

export async function setupWebhookServer(bot: TelegramBot): Promise<Express> {
  const app = express();

  // Middleware
  app.use(express.json());

  // Health check endpoint (for n8n or monitoring)
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Webhook endpoint for Telegram updates
  app.post('/telegram/webhook', (req: Request, res: Response) => {
    console.log('📨 Webhook update received');
    try {
      bot.processUpdate(req.body);
      res.json({ ok: true });
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Endpoint to setup/register webhook with Telegram
  app.post('/telegram/register-webhook', async (req: Request, res: Response) => {
    try {
      const webhookUrl = `${WEBHOOK_URL}/telegram/webhook`;
      console.log(`🔗 Registering webhook: ${webhookUrl}`);
      
      // Remove old webhook if exists
      await bot.deleteWebHook();
      
      // Set new webhook
      await bot.setWebHook(webhookUrl);
      
      res.json({ 
        ok: true, 
        message: 'Webhook registered successfully',
        webhook_url: webhookUrl
      });
    } catch (error) {
      console.error('❌ Webhook registration error:', error);
      res.status(500).json({ error: 'Failed to register webhook' });
    }
  });

  // Endpoint to get webhook info
  app.get('/telegram/webhook-info', async (req: Request, res: Response) => {
    try {
      const info = await bot.getWebHookInfo();
      res.json(info);
    } catch (error) {
      console.error('❌ Webhook info error:', error);
      res.status(500).json({ error: 'Failed to get webhook info' });
    }
  });

  // Endpoint to remove webhook (for switching back to polling)
  app.post('/telegram/remove-webhook', async (req: Request, res: Response) => {
    try {
      await bot.deleteWebHook();
      res.json({ ok: true, message: 'Webhook removed' });
    } catch (error) {
      console.error('❌ Webhook removal error:', error);
      res.status(500).json({ error: 'Failed to remove webhook' });
    }
  });

  // n8n integration endpoint - allows external services to trigger actions
  app.post('/n8n/action', (req: Request, res: Response) => {
    console.log('🔔 n8n action received:', req.body);
    // This can be extended for custom n8n workflows
    res.json({ ok: true, message: 'Action received' });
  });

  return app;
}

export async function startServer(app: Express): Promise<void> {
  return new Promise((resolve) => {
    // Use HTTP for now (easier testing)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} (HTTP)`);
      console.log(`📍 Webhook URL: http://${VPS_IP}:${PORT}/telegram/webhook`);
      console.log(`🔗 n8n action URL: http://${VPS_IP}:${PORT}/n8n/action`);
      console.log(`🔗 Health check: http://${VPS_IP}:${PORT}/health`);
      resolve();
    });
  });
}
