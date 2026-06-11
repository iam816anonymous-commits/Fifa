# FIFA World Cup 2026 WhatsApp Bot (Phase 1)

A reliability-first WhatsApp bot for WC 2026, designed for single-server deployment.

## Key Features

- **Reliable Scraping**: Multi-provider failover (FIFA -> ESPN -> BBC).
- **Adaptive Data**: Strict validation and snapshot-based event detection.
- **Fingerprinted Notifications**: Prevents duplicate alerts via notification hashing.
- **Crash Recovery**: Automatically resumes scheduler and queue state on restart.
- **Large Scale**: Batch processing for 10,000+ subscribers.
- **Admin Dashboard**: Restricted WhatsApp commands for real-time monitoring.

## Folder Structure

```text
src/
├── bot/           # WhatsApp (Baileys) integration
├── commands/      # User and Admin command handlers
├── providers/     # Modular scrapers and failover logic
├── scheduler/     # Periodic tasks (node-cron)
├── queue/         # Rate-limited message delivery
├── database/      # SQLite schema and persistence
├── notifications/ # Event detection and hashing
├── health/        # Provider health monitoring
├── utils/         # Helper functions
├── types/         # TypeScript interfaces
```

## Setup

1. `npm install`
2. `npm run build`
3. `npm start`

No Docker or paid APIs required.

## Admin Commands
Admin commands are restricted to configured phone numbers.
- `/admin stats`
- `/admin providers`
- `/admin queue`
- `/admin broadcast <message>`

## Success Criteria
- [x] Bot reconnects automatically.
- [x] Zero duplicate notifications on restart.
- [x] Automatic failover if a scraper source fails.
- [x] Health-based provider prioritization.
