import { Match, MatchProvider, Standing, NewsArticle, VerificationResult } from '../../types';
import { StrategyScraper } from '../strategyScraper';
import * as cheerio from 'cheerio';

export class GoogleVerificationProvider extends StrategyScraper {
  id = 'google';
  name = 'Google Verification';
  protected url = 'https://www.google.com/search?q=';

  async getMatches(): Promise<Match[]> {
    return [];
  }

  async getStandings(): Promise<Standing[]> {
    return [];
  }

  async getNews(): Promise<NewsArticle[]> {
    return [];
  }

  async verifyMatch(match: Match): Promise<VerificationResult | null> {
    try {
      const query = `score ${match.homeTeam} vs ${match.awayTeam} World Cup 2026`;
      const html = await this.fetchWithPlaywright(this.url + encodeURIComponent(query));
      const $ = cheerio.load(html);

      const googleScoreText = $('[data-attrid="Scoreboard"]').text().trim() || $('.vP499e').text().trim();

      if (!googleScoreText) return null;

      return {
          matchId: match.id,
          isVerified: true,
          confidenceAdjustment: 5,
          correctedFields: {}
      };
    } catch {
      return null;
    }
  }
}
