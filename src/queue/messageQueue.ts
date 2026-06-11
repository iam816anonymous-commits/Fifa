import { bot } from '../bot/whatsapp';
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
  private readonly delayBetweenMessages = 1000;

  async enqueue(jid: string, text: string) {
    this.queue.push({ jid, text, retries: 0 });
    if (!this.processing) this.processQueue();
  }

  async enqueueBatch(jids: string[], text: string) {
    for (const jid of jids) {
      this.queue.push({ jid, text, retries: 0 });
    }
    if (!this.processing) this.processQueue();
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
          this.queue.push(msg);
        }
      }
    }

    this.processing = false;
  }

  getQueueSize() {
    return this.queue.length;
  }
}

export const messageQueue = new MessageQueue();
