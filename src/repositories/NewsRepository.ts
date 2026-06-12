import { getDb } from '../database/db';
import { NewsArticle } from '../types';

export class NewsRepository {
  static async saveNews(article: NewsArticle) {
    const db = await getDb();
    await db.run(
      'INSERT INTO news (title, url, published_at) VALUES (?, ?, ?)',
      [article.title, article.url, article.publishedAt.toISOString()]
    );
  }

  static async getLatestNews(limit: number = 5): Promise<NewsArticle[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM news ORDER BY published_at DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      title: r.title,
      url: r.url,
      publishedAt: new Date(r.published_at)
    }));
  }
}
