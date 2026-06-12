# FIFA World Cup 2026 WhatsApp Bot (Hybrid Model)

A Group-first WhatsApp bot that provides real-time World Cup updates, goal alerts, and news.

## 🚀 Architecture: Group-First

This bot is designed to run inside a WhatsApp Group (or Channel) to minimize direct message volume.

- **Group Updates**: All major events (Goals, Match Start/Finish, FIFA News) are posted automatically to the group.
- **Direct Messages**: Users can `!follow` specific teams to receive private DM alerts for those teams only.

## 🛠️ Key Features

- **Multi-Source Scraping**: Scrapes FIFA, ESPN, and BBC with automatic failover.
- **Event Detection**: Snapshot-based engine detects goals, half-time, and final scores.
- **Zero Spam**: Fingerprinting ensures every unique event is notified only once.
- **Group Protection**: Ignores any message not starting with `!`.
- **Admin Control**: Restricted commands for monitoring health, stats, and queue.

## 📋 Commands

### User Commands (In Group or DM)
- `!today` - Matches happening today.
- `!live` - Current live scores.
- `!standings` - Group standings.
- `!news` - Latest World Cup news.
- `!follow <team>` - Get private DM alerts for a team (e.g., `!follow Argentina`).
- `!unfollow <team>` - Stop private alerts for a team.
- `!myteams` - List teams you are following.
- `!status` - Bot health and provider status.
- `!help` - Show this menu.

### Admin Commands (Restricted to Owner)
- `!admin stats` - User and match statistics.
- `!admin providers` - Scraper health scores.
- `!admin health` - Uptime and system status.
- `!admin queue` - Message delivery queue size.
- `!admin broadcast <msg>` - Post a manual message to the group.

## ⚙️ Setup

1. `npm install`
2. Configure `.env`:
   ```env
   OWNER_JID=123456789@s.whatsapp.net
   WHATSAPP_GROUP_JID=123456789@g.us
   ```
3. `npm run build`
4. `npm start`

## ✅ Verification
Run the verification suite to ensure all systems are green:
```bash
npm test
```
The architecture and hybrid alert model are verified via Jest. Scraper resilience is built into the `ProviderManager` and `StrategyScraper` base class.
