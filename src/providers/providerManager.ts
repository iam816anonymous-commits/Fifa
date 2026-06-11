import { SportsProvider, Match, Standing } from './types';
import { getDb } from '../database/db';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

export interface ScraperProvider extends SportsProvider {
  id: string;
  name: string;
}

export class ProviderManager implements SportsProvider {
  private providers: ScraperProvider[] = [];

  constructor(providers: ScraperProvider[]) {
    this.providers = providers;
  }

  async getMatches(leagueId: number, season: number): Promise<Match[]> {
    // Sort providers by health score descending
    const sortedProviders = await this.getSortedProviders();

    for (const p of sortedProviders) {
      try {
        const matches = await p.getMatches(leagueId, season);
        if (matches && matches.length > 0) {
          await this.recordSuccess(p.id);
          return matches;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} failed:`, error);
        await this.recordFailure(p.id);
      }
    }

    logger.warn('All providers failed for getMatches. Returning cached data.');
    return []; // MatchService will handle fetching from DB if this is empty
  }

  async getLiveScores(leagueId: number): Promise<Match[]> {
    const sortedProviders = await this.getSortedProviders();

    for (const p of sortedProviders) {
      try {
        const scores = await p.getLiveScores(leagueId);
        if (scores && scores.length > 0) {
          await this.recordSuccess(p.id);
          return scores;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} failed:`, error);
        await this.recordFailure(p.id);
      }
    }
    return [];
  }

  async getStandings(leagueId: number, season: number): Promise<Standing[]> {
    const sortedProviders = await this.getSortedProviders();
    for (const p of sortedProviders) {
      try {
        const standings = await p.getStandings(leagueId, season);
        if (standings && standings.length > 0) {
          await this.recordSuccess(p.id);
          return standings;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} failed:`, error);
        await this.recordFailure(p.id);
      }
    }
    return [];
  }

  private async getSortedProviders(): Promise<ScraperProvider[]> {
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
}
