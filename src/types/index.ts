export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  matchTime: Date;
  minute?: number;
  lastUpdated: Date;
  scorers?: string[];
  redCards?: string[];
  source?: string;
  confidence?: number;
  strategyUsed?: string;
}

export interface Standing {
  rank: number;
  teamName: string;
  points: number;
  played: number;
  group: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  publishedAt: Date;
}

export interface MatchProvider {
  id: string;
  name: string;
  getMatches(): Promise<Match[]>;
  getStandings?(): Promise<Standing[]>;
  getNews?(): Promise<NewsArticle[]>;
}
