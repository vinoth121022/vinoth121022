# ChessAlive

ChessAlive is a mobile-first Alive Mode chess game for iOS, Android, and web. The app is built with Expo, React Native, and TypeScript, with every product capability sitting behind replaceable interfaces so local prototypes can become production services over time.

## Run

```bash
npm install
npm run dev
```

For real local multiplayer, run the lightweight realtime server in a second terminal:

```bash
npm run dev:server
```

Useful scripts:

```bash
npm run typecheck
npm --workspace @chessalive/player-app run ios
npm --workspace @chessalive/player-app run android
```

## What Exists Now

- Full Expo app shell for phone and web.
- Legal chess move validation through a shared chess core.
- Play screen with board, move selection, move list, captured pieces, game status, new game, and Alive Mode toggle.
- Local realtime rooms over WebSocket/HTTP through `apps/realtime-server`, backed by hot in-memory room state and a cheap append-only event log.
- Working multiplayer room creation/join UI, live server health, event-log database health, and WebSocket snapshot sync hooks.
- Playable puzzle trainer with board interaction, solution validation, motifs, and success stats.
- Rich lesson content with tracks, XP, steps, coach notes, and completion state.
- Bot match entry points, simple difficulty-aware bot move selection, and active game clocks.
- Live matching flow with Bullet/Blitz/Rapid presets and similar-rating search copy.
- Clarity board themes for simpler, high-definition board reading.
- Lobby chat composer plus join states for tournaments and clubs.
- Google Ads/AdMob-ready placement interfaces and test ad slots for web and mobile.
- Alive Mode effect registry with the first cinematic capture effects.
- End-to-end screens for puzzles, lessons, bots, game review, tournaments, clubs, social, leaderboard, profile, and settings.
- Local/mock service adapters behind production-ready interfaces.

## Architecture

See [docs/architecture.md](docs/architecture.md).

Permanent GCP persistence setup is documented in [docs/gcp-persistence.md](docs/gcp-persistence.md).

The latest player UX study is captured in [docs/chesscom-ux-study.md](docs/chesscom-ux-study.md).
