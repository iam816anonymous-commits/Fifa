import { notificationEngine } from '../src/notifications/engine';
import { handleCommand } from '../src/commands';
import { initDb, getDb } from '../src/database/db';
import { messageQueue } from '../src/queue/messageQueue';
import { config } from '../src/config';
import { Match } from '../src/types';

jest.mock('../src/bot/whatsapp', () => ({
  bot: {
    connect: jest.fn(),
    onMessage: jest.fn(),
    sendMessage: jest.fn(),
    getSocket: jest.fn().mockReturnValue({})
  }
}));

jest.mock('../src/queue/messageQueue', () => ({
  messageQueue: {
    enqueue: jest.fn(),
    enqueueBatch: jest.fn(),
    getQueueSize: jest.fn().mockReturnValue(0)
  }
}));

describe('Hybrid Bot Architecture', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:';
    // We must set these BEFORE requiring anything that uses config
    process.env.WHATSAPP_GROUP_JID = 'group123@g.us';
    process.env.OWNER_JID = 'owner@s.whatsapp.net';
    await initDb();
  });

  beforeEach(() => {
    // Manually override config values for testing
    (config.whatsapp as any).groupJid = 'group123@g.us';
    (config.whatsapp as any).ownerJid = 'owner@s.whatsapp.net';
  });

  afterEach(async () => {
    const db = await getDb();
    await db.run('DELETE FROM users');
    await db.run('DELETE FROM team_follows');
    await db.run('DELETE FROM notification_hashes');
    await db.run('DELETE FROM matches');
    await db.run('DELETE FROM match_snapshots');
    jest.clearAllMocks();
  });

  test('should ignore messages without ! prefix', async () => {
    await handleCommand('user1@s.whatsapp.net', 'Hello bot');
    expect(messageQueue.enqueue).not.toHaveBeenCalled();
  });

  test('should post goal to group and DM follower', async () => {
    const followerJid = 'user1@s.whatsapp.net';
    await handleCommand(followerJid, '!follow Argentina');
    jest.clearAllMocks();

    const mockMatch: Match = {
      id: 'test-match-1',
      homeTeam: 'Argentina',
      awayTeam: 'Brazil',
      homeScore: 0,
      awayScore: 0,
      status: 'NS',
      matchTime: new Date(),
      lastUpdated: new Date()
    };

    const updatedMatch: Match = { ...mockMatch, homeScore: 1, status: 'LIVE' };

    await notificationEngine.processMatchUpdate(mockMatch);
    await notificationEngine.processMatchUpdate(updatedMatch);

    expect(messageQueue.enqueue).toHaveBeenCalledWith('group123@g.us', expect.stringContaining('Argentina scored'));
    expect(messageQueue.enqueueBatch).toHaveBeenCalledWith([followerJid], expect.stringContaining('Argentina scored'));
  });

  test('should prevent duplicate notifications for same event', async () => {
    const mockMatch: Match = {
      id: 'test-match-1',
      homeTeam: 'Argentina',
      awayTeam: 'Brazil',
      homeScore: 1,
      awayScore: 0,
      status: 'LIVE',
      matchTime: new Date(),
      lastUpdated: new Date()
    };

    await notificationEngine.processMatchUpdate(mockMatch);
    jest.clearAllMocks();
    await notificationEngine.processMatchUpdate(mockMatch);

    expect(messageQueue.enqueue).not.toHaveBeenCalled();
  });

  test('should restrict admin commands to owner', async () => {
    await handleCommand('random@s.whatsapp.net', '!admin stats');
    expect(messageQueue.enqueue).not.toHaveBeenCalled();

    await handleCommand('owner@s.whatsapp.net', '!admin stats');
    expect(messageQueue.enqueue).toHaveBeenCalledWith('owner@s.whatsapp.net', expect.stringContaining('Admin Stats'));
  });
});
