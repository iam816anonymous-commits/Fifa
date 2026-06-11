import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('database.db'),
  ADMIN_API_KEY: z.string(),
  SPORTS_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  FIFA_LEAGUE_ID: z.string().default('1'),
  FIFA_SEASON: z.string().default('2026'),
  WHATSAPP_GROUP_JID: z.string().optional(),
  OWNER_JID: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = envSchema.parse(process.env);

export const config = {
  port: parseInt(env.PORT, 10),
  whatsapp: {
    groupJid: process.env.WHATSAPP_GROUP_JID || env.WHATSAPP_GROUP_JID,
    ownerJid: process.env.OWNER_JID || env.OWNER_JID,
  },
  database: {
    url: env.DATABASE_URL,
  },
  admin: {
    apiKey: env.ADMIN_API_KEY,
  },
  sports: {
    apiKey: env.SPORTS_API_KEY,
    leagueId: parseInt(env.FIFA_LEAGUE_ID, 10),
    season: parseInt(env.FIFA_SEASON, 10),
  },
  news: {
    apiKey: env.NEWS_API_KEY,
  },
  isDevelopment: env.NODE_ENV === 'development',
};
