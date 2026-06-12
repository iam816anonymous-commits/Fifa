import cron from 'node-cron';
import { notificationEngine } from '../notifications/engine';
import { getMatchProvider } from '../providers';
import { messageQueue } from '../queue/messageQueue';
import { config } from '../config';
import { MatchRepository } from '../repositories/MatchRepository';
import { NewsRepository } from '../repositories/NewsRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
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
      for (const item of newsItems) {
        const fingerprint = `NEWS_${item.url}`.toUpperCase();
        const alreadySent = await NotificationRepository.isAlreadySent(fingerprint);

        if (!alreadySent) {
            await NewsRepository.saveNews(item);
            await NotificationRepository.markAsSent(fingerprint);

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
    const today = new Date().toISOString().split('T')[0];
    const matches = await MatchRepository.getMatchesByDate(today);
    if (matches.length > 0) {
      const msg = `📅 *Today's WC Fixtures* 📅\n\n` + matches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.matchTime.toLocaleTimeString()})`).join('\n');

      // 1. Post to Group
      if (config.whatsapp.groupJid) {
          await messageQueue.enqueue(config.whatsapp.groupJid, msg);
      }
    }
  });
}
