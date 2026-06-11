import { UserService } from '../utils/userService';
import { getDb } from '../database/db';
import { messageQueue } from '../queue/messageQueue';
import { bot } from '../bot/whatsapp';
import { ProviderManager } from '../providers/providerManager';
import { FifaProvider, EspnProvider, BbcProvider } from '../providers/matchProviders';

const providerManager = new ProviderManager([
  new FifaProvider(),
  new EspnProvider(),
  new BbcProvider()
]);

const ADMIN_NUMBERS = ['123456789@s.whatsapp.net']; // Replace with your admin JID

export async function handleCommand(jid: string, text: string) {
  const [command, ...args] = text.trim().toLowerCase().split(' ');
  const isAdmin = ADMIN_NUMBERS.includes(jid);

  // Auto-create user
  await UserService.createUser(jid, jid.split('@')[0]);

  // Admin Commands
  if (text.startsWith('/admin')) {
    if (!isAdmin) return;
    const adminCmd = args[0]; // because text.split(' ') is ["/admin", "stats"]
    const adminArgs = args.slice(1);

    switch (adminCmd) {
      case 'stats': {
        const db = await getDb();
        const users = await db.get('SELECT COUNT(*) as c FROM users WHERE is_subscribed = 1');
        const matches = await db.get('SELECT COUNT(*) as c FROM matches');
        await messageQueue.enqueue(jid, `📊 *Admin Stats*\n\nSubscribers: ${users.c}\nMatches Tracked: ${matches.c}\nQueue Size: ${messageQueue.getQueueSize()}`);
        break;
      }
      case 'broadcast': {
        const msg = adminArgs.join(' ');
        if (!msg) return;
        const db = await getDb();
        const users = await db.all('SELECT id FROM users WHERE is_subscribed = 1');
        await messageQueue.enqueueBatch(users.map(u => u.id), `📢 *Broadcast*\n\n${msg}`);
        await messageQueue.enqueue(jid, `✅ Broadcasted to ${users.length} users.`);
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
    case 'subscribe':
      await UserService.subscribe(jid);
      await messageQueue.enqueue(jid, '✅ Successfully subscribed to WC 2026 updates!');
      break;
    case 'unsubscribe':
      await UserService.unsubscribe(jid);
      await messageQueue.enqueue(jid, '❌ Unsubscribed from updates.');
      break;
    case 'status': {
      const db = await getDb();
      const user = await db.get('SELECT * FROM users WHERE id = ?', [jid]);
      const providers = await db.all('SELECT name, health_score FROM providers');
      const waStatus = bot.getSocket() ? 'Connected' : 'Disconnected';

      let msg = `*Bot Status*: Online\n\n`;
      msg += `WhatsApp: ${waStatus}\n`;
      msg += `Subscription: ${user?.is_subscribed ? '✅ Active' : '❌ Inactive'}\n`;
      msg += `Queue Size: ${messageQueue.getQueueSize()}\n`;
      msg += `\n*Providers Health:*\n`;
      providers.forEach(p => msg += `${p.name}: ${p.health_score.toFixed(1)}%\n`);

      await messageQueue.enqueue(jid, msg);
      break;
    }
    case 'help': {
      const help = `⚽ *WC 2026 Bot* 🏆\n\n*subscribe* - Join updates\n*unsubscribe* - Stop updates\n*status* - Bot health\n*today* - Today's matches\n*live* - Live scores\n*help* - Show menu`;
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
  }
}
