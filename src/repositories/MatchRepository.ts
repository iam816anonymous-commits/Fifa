import { getDb } from '../database/db';
import { Match } from '../types';

export class MatchRepository {
  static async saveMatch(match: Match) {
    const db = await getDb();
    await db.run(
      `INSERT INTO matches (id, home_team, away_team, home_score, away_score, status, match_time, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
       home_score = excluded.home_score,
       away_score = excluded.away_score,
       status = excluded.status,
       last_updated = CURRENT_TIMESTAMP`,
      [match.id, match.homeTeam, match.awayTeam, match.homeScore, match.awayScore, match.status, match.matchTime.toISOString()]
    );
  }

  static async getMatchesByDate(dateStr: string): Promise<Match[]> {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM matches WHERE date(match_time) = date(?)", [dateStr]);
    return rows.map(this.mapRowToMatch);
  }

  static async getLiveMatches(): Promise<Match[]> {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM matches WHERE status = 'LIVE'");
    return rows.map(this.mapRowToMatch);
  }

  static async getAllMatches(): Promise<Match[]> {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM matches");
    return rows.map(this.mapRowToMatch);
  }

  static async countMatches(): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT COUNT(*) as c FROM matches');
    return row.c;
  }

  static async getLatestSnapshot(matchId: string): Promise<any> {
    const db = await getDb();
    return await db.get(
      'SELECT * FROM match_snapshots WHERE match_id = ? ORDER BY snapshot_time DESC LIMIT 1',
      [matchId]
    );
  }

  static async saveSnapshot(matchId: string, hScore: number, aScore: number, status: string, scorers: string[], redCards: string[]) {
    const db = await getDb();
    await db.run(
      'INSERT INTO match_snapshots (match_id, home_score, away_score, status, scorers, red_cards) VALUES (?, ?, ?, ?, ?, ?)',
      [matchId, hScore, aScore, status, JSON.stringify(scorers), JSON.stringify(redCards)]
    );
  }

  private static mapRowToMatch(r: any): Match {
    return {
      id: r.id,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      homeScore: r.home_score,
      awayScore: r.away_score,
      status: r.status,
      matchTime: new Date(r.match_time),
      lastUpdated: new Date(r.last_updated)
    };
  }
}
