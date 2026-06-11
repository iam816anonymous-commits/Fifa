import cron from 'node-cron';
import { MatchService } from '../services/matchService';
import { NewsService } from '../services/newsService';
import { UserService } from '../services/userService';
import { getSportsProvider, getNewsProvider } from '../providers';
import { messageQueue } from '../bot/queue';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

const sportsProvider = getSportsProvider();
const newsProvider = getNewsProvider();
const matchService = new MatchService(sportsProvider);
const newsService = new NewsService(newsProvider);

export function setupJobs() {
  // Every 5 minutes: Check live matches
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running 5-minute job: Checking live matches');
    try {
      await matchService.syncMatches();
    } catch (error) {
      logger.error('Error in 5-minute job:', error);
    }
  });

  // Every 15 minutes: Check news
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running 15-minute job: Checking news');
    try {
      await newsService.syncNews();
      // Optionally notify users of new breaking news here
    } catch (error) {
      logger.error('Error in 15-minute job:', error);
    }
  });

  // Every day at 8 AM: Send today's fixtures
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running daily 8 AM job: Sending fixtures');
    try {
      const matches = await matchService.getTodayMatches();
      if (matches.length > 0) {
        const users = await UserService.getSubscribedUsers();
        const userIds = users.map(u => u.id);
        const msg = `⚽ *Today's World Cup Fixtures:*\n\n` +
                    matches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.matchTime.toLocaleTimeString()})`).join('\n');
        await messageQueue.enqueueBatch(userIds, msg);
      }
    } catch (error) {
      logger.error('Error in daily job:', error);
    }
  });
}
