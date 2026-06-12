import cron from 'node-cron';
import { getDb } from '../database/db';
import { notificationEngine } from '../notifications/engine';
import { getMatchProvider } from '../providers';
import { messageQueue } from '../queue/messageQueue';
import { config } from '../config';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

const providerManager = getMatchProvider();

export function setupJobs() {
  // Every 5 minutes: Check live matches
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Syncing matches...');
    try {
      const matches = await providerManager.getMatches();
      for (const m of matches) {
        await notificationEngine.processMatchUpdate(m);
      }
    } catch (error) {
      logger.error('Match sync failed:', error);
    }
  });

  // Every 15 minutes: Check news
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Syncing news...');
    try {
      const newsItems = await providerManager.getNews();
      const db = await getDb();
      for (const item of newsItems) {
        const fingerprint = `NEWS_${item.url}`.toUpperCase();
        const exists = await db.get('SELECT hash FROM notification_hashes WHERE hash = ?', [fingerprint]);

        if (!exists) {
            await db.run('INSERT INTO news (title, url, published_at) VALUES (?, ?, ?)', [item.title, item.url, item.publishedAt.toISOString()]);
            await db.run('INSERT INTO notification_hashes (hash) VALUES (?)', [fingerprint]);

            if (config.whatsapp.groupJid) {
                await messageQueue.enqueue(config.whatsapp.groupJid, `📰 *World Cup News* 📰\n\n${item.title}\n\nRead more: ${item.url}`);
            }
        }
      }
    } catch (error) {
      logger.error('News sync failed:', error);
    }
  });

  // Every day at 8 AM: Daily fixtures broadcast
  cron.schedule('0 8 * * *', async () => {
    logger.info('Sending daily fixtures...');
    const db = await getDb();
    const matches = await db.all("SELECT * FROM matches WHERE date(match_time) = date('now')");
    if (matches.length > 0) {
      const msg = `📅 *Today's WC Fixtures* 📅\n\n` + matches.map(m => `${m.home_team} vs ${m.away_team} (${new Date(m.match_time).toLocaleTimeString()})`).join('\n');

      // 1. Post to Group
      if (config.whatsapp.groupJid) {
          await messageQueue.enqueue(config.whatsapp.groupJid, msg);
      }

      // 2. We no longer broadcast to all users directly (Group-first pivot)
    }
  });
}
