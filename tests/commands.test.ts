import { handleCommand } from '../src/commands';
import { initDb, getDb } from '../src/database/db';
import { messageQueue } from '../src/queue/messageQueue';

// Mock everything that imports Baileys
jest.mock('../src/bot/whatsapp', () => ({
  bot: {
    connect: jest.fn(),
    onMessage: jest.fn(),
    sendMessage: jest.fn(),
    getSocket: jest.fn()
  }
}));

jest.mock('../src/queue/messageQueue', () => ({
  messageQueue: {
    enqueue: jest.fn(),
    enqueueBatch: jest.fn(),
    getQueueSize: jest.fn().mockReturnValue(0)
  }
}));

describe('Bot Commands', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:';
    process.env.ADMIN_API_KEY = 'test';
    await initDb();
  });

  afterEach(async () => {
    const db = await getDb();
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM notification_hashes');
    await db.run('DELETE FROM providers');
    await db.run('DELETE FROM matches');
    await db.run('DELETE FROM match_snapshots');
    (messageQueue.enqueue as jest.Mock).mockClear();
    (messageQueue.enqueueBatch as jest.Mock).mockClear();
  });

  test('subscribe command should subscribe user', async () => {
    const jid = '123@s.whatsapp.net';
    await handleCommand(jid, 'subscribe');

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [jid]);
    expect(user.is_subscribed).toBe(1);
    expect(messageQueue.enqueue).toHaveBeenCalledWith(jid, expect.stringContaining('Successfully subscribed'));
  });

  test('status command should return active status', async () => {
    const jid = '123@s.whatsapp.net';
    await handleCommand(jid, 'subscribe');
    await handleCommand(jid, 'status');

    expect(messageQueue.enqueue).toHaveBeenCalledWith(jid, expect.stringContaining('Subscription: ✅ Active'));
  });
});
