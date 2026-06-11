import { bot } from './whatsapp';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

interface QueuedMessage {
  jid: string;
  text: string;
  retries: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly delayBetweenMessages = 2000; // 2 seconds

  async enqueue(jid: string, text: string) {
    this.queue.push({ jid, text, retries: 0 });
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const msg = this.queue.shift();
      if (!msg) continue;

      try {
        await bot.sendMessage(msg.jid, msg.text);
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenMessages));
      } catch (error) {
        logger.error(`Failed to send message to ${msg.jid}:`, error);
        if (msg.retries < this.maxRetries) {
          msg.retries++;
          this.queue.push(msg); // Re-queue for retry
        } else {
          logger.error(`Max retries reached for ${msg.jid}`);
        }
      }
    }

    this.processing = false;
  }
}

export const messageQueue = new MessageQueue();
