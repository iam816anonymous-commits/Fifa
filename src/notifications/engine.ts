import { Match } from '../types';
import { getDb } from '../database/db';
import crypto from 'crypto';
import { messageQueue } from '../queue/messageQueue';

export class NotificationEngine {
  async processMatchUpdate(newMatch: Match) {
    const db = await getDb();
    const oldSnapshot = await db.get(
      'SELECT * FROM match_snapshots WHERE match_id = ? ORDER BY snapshot_time DESC LIMIT 1',
      [newMatch.id]
    );

    // Save new snapshot
    await db.run(
      'INSERT INTO match_snapshots (match_id, home_score, away_score, status) VALUES (?, ?, ?, ?)',
      [newMatch.id, newMatch.homeScore, newMatch.awayScore, newMatch.status]
    );

    // Update main matches table
    await db.run(
      `INSERT INTO matches (id, home_team, away_team, home_score, away_score, status, match_time, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
       home_score = excluded.home_score,
       away_score = excluded.away_score,
       status = excluded.status,
       last_updated = CURRENT_TIMESTAMP`,
      [newMatch.id, newMatch.homeTeam, newMatch.awayTeam, newMatch.homeScore, newMatch.awayScore, newMatch.status, newMatch.matchTime.toISOString()]
    );

    if (!oldSnapshot) return; // First time seeing this match

    await this.detectEvents(oldSnapshot, newMatch);
  }

  private async detectEvents(old: any, newM: Match) {
    // Goal detection
    if (newM.homeScore > old.home_score) {
      await this.sendNotification(newM, 'GOAL', `${newM.homeTeam} scored! (${newM.homeScore}-${newM.awayScore})`);
    }
    if (newM.awayScore > old.away_score) {
      await this.sendNotification(newM, 'GOAL', `${newM.awayTeam} scored! (${newM.homeScore}-${newM.awayScore})`);
    }

    // Status change detection
    if (old.status !== newM.status) {
      if (newM.status === 'LIVE') {
        await this.sendNotification(newM, 'START', `🎬 Match Started: ${newM.homeTeam} vs ${newM.awayTeam}`);
      } else if (newM.status === 'FT') {
        await this.sendNotification(newM, 'FINISH', `🏁 Match Finished: ${newM.homeTeam} ${newM.homeScore} - ${newM.awayScore} ${newM.awayTeam}`);
      }
    }
  }

  private async sendNotification(match: Match, type: string, message: string) {
    const fingerprint = `${type}_${match.homeTeam}_${match.homeScore}_${match.awayTeam}_${match.awayScore}_${match.id}`.toUpperCase().replace(/\s+/g, '_');

    if (await this.isAlreadySent(fingerprint)) return;

    const db = await getDb();
    const users = await db.all('SELECT id FROM users WHERE is_subscribed = 1');
    const userIds = users.map(u => u.id);

    if (userIds.length > 0) {
      await messageQueue.enqueueBatch(userIds, `⚽ *WC Update* ⚽\n\n${message}`);
      await this.markAsSent(fingerprint);
    }
  }

  private async isAlreadySent(hash: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.get('SELECT hash FROM notification_hashes WHERE hash = ?', [hash]);
    return !!row;
  }

  private async markAsSent(hash: string) {
    const db = await getDb();
    await db.run('INSERT OR IGNORE INTO notification_hashes (hash) VALUES (?)', [hash]);
  }
}

export const notificationEngine = new NotificationEngine();
