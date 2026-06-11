import { getDb } from '../database/db';

export class UserService {
  static async createUser(id: string, phoneNumber: string) {
    const db = await getDb();
    await db.run(
      'INSERT OR IGNORE INTO users (id, phone_number) VALUES (?, ?)',
      [id, phoneNumber]
    );
  }

  static async subscribe(userId: string) {
    const db = await getDb();
    await db.run('UPDATE users SET is_subscribed = 1 WHERE id = ?', [userId]);
  }

  static async unsubscribe(userId: string) {
    const db = await getDb();
    await db.run('UPDATE users SET is_subscribed = 0 WHERE id = ?', [userId]);
  }

  static async followTeam(userId: string, teamName: string) {
    const db = await getDb();
    await db.run(
      'INSERT OR IGNORE INTO subscriptions (user_id, team_name) VALUES (?, ?)',
      [userId, teamName.toLowerCase()]
    );
  }

  static async unfollowTeam(userId: string, teamName: string) {
    const db = await getDb();
    await db.run(
      'DELETE FROM subscriptions WHERE user_id = ? AND team_name = ?',
      [userId, teamName.toLowerCase()]
    );
  }

  static async getSubscribedUsers() {
    const db = await getDb();
    return await db.all('SELECT * FROM users WHERE is_subscribed = 1');
  }

  static async getUserFollowedTeams(userId: string) {
    const db = await getDb();
    const subs = await db.all('SELECT team_name FROM subscriptions WHERE user_id = ?', [userId]);
    return subs.map(s => s.team_name);
  }
}
