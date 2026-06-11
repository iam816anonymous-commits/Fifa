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
  // Every 5 minutes: Check live scores and sync matches
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running 5-minute job: Syncing matches and checking live scores');
    await matchService.syncMatches();
    // Logic for notifying subscribed users about live score changes could go here
  });

  // Every 15 minutes: Check breaking news
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running 15-minute job: Syncing news');
    await newsService.syncNews();
  });

  // Every day at 8 AM: Send today's matches
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running daily 8 AM job: Sending today\'s matches');
    const matches = await matchService.getTodayMatches();
    if (matches.length > 0) {
      const users = await UserService.getSubscribedUsers();
      const msg = `⚽ *Today's Matches:*\n\n` + matches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.matchTime.toLocaleTimeString()})`).join('\n');
      for (const user of users) {
        await messageQueue.enqueue(user.id, msg);
      }
    }
  });

  // Every Monday: Send weekly fixtures (simplified here as just a reminder or list)
  cron.schedule('0 9 * * 1', async () => {
    logger.info('Running weekly Monday job: Sending weekly fixtures');
    const users = await UserService.getSubscribedUsers();
    for (const user of users) {
      await messageQueue.enqueue(user.id, '📅 Happy Monday! Use the *schedule* command to see this week\'s fixtures.');
    }
  });
}
