import cron from 'node-cron';
import { getDb } from '../database/db';
import { notificationEngine } from '../notifications/engine';
import { ProviderManager } from '../providers/providerManager';
import { FifaProvider, EspnProvider, BbcProvider } from '../providers/matchProviders';
import { messageQueue } from '../queue/messageQueue';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

const providerManager = new ProviderManager([
  new FifaProvider(),
  new EspnProvider(),
  new BbcProvider()
]);

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
    // Implementation for news syncing using a NewsProvider
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
