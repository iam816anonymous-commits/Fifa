import { UserService } from '../utils/userService';
import { getMatchProvider } from '../providers';
import { getDb } from '../database/db';
import { config } from '../config';
import { messageQueue } from '../queue/messageQueue';
import { bot } from '../bot/whatsapp';
export async function handleCommand(jid: string, text: string) {
  if (!text.startsWith('!')) return; // Group protection

  const [rawCommand, ...args] = text.trim().split(' ');
  const command = rawCommand.toLowerCase().slice(1);
  const isAdmin = jid === config.whatsapp.ownerJid;

  // Auto-create user
  await UserService.createUser(jid, jid.split('@')[0]);

  // Admin Commands
  if (command === 'admin') {
    if (!isAdmin) return;
    const adminCmd = args[0]?.toLowerCase();
    const adminArgs = args.slice(1);

    switch (adminCmd) {
      case 'stats': {
        const db = await getDb();
        const users = await db.get('SELECT COUNT(*) as c FROM users');
        const follows = await db.get('SELECT COUNT(*) as c FROM team_follows');
        const matches = await db.get('SELECT COUNT(*) as c FROM matches');
        await messageQueue.enqueue(jid, `📊 *Admin Stats*\n\nUsers: ${users.c}\nFollows: ${follows.c}\nMatches: ${matches.c}\nQueue: ${messageQueue.getQueueSize()}`);
        break;
      }
      case 'broadcast': {
        const msg = args.slice(1).join(' ');
        if (!msg) return;
        if (config.whatsapp.groupJid) {
            await messageQueue.enqueue(config.whatsapp.groupJid, `📢 *Admin Broadcast*\n\n${msg}`);
            await messageQueue.enqueue(jid, `✅ Broadcasted to Group.`);
        }
        break;
      }
      case 'providers': {
        const db = await getDb();
        const providers = await db.all('SELECT * FROM providers');
        let msg = `🔌 *Providers Health*\n\n`;
        providers.forEach(p => msg += `${p.name}: ${p.health_score.toFixed(1)}% (${p.success_count}S/${p.failure_count}F)\n`);
        await messageQueue.enqueue(jid, msg);
        break;
      }
      case 'queue': {
        await messageQueue.enqueue(jid, `📦 *Queue Size:* ${messageQueue.getQueueSize()}`);
        break;
      }
    }
    return;
  }

  // User Commands
  switch (command) {
    case 'status': {
      const db = await getDb();
      const providers = await db.all('SELECT name, health_score FROM providers');
      const waStatus = bot.getSocket() ? 'Connected' : 'Disconnected';

      let msg = `*Bot Status*: Online\n\n`;
      msg += `WhatsApp: ${waStatus}\n`;
      msg += `Group: ${config.whatsapp.groupJid ? '✅ Active' : '❌ Not Set'}\n`;
      msg += `Queue Size: ${messageQueue.getQueueSize()}\n`;
      msg += `\n*Providers Health:*\n`;
      providers.forEach(p => msg += `${p.name}: ${p.health_score.toFixed(1)}%\n`);

      await messageQueue.enqueue(jid, msg);
      break;
    }
    case 'help': {
      const help = `⚽ *WC 2026 Bot* 🏆\n\n!today - Today's matches\n!live - Live scores\n!standings - Standings\n!news - News\n!follow <team> - Get DMs for a team\n!unfollow <team> - Stop team DMs\n!myteams - List followed teams\n!status - Bot health\n!help - Menu`;
      await messageQueue.enqueue(jid, help);
      break;
    }
    case 'today': {
      const db = await getDb();
      const matches = await db.all("SELECT * FROM matches WHERE date(match_time) = date('now')");
      if (matches.length === 0) {
        await messageQueue.enqueue(jid, 'No matches scheduled for today.');
      } else {
        const msg = matches.map(m => `${m.home_team} vs ${m.away_team} (${m.status})`).join('\n');
        await messageQueue.enqueue(jid, `*Today's Matches:*\n${msg}`);
      }
      break;
    }
    case 'live': {
      const db = await getDb();
      const matches = await db.all("SELECT * FROM matches WHERE status = 'LIVE'");
      if (matches.length === 0) {
        await messageQueue.enqueue(jid, 'No live matches right now.');
      } else {
        const msg = matches.map(m => `🔴 ${m.home_team} ${m.home_score} - ${m.away_score} ${m.away_team}`).join('\n');
        await messageQueue.enqueue(jid, `*Live Scores:*\n${msg}`);
      }
      break;
    }
    case 'follow': {
      const team = args.join(' ');
      if (!team) return messageQueue.enqueue(jid, 'Usage: !follow Argentina');
      await UserService.followTeam(jid, team);
      await messageQueue.enqueue(jid, `✅ You are now following *${team}*.\nYou will receive private DM alerts for their matches.`);
      break;
    }
    case 'unfollow': {
      const team = args.join(' ');
      if (!team) return messageQueue.enqueue(jid, 'Usage: !unfollow Argentina');
      await UserService.unfollowTeam(jid, team);
      await messageQueue.enqueue(jid, `❌ Unfollowed *${team}*.`);
      break;
    }
    case 'myteams': {
      const teams = await UserService.getUserFollowedTeams(jid);
      if (teams.length === 0) {
        await messageQueue.enqueue(jid, 'You are not following any teams.');
      } else {
        await messageQueue.enqueue(jid, `⭐️ *Your Teams:*\n\n${teams.map(t => `- ${t}`).join('\n')}`);
      }
      break;
    }
    case 'unfollowall': {
      await UserService.unfollowAll(jid);
      await messageQueue.enqueue(jid, '❌ Unfollowed all teams.');
      break;
    }
    case 'standings': {
      const provider = getMatchProvider();
      const standings = await provider.getStandings();
      if (!standings || standings.length === 0) {
        await messageQueue.enqueue(jid, 'Standings unavailable.');
      } else {
        const msg = standings.map((s: any) => `${s.group}: ${s.rank}. ${s.teamName} (${s.points}pts)`).join('\n');
        await messageQueue.enqueue(jid, `*Standings*\n${msg}`);
      }
      break;
    }
    case 'news': {
      const db = await getDb();
      const news = await db.all('SELECT * FROM news ORDER BY published_at DESC LIMIT 5');
      if (news.length === 0) {
        await messageQueue.enqueue(jid, 'No news available.');
      } else {
        const msg = news.map(n => `*${n.title}*\n${n.url}`).join('\n\n');
        await messageQueue.enqueue(jid, `*Latest News*\n\n${msg}`);
      }
      break;
    }
  }
}
