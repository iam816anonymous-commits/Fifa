import { getDb } from '../database/db';

export class UserService {
  static async createUser(id: string, phoneNumber: string) {
    const db = await getDb();
    await db.run(
      'INSERT OR IGNORE INTO users (id, phone_number) VALUES (?, ?)',
      [id, phoneNumber]
    );
  }

  static async followTeam(userId: string, teamName: string) {
    const db = await getDb();
    await db.run(
      'INSERT OR IGNORE INTO team_follows (user_id, team_name) VALUES (?, ?)',
      [userId, teamName.toLowerCase()]
    );
  }

  static async unfollowTeam(userId: string, teamName: string) {
    const db = await getDb();
    await db.run(
      'DELETE FROM team_follows WHERE user_id = ? AND team_name = ?',
      [userId, teamName.toLowerCase()]
    );
  }

  static async unfollowAll(userId: string) {
    const db = await getDb();
    await db.run('DELETE FROM team_follows WHERE user_id = ?', [userId]);
  }

  static async getUserFollowedTeams(userId: string) {
    const db = await getDb();
    const rows = await db.all('SELECT team_name FROM team_follows WHERE user_id = ?', [userId]);
    return rows.map(r => r.team_name);
  }

  static async getTeamFollowers(teamName: string) {
    const db = await getDb();
    const rows = await db.all('SELECT user_id FROM team_follows WHERE team_name = ?', [teamName.toLowerCase()]);
    return rows.map(r => r.user_id);
  }
}
