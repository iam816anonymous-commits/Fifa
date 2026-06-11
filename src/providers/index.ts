import { SportsProvider, NewsProvider } from './types';
import { MockSportsProvider, MockNewsProvider } from './mockProvider';
import { FootballApiProvider } from './footballApiProvider';
import { NewsApiProvider } from './newsApiProvider';
import { config } from '../config';

export function getSportsProvider(): SportsProvider {
  if (config.sports.apiKey) {
    return new FootballApiProvider(config.sports.apiKey);
  }
  return new MockSportsProvider();
}

export function getNewsProvider(): NewsProvider {
  if (config.news.apiKey) {
    return new NewsApiProvider(config.news.apiKey);
  }
  return new MockNewsProvider();
}
