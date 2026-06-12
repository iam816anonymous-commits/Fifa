import { Match, Standing, NewsArticle } from '../types';
import { StrategyScraper, SelectorChain } from './strategyScraper';
import * as cheerio from 'cheerio';

export class FifaProvider extends StrategyScraper {
  id = 'fifa';
  name = 'FIFA Official';
  protected url = 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026';

  async getMatches(): Promise<Match[]> {
    try {
      let html = '';
      let strategy = 'Selector-Chain';
      try {
        html = await this.fetch(this.url);
      } catch {
        html = await this.fetchWithPlaywright(this.url);
        strategy = 'Playwright-Fallback';
      }
      const $ = cheerio.load(html);
      let matches: Match[] = [];

      // 1. Attempt JSON-LD
      const jsonLd = this.extractJsonLd($ as any);
      const ldMatch = jsonLd.find(item => item['@type'] === 'SportsEvent');
      if (ldMatch) {
          matches.push({
              id: `fifa-ld-${ldMatch.homeTeam?.name}-${ldMatch.awayTeam?.name}`.toLowerCase(),
              homeTeam: ldMatch.homeTeam?.name,
              awayTeam: ldMatch.awayTeam?.name,
              homeScore: 0,
              awayScore: 0,
              status: 'NS',
              matchTime: new Date(ldMatch.startDate),
              lastUpdated: new Date(),
              source: this.name,
              strategyUsed: 'JSON-LD',
              confidence: this.calculateConfidence(ldMatch, 'JSON-LD')
          });
      }

      // 2. Attempt Selector Chain (Resilient Fallbacks)
      const homeChain: SelectorChain = { primary: '.home-team', fallbacks: ['.team-name-home', '[data-testid="home-team"]'] };
      const awayChain: SelectorChain = { primary: '.away-team', fallbacks: ['.team-name-away', '[data-testid="away-team"]'] };

      $('.fixture-row').each((i, el) => {
          const home = this.getFromChain($(el), homeChain);
          const away = this.getFromChain($(el), awayChain);
          if (home && away) {
              const match: Partial<Match> = {
                  id: `fifa-${home}-${away}`.toLowerCase(),
                  homeTeam: home,
                  awayTeam: away,
                  homeScore: 0,
                  awayScore: 0,
                  status: 'NS',
                  matchTime: new Date(),
                  lastUpdated: new Date(),
                  source: this.name,
                  strategyUsed: strategy,
                  confidence: this.calculateConfidence({}, strategy)
              };
              if (this.validateMatch(match)) matches.push(match as Match);
          }
      });

      return matches;
    } catch { return []; }
  }

  async getStandings(): Promise<Standing[]> { return []; }

  async getNews(): Promise<NewsArticle[]> {
    try {
      const html = await this.fetch('https://www.fifa.com/en/news');
      const $ = cheerio.load(html);
      const news: NewsArticle[] = [];
      $('.news-card').each((i, el) => {
        if (i < 5) {
          news.push({
            title: $(el).find('.title').text().trim(),
            url: 'https://www.fifa.com' + $(el).find('a').attr('href'),
            publishedAt: new Date()
          });
        }
      });
      return news;
    } catch { return []; }
  }
}

export class EspnProvider extends StrategyScraper {
  id = 'espn';
  name = 'ESPN';
  protected url = 'https://www.espn.com/soccer/fixtures';

