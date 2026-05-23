# ChessAlive Player Modules

Each product domain owns its route definitions and future screen implementation files here. Keep modules independent: a module may import from `../../shared`, `../../app`, package APIs such as `@chessalive/services`, and its own local files, but it should not import another product module directly.

Current ownership:

- `auth`: login, signup, Google login, OTP, session persistence, auth gate.
- `home`: logged-in dashboard and landing/dashboard orchestration.
- `play`: live play, P2P friend games, practice, bots, clocks, move controls, game side panel.
- `premium`: paid plan page, free-vs-premium messaging, upgrade entry points.
- `puzzles`: puzzles, lessons, puzzle tutor, puzzle progress.
- `review`: game review and analysis UI.
- `social`: chat, friends, private rooms, watch matches.
- `profile`: player profile, board settings, user-facing preferences.
- `admin`: admin-only animation studio, piece sets, ops, hidden tournament/admin surfaces.

The legacy `App.tsx` still contains screen bodies. New work should move one screen at a time into its owning module, starting with leaf screens (`Review`, `Social`, `Profile`, then `Puzzles`, then `Play`).
