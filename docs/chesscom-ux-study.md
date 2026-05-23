# Chess.com UX Study

Observed May 10, 2026 from the provided 142.7s Chess.com screen recording and public Chess.com pages.

## Player-Facing Patterns To Keep

- Play page keeps the board, player strips, and large clocks as the center of gravity.
- The game screen is a cockpit: left global navigation, central board, right gameplay panel, and an outside ad rail.
- Player strips show avatar, username, rating, connection bars, and a high-contrast clock. The clock is not decorative; it is one of the most visually dominant elements.
- The right gameplay panel has compact tab groups. In the recording it switches across moves, chat, info/openings, games, and players without navigating away from the game.
- Move history is table-like, scan-friendly, and paired with an opening name plus replay controls.
- Game actions such as draw and resign sit under the move panel where players naturally look after each move.
- Chat is in the same right panel rather than a separate page. It is available, but quieter than the board and clocks.
- The players/friends panel includes online users, statuses, search, and challenge affordances.
- Ads are visible on the far right, outside the board and move panel. They monetize the session without interrupting square selection or clock reading.
- Win/loss results appear as a modal with a clear next action: review, rematch, or new game.
- Online play is action-first: New Game, Games, Players, then time controls and Start Game.
- Time controls are grouped by Bullet, Blitz, and Rapid with familiar presets like 1 min, 3|2, 5 min, 10 min, 15|10, and 30 min.
- Start Game becomes a matching flow. The important player promise is “same mode, similar strength, low wait.”
- Player strips show avatar/name plus a prominent timer. Connection/player status belongs near the player, not in an admin panel.
- Public cards use consumer metrics such as playing-now and games-today. Server storage, DB cost, p95, and region are not public UI.
- Lessons, puzzles, bots, analysis, and events each have a direct primary action instead of long explanation.

## Recording Breakdown

- `00:00`: Active game surface. Board centered, left nav persistent, right panel on moves/chat/info, far-right vertical ad, clocks prominent.
- `00:12`: New Game/Games/Players tab cluster. The player can browse variants without losing the board.
- `00:28`: Mid-game move list. Opening name, SAN moves, replay controls, draw/resign, player clocks, and ad all fit in one screen.
- `00:45`: Players/friends list. Online statuses and challengeable users are one tab away from the game.
- `01:05`: Game end modal. Review is the primary CTA, with new game/rematch secondary.
- `01:28`: Courses/puzzles area. Content cards use thumbnails and short titles, not long explanations.
- `01:52`: Play dropdown. Play Online/Bots/Coach/Stats/Tournaments/Variants/History are directly reachable.
- `02:16`: Bot loading state. Skeleton cards keep layout stable while content loads.

## ChessAlive Improvements Applied

- Player-facing multiplayer is now “Live Matching,” with time controls and rating-band copy.
- Infrastructure details moved to Admin.
- Play navigation scrolls/focuses the board.
- Timers and network signal now live in the player strip.
- Added clear board themes, including Clarity Ivory as the default.
- Alive Mode remains separate from chess rules and adds expressive board entry animation.

## ChessAlive Build Targets From This Recording

- Add a dedicated right game dock with `Moves`, `Chat`, `Players`, and `Info` tabs.
- Keep draw, resign, replay controls, opening label, and move list in the Moves tab.
- Add game chat and direct messaging entry points in the Chat tab.
- Add friends, online players, status, and challenge buttons in the Players tab.
- Add match details, time control, connection quality, rating band, and scale-oriented matchmaking copy in the Info tab.
- Restore the play ad as a separate far-right rail on large screens, not inside the core game controls.
- Add a slim left play rail on desktop for profile, messages, primary sections, and settings, while hiding it on small screens.
- Preserve the board-first sizing model: all rails should disappear or compact before the board becomes cramped.
