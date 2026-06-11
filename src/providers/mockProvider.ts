import { SportsProvider, NewsProvider, Match, Standing, NewsArticle } from './types';

export class MockSportsProvider implements SportsProvider {
  async getMatches(leagueId: number, season: number): Promise<Match[]> {
    return [
      {
        id: 1,
        homeTeam: 'USA',
        awayTeam: 'Mexico',
        matchTime: new Date(Date.now() + 86400000),
        status: 'NS',
      },
      {
        id: 2,
        homeTeam: 'Canada',
        awayTeam: 'Morocco',
        matchTime: new Date(),
        status: 'LIVE',
        homeScore: 1,
        awayScore: 0,
      }
    ];
  }

  async getLiveScores(leagueId: number): Promise<Match[]> {
    return [
      {
        id: 2,
        homeTeam: 'Canada',
        awayTeam: 'Morocco',
        matchTime: new Date(),
        status: 'LIVE',
        homeScore: 1,
        awayScore: 0,
      }
    ];
  }

  async getStandings(leagueId: number, season: number): Promise<Standing[]> {
    return [
      {
        rank: 1,
        teamName: 'USA',
        points: 3,
        played: 1,
        goalsFor: 2,
        goalsAgainst: 0,
        group: 'Group A',
      }
    ];
  }
}

export class MockNewsProvider implements NewsProvider {
  async getLatestNews(query: string): Promise<NewsArticle[]> {
    return [
      {
        title: 'World Cup 2026 Preparations Underway',
        summary: 'Host cities are preparing for the biggest World Cup ever.',
        url: 'https://example.com/news1',
        publishedAt: new Date(),
      }
    ];
  }
}
