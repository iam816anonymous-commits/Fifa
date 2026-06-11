import { handleCommand } from '../src/commands';
import { UserService } from '../src/services/userService';
import { initDb, getDb } from '../src/database/db';
import { messageQueue } from '../src/bot/queue';

// Mock everything that imports Baileys
jest.mock('../src/bot/whatsapp', () => ({
  bot: {
    connect: jest.fn(),
    onMessage: jest.fn(),
    sendMessage: jest.fn(),
    getSocket: jest.fn()
  }
}));

jest.mock('../src/bot/queue', () => ({
  messageQueue: {
    enqueue: jest.fn()
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
    await db.run('DELETE FROM subscriptions');
    (messageQueue.enqueue as jest.Mock).mockClear();
  });

  test('subscribe command should subscribe user', async () => {
    const jid = '123@s.whatsapp.net';
    await handleCommand(jid, 'subscribe');

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [jid]);
    expect(user.is_subscribed).toBe(1);
    expect(messageQueue.enqueue).toHaveBeenCalledWith(jid, expect.stringContaining('successfully subscribed'));
  });

  test('follow command should add subscription', async () => {
    const jid = '123@s.whatsapp.net';
    await handleCommand(jid, 'follow USA');

    const teams = await UserService.getUserFollowedTeams(jid);
    expect(teams).toContain('usa');
  });
});
