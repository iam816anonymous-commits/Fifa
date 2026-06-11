import { Match, MatchProvider } from '../types';
import { getDb } from '../database/db';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

export class ProviderManager {
  private providers: MatchProvider[] = [];

  constructor(providers: MatchProvider[]) {
    this.providers = providers;
  }

  async getMatches(): Promise<Match[]> {
    const sortedProviders = await this.getSortedProviders();

    for (const p of sortedProviders) {
      try {
        const matches = await p.getMatches();
        if (matches && matches.length > 0) {
          await this.recordSuccess(p.id);
          return matches;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} (${p.id}) failed:`, error);
        await this.recordFailure(p.id);
      }
    }

    logger.warn('All providers failed. Falling back to database cache.');
    return this.getCachedMatches();
  }

  private async getSortedProviders(): Promise<MatchProvider[]> {
    const db = await getDb();
    const rows = await db.all('SELECT id, health_score FROM providers');
    const healthMap = new Map(rows.map(r => [r.id, r.health_score]));

    return [...this.providers].sort((a, b) => {
      const scoreA = healthMap.get(a.id) ?? 100;
      const scoreB = healthMap.get(b.id) ?? 100;
      return scoreB - scoreA;
    });
  }

  private async recordSuccess(id: string) {
    const db = await getDb();
    await db.run(`
      INSERT INTO providers (id, name, success_count, health_score, last_used)
      VALUES (?, ?, 1, 100.0, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        success_count = success_count + 1,
        health_score = MIN(100.0, health_score + 1.0),
        last_used = CURRENT_TIMESTAMP
    `, [id, this.providers.find(p => p.id === id)?.name || id]);
  }

  private async recordFailure(id: string) {
    const db = await getDb();
    await db.run(`
      INSERT INTO providers (id, name, failure_count, health_score, last_used)
      VALUES (?, ?, 1, 95.0, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        failure_count = failure_count + 1,
        health_score = MAX(0.0, health_score - 5.0),
        last_used = CURRENT_TIMESTAMP
    `, [id, this.providers.find(p => p.id === id)?.name || id]);
  }

  private async getCachedMatches(): Promise<Match[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM matches');
    return rows.map(r => ({
      id: r.id,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      homeScore: r.home_score,
      awayScore: r.away_score,
      status: r.status,
      matchTime: new Date(r.match_time),
      lastUpdated: new Date(r.last_updated)
    }));
  }
}
