import { getDb } from '../database/db';
import { NewsProvider, NewsArticle } from '../providers/types';

export class NewsService {
  constructor(private provider: NewsProvider) {}

  async syncNews() {
    const newsItems = await this.provider.getLatestNews('FIFA World Cup 2026');
    const db = await getDb();

    for (const item of newsItems) {
      await db.run(
        `INSERT OR IGNORE INTO news (title, summary, url, published_at)
         VALUES (?, ?, ?, ?)`,
        [item.title, item.summary, item.url, item.publishedAt.toISOString()]
      );
    }
  }

  async getLatestNews(limit: number = 5): Promise<NewsArticle[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM news ORDER BY published_at DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      title: r.title,
      summary: r.summary,
      url: r.url,
      publishedAt: new Date(r.published_at),
    }));
  }
}
