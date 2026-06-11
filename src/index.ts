import express from 'express';
import { config } from './config';
import { initDb, getDb } from './database/db';
import { bot } from './bot/whatsapp';
import { handleCommand } from './commands';
import { setupJobs } from './scheduler/jobs';
import { messageQueue } from './bot/queue';
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

// Admin Routes
app.get('/admin/stats', adminAuth, async (req, res) => {
  const db = await getDb();
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  const subCount = await db.get('SELECT COUNT(*) as count FROM users WHERE is_subscribed = 1');
  res.json({ users: userCount.count, subscribers: subCount.count });
});

app.post('/admin/broadcast', adminAuth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const db = await getDb();
  const users = await db.all('SELECT id FROM users WHERE is_subscribed = 1');
  for (const user of users) {
    await messageQueue.enqueue(user.id, `📢 *BROADCAST*\n\n${message}`);
  }
  res.json({ success: true, broadcastedTo: users.length });
});

app.get('/admin/users', adminAuth, async (req, res) => {
  const db = await getDb();
  const users = await db.all('SELECT * FROM users');
  res.json(users);
});

app.get('/admin/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function start() {
  await initDb();
  logger.info('Database initialized');

  await bot.connect();
  bot.onMessage(async (msg) => {
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
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
