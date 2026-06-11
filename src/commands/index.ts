import { UserService } from '../services/userService';
import { MatchService } from '../services/matchService';
import { NewsService } from '../services/newsService';
import { getSportsProvider, getNewsProvider } from '../providers';
import { messageQueue } from '../bot/queue';
import { config } from '../config';
import { getDb } from '../database/db';

const sportsProvider = getSportsProvider();
const newsProvider = getNewsProvider();
const matchService = new MatchService(sportsProvider);
const newsService = new NewsService(newsProvider);

export async function handleCommand(jid: string, text: string) {
  const [command, ...args] = text.trim().toLowerCase().split(' ');

  // Ensure user exists
  await UserService.createUser(jid, jid.split('@')[0]);

  switch (command) {
    case 'subscribe':
      await UserService.subscribe(jid);
      await messageQueue.enqueue(jid, '✅ You have successfully subscribed to FIFA 2026 updates!');
      break;

    case 'unsubscribe':
      await UserService.unsubscribe(jid);
      await messageQueue.enqueue(jid, '❌ You have unsubscribed from updates.');
      break;



    case 'help': {
      const helpMessage = `⚽ *FIFA World Cup 2026 Bot* 🏆

*subscribe* - Join the notification list
*unsubscribe* - Stop receiving updates
*today* - See today's matches
*live* - Get live scores
*standings* - Group standings
*news* - Latest news
*follow <team>* - Follow a specific team
*status* - Check bot health
*help* - Show this menu

_Automatic updates for scores and news are sent to all subscribers._`;
      await messageQueue.enqueue(jid, helpMessage);
      break;
    }

    case 'status': {
      const db = await getDb();
      const user = await db.get('SELECT * FROM users WHERE id = ?', [jid]);
      const providers = await db.all('SELECT name, health_score FROM providers');

      let statusMsg = `*Bot Status*\n\n`;
      statusMsg += `Subscription: ${user?.is_subscribed ? '✅ Active' : '❌ Inactive'}\n`;
      statusMsg += `\n*Data Sources Health:*\n`;
      if (providers.length === 0) {
        statusMsg += `Initial setup in progress...`;
      } else {
        providers.forEach((p: any) => {
          statusMsg += `${p.name}: ${p.health_score.toFixed(1)}%\n`;
        });
      }

      await messageQueue.enqueue(jid, statusMsg);
      break;
    }

    case 'follow': {
      if (args.length === 0) {
        await messageQueue.enqueue(jid, 'Please specify a team name. Example: follow USA');
        break;
      }
      const teamToFollow = args.join(' ');
      await UserService.followTeam(jid, teamToFollow);
      await messageQueue.enqueue(jid, `✅ You are now following *${teamToFollow}*.`);
      break;
    }

    case 'unfollow': {
      if (args.length === 0) {
        await messageQueue.enqueue(jid, 'Please specify a team name. Example: unfollow USA');
        break;
      }
      const teamToUnfollow = args.join(' ');
      await UserService.unfollowTeam(jid, teamToUnfollow);
      await messageQueue.enqueue(jid, `❌ You have unfollowed *${teamToUnfollow}*.`);
      break;
    }

    case 'today': {
      const matches = await matchService.getTodayMatches();
      if (matches.length === 0) {
        await messageQueue.enqueue(jid, 'No matches scheduled for today.');
      } else {
        const msg = matches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.status})`).join('\n');
        await messageQueue.enqueue(jid, `*Today's Matches:*\n${msg}`);
      }
      break;
    }

    case 'live': {
      const live = await matchService.getLiveScores();
      if (live.length === 0) {
        await messageQueue.enqueue(jid, 'No live matches at the moment.');
      } else {
        const msg = live.map(m => `🔴 ${m.homeTeam} ${m.homeScore} - ${m.awayScore} ${m.awayTeam}`).join('\n');
        await messageQueue.enqueue(jid, `*Live Scores:*\n${msg}`);
      }
      break;
    }

    case 'standings': {
      const standings = await matchService.getStandings();
      if (standings.length === 0) {
        await messageQueue.enqueue(jid, 'Standings data currently unavailable.');
      } else {
        const msg = standings.map(s => `${s.group}: ${s.rank}. ${s.teamName} - ${s.points}pts`).join('\n');
        await messageQueue.enqueue(jid, `*Standings:*\n${msg}`);
      }
      break;
    }

    case 'news': {
      const news = await newsService.getLatestNews();
      if (news.length === 0) {
        await messageQueue.enqueue(jid, 'No news available at the moment.');
      } else {
        const msg = news.map(n => `*${n.title}*\n${n.url}`).join('\n\n');
        await messageQueue.enqueue(jid, `*Latest News:*\n\n${msg}`);
      }
      break;
    }

    default:
      break;
  }
}
