# FIFA World Cup 2026 WhatsApp Bot

A WhatsApp bot that provides real-time updates for the FIFA World Cup 2026, including scores, standings, and news.

## Features

- **Subscriptions:** Users can subscribe to get automatic match updates.
- **Team Tracking:** Users can follow specific teams to get alerts only for their matches.
- **Live Scores:** Get real-time scores for ongoing matches.
- **Standings:** View group standings.
- **News:** Stay updated with the latest FIFA World Cup news.
- **Admin Dashboard:** Protected endpoints to manage users and broadcast messages.

## Tech Stack

- **Node.js** & **TypeScript**
- **Baileys:** WhatsApp Web API library.
- **SQLite:** Lightweight database for user and match data.
- **Express:** Admin API server.
- **node-cron:** For scheduled tasks.

## Setup

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure environment variables:**
    Create a `.env` file based on `.env.example`:
    ```env
    PORT=3000
    DATABASE_URL=database.db
    ADMIN_API_KEY=your_admin_api_key
    SPORTS_API_KEY=your_api_football_key
    NEWS_API_KEY=your_newsapi_key
    ```
    *Note: Get your sports API key from [API-Football](https://www.api-football.com/).*

4.  **Build the project:**
    ```bash
    npm run build
    ```

5.  **Start the bot:**
    ```bash
    npm start
    ```
    Scan the QR code displayed in the terminal with your WhatsApp.

## Commands

- `subscribe` - Get automatic updates
- `unsubscribe` - Stop receiving updates
- `follow <team>` - Follow a specific team
- `unfollow <team>` - Unfollow a team
- `today` - Matches happening today
- `schedule` - Upcoming fixtures
- `standings` - Group standings
- `live` - Live scores
- `news` - Latest FIFA news
- `help` - Show all commands

## Admin API

All admin endpoints require the `x-api-key` header.

- `GET /admin/stats` - Get bot statistics.
- `POST /admin/broadcast` - Send a message to all subscribers.
- `GET /admin/users` - List all users.
- `GET /admin/health` - Check application health.

## Deployment

This bot is designed to run on a single machine (PC, VPS, or cloud VM).

1. Ensure Node.js is installed.
2. Follow the setup steps above.
3. Use a process manager like `pm2` to keep the bot running:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "fifa-bot"
   ```
