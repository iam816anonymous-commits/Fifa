import express from 'express';
import { config } from './config';
import { initDb, getDb } from './database/db';
import { bot } from './bot/whatsapp';
import { handleCommand } from './commands';
import { setupJobs } from './scheduler/jobs';
import { notificationEngine } from './notifications/engine';
import { ProviderManager } from './providers/providerManager';
import { FifaProvider, EspnProvider, BbcProvider } from './providers/matchProviders';
import { UserRepository } from './repositories/UserRepository';
import { MatchRepository } from './repositories/MatchRepository';
import { messageQueue } from './queue/messageQueue';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json());

// Admin Middleware
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === config.admin.apiKey) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
};

// Admin API Routes
app.get('/admin/stats', adminAuth, async (req, res) => {
    const users = await UserRepository.countUsers();
    const follows = await UserRepository.countFollows();
    const matches = await MatchRepository.countMatches();
    res.json({ users, follows, matches });
});

app.post('/admin/broadcast', adminAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (config.whatsapp.groupJid) {
        await messageQueue.enqueue(config.whatsapp.groupJid, `📢 *BROADCAST*\n\n${message}`);
    }
    res.json({ success: true });
});

app.get('/admin/users', adminAuth, async (req, res) => {
    const db = await getDb();
    const users = await db.all('SELECT * FROM users');
    res.json(users);
});

app.get('/admin/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

async function crashRecovery() {
  logger.info('Starting crash recovery...');
  const db = await getDb();

  // Load users count
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  logger.info(`Users loaded: ${userCount.count}`);

  // Load last match states
  const matchCount = await db.get('SELECT COUNT(*) as count FROM matches');
  logger.info(`Last match states loaded: ${matchCount.count}`);

  // Load notification hashes count
  const hashCount = await db.get('SELECT COUNT(*) as count FROM notification_hashes');
  logger.info(`Notification hashes loaded: ${hashCount.count}`);
}

async function start() {
  await initDb();
  logger.info('Database initialized');

  await crashRecovery();

  await bot.connect();
  bot.onMessage(async (msg) => {
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
    if (jid && text) {
      await handleCommand(jid, text);
    }
  });

  setupJobs();
  logger.info('Scheduler jobs started');

  app.listen(config.port, () => {
    logger.info(`Admin API listening on port ${config.port}`);
  });
}

start().catch(err => {
  logger.error('Failed to start application:', err);
});
