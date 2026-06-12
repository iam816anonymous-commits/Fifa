import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  ConnectionState,
  WAMessage,
  proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

export class WhatsAppBot {
  private sock: any;
  private messageHandler: (msg: proto.IWebMessageInfo) => void = () => {};

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: state,
      logger: winston.createLogger({ level: 'silent' }) as any,
    });

    this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.info(`Connection closed (status: ${statusCode}), reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          // Automatic recovery after restart/disconnect
          setTimeout(() => this.connect(), 5000);
        }
      } else if (connection === 'open') {
        logger.info('WhatsApp connection opened successfully');
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async (m: { messages: proto.IWebMessageInfo[], type: string }) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await this.messageHandler(msg);
          }
        }
      }
    });
  }

  onMessage(handler: (msg: proto.IWebMessageInfo) => void) {
    this.messageHandler = handler;
  }

  async sendMessage(jid: string, content: any) {
    await this.sock.sendMessage(jid, content);
  }

  getSocket() {
    return this.sock;
  }
}

export const bot = new WhatsAppBot();
