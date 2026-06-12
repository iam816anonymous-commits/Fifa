import { getDb } from '../database/db';

export class NotificationRepository {
  static async isAlreadySent(hash: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.get('SELECT hash FROM notification_hashes WHERE hash = ?', [hash]);
    return !!row;
  }

  static async markAsSent(hash: string) {
    const db = await getDb();
    await db.run('INSERT OR IGNORE INTO notification_hashes (hash) VALUES (?)', [hash]);
  }

  static async countHashes(): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT COUNT(*) as c FROM notification_hashes');
    return row.c;
  }
}
