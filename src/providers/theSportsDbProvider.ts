import axios from 'axios';
import { SportsProvider, Match, Standing } from './types';

export class TheSportsDbProvider implements SportsProvider {
  private baseUrl = 'https://www.thesportsdb.com/api/v1/json';

  constructor(private apiKey: string) {}

  async getMatches(leagueId: number, season: number): Promise<Match[]> {
    // Note: In real world, we'd map leagueId to TheSportsDB league ID
    const response = await axios.get(`${this.baseUrl}/${this.apiKey}/eventsnextleague.php?id=4429`); // 4429 is WC

    return response.data.events?.map((item: any) => ({
      id: parseInt(item.idEvent, 10),
      homeTeam: item.strHomeTeam,
      awayTeam: item.strAwayTeam,
      matchTime: new Date(item.strTimestamp),
      status: 'NS',
      homeScore: parseInt(item.intHomeScore, 10) || 0,
      awayScore: parseInt(item.intAwayScore, 10) || 0,
    })) || [];
  }

  async getLiveScores(leagueId: number): Promise<Match[]> {
    // Fallback for live scores might be limited in free tier
    return [];
  }

  async getStandings(leagueId: number, season: number): Promise<Standing[]> {
    return [];
  }
}
