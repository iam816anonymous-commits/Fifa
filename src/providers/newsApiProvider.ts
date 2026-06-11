import axios from 'axios';
import { NewsProvider, NewsArticle } from './types';

export class NewsApiProvider implements NewsProvider {
  private baseUrl = 'https://newsapi.org/v2';

  constructor(private apiKey: string) {}

  async getLatestNews(query: string): Promise<NewsArticle[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/everything`, {
        params: {
          q: query,
          apiKey: this.apiKey,
          sortBy: 'publishedAt',
          pageSize: 10,
          language: 'en',
        },
      });

      return response.data.articles.map((item: any) => ({
        title: item.title,
        summary: item.description,
        url: item.url,
        publishedAt: new Date(item.publishedAt),
      }));
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }
}
