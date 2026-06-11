import axios from 'axios';
import { SportsProvider, Match, Standing } from './types';

export class FootballApiProvider implements SportsProvider {
  private baseUrl = 'https://v3.football.api-sports.io';
  private headers: { [key: string]: string };

  constructor(apiKey: string) {
    this.headers = {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    };
  }

  async getMatches(leagueId: number, season: number): Promise<Match[]> {
    const response = await axios.get(`${this.baseUrl}/fixtures`, {
      headers: this.headers,
      params: { league: leagueId, season: season },
    });

    return response.data.response.map((item: any) => ({
      id: item.fixture.id,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      matchTime: new Date(item.fixture.date),
      status: item.fixture.status.short,
      homeScore: item.goals.home,
      awayScore: item.goals.away,
    }));
  }

  async getLiveScores(leagueId: number): Promise<Match[]> {
    const response = await axios.get(`${this.baseUrl}/fixtures`, {
      headers: this.headers,
      params: { league: leagueId, live: 'all' },
    });

    return response.data.response
      .filter((item: any) => item.league.id === leagueId)
      .map((item: any) => ({
        id: item.fixture.id,
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        matchTime: new Date(item.fixture.date),
        status: item.fixture.status.short,
        homeScore: item.goals.home,
        awayScore: item.goals.away,
      }));
  }

  async getStandings(leagueId: number, season: number): Promise<Standing[]> {
    const response = await axios.get(`${this.baseUrl}/standings`, {
      headers: this.headers,
      params: { league: leagueId, season: season },
    });

    const standings: Standing[] = [];
    const groups = response.data.response[0].league.standings;

    for (const group of groups) {
      for (const item of group) {
        standings.push({
          rank: item.rank,
          teamName: item.team.name,
          points: item.points,
          played: item.all.played,
          goalsFor: item.all.goals.for,
          goalsAgainst: item.all.goals.against,
          group: item.group,
        });
      }
    }

    return standings;
  }
}
