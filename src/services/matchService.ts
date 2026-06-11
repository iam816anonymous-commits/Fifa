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

    if (oldMatch.status !== newMatch.status) {
      if (newMatch.status === 'LIVE' || newMatch.status === '1H') {
        message = `🎬 Match Started: *${newMatch.homeTeam} vs ${newMatch.awayTeam}*`;
      } else if (newMatch.status === 'FT') {
        message = `🏁 Match Finished: *${newMatch.homeTeam} ${newMatch.homeScore} - ${newMatch.awayScore} ${newMatch.awayTeam}*`;
      }
    } else if (oldMatch.home_score !== newMatch.homeScore || oldMatch.away_score !== newMatch.awayScore) {
      message = `⚽ GOAL! *${newMatch.homeTeam} ${newMatch.homeScore} - ${newMatch.awayScore} ${newMatch.awayTeam}*`;
    }

    if (message) {
      const db = await getDb();
      // Get all subscribed users
      const generalSubs = await db.all('SELECT id FROM users WHERE is_subscribed = 1');
      // Get team-specific subs
      const teamSubs = await db.all(
        'SELECT user_id FROM subscriptions WHERE team_name = ? OR team_name = ?',
        [newMatch.homeTeam.toLowerCase(), newMatch.awayTeam.toLowerCase()]
      );

      const userIds = new Set([...generalSubs.map(u => u.id), ...teamSubs.map(u => u.user_id)]);

      for (const userId of userIds) {
        await messageQueue.enqueue(userId, message);
        // Track notification history
        await db.run(
          'INSERT INTO notifications (user_id, match_id, type) VALUES (?, ?, ?)',
          [userId, newMatch.id, 'match_update']
        );
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
