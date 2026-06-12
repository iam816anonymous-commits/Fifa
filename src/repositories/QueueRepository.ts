import { getDb } from '../database/db';

export interface QueuedMessage {
  id?: number;
  jid: string;
  content: string;
  retries: number;
}

export class QueueRepository {
  static async enqueue(jid: string, content: string) {
    const db = await getDb();
    await db.run(
      'INSERT INTO message_queue (jid, content, retries) VALUES (?, ?, 0)',
      [jid, content]
    );
  }

  static async getNextMessage(): Promise<QueuedMessage | null> {
    const db = await getDb();
    const row = await db.get('SELECT * FROM message_queue ORDER BY created_at ASC LIMIT 1');
    if (!row) return null;
    return {
      id: row.id,
      jid: row.jid,
      content: row.content,
      retries: row.retries
    };
  }

  static async dequeue(id: number) {
    const db = await getDb();
    await db.run('DELETE FROM message_queue WHERE id = ?', [id]);
  }

  static async incrementRetry(id: number) {
    const db = await getDb();
    await db.run('UPDATE message_queue SET retries = retries + 1 WHERE id = ?', [id]);
  }

  static async countQueue(): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT COUNT(*) as c FROM message_queue');
    return row.c;
  }
}
