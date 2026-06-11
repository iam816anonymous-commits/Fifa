import { SportsProvider, NewsProvider } from './types';
import { MockNewsProvider } from './mockProvider';
import { FifaScraper, EspnScraper } from './scrapers';
import { ProviderManager } from './providerManager';
import { NewsApiProvider } from './newsApiProvider';
import { config } from '../config';

export function getSportsProvider(): SportsProvider {
  return new ProviderManager([
    new FifaScraper(),
    new EspnScraper()
  ]);
}

export function getNewsProvider(): NewsProvider {
  if (config.news.apiKey) {
    return new NewsApiProvider(config.news.apiKey);
  }
  return new MockNewsProvider();
}
