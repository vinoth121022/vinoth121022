# ChessAlive Architecture

ChessAlive is designed as an interface-first product. The first implementation is local and fast to iterate on, but every product system has a stable TypeScript contract that can later be backed by cloud services, Redis, databases, queues, CDN assets, or native mobile APIs.

## Product Shape

- One app codebase: Expo + React Native + TypeScript.
- Targets: iOS, Android, and web.
- Core rules are shared across clients and future backend workers.
- Alive Mode is a plugin layer. Chess remains chess; effects decorate validated moves.
- Current local services are intentionally replaceable adapters.

## Workspace Layout

```text
apps/player-app
  Expo app, screens, board UI, controls

packages/chess-core
  Chess rules, legal moves, board snapshots, move history

packages/services
  Interfaces plus local adapters for product systems

packages/funny-mode
  Alive effect registry and move-trigger metadata

packages/assets
  Board themes, piece assets, effect manifests

packages/ui
  Shared design tokens

apps/realtime-server
  Cheap WebSocket/HTTP game room server for local and small-cloud multiplayer
```

## Replaceable Service Interfaces

The app talks to interfaces, not infrastructure:

- `AuthService`
- `ProfileService`
- `MatchmakingService`
- `RealtimeGameService`
- `GameStateStore`
- `MoveValidator`
- `ClockService`
- `GameReplayService`
- `PresenceService`
- `FriendService`
- `ChatService`
- `PuzzleService`
- `LessonService`
- `BotService`
- `AnalysisService`
- `GameReviewService`
- `TournamentService`
- `ClubService`
- `LeaderboardService`
- `StatsService`
- `SettingsService`
- `NotificationService`
- `AdService`
- `DatabaseService`
- `MultiplayerService`
- `MusicService`
- `SoundEffectService`
- `TelemetryService`
- `CrashReportingService`
- `AssetCDNService`
- `ExperimentService`

Local adapters live in `packages/services/src/localServices.ts`. Future production adapters can implement the same interfaces without changing screen code.

## Current Multiplayer Implementation

The app now has a real local multiplayer path:

```text
Expo/Web app
  -> MultiplayerService
  -> http://localhost:8982 rooms API
  -> WebSocket room subscription
  -> in-memory hot room state
  -> apps/realtime-server/data/events.jsonl durable event log
```

This is intentionally cheap: one small Node process can host local/dev games, while production can replace it with regional WebSocket gateways, Redis hot state, and Postgres/Cockroach/Dynamo-style durable storage. The client already talks through interfaces, so the migration is adapter work rather than a rewrite.

## Million-User Scaling Model

ChessAlive should scale around small game rooms, not one giant shared world.

```text
App
  -> API Gateway
  -> Auth/Profile/Settings
  -> Matchmaking
  -> Realtime Gateway
  -> Game Worker assigned by gameId
  -> Redis live state
  -> Postgres/Cockroach/Dynamo-style durable event log
  -> Queue for review, analytics, notifications
  -> CDN for Alive effect packs
  -> Google AdSense on web / AdMob on iOS and Android
```

## Chess.com-Scale Play Target

The product target from the May 10, 2026 Chess.com recording is roughly:

- Hundreds of thousands of concurrent players.
- Tens of millions of games per day.
- Every game is still only a two-player room plus observers, chat, clocks, and events.

That means the hot path must stay tiny:

```text
find match -> assign game worker -> validate move -> update hot state -> broadcast snapshot -> append event
```

The UI now reflects that model with a four-tab game dock:

- `Moves`: SAN table, opening label, replay controls, draw/resign, captured pieces.
- `Chat`: room chat and direct-message entry surface.
- `Players`: online friends and challenge actions.
- `Info`: time control, rating band, connection quality, and match pipeline.

Production services should shard by `gameId` and region. A practical low-cost path is:

- Regional WebSocket gateways terminate client connections.
- Matchmaking writes short-lived seeks into Redis sorted sets by time control, rating, and region.
- Game workers own active games and keep authoritative clocks in memory/Redis.
- Every accepted move is appended to a durable event stream before fanout.
- Postgres/Cockroach/Dynamo stores user, social, tournament, and historical game records.
- Object storage plus CDN serves board themes, piece sets, and Alive effect packs.
- Review, anti-cheat, notifications, telemetry, and ad reporting run off queues.

This preserves the cheap local adapter while keeping a straight path to Chess.com-style concurrency.

## Cheap Database Strategy

The current adapter uses localStorage/memory for client settings and an append-only JSONL event log in the realtime server. That keeps local development at $0/month and keeps live room latency low. The production step should be:

- Redis or Dragonfly for hot game room state.
- Postgres/Cockroach for user, game, tournament, and payment records.
- Object storage plus CDN for effect packs and generated review artifacts.
- A queue for game review, telemetry rollups, notifications, and ad/reporting jobs.

Clients send move intents:

```text
from: e2
to: e4
promotion: optional
```

The server validates moves and broadcasts accepted events:

```text
moveAccepted
snapshot
funnyEffect: optional
```

## Alive Mode

Alive Mode is intentionally separate from chess rules.

```text
move event -> effect registry -> animation/audio asset -> UI overlay
```

The current app ships with lightweight bundled effects. Production effects should become downloadable packs served from a CDN, using the best format for each effect: sprite/video/WebP/Lottie/Rive/native 3D.

## Backend Migration Path

The local adapter can be replaced piece by piece:

- `LocalMatchmakingService` -> regional matchmaking service.
- `LocalRealtimeGameService` -> WebSocket gateway plus game workers.
- `LocalAssetCDNService` -> signed CDN asset manifests.
- `LocalAnalysisService` -> background engine/AI review jobs.
- `LocalSettingsService` -> user settings database.

The app should not need a rewrite as long as each adapter keeps the interface contract.
