import { getDb } from '../database/db';

export class ProviderRepository {
  static async getAllProviders(): Promise<any[]> {
    const db = await getDb();
    return await db.all('SELECT * FROM providers');
  }

  static async getProviderMetrics(): Promise<any[]> {
    const db = await getDb();
    return await db.all('SELECT id, health_score, avg_confidence FROM providers');
  }

  static async recordSuccess(id: string, name: string, confidence: number) {
    const db = await getDb();
    await db.run(`
      INSERT INTO providers (id, name, success_count, health_score, avg_confidence, last_used)
      VALUES (?, ?, 1, 100.0, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        success_count = success_count + 1,
        health_score = MIN(100.0, health_score + 1.0),
        avg_confidence = (avg_confidence * 0.8) + (? * 0.2),
        last_used = CURRENT_TIMESTAMP
    `, [id, name, confidence, confidence]);
  }

  static async recordFailure(id: string, name: string) {
    const db = await getDb();
    await db.run(`
      INSERT INTO providers (id, name, failure_count, health_score, last_used)
      VALUES (?, ?, 1, 95.0, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        failure_count = failure_count + 1,
        health_score = MAX(0.0, health_score - 5.0),
        last_used = CURRENT_TIMESTAMP
    `, [id, name]);
  }
}
