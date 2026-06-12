import { Match, MatchProvider, Standing, NewsArticle } from '../types';
import { ProviderRepository } from '../repositories/ProviderRepository';
import { MatchRepository } from '../repositories/MatchRepository';
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
    const rows = await ProviderRepository.getProviderMetrics();
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
    const name = this.providers.find(p => p.id === id)?.name || id;
    await ProviderRepository.recordSuccess(id, name, confidence);
  }

  private async recordFailure(id: string) {
    const name = this.providers.find(p => p.id === id)?.name || id;
    await ProviderRepository.recordFailure(id, name);
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

  async getNews(): Promise<NewsArticle[]> {
    const sortedProviders = await this.getSortedProviders();
    for (const p of sortedProviders) {
      try {
        const news = await p.getNews?.();
        if (news && news.length > 0) {
          await this.recordSuccess(p.id, 95);
          return news;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} news fetch failed:`, error);
        await this.recordFailure(p.id);
      }
    }
    return [];
  }

  private async getCachedMatches(): Promise<Match[]> {
    return await MatchRepository.getAllMatches();
  }
}
