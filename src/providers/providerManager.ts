import { SportsProvider, Match, Standing } from './types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

export class ProviderManager implements SportsProvider {
  private providers: { layer: number, provider: SportsProvider, name: string }[] = [];

  addProvider(layer: number, name: string, provider: SportsProvider) {
    this.providers.push({ layer, name, provider });
    this.providers.sort((a, b) => a.layer - b.layer);
  }

  async getMatches(leagueId: number, season: number): Promise<Match[]> {
    for (const p of this.providers) {
      try {
        const matches = await p.provider.getMatches(leagueId, season);
        if (matches && matches.length > 0) {
          return matches;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} (Layer ${p.layer}) failed:`, error);
      }
    }
    return [];
  }

  async getLiveScores(leagueId: number): Promise<Match[]> {
    for (const p of this.providers) {
      try {
        const scores = await p.provider.getLiveScores(leagueId);
        if (scores && scores.length > 0) {
          return scores;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} (Layer ${p.layer}) failed:`, error);
      }
    }
    return [];
  }

  async getStandings(leagueId: number, season: number): Promise<Standing[]> {
    for (const p of this.providers) {
      try {
        const standings = await p.provider.getStandings(leagueId, season);
        if (standings && standings.length > 0) {
          return standings;
        }
      } catch (error) {
        logger.error(`Provider ${p.name} (Layer ${p.layer}) failed:`, error);
      }
    }
    return [];
  }
}
