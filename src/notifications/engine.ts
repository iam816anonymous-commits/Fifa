import { Match } from '../types';
import { messageQueue } from '../queue/messageQueue';
import { config } from '../config';
import { UserRepository } from '../repositories/UserRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';

export class NotificationEngine {
  async processMatchUpdate(newMatch: Match) {
    const oldSnapshot = await MatchRepository.getLatestSnapshot(newMatch.id);

    // Save new snapshot
    await MatchRepository.saveSnapshot(
      newMatch.id,
      newMatch.homeScore,
      newMatch.awayScore,
      newMatch.status,
      newMatch.scorers || [],
      newMatch.redCards || []
    );

    // Update main matches table
    await MatchRepository.saveMatch(newMatch);

    if (!oldSnapshot) return; // First time seeing this match

    await this.detectEvents(oldSnapshot, newMatch);
  }

  private async detectEvents(old: any, newM: Match) {
    const oldScorers = JSON.parse(old.scorers || '[]');
    const oldRedCards = JSON.parse(old.red_cards || '[]');

    // 1. Goal & Scorer Detection
    if (newM.homeScore > old.home_score || newM.awayScore > old.away_score) {
        let scorerMsg = '';
        if (newM.scorers && newM.scorers.length > oldScorers.length) {
            scorerMsg = `\nScorer: ${newM.scorers[newM.scorers.length - 1]}`;
        }

        const isComeback = (old.home_score < old.away_score && newM.homeScore > newM.awayScore) ||
                           (old.away_score < old.home_score && newM.awayScore > newM.homeScore);

        const comebackMsg = isComeback ? '\n🔥 AMAZING COMEBACK!' : '';

        console.log(`⚽ Detected Score Change: ${newM.homeTeam} ${newM.homeScore}-${newM.awayScore} ${newM.awayTeam}`);
        await this.sendNotification(newM, 'GOAL', `⚽ GOAL!\n\n${newM.homeTeam} ${newM.homeScore}-${newM.awayScore} ${newM.awayTeam}${scorerMsg}${comebackMsg}`);
    }

    // 2. Red Card Detection
    if (newM.redCards && newM.redCards.length > oldRedCards.length) {
        const newPlayer = newM.redCards[newM.redCards.length - 1];
        await this.sendNotification(newM, 'RED_CARD', `🟥 RED CARD!\n\nPlayer: ${newPlayer}\nMatch: ${newM.homeTeam} vs ${newM.awayTeam}`);
    }

    // 3. Status change detection
    if (old.status !== newM.status) {
      if (newM.status === 'LIVE' || newM.status === '1H') {
        await this.sendNotification(newM, 'START', `🎬 Match Started: *${newM.homeTeam} vs ${newM.awayTeam}*`);
      } else if (newM.status === 'HT') {
        await this.sendNotification(newM, 'HT', `⏱ Half Time: ${newM.homeTeam} ${newM.homeScore}-${newM.awayScore} ${newM.awayTeam}`);
      } else if (newM.status === 'FT') {
        await this.sendNotification(newM, 'FINISH', `🏁 Match Finished: *${newM.homeTeam} ${newM.homeScore} - ${newM.awayScore} ${newM.awayTeam}*`);
      }
    }
  }

  private async sendNotification(match: Match, type: string, message: string) {
    const fingerprint = `${type}_${match.homeTeam}_${match.homeScore}_${match.awayTeam}_${match.awayScore}_${match.id}_${match.scorers?.length || 0}_${match.redCards?.length || 0}`.toUpperCase().replace(/\s+/g, '_');

    if (await NotificationRepository.isAlreadySent(fingerprint)) {
        console.log(`[NotificationEngine] Duplicate event blocked: ${fingerprint}`);
        return;
    }

    const sourceSuffix = match.source ? `\n\n_Source: ${match.source}_` : '';
    const finalMsg = `${message}${sourceSuffix}`;

    // 1. Always post to Group
    if (config.whatsapp.groupJid) {
      await messageQueue.enqueue(config.whatsapp.groupJid, `⚽ *WC Group Update* ⚽\n\n${finalMsg}`);
    }

    // 2. Team-specific DM alerts
    const homeFollowers = await UserRepository.getTeamFollowers(match.homeTeam);
    const awayFollowers = await UserRepository.getTeamFollowers(match.awayTeam);
    const followers = Array.from(new Set([...homeFollowers, ...awayFollowers]));

    if (followers.length > 0) {
      await messageQueue.enqueueBatch(followers, `⚽ *Team Alert* ⚽\n\n${message}`);
    }

    await NotificationRepository.markAsSent(fingerprint);
  }
}

export const notificationEngine = new NotificationEngine();
