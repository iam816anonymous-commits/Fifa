import { SportsProvider, NewsProvider } from './types';
import { MockSportsProvider, MockNewsProvider } from './mockProvider';
import { FootballApiProvider } from './footballApiProvider';
import { TheSportsDbProvider } from './theSportsDbProvider';
import { AdaptiveScrapingProvider } from './adaptiveScrapingProvider';
import { NewsApiProvider } from './newsApiProvider';
import { ProviderManager } from './providerManager';
import { config } from '../config';

export function getSportsProvider(): SportsProvider {
  const manager = new ProviderManager();

  // Layer 1: Primary API-Football
  if (config.sports.apiKey) {
    manager.addProvider(1, 'API-Football', new FootballApiProvider(config.sports.apiKey));
  }

  // Layer 2: Fallback TheSportsDB
  // For demo, we use a mock/fixed key if not provided
  manager.addProvider(2, 'TheSportsDB', new TheSportsDbProvider('1'));

  // Layer 3: Adaptive Scraping
  manager.addProvider(3, 'AdaptiveScraping', new AdaptiveScrapingProvider());

  // Default Mock if nothing else works or is configured
  // manager.getMatches.length was incorrectly checking the function's arity
  // Since we always add Layer 2 and Layer 3 providers above, we don't strictly need a length check here
  // unless we want to check if any providers were actually added to the manager.

  return manager;
}

export function getNewsProvider(): NewsProvider {
  if (config.news.apiKey) {
    return new NewsApiProvider(config.news.apiKey);
  }
  return new MockNewsProvider();
}
