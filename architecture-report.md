# Architecture Analysis Report - FIFA World Cup 2026 Bot

## 1. Layer Identification

### Presentation Layer (User Interface & API)
- **WhatsApp Bot Interface**: `src/bot/whatsapp.ts` (Handles Baileys events and message entry).
- **Command Handler**: `src/commands/index.ts` (Dispatches user and admin commands).
- **Admin API**: `src/index.ts` (Express server with protected stats and broadcast routes).

### Business Logic Layer
- **Notification Engine**: `src/notifications/engine.ts` (Event detection: goals, red cards, comebacks; duplicate prevention via hashing).
- **Scheduler**: `src/scheduler/jobs.ts` (Orchestrates periodic match and news syncing).
- **Provider Management**: `src/providers/providerManager.ts` (Dynamic prioritization and failover logic).

### Data Access Layer
- **Persistence**: `src/database/db.ts` (SQLite connection and schema management).
- **Extraction Engine**: `src/providers/strategyScraper.ts` (Multi-strategy scraping: JSON-LD, Embedded JSON, Tables, Selectors).
- **Scraper Implementations**: `src/providers/matchProviders.ts` (FIFA, ESPN, BBC specific logic).
- **Utilities**: `src/utils/userService.ts` (User and team follow management).

---

## 2. Component List

| Category | Components |
| :--- | :--- |
| **API Routes** | `/admin/stats`, `/admin/broadcast`, `/admin/health` (implemented via Express in `src/index.ts`). |
| **Service Files** | `NotificationEngine`, `ProviderManager`, `UserService`. |
| **Database Models** | `users`, `team_follows`, `matches`, `match_snapshots`, `notification_hashes`, `news`, `providers` (defined in `src/database/schema.sql`). |
| **Interface Elements** | WhatsApp Command Dispatcher (`!help`, `!status`, `!live`, etc.). |

*Note: This project does not contain React Components as it is a headless WhatsApp bot.*

---

## 3. Separation of Concerns Analysis

### Is business logic separated from UI/Interface?
**Partially.** While core services like the `NotificationEngine` exist, the `src/commands/index.ts` (Presentation Layer) contains significant business logic and direct database interactions.

### 🚩 Flagged Violations

1.  **Database Queries inside Interface Layer**:
    - `src/commands/index.ts` performs direct `await db.all()` and `await db.get()` calls for stats, standings, and match data instead of using a service/repository.
2.  **Logic Mixing**:
    - Match event detection logic is encapsulated in `NotificationEngine`, which is good. However, the fingerprinting logic (hashing) is also performed within the engine, which could be moved to a dedicated utility.
3.  **Missing Repository Pattern**:
    - The data access layer is not fully abstracted; raw SQL strings are scattered across several files (`engine.ts`, `jobs.ts`, `index.ts`).

---

## 4. Architecture Classification
**Classification: Hybrid (Layered + Feature-Based)**

The project follows a standard Layered architecture (Data -> Logic -> Presentation) but groups some components by feature (e.g., `notifications/`, `providers/`).

---

## 5. Recommendations

1.  **Abstract Data Access**: Create a Repository layer to encapsulate all SQLite queries. This will remove raw SQL from `commands/` and `notifications/`.
2.  **Clean Commands**: Refactor `src/commands/index.ts` to only handle input parsing and output formatting. Move all logic (e.g., fetching today's matches or generating status reports) to service classes.
3.  **Consolidate Providers**: Merge `matchProviders.ts` and `strategyScraper.ts` into a cleaner hierarchy with clear interfaces for each data source.
4.  **Error Handling Middleware**: For the Admin API in `src/index.ts`, implement a centralized error-handling middleware to improve resilience.
5.  **Environment Validation**: Use Zod (which is already implemented) even more strictly across all configuration points to prevent runtime crashes.
