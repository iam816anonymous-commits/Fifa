# Repository Analysis Report

## 1. open-wa/wa-automate-nodejs

### Authentication
- Uses `useMultiFileAuthState` from `@whiskeysockets/baileys` (or equivalent in its own driver layer).
- Supports QR code and Link-code login.
- Authentication data is persisted in a local folder (`auth_info_baileys` in our case).

### Session Persistence
- Session state (credentials, keys) is stored in the file system.
- Allows the bot to restart without re-scanning the QR code.

### Auto-reconnect Logic
- Monitors connection state changes.
- Automatically attempts reconnection on `connection === 'close'` unless explicitly logged out.
- Implements exponential backoff or retry limits to avoid spamming the server.

### Event Architecture
- Heavily event-driven using `EventEmitter`.
- Events for: `messages.upsert`, `connection.update`, `creds.update`, `group-participants.update`.

### Message Handling
- Central dispatcher for incoming messages.
- Supports various message types (text, media, location).

### API Abstractions
- Decouples the browser driver (Puppeteer, Playwright) from the high-level WhatsApp API.
- Provides a clean `SocketClient` for remote consumption.

---

## 2. D4Vinci/Scrapling

### Adaptive Scraping
- Uses intelligent similarity algorithms to relocate elements if the DOM structure changes.
- Learns from previous successful extractions.

### Selector Recovery
- If a primary CSS/XPath selector fails, it falls back to alternative selectors or similar element search.

### Anti-bot Handling
- Impersonates browser TLS fingerprints, headers, and uses HTTP/3.
- Built-in support for bypassing Cloudflare Turnstile.

### Retry Mechanisms
- Automatic detection of blocked requests.
- Customizable retry logic with proxy rotation.

### Crawl Orchestration
- Supports concurrent crawls with pause/resume capability.
- Multi-session management (routing requests to different session types).

### Data Extraction Pipelines
- Built-in JSON/JSONL exporters.
- Streaming mode for real-time item processing.

---

## 3. Reusable Patterns for FIFA 2026 Bot

- **Event-Driven Dispatcher:** For handling commands and system alerts.
- **Provider Fallback (Multi-Layer):** Automatic switching between API layers and scraping.
- **Message Queueing:** Throttling and retrying outgoing messages to handle large subscriber bases (10,000+).
- **Session Persistence:** File-based auth state for seamless restarts.
- **Adaptive Selectors:** Use multiple fallback selectors for the scraping layer.