  async getMatches(): Promise<Match[]> {
    try {
      let html = '';
      let strategy = 'Table';
      try {
        html = await this.fetch(this.url);
      } catch {
        html = await this.fetchWithPlaywright(this.url);
        strategy = 'Playwright-Fallback';
      }
      const $ = cheerio.load(html);
      let matches: Match[] = [];

      // 1. Attempt Embedded JSON (ESPN often has window.__espn__)
      const espnData = this.extractEmbeddedJson(html, /window\.__espn__\s*=\s*({.*?});/);
      if (espnData && espnData.content?.matches) {
          espnData.content.matches.forEach((m: any) => {
              matches.push({
                  id: `espn-eb-${m.home.name}-${m.away.name}`.toLowerCase(),
                  homeTeam: m.home.name,
                  awayTeam: m.away.name,
                  homeScore: m.home.score || 0,
                  awayScore: m.away.score || 0,
                  status: m.status || 'NS',
                  matchTime: new Date(m.date),
                  lastUpdated: new Date(),
                  source: this.name,
                  strategyUsed: 'Embedded-JSON',
                  confidence: this.calculateConfidence(m, 'Embedded-JSON')
              });
          });
      }

      // 2. Attempt Tables
      $('tr.Table__TR').each((i, el) => {
        const homeTeam = $(el).find('.Table__Team--home').text().trim() || $(el).find('.Table__Team').first().text().trim();
        const awayTeam = $(el).find('.Table__Team--away').text().trim() || $(el).find('.Table__Team').last().text().trim();
        const scoreText = $(el).find('.Table__Score').text().trim();
        const timeText = $(el).find('.Table__Time').text().trim();

        if (homeTeam && awayTeam && homeTeam !== awayTeam) {
            const [h, a] = scoreText.split('-').map(s => parseInt(s, 10));

            let matchTime = new Date();
            if (timeText) {
                const [hours, mins] = timeText.split(':');
                if (hours && mins) {
                    matchTime.setHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
                }
            }

            matches.push({
                id: `espn-${homeTeam.replace(/\s+/g, '_')}-${awayTeam.replace(/\s+/g, '_')}`.toLowerCase(),
                homeTeam,
                awayTeam,
                homeScore: isNaN(h) ? 0 : h,
                awayScore: isNaN(a) ? 0 : a,
                status: scoreText ? 'LIVE' : 'NS',
                matchTime,
                lastUpdated: new Date(),
                source: this.name,
                strategyUsed: strategy,
                confidence: this.calculateConfidence({}, strategy)
            });
        }
      });

      return matches;
    } catch { return []; }
  }

  async getStandings(): Promise<Standing[]> {
    try {
      const html = await this.fetch('https://www.espn.com/soccer/standings/_/league/fifa.world');
      const $ = cheerio.load(html);
      const standings: Standing[] = [];

      $('.Table__TR').each((i, el) => {
        const teamName = $(el).find('.team-names').text().trim();
        const cols = $(el).find('.Table__TD');
        if (teamName && cols.length >= 8) {
            standings.push({
                rank: i + 1,
                teamName,
                played: parseInt($(cols[0]).text(), 10),
                points: parseInt($(cols[7]).text(), 10),
                group: 'Group'
            });
        }
      });
      return standings;
    } catch { return []; }
  }
}

export class BbcProvider extends StrategyScraper {
  id = 'bbc';
  name = 'BBC Sport';
  protected url = 'https://www.bbc.com/sport/football/scores-fixtures';

  async getMatches(): Promise<Match[]> {
    try {
      let html = '';
      let strategy = 'DOM-Selector';
      try {
        html = await this.fetch(this.url);
      } catch {
        html = await this.fetchWithPlaywright(this.url);
        strategy = 'Playwright-Fallback';
      }
      const $ = cheerio.load(html);
      let matches: Match[] = [];

      $('[class*="Fixture"]').each((i, el) => {
        const teams = $(el).find('[class*="TeamName"]');
        const score = $(el).find('[class*="Score"]').text().trim();
        if (teams.length >= 2) {
            const home = $(teams[0]).text().trim();
            const away = $(teams[1]).text().trim();
            const [h, a] = score.split('-').map(s => parseInt(s, 10));

            matches.push({
                id: `bbc-${home.replace(/\s+/g, '_')}-${away.replace(/\s+/g, '_')}`.toLowerCase(),
                homeTeam: home,
                awayTeam: away,
                homeScore: isNaN(h) ? 0 : h,
                awayScore: isNaN(a) ? 0 : a,
                status: score ? 'LIVE' : 'NS',
                matchTime: new Date(),
                lastUpdated: new Date(),
                source: this.name,
                strategyUsed: strategy,
                confidence: this.calculateConfidence({}, strategy)
            });
        }
      });
      return matches;
    } catch { return []; }
  }

  async getStandings(): Promise<Standing[]> { return []; }
}
