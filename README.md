# FIFA World Cup 2026 WhatsApp Bot (Phase 1)

A robust, single-server WhatsApp bot providing real-time World Cup 2026 updates using web scraping and a reliability-first architecture.

## Architecture

- **WhatsApp (Baileys):** Direct integration with WhatsApp Web.
- **SQLite Database:** Local persistence for users, matches, and notifications.
- **Multi-Selector Scraping:** Robust data collection with fallback mechanisms (FIFA -> ESPN -> BBC).
- **Health Scoring System:** Automated provider prioritization based on success/failure rates.
- **Message Queue:** Batched delivery to handle 10,000+ subscribers safely.

## Phase 1 Features

- **Reliability:** Auto-reconnect, session persistence, and recovery after restart.
- **Subscriptions:** Simple `subscribe`/`unsubscribe` commands.
- **Automated Notifications:** Real-time goals, match starts/finishes, and breaking news.
- **Health Monitoring:** Check system and data source status via `status` command.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Configuration:**
    Create a `.env` file (see `.env.example`). No API keys required for core scraping features.
3.  **Build:**
    ```bash
    npm run build
    ```
4.  **Start:**
    ```bash
    npm start
    ```
    Scan the QR code in the terminal to link your WhatsApp.

## Commands

- `subscribe` - Join the notification list.
- `unsubscribe` - Stop receiving updates.
- `status` - Check your subscription and bot health.
- `help` - Show the command menu.

## Success Criteria (Phase 1)

- [x] Bot survives restart without losing subscribers.
- [x] Reconnects automatically to WhatsApp.
- [x] Prevents duplicate notifications.
- [x] Uses multiple scraping sources with automatic failover.
- [x] Handles large subscriber batches efficiently.
