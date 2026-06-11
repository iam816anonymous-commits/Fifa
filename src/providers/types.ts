export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchTime: Date;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

export interface Standing {
  rank: number;
  teamName: string;
  points: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  group: string;
}

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
}

export interface SportsProvider {
  getMatches(leagueId: number, season: number): Promise<Match[]>;
  getLiveScores(leagueId: number): Promise<Match[]>;
  getStandings(leagueId: number, season: number): Promise<Standing[]>;
}

export interface NewsProvider {
  getLatestNews(query: string): Promise<NewsArticle[]>;
}
