import { Match, MatchProvider, Standing } from '../types';
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
          const avgConf = matches.reduce((acc, m) => acc + (m.confidence || 0), 0) / matches.length;
          await this.recordSuccess(p.id, avgConf);
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
    const rows = await db.all('SELECT id, health_score, avg_confidence FROM providers');
    const metricMap = new Map(rows.map(r => [r.id, { health: r.health_score, conf: r.avg_confidence }]));

    return [...this.providers].sort((a, b) => {
      const metricsA = metricMap.get(a.id) ?? { health: 100, conf: 0 };
      const metricsB = metricMap.get(b.id) ?? { health: 100, conf: 0 };

      // Weight health more than confidence
      const scoreA = (metricsA.health * 0.7) + (metricsA.conf * 0.3);
      const scoreB = (metricsB.health * 0.7) + (metricsB.conf * 0.3);
      return scoreB - scoreA;
    });
  }

  private async recordSuccess(id: string, confidence: number) {
    const db = await getDb();
    await db.run(`
      INSERT INTO providers (id, name, success_count, health_score, avg_confidence, last_used)
      VALUES (?, ?, 1, 100.0, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        success_count = success_count + 1,
        health_score = MIN(100.0, health_score + 1.0),
        avg_confidence = (avg_confidence * 0.8) + (? * 0.2),
        last_used = CURRENT_TIMESTAMP
    `, [id, this.providers.find(p => p.id === id)?.name || id, confidence, confidence]);
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

  async getStandings(): Promise<Standing[]> {
    const sortedProviders = await this.getSortedProviders();
    for (const p of sortedProviders) {
      try {
        const standings = await p.getStandings?.();
        if (standings && standings.length > 0) {
          await this.recordSuccess(p.id, 90); // Default confidence for standings
          return standings;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} failed:`, error);
        await this.recordFailure(p.id);
      }
    }
    return [];
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
