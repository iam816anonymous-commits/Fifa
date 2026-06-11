import { getDb } from '../database/db';
import { SportsProvider, Match, Standing } from '../providers/types';
import { config } from '../config';
import { messageQueue } from '../bot/queue';

export class MatchService {
  constructor(private provider: SportsProvider) {}

  async syncMatches() {
    const matches = await this.provider.getMatches(config.sports.leagueId, config.sports.season);
    const db = await getDb();

    for (const match of matches) {
      const existingMatch = await db.get('SELECT * FROM matches WHERE id = ?', [match.id]);

      if (existingMatch) {
        // Detect changes
        if (existingMatch.status !== match.status ||
            existingMatch.home_score !== match.homeScore ||
            existingMatch.away_score !== match.awayScore) {

          await this.notifyMatchUpdate(existingMatch, match);
        }
      }

      await db.run(
        `INSERT INTO matches (id, home_team, away_team, match_time, status, home_score, away_score, league_id, season)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         home_score = excluded.home_score,
         away_score = excluded.away_score`,
        [
          match.id,
          match.homeTeam,
          match.awayTeam,
          match.matchTime.toISOString(),
          match.status,
          match.homeScore,
          match.awayScore,
          config.sports.leagueId,
          config.sports.season,
        ]
      );
    }
  }

  private async notifyMatchUpdate(oldMatch: any, newMatch: Match) {
    let message = '';
    let type = '';
    let payload = '';

    if (oldMatch.status !== newMatch.status) {
      if (newMatch.status === 'LIVE' || newMatch.status === '1H') {
        message = `🎬 Match Started: *${newMatch.homeTeam} vs ${newMatch.awayTeam}*`;
        type = 'match_start';
      } else if (newMatch.status === 'FT') {
        message = `🏁 Match Finished: *${newMatch.homeTeam} ${newMatch.homeScore} - ${newMatch.awayScore} ${newMatch.awayTeam}*`;
        type = 'match_finish';
      }
    } else if (oldMatch.home_score !== newMatch.homeScore || oldMatch.away_score !== newMatch.awayScore) {
      message = `⚽ GOAL! *${newMatch.homeTeam} ${newMatch.homeScore} - ${newMatch.awayScore} ${newMatch.awayTeam}*`;
      type = 'goal';
      payload = `${newMatch.homeScore}-${newMatch.awayScore}`;
    }

    if (message) {
      const db = await getDb();
      const users = await db.all('SELECT id FROM users WHERE is_subscribed = 1');
      const userIds = users.map(u => u.id);

      // Filter users who already received this exact notification
      const alreadyNotified = await db.all(
        'SELECT user_id FROM notifications WHERE match_id = ? AND type = ? AND payload = ?',
        [newMatch.id, type, payload]
      );
      const notifiedSet = new Set(alreadyNotified.map(n => n.user_id));
      const filteredUserIds = userIds.filter(id => !notifiedSet.has(id));

      if (filteredUserIds.length === 0) return;

      await messageQueue.enqueueBatch(filteredUserIds, message);

      await db.run('BEGIN TRANSACTION');
      try {
        const stmt = await db.prepare('INSERT INTO notifications (user_id, match_id, type, payload) VALUES (?, ?, ?, ?)');
        for (const userId of filteredUserIds) {
          await stmt.run([userId, newMatch.id.toString(), type, payload]);
        }
        await stmt.finalize();
        await db.run('COMMIT');
      } catch (err) {
        await db.run('ROLLBACK');
        throw err;
      }
    }
  }

  async getTodayMatches(): Promise<Match[]> {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.all(
      "SELECT * FROM matches WHERE date(match_time) = date('now')"
    );
    return rows.map(r => ({
      id: r.id,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      matchTime: new Date(r.match_time),
      status: r.status,
      homeScore: r.home_score,
      awayScore: r.away_score,
    }));
  }

  async getLiveScores(): Promise<Match[]> {
    return await this.provider.getLiveScores(config.sports.leagueId);
  }

  private standingsCache: Standing[] | null = null;
  private lastStandingsFetch: number = 0;
  private readonly standingsTTL = 3600000; // 1 hour

  async getStandings() {
    const now = Date.now();
    if (this.standingsCache && (now - this.lastStandingsFetch < this.standingsTTL)) {
      return this.standingsCache;
    }

    const standings = await this.provider.getStandings(config.sports.leagueId, config.sports.season);
    this.standingsCache = standings;
    this.lastStandingsFetch = now;
    return standings;
  }
}
