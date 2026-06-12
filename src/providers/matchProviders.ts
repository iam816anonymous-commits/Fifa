import { Match, Standing } from '../types';
import { StrategyScraper, SelectorChain } from './strategyScraper';
import * as cheerio from 'cheerio';

export class FifaProvider extends StrategyScraper {
  id = 'fifa';
  name = 'FIFA Official';
  protected url = 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026';

  async getMatches(): Promise<Match[]> {
    try {
      const html = await this.fetch(this.url);
      const $ = cheerio.load(html);
      let matches: Match[] = [];

      // 1. Attempt JSON-LD
      const jsonLd = this.extractJsonLd($ as any);
      // Logic to map JSON-LD to Match[] would go here

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
                  strategyUsed: 'Selector-Chain',
                  confidence: this.calculateConfidence({}, 'Selector-Chain')
              };
              if (this.validateMatch(match)) matches.push(match as Match);
          }
      });

      return matches;
    } catch { return []; }
  }

  async getStandings(): Promise<Standing[]> { return []; }
}

export class EspnProvider extends StrategyScraper {
  id = 'espn';
  name = 'ESPN';
  protected url = 'https://www.espn.com/soccer/fixtures';

  async getMatches(): Promise<Match[]> {
    try {
      const html = await this.fetch(this.url);
      const $ = cheerio.load(html);
      let matches: Match[] = [];

      // 1. Attempt Embedded JSON (ESPN often has window.__espn__)
      const espnData = this.extractEmbeddedJson(html, /window\.__espn__\s*=\s*({.*?});/);
      if (espnData) {
          // Map espnData to Match[]
      }

      // 2. Attempt Tables
      $('tr.Table__TR').each((i, el) => {
        const home = $(el).find('.Table__Team--home').text().trim() || $(el).find('.Table__Team').first().text().trim();
        const away = $(el).find('.Table__Team--away').text().trim() || $(el).find('.Table__Team').last().text().trim();
        if (home && away && home !== away) {
            matches.push({
                id: `espn-${home}-${away}`.toLowerCase(),
                homeTeam: home,
                awayTeam: away,
                homeScore: 0,
                awayScore: 0,
                status: 'NS',
                matchTime: new Date(),
                lastUpdated: new Date(),
                source: this.name,
                strategyUsed: 'Table',
                confidence: this.calculateConfidence({}, 'Table')
            });
        }
      });

      return matches;
    } catch { return []; }
  }

  async getStandings(): Promise<Standing[]> { return []; }
}

export class BbcProvider extends StrategyScraper {
  id = 'bbc';
  name = 'BBC Sport';
  protected url = 'https://www.bbc.com/sport/football/scores-fixtures';

  async getMatches(): Promise<Match[]> {
    try {
      const html = await this.fetch(this.url);
      const $ = cheerio.load(html);
      let matches: Match[] = [];

      $('[class*="Fixture"]').each((i, el) => {
        const teams = $(el).find('[class*="TeamName"]');
        if (teams.length >= 2) {
            const home = $(teams[0]).text().trim();
            const away = $(teams[1]).text().trim();
            matches.push({
                id: `bbc-${home}-${away}`.toLowerCase(),
                homeTeam: home,
                awayTeam: away,
                homeScore: 0,
                awayScore: 0,
                status: 'NS',
                matchTime: new Date(),
                lastUpdated: new Date(),
                source: this.name,
                strategyUsed: 'DOM-Selector',
                confidence: this.calculateConfidence({}, 'DOM-Selector')
            });
        }
      });
      return matches;
    } catch { return []; }
  }

  async getStandings(): Promise<Standing[]> { return []; }
}
