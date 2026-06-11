import { Match, MatchProvider } from '../types';
import axios from 'axios';

export abstract class BaseScraper implements MatchProvider {
  abstract id: string;
  abstract name: string;

  protected async fetch(url: string): Promise<string> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    return response.data;
  }

  protected validateMatch(match: Partial<Match>): match is Match {
    if (!match.id || !match.homeTeam || !match.awayTeam) return false;
    if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return false;
    if (!match.status || !match.matchTime) return false;
    return true;
  }

  abstract getMatches(): Promise<Match[]>;
}

export class FifaProvider extends BaseScraper {
  id = 'fifa';
  name = 'FIFA Official';

  async getMatches(): Promise<Match[]> {
    // Simulated scraping & validation
    const data: Partial<Match>[] = [
      {
        id: 'wc-1',
        homeTeam: 'USA',
        awayTeam: 'Mexico',
        homeScore: 0,
        awayScore: 0,
        status: 'NS',
        matchTime: new Date(),
        lastUpdated: new Date()
      }
    ];
    return data.filter(this.validateMatch);
  }
}

export class EspnProvider extends BaseScraper {
  id = 'espn';
  name = 'ESPN';

  async getMatches(): Promise<Match[]> {
    const data: Partial<Match>[] = [
      {
        id: 'wc-1',
        homeTeam: 'USA',
        awayTeam: 'Mexico',
        homeScore: 0,
        awayScore: 0,
        status: 'NS',
        matchTime: new Date(),
        lastUpdated: new Date()
      }
    ];
    return data.filter(this.validateMatch);
  }
}

export class BbcProvider extends BaseScraper {
  id = 'bbc';
  name = 'BBC Sport';

  async getMatches(): Promise<Match[]> {
    return [];
  }
}
