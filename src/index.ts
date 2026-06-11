import express from 'express';
import { config } from './config';
import { initDb, getDb } from './database/db';
import { bot } from './bot/whatsapp';
import { handleCommand } from './commands';
import { setupJobs } from './scheduler/jobs';
import { notificationEngine } from './notifications/engine';
import { ProviderManager } from './providers/providerManager';
import { FifaProvider, EspnProvider, BbcProvider } from './providers/matchProviders';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json());

async function crashRecovery() {
  logger.info('Starting crash recovery...');
  const db = await getDb();

  // Load subscribers count
  const userCount = await db.get('SELECT COUNT(*) as count FROM users WHERE is_subscribed = 1');
  logger.info(`Subscribers loaded: ${userCount.count}`);

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
