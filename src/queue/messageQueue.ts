import { bot } from '../bot/whatsapp';
import { QueueRepository } from '../repositories/QueueRepository';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

class MessageQueue {
  private processing = false;
  private readonly maxRetries = 3;
  private readonly delayBetweenMessages = 1000;

  async enqueue(jid: string, text: string) {
    await QueueRepository.enqueue(jid, text);
    this.triggerProcess();
  }

  async enqueueBatch(jids: string[], text: string) {
    for (const jid of jids) {
      await QueueRepository.enqueue(jid, text);
    }
    this.triggerProcess();
  }

  private triggerProcess() {
    if (!this.processing) {
        setImmediate(() => this.processQueue());
    }
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
        let msg = await QueueRepository.getNextMessage();
        while (msg) {
          try {
            console.log(`[Queue] Sending message to ${msg.jid}`);
            await bot.sendMessage(msg.jid, { text: msg.content });
            await QueueRepository.dequeue(msg.id!);
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenMessages));
          } catch (error) {
            logger.error(`Failed to send message to ${msg.jid}:`, error);
            if (msg.retries < this.maxRetries) {
              await QueueRepository.incrementRetry(msg.id!);
            } else {
              await QueueRepository.dequeue(msg.id!); // Give up
            }
          }
          msg = await QueueRepository.getNextMessage();
        }
    } finally {
        this.processing = false;
    }
  }

  async getQueueSize() {
    return await QueueRepository.countQueue();
  }
}

export const messageQueue = new MessageQueue();
