import { Match, MatchProvider } from '../types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

export interface SelectorChain {
    primary: string;
    fallbacks: string[];
}

export abstract class StrategyScraper implements MatchProvider {
  abstract id: string;
  abstract name: string;
  protected abstract url: string;

  protected async fetch(url: string): Promise<string> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            },
            timeout: 20000
        });
        return response.data;
    } catch (error) {
        this.saveFailureSnapshot(url, error);
        throw error;
    }
  }

  private saveFailureSnapshot(url: string, error: any) {
    const dir = path.join('snapshots', 'failed', this.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `fail_${Date.now()}.txt`;
    fs.writeFileSync(path.join(dir, filename), `URL: ${url}\nError: ${error.message}`);
  }

  protected extractJsonLd($: cheerio.CheerioAPI): any[] {
    const scripts = $('script[type="application/ld+json"]');
    const data: any[] = [];
    scripts.each((_, el) => {
        try {
            const json = JSON.parse($(el).html() || '{}');
            data.push(json);
        } catch {}
    });
    return data;
  }

  protected extractEmbeddedJson(html: string, pattern: RegExp): any | null {
    const match = html.match(pattern);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]);
        } catch {}
    }
    return null;
  }

  protected getFromChain($: cheerio.Cheerio, chain: SelectorChain): string {
    let val = $.find(chain.primary).text().trim();
    if (!val) {
        for (const fallback of chain.fallbacks) {
            val = $.find(fallback).text().trim();
            if (val) break;
        }
    }
    return val;
  }

  protected calculateConfidence(match: Partial<Match>, strategy: string): number {
    let score = 0;
    if (strategy === 'JSON-LD') score = 95;
    else if (strategy === 'Embedded-JSON') score = 90;
    else if (strategy === 'Table') score = 80;
    else score = 70;

    // Penalty for missing fields
    if (!match.homeScore && match.homeScore !== 0) score -= 10;
    if (!match.matchTime) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  protected validateMatch(match: Partial<Match>): match is Match {
    const required = ['id', 'homeTeam', 'awayTeam', 'status', 'matchTime'];
    const missing = required.filter(f => !(match as any)[f]);
    return missing.length === 0;
  }

  abstract getMatches(): Promise<Match[]>;
}
