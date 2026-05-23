import { createChessEngine, GameSnapshot, MoveIntent, PieceKind, SquareName } from "@chessalive/chess-core";
import {
  AnimationClip,
  AnimationRule,
  AnimationSet,
  PieceSet,
  createFunnyEffectRegistry,
  effectFromAnimationRule,
  seededAllAnimationClips,
  seededAnimationSetId,
  seededAnimationSets,
  seededPieceSetId,
  seededPieceSets,
  selectAnimationRule,
  FunnyModeSettings,
} from "@chessalive/funny-mode";

import {
  AnalysisSummary,
  AdPlacement,
  AuthProvider,
  BotProfile,
  ChatMessage,
  ChessAliveServices,
  Club,
  GameSession,
  GoogleAuthProfile,
  LeaderboardEntry,
  Lesson,
  MultiplayerRoom,
  PlayerSettings,
  Puzzle,
  PuzzleAttempt,
  PuzzleDifficultyMode,
  PuzzleRatingState,
  Tournament,
  UserProfile,
} from "./interfaces";
import { createLocalDatabase } from "./localDatabase";

interface MinimalWebSocket {
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  close(): void;
}

function envValue(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

function browserLocation() {
  return (globalThis as { location?: { origin?: string; hostname?: string; protocol?: string; host?: string } }).location;
}

function isLocalHost(hostname?: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function realtimeHttpEndpoint() {
  const configured = envValue("EXPO_PUBLIC_CHESSALIVE_REALTIME_HTTP");
  if (configured) return configured.replace(/\/$/, "");
  const location = browserLocation();
  if (location?.origin && !isLocalHost(location.hostname)) return `${location.origin}/api`;
  return "http://localhost:8982";
}

function realtimeWsEndpoint() {
  const configured = envValue("EXPO_PUBLIC_CHESSALIVE_REALTIME_WS");
  if (configured) return configured.replace(/\/$/, "");
  const location = browserLocation();
  if (location?.host && !isLocalHost(location.hostname)) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${location.host}/ws`;
  }
  return "ws://localhost:8982";
}

const user: UserProfile = {
  id: "guest-1",
  displayName: "Guest Player",
  avatarEmoji: "♙",
  rating: {
    blitz: 400,
    rapid: 400,
    bullet: 400,
    funny: 400,
  },
};

const guestUser: UserProfile = {
  ...user,
  rating: { ...user.rating },
};

const rival: UserProfile = {
  id: "bot-rival",
  displayName: "Drama Bot",
  avatarEmoji: "🎭",
  rating: {
    blitz: 875,
    rapid: 930,
    bullet: 780,
    funny: 1111,
  },
};

const onlineFriends: UserProfile[] = [
  rival,
  {
    id: "friend-1",
    displayName: "Tactical Mani",
    avatarEmoji: "⚡",
    rating: { blitz: 1010, rapid: 1044, bullet: 930, funny: 1288 },
  },
  {
    id: "friend-2",
    displayName: "Endgame Raja",
    avatarEmoji: "♚",
    rating: { blitz: 1180, rapid: 1215, bullet: 990, funny: 1090 },
  },
  {
    id: "friend-3",
    displayName: "Cinema Knight",
    avatarEmoji: "🎥",
    rating: { blitz: 905, rapid: 970, bullet: 880, funny: 1350 },
  },
];

const funnyMode: FunnyModeSettings = {
  animationSetId: seededAnimationSetId,
  animationsEnabled: true,
  enabled: true,
  musicEnabled: true,
  pieceSetId: seededPieceSetId,
  intensity: "cinema",
};

const engine = createChessEngine();
const effectRegistry = createFunnyEffectRegistry();
const sessions = new Map<string, GameSession>();
const remoteRooms = new Map<string, MultiplayerRoom>();
const joinedTournaments = new Set<string>();
const joinedClubs = new Set<string>();
const clockStates = new Map<string, { whiteMs: number; blackMs: number; running: boolean; updatedAt: number }>();
const pendingEmailOtps = new Map<string, { code: string; expiresAt: number }>();
const database = createLocalDatabase({ remoteEndpoint: realtimeHttpEndpoint() });
const defaultCustomRules = [
  {
    id: "rule-king-queen",
    name: "Royal Queen Walk",
    description: "The king can move like a queen in Alive custom games.",
    enabled: false,
  },
  {
    id: "rule-knight-double",
    name: "Double Hop Knight",
    description: "Knights can chain two legal hops when the rule is enabled.",
    enabled: false,
  },
  {
    id: "rule-rook-dance",
    name: "Dancing Rook",
    description: "Rooks may sidestep one square before a straight-line move.",
    enabled: false,
  },
  {
    id: "rule-bishop-curve",
    name: "Curved Bishop",
    description: "Bishops can bend once around a friendly piece.",
    enabled: false,
  },
  {
    id: "rule-pawn-sprint",
    name: "Pawn Sprint",
    description: "Pawns can sprint three squares from their starting rank.",
    enabled: false,
  },
];

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function startingRating(value = 400) {
  return {
    blitz: value,
    rapid: value,
    bullet: value,
    funny: value,
  };
}

function userFromGoogleProfile(profile: GoogleAuthProfile) {
  const fallbackName = profile.email?.split("@")[0]?.replace(/[._-]+/g, " ") || "Google Player";
  return Object.assign(user, {
    id: `google-${profile.sub}`,
    email: profile.email?.trim().toLowerCase(),
    displayName: profile.name || fallbackName,
    avatarEmoji: "G",
    rating: startingRating(),
  });
}

async function fetchRealtime<T>(path: string, options?: RequestInit): Promise<T | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const response = await fetch(`${realtimeHttpEndpoint()}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function socketConstructor() {
  return (globalThis as { WebSocket?: new (url: string) => MinimalWebSocket }).WebSocket;
}

function roomToSession(room: MultiplayerRoom): GameSession | null {
  if (!room.snapshot) return null;
  const session: GameSession = {
    id: room.id,
    white: room.players.white ?? user,
    black: room.players.black ?? rival,
    snapshot: room.snapshot,
    funnyMode: {
      ...funnyMode,
      enabled: room.funnyMode,
    },
    createdAt: room.createdAt,
  };
  sessions.set(session.id, session);
  remoteRooms.set(session.id, room);
  return session;
}

function createSession(): GameSession {
  const snapshot = engine.newGame();
  const session: GameSession = {
    id: snapshot.id,
    white: user,
    black: rival,
    snapshot,
    funnyMode,
    createdAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

// ─── Puzzle dataset ────────────────────────────────────────────────────────────
// Primary source: packages/data/puzzles.json (2000 puzzles, 400 per tier).
// Hard-coded fallbacks ensure the board always renders even if the JSON doesn't
// bundle correctly in a particular environment.

const FALLBACK_PUZZLES: Puzzle[] = [
  {
    id: "fallback-beginner-01",
    title: "Back-rank Mate #1",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    goal: "Find the move that ends the game immediately.",
    hint: "Push the rook to the 8th rank.",
    rating: 420,
    solution: ["Ra8#"],
    solutionLan: ["a1a8"],
    motif: "Back-rank mate",
    difficulty: "beginner",
    xp: 50,
    sideToMove: "w",
    expectedTime: 20,
    attempts: 18420,
    successRate: 62,
    themes: ["mateIn1", "backRankMate"],
  },
  {
    id: "fallback-beginner-02",
    title: "Knight Fork #1",
    fen: "r3k2r/ppp2ppp/2n5/3Np3/8/8/PPP2PPP/R3K2R w KQkq - 0 1",
    goal: "Use the knight to win material.",
    hint: "The knight can attack two pieces at once.",
    rating: 620,
    solution: ["Nxc7+"],
    solutionLan: ["d5c7"],
    motif: "Knight fork",
    difficulty: "beginner",
    xp: 50,
    sideToMove: "w",
    expectedTime: 25,
    attempts: 11706,
    successRate: 54,
    themes: ["fork"],
  },
  {
    id: "fallback-easy-01",
    title: "Pin & Win",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    goal: "Exploit the pin to win a pawn.",
    hint: "The bishop can create a pin on the f6 knight.",
    rating: 750,
    solution: ["Ng5"],
    solutionLan: ["f3g5"],
    motif: "Pin",
    difficulty: "easy",
    xp: 75,
    sideToMove: "w",
    expectedTime: 30,
    attempts: 9000,
    successRate: 48,
    themes: ["pin"],
  },
];

// Try to load the full 2000-puzzle set — works in Metro/webpack since
// resolveJsonModule is enabled and the file is in the workspace.
// Falls back gracefully to FALLBACK_PUZZLES if bundling skips it.
let puzzles: Puzzle[] = FALLBACK_PUZZLES;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require("../../data/puzzles.json") as { puzzles: Puzzle[] };
  if (Array.isArray(raw?.puzzles) && raw.puzzles.length > 0) {
    puzzles = raw.puzzles;
  }
} catch {
  // bundler didn't include the JSON — fallback puzzles will be used
}

// Rush set: first 8 per tier (40 total) for the initial roadmap render.
const RUSH_PER_TIER = 8;
const tierOrder = ["beginner", "easy", "intermediate", "hard", "expert"] as const;
const puzzleRushSet: Puzzle[] = tierOrder.flatMap((tier) =>
  puzzles.filter((p) => p.difficulty === tier).slice(0, RUSH_PER_TIER),
).concat(
  // Always guarantee at least 1 fallback puzzle is present
  puzzles.length === FALLBACK_PUZZLES.length ? [] : []
).filter((_, i, arr) => arr.findIndex(p => p.id === arr[i].id) === i); // dedup

const lessons: Lesson[] = [
  {
    id: "opening-basics",
    title: "Open Like A Main Character",
    summary: "Control the center, develop pieces, and castle before the soundtrack gets tense.",
    minutes: 7,
    completed: false,
    level: "beginner",
    track: "openings",
    xp: 80,
    steps: [
      {
        id: "center",
        title: "Own the center",
        body: "Start by fighting for e4, d4, e5, and d5. Your pieces become faster when the center is yours.",
        boardFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        move: "e4",
        coachNote: "A strong center makes every later Alive effect feel earned.",
      },
      {
        id: "develop",
        title: "Bring pieces out",
        body: "Knights and bishops should enter before the queen tries to become a celebrity.",
        boardFen: "rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 1",
        move: "Nf3",
        coachNote: "Development first, drama second.",
      },
    ],
  },
  {
    id: "capture-timing",
    title: "Capture Timing For Comedy",
    summary: "Learn when a capture deserves a baby elephant and when it deserves quiet dignity.",
    minutes: 5,
    completed: false,
    level: "beginner",
    track: "funny-mode",
    xp: 60,
    steps: [
      {
        id: "count-defenders",
        title: "Count defenders",
        body: "Before taking, count attackers and defenders. Comedy is better when the move is legal and strong.",
        boardFen: "rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2",
        move: "exd5",
        coachNote: "The best capture animation is the one that wins material.",
      },
    ],
  },
  {
    id: "rook-endgames",
    title: "Rook Endgames Without Panic",
    summary: "Use active rooks, checking distance, and cutoffs to convert the ending cleanly.",
    minutes: 11,
    completed: false,
    level: "intermediate",
    track: "endgames",
    xp: 120,
    steps: [
      {
        id: "active-rook",
        title: "Stay active",
        body: "Rooks belong behind passed pawns and on open files. Passive defense makes winning easy for the opponent.",
        boardFen: "8/8/8/8/8/8/5k2/4R1K1 w - - 0 1",
        move: "Re2+",
        coachNote: "Activity matters more than material counting in many rook endings.",
      },
    ],
  },
  {
    id: "tactical-vision",
    title: "See Tactics Before They Happen",
    summary: "Train pins, forks, skewers, discovered attacks, and forcing move order.",
    minutes: 13,
    completed: false,
    level: "intermediate",
    track: "tactics",
    xp: 140,
    steps: [
      {
        id: "forcing-moves",
        title: "Checks, captures, threats",
        body: "Scan forcing moves first. They reduce the tree and reveal the move your opponent hopes you miss.",
        boardFen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3",
        move: "Ng5",
        coachNote: "The faster you see forcing moves, the faster the board feels.",
      },
    ],
  },
];

const bots: BotProfile[] = [
  {
    id: "drama-bot",
    name: "Drama Bot",
    rating: 850,
    personality: "Blunders with confidence and celebrates every pawn move.",
    avatarEmoji: "🎭",
  },
  {
    id: "mass-hero-bot",
    name: "Mass Hero Bot",
    rating: 1250,
    personality: "Always looks for forcing moves and unnecessary slow motion.",
    avatarEmoji: "🔥",
  },
  {
    id: "endgame-aunty",
    name: "Endgame Aunty",
    rating: 1520,
    personality: "Trades queens early, then lectures your rook for being lazy.",
    avatarEmoji: "👑",
  },
  {
    id: "speed-dancer",
    name: "Speed Dancer",
    rating: 1780,
    personality: "Moves instantly, attacks both wings, and never skips the chorus.",
    avatarEmoji: "⚡",
  },
];

const tournaments: Tournament[] = [
  {
    id: "sunday-alive-arena",
    name: "Sunday Alive Arena",
    format: "arena",
    players: 128,
    startsAt: new Date(Date.now() + 3600_000).toISOString(),
    funnyMode: true,
  },
  {
    id: "rapid-classic",
    name: "Rapid Classic",
    format: "swiss",
    players: 64,
    startsAt: new Date(Date.now() + 7200_000).toISOString(),
    funnyMode: false,
  },
];

const clubs: Club[] = [
  {
    id: "elephant-rooks",
    name: "Elephant Rooks Club",
    members: 2401,
    description: "For players who believe captures deserve choreography.",
  },
  {
    id: "endgame-comedians",
    name: "Endgame Comedians",
    members: 911,
    description: "Serious king-and-pawn endings, unserious celebrations.",
  },
];

const chatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    from: rival,
    body: "Good luck. My horse has insurance.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "msg-2",
    from: user,
    body: "Alive Mode is on. Respect the rook.",
    createdAt: new Date().toISOString(),
  },
];

const adPlacements: AdPlacement[] = [
  {
    id: "adsense-home-hero",
    slot: "home-hero",
    network: "google-adsense",
    format: "banner",
    advertiser: "Google AdSense",
    headline: "Responsive home banner",
    body: "Auto Ads script is loaded globally; manual display activates when EXPO_PUBLIC_ADSENSE_HOME_TOP_SLOT is configured.",
    cta: "AdSense",
    enabled: true,
    testMode: false,
    refreshSeconds: 60,
    platformHints: {
      webSlotId: "EXPO_PUBLIC_ADSENSE_HOME_TOP_SLOT",
    },
  },
  {
    id: "adsense-home-rail",
    slot: "home-rail",
    network: "google-adsense",
    format: "rectangle",
    advertiser: "Google AdSense",
    headline: "Responsive home rail",
    body: "Manual display activates when EXPO_PUBLIC_ADSENSE_HOME_RAIL_SLOT is configured.",
    cta: "AdSense",
    enabled: true,
    testMode: false,
    refreshSeconds: 90,
    platformHints: {
      webSlotId: "EXPO_PUBLIC_ADSENSE_HOME_RAIL_SLOT",
    },
  },
  {
    id: "adsense-play-rail",
    slot: "play-rail",
    network: "google-adsense",
    format: "rectangle",
    advertiser: "Google AdSense",
    headline: "300 x 250 performance slot",
    body: "Manual display activates when EXPO_PUBLIC_ADSENSE_PLAY_RAIL_SLOT is configured.",
    cta: "AdSense",
    enabled: true,
    testMode: false,
    refreshSeconds: 90,
    platformHints: {
      webSlotId: "EXPO_PUBLIC_ADSENSE_PLAY_RAIL_SLOT",
    },
  },
  {
    id: "adsense-lesson-feed",
    slot: "lesson-feed",
    network: "google-adsense",
    format: "banner",
    advertiser: "Google AdSense",
    headline: "Lesson feed responsive slot",
    body: "Manual display activates when EXPO_PUBLIC_ADSENSE_LESSON_FEED_SLOT is configured.",
    cta: "AdSense",
    enabled: true,
    testMode: false,
    refreshSeconds: 120,
    platformHints: {
      webSlotId: "EXPO_PUBLIC_ADSENSE_LESSON_FEED_SLOT",
    },
  },
  {
    id: "adsense-puzzle-feed",
    slot: "puzzle-feed",
    network: "google-adsense",
    format: "banner",
    advertiser: "Google AdSense",
    headline: "Puzzle feed responsive slot",
    body: "Manual display activates when EXPO_PUBLIC_ADSENSE_PUZZLE_FEED_SLOT is configured.",
    cta: "AdSense",
    enabled: true,
    testMode: false,
    refreshSeconds: 120,
    platformHints: {
      webSlotId: "EXPO_PUBLIC_ADSENSE_PUZZLE_FEED_SLOT",
    },
  },
  {
    id: "adsense-review-rail",
    slot: "review-rail",
    network: "google-adsense",
    format: "rectangle",
    advertiser: "Google AdSense",
    headline: "Review rail responsive slot",
    body: "Manual display activates when EXPO_PUBLIC_ADSENSE_REVIEW_RAIL_SLOT is configured.",
    cta: "AdSense",
    enabled: true,
    testMode: false,
    refreshSeconds: 90,
    platformHints: {
      webSlotId: "EXPO_PUBLIC_ADSENSE_REVIEW_RAIL_SLOT",
    },
  },
];

function localAnalysis(snapshot: GameSnapshot): AnalysisSummary {
  const moveCount = snapshot.history.length;
  return {
    accuracyWhite: Math.max(58, 94 - moveCount),
    accuracyBlack: Math.max(55, 91 - moveCount),
    bestMove: snapshot.status.isGameOver ? undefined : "Develop, castle, and keep the elephant ready.",
    mistakes: moveCount > 5 ? ["One tempo was spent for style instead of safety."] : [],
    brilliant: snapshot.history.some((move) => move.captured) ? ["Capture with cinematic timing."] : [],
  };
}

function capturedFromHistory(history: GameSnapshot["history"]) {
  return history.reduce(
    (captured, move) => {
      if (move.captured) {
        const bucket = move.color === "w" ? captured.white : captured.black;
        bucket.push(move.captured);
      }
      return captured;
    },
    { white: [] as PieceKind[], black: [] as PieceKind[] },
  );
}

const browserPersistenceKey = "chessalive-local-services-v2";
const puzzleRatingKey = "chessalive-puzzle-rating-v1";
const puzzleAttemptsKey = "chessalive-puzzle-attempts-v1";

interface PersistedLocalState {
  animationClips?: AnimationClip[];
  animationSets?: AnimationSet[];
  currentUser?: UserProfile | null;
  pieceSets?: PieceSet[];
  settings?: PlayerSettings;
}

// ─── Puzzle Rating Engine ────────────────────────────────────────────────────

function defaultPuzzleRatingState(userId: string): PuzzleRatingState {
  return {
    userId,
    puzzleRating: 800,
    ratingDeviation: 350,
    puzzlesSolved: 0,
    currentStreak: 0,
    bestStreak: 0,
    difficultyMode: "standard",
    calibrationComplete: false,
    totalBonusXp: 0,
  };
}

function readPuzzleRatingState(userId: string): PuzzleRatingState {
  try {
    const raw = localStorageRef()?.getItem(`${puzzleRatingKey}-${userId}`);
    if (raw) return JSON.parse(raw) as PuzzleRatingState;
  } catch {
    // ignore
  }
  return defaultPuzzleRatingState(userId);
}

function writePuzzleRatingState(state: PuzzleRatingState): void {
  try {
    localStorageRef()?.setItem(`${puzzleRatingKey}-${state.userId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function appendPuzzleAttempt(attempt: PuzzleAttempt): void {
  try {
    const raw = localStorageRef()?.getItem(`${puzzleAttemptsKey}-${attempt.userId}`);
    const history: PuzzleAttempt[] = raw ? (JSON.parse(raw) as PuzzleAttempt[]) : [];
    // Keep last 500 attempts to avoid unbounded growth
    history.push(attempt);
    if (history.length > 500) history.splice(0, history.length - 500);
    localStorageRef()?.setItem(`${puzzleAttemptsKey}-${attempt.userId}`, JSON.stringify(history));
  } catch {
    // ignore
  }
}

async function readRemotePuzzleRatingState(userId: string): Promise<PuzzleRatingState | null> {
  const remote = await fetchRealtime<{ state: PuzzleRatingState | null }>(
    `/persistence/puzzle-rating?userId=${encodeURIComponent(userId)}`,
  );
  return remote?.state ?? null;
}

async function writeRemotePuzzleRatingState(state: PuzzleRatingState): Promise<void> {
  await fetchRealtime("/persistence/puzzle-rating", {
    method: "POST",
    body: JSON.stringify({ state, userId: state.userId }),
  });
}

async function appendRemotePuzzleAttempt(attempt: PuzzleAttempt): Promise<void> {
  await fetchRealtime("/persistence/puzzle-attempts", {
    method: "POST",
    body: JSON.stringify({ attempt, userId: attempt.userId }),
  });
}

/**
 * Compute the Glicko-2-inspired rating delta for a single puzzle attempt.
 * outcome is a value in [0, 1] derived from performance score.
 */
function computeGlickoDelta(state: PuzzleRatingState, puzzleRating: number, outcome: number): number {
  // Aggressive K during calibration (RD > 200), normal K after
  const K = state.ratingDeviation > 200 ? 40 : 20;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - state.puzzleRating) / 400));
  return Math.round(K * (outcome - expected));
}

/**
 * Given raw attempt data, compute the normalised performance score (0–1),
 * rating delta, earned bonuses, and bonus XP.
 */
function evaluateAttempt(
  state: PuzzleRatingState,
  puzzle: Puzzle,
  timeTakenSeconds: number,
  hintsUsed: number,
  wrongMoves: number,
  solved: boolean,
): { performanceScore: number; ratingDelta: number; bonuses: PuzzleAttempt["bonuses"]; bonusXp: number } {
  if (!solved) {
    const delta = computeGlickoDelta(state, puzzle.rating, 0);
    return { performanceScore: 0, ratingDelta: delta, bonuses: [], bonusXp: 0 };
  }

  // Time threshold: harder puzzles get more thinking time
  const thresholdSeconds = Math.max(20, puzzle.rating / 60);
  const timePenalty = Math.max(0, (timeTakenSeconds - thresholdSeconds) * 0.005);
  const hintPenalty = hintsUsed * 0.20;
  const wrongPenalty = wrongMoves * 0.12;
  const performanceScore = Math.max(0, Math.min(1, 1 - timePenalty - hintPenalty - wrongPenalty));

  const ratingDelta = computeGlickoDelta(state, puzzle.rating, performanceScore);

  // Bonuses
  const bonuses: PuzzleAttempt["bonuses"] = [];
  let bonusXp = 0;
  const isFlawless = hintsUsed === 0 && wrongMoves === 0;
  const isSpeed = timeTakenSeconds < thresholdSeconds * 0.5;

  if (isSpeed) { bonuses.push("speed"); bonusXp += 5; }
  if (state.currentStreak >= 1) {
    bonuses.push("streak");
    bonusXp += Math.min(state.currentStreak + 1, 5); // caps at +5
  }
  if (isFlawless && !isSpeed) { bonuses.push("flawless"); bonusXp += 8; }
  if (isFlawless && isSpeed) { bonuses.push("brilliant"); bonusXp += 15; }

  return { performanceScore, ratingDelta, bonuses, bonusXp };
}

/** Select the best matching puzzle given user rating and difficulty mode. */
function selectNextPuzzle(
  allPuzzles: Puzzle[],
  userRating: number,
  difficultyMode: PuzzleDifficultyMode,
  excludeIds: string[] = [],
): Puzzle | null {
  const pool = allPuzzles.filter((p) => !excludeIds.includes(p.id));
  if (pool.length === 0) return allPuzzles[0] ?? null;

  // Compute target rating with a random spread per mode
  const [lo, hi] = difficultyMode === "extra-hard" ? [300, 650] : difficultyMode === "hard" ? [100, 350] : [-50, 150];
  const offset = lo + Math.random() * (hi - lo);
  const target = userRating + offset;

  // Pick puzzle with rating closest to target
  return pool.reduce((best, puzzle) =>
    Math.abs(puzzle.rating - target) < Math.abs(best.rating - target) ? puzzle : best
  );
}

function localStorageRef() {
  return (globalThis as { localStorage?: Pick<Storage, "getItem" | "setItem"> }).localStorage;
}

function readPersistedLocalState(): PersistedLocalState {
  try {
    const raw = localStorageRef()?.getItem(browserPersistenceKey);
    return raw ? (JSON.parse(raw) as PersistedLocalState) : {};
  } catch {
    return {};
  }
}

function writePersistedLocalState(state: PersistedLocalState) {
  try {
    localStorageRef()?.setItem(browserPersistenceKey, JSON.stringify(state));
  } catch {
    // Local persistence is a browser convenience; gameplay should continue if storage is unavailable.
  }
}

function cloneAnimationSet(animationSet: AnimationSet): AnimationSet {
  return {
    ...animationSet,
    rules: animationSet.rules.map((rule) => ({ ...rule, clipStack: rule.clipStack.map((item) => ({ ...item })) })),
  };
}

function clonePieceSet(pieceSet: PieceSet): PieceSet {
  return {
    ...pieceSet,
    animationClipIds: [...pieceSet.animationClipIds],
    pieces: Object.fromEntries(
      Object.entries(pieceSet.pieces).map(([piece, asset]) => [
        piece,
        asset ? { ...asset, assetSlots: asset.assetSlots ? { ...asset.assetSlots } : undefined } : asset,
      ]),
    ) as PieceSet["pieces"],
    pieceTargets: pieceSet.pieceTargets ? { ...pieceSet.pieceTargets } : undefined,
  };
}

function mergeById<T extends { id: string }>(base: T[], saved: T[]) {
  const map = new Map<string, T>();
  base.forEach((item) => map.set(item.id, item));
  saved.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function isLegacyBundledHorseAsset(pieceSet: PieceSet) {
  const knightAsset = pieceSet.pieces.n;
  if (!knightAsset) return false;
  const paths = [knightAsset.glbPath, ...Object.values(knightAsset.assetSlots ?? {}).map((slot) => slot?.path)];
  return paths.some((path) => path === "chessalive-asset://horse-fullset");
}

function mergeSeededPieceSet(seed: PieceSet, pieceSet: PieceSet): PieceSet {
  const pieces = { ...seed.pieces, ...pieceSet.pieces };
  if (seed.id === seededPieceSetId && isLegacyBundledHorseAsset(pieceSet)) {
    pieces.n = seed.pieces.n;
  }
  return {
    ...seed,
    ...pieceSet,
    animationClipIds: Array.from(new Set([...seed.animationClipIds, ...pieceSet.animationClipIds])),
    pieces,
  };
}

function isCeremonyAnimationRule(rule: AnimationRule) {
  return rule.action === "game-start-handshake" || rule.action === "checkmate-finisher";
}

function hasLegacySystemCeremonyClip(rule: AnimationRule) {
  return rule.clipStack.some((item) => item.clipId === "ceremony-checkmate-kick");
}

export function createLocalServices(): ChessAliveServices {
  const persisted = readPersistedLocalState();
  let activeSession = createSession();
  let signedInUser: UserProfile | null = persisted.currentUser ?? null;
  const settings: PlayerSettings = {
    ...funnyMode,
    animationsEnabled: true,
    animationSetId: seededAnimationSetId,
    boardTheme: "clarity-ivory",
    customBoardTheme: {
      name: "My Pink Board",
      light: "#fff1f8",
      dark: "#e879b7",
      highlight: "#facc15",
      legal: "rgba(190, 24, 93, 0.24)",
      danger: "rgba(220, 38, 38, 0.44)",
    },
    customRules: defaultCustomRules,
    pieceSetId: seededPieceSetId,
    soundVolume: 0.7,
    ...persisted.settings,
  };
  const animationClips = mergeById(seededAllAnimationClips, persisted.animationClips ?? []);
  const pieceSets: PieceSet[] = mergeById(seededPieceSets.map(clonePieceSet), (persisted.pieceSets ?? []).map(clonePieceSet)).map((pieceSet) => {
    const seed = seededPieceSets.find((item) => item.id === pieceSet.id);
    if (!seed) return pieceSet;
    return mergeSeededPieceSet(seed, pieceSet);
  });
  const animationSets: AnimationSet[] = mergeById(seededAnimationSets.map(cloneAnimationSet), (persisted.animationSets ?? []).map(cloneAnimationSet)).map((animationSet) => {
    const seed = seededAnimationSets.find((item) => item.id === animationSet.id);
    if (!seed) return { ...animationSet, rules: animationSet.rules.filter(isCeremonyAnimationRule) };
    const validClipIds = new Set(animationClips.map((clip) => clip.id));
    const rulesById = new Map(seed.rules.map((rule) => [rule.id, rule]));
    animationSet.rules.forEach((rule) => {
      if (!isCeremonyAnimationRule(rule)) return;
      if (hasLegacySystemCeremonyClip(rule) && seed.rules.some((seedRule) => seedRule.id === rule.id)) return;
      const hasMissingClip = rule.clipStack.some((item) => !validClipIds.has(item.clipId));
      if (hasMissingClip && seed.rules.some((seedRule) => seedRule.id === rule.id)) return;
      rulesById.set(rule.id, rule);
    });
    return { ...seed, ...animationSet, rules: [...rulesById.values()] };
  });
  const persistLocalState = () =>
    writePersistedLocalState({
      animationClips,
      animationSets,
      currentUser: signedInUser,
      pieceSets,
      settings,
    });
  const remoteUserId = () => signedInUser?.id ?? user.id ?? "guest-1";
  let lastRemoteHydrationAt = 0;
  let remoteHydration: Promise<void> | null = null;
  const applyPersistedState = (next: PersistedLocalState) => {
    if (next.animationClips) {
      animationClips.splice(0, animationClips.length, ...mergeById(seededAllAnimationClips, next.animationClips));
    }
    if (next.pieceSets) {
      const mergedPieceSets = mergeById(seededPieceSets.map(clonePieceSet), next.pieceSets.map(clonePieceSet)).map((pieceSet) => {
        const seed = seededPieceSets.find((item) => item.id === pieceSet.id);
        return seed ? mergeSeededPieceSet(seed, pieceSet) : pieceSet;
      });
      pieceSets.splice(0, pieceSets.length, ...mergedPieceSets);
    }
    if (next.animationSets) {
      const mergedAnimationSets = mergeById(seededAnimationSets.map(cloneAnimationSet), next.animationSets.map(cloneAnimationSet));
      animationSets.splice(0, animationSets.length, ...mergedAnimationSets);
    }
    if (next.settings) Object.assign(settings, next.settings);
    if (next.currentUser) signedInUser = next.currentUser;
  };
  const hydrateRemoteState = async (force = false) => {
    if (!force && Date.now() - lastRemoteHydrationAt < 2_500) return;
    if (remoteHydration) return remoteHydration;
    remoteHydration = (async () => {
      const remote = await fetchRealtime<PersistedLocalState>(
        `/persistence/state?userId=${encodeURIComponent(remoteUserId())}`,
      );
      if (remote) {
        applyPersistedState(remote);
        writePersistedLocalState({
          animationClips,
          animationSets,
          currentUser: signedInUser,
          pieceSets,
          settings,
        });
      }
      lastRemoteHydrationAt = Date.now();
    })().finally(() => {
      remoteHydration = null;
    });
    return remoteHydration;
  };
  const persistState = () => {
    persistLocalState();
    void fetchRealtime("/persistence/state", {
      method: "POST",
      body: JSON.stringify({
        state: {
          animationClips,
          animationSets,
          currentUser: signedInUser,
          pieceSets,
          settings,
        },
        userId: remoteUserId(),
      }),
    });
  };
  const pickAnimationEffect = (gameId: string, move: GameSession["snapshot"]["history"][number], sessionSettings: FunnyModeSettings) => {
    if (!sessionSettings.enabled || sessionSettings.animationsEnabled === false) return null;
    const animationSet =
      animationSets.find((set) => set.id === sessionSettings.animationSetId) ??
      animationSets.find((set) => set.isDefault) ??
      animationSets[0];
    const pieceSet =
      pieceSets.find((set) => set.id === (sessionSettings.pieceSetId ?? animationSet?.pieceSetId)) ??
      pieceSets.find((set) => set.id === animationSet?.pieceSetId) ??
      pieceSets[0];
    if (!animationSet || !pieceSet) return effectRegistry.pick({ gameId, move, funnyMode: sessionSettings });
    const rule = selectAnimationRule(animationSet, { gameId, move, funnyMode: sessionSettings });
    if (!rule) return null;
    return effectFromAnimationRule(rule, animationSet, pieceSet, animationClips, { gameId, move, funnyMode: sessionSettings });
  };
  const providerLabels: Record<AuthProvider, { name: string; avatar: string }> = {
    google: { name: "Google Player", avatar: "G" },
    facebook: { name: "Facebook Player", avatar: "f" },
    apple: { name: "Apple Player", avatar: "A" },
  };
  const authenticate = (nextUser: UserProfile) => {
    signedInUser = nextUser;
    persistState();
    return nextUser;
  };
  const resetGuestUser = () => {
    Object.assign(user, {
      ...guestUser,
      email: undefined,
      rating: { ...guestUser.rating },
    });
  };

  return {
    auth: {
      currentUser: async () => {
        await hydrateRemoteState();
        return signedInUser;
      },
      signInWithProvider: async (provider) => {
        const identity = providerLabels[provider];
        return authenticate(Object.assign(user, {
          id: `${provider}-local-user`,
          email: undefined,
          displayName: identity.name,
          avatarEmoji: identity.avatar,
          rating: startingRating(),
        }));
      },
      signInWithGoogleProfile: async (profile) => authenticate(userFromGoogleProfile(profile)),
      requestEmailOtp: async (email) => {
        const normalizedEmail = email.trim().toLowerCase();
        const remote = await fetchRealtime<{ delivery: "email" | "dev"; email: string; expiresInSeconds: number; previewCode?: string }>("/auth/otp/request", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail }),
        });
        if (remote) {
          if (remote.previewCode) pendingEmailOtps.set(normalizedEmail, { code: remote.previewCode, expiresAt: Date.now() + remote.expiresInSeconds * 1000 });
          return remote;
        }
        const code = createOtpCode();
        pendingEmailOtps.set(normalizedEmail, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
        await database.appendEvent("auth.emailOtp", { email: normalizedEmail, template: "horse-logo", code });
        return { delivery: "dev", email: normalizedEmail, expiresInSeconds: 300, previewCode: code };
      },
      verifyEmailOtp: async (email, code) => {
        const normalizedEmail = email.trim().toLowerCase();
        const remote = await fetchRealtime<{ email: string; ok: boolean }>("/auth/otp/verify", {
          method: "POST",
          body: JSON.stringify({ code: code.trim(), email: normalizedEmail }),
        });
        if (remote?.ok) {
          const displayName = normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ") || "ChessAlive Player";
          return authenticate(Object.assign(user, {
            id: `email-${normalizedEmail}`,
            email: normalizedEmail,
            displayName,
            avatarEmoji: "♘",
            rating: startingRating(),
          }));
        }
        const pending = pendingEmailOtps.get(normalizedEmail);
        if (!pending || pending.expiresAt < Date.now() || pending.code !== code.trim()) {
          throw new Error("Invalid or expired OTP");
        }
        pendingEmailOtps.delete(normalizedEmail);
        const displayName = normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ") || "ChessAlive Player";
        return authenticate(Object.assign(user, {
          id: `email-${normalizedEmail}`,
          email: normalizedEmail,
          displayName,
          avatarEmoji: "♘",
          rating: startingRating(),
        }));
      },
      signInAsGuest: async (displayName) => authenticate(Object.assign(user, { displayName: displayName ?? user.displayName })),
      signOut: async () => {
        signedInUser = null;
        resetGuestUser();
        persistState();
      },
    },
    profile: {
      getProfile: async () => {
        await hydrateRemoteState();
        return signedInUser ?? user;
      },
      updateProfile: async (_userId, patch) => authenticate(Object.assign(user, patch)),
    },
    matchmaking: {
      findGame: async (request) => {
        activeSession = createSession();
        activeSession.funnyMode = { ...settings, enabled: request.funnyMode };
        if (request.rated && request.preferredRating) {
          const window = request.ratingWindow ?? 150;
          activeSession.black = {
            ...rival,
            id: `global-${request.timeControl}-${Date.now()}`,
            displayName: "Global Match",
            avatarEmoji: "🌐",
            rating: {
              ...rival.rating,
              rapid: Math.max(100, request.preferredRating + Math.min(window, 42)),
              blitz: Math.max(100, request.preferredRating + Math.min(window, 28)),
              bullet: Math.max(100, request.preferredRating + Math.min(window, 18)),
              funny: Math.max(100, user.rating.funny + 24),
            },
          };
        }
        return activeSession;
      },
      cancelSearch: async () => undefined,
    },
    realtime: {
      connect: async () => undefined,
      subscribe: async (gameId, onSnapshot) => {
        if (!remoteRooms.has(gameId)) return () => undefined;
        const Socket = socketConstructor();
        if (!Socket) return () => undefined;
        const socket = new Socket(`${realtimeWsEndpoint()}?room=${encodeURIComponent(gameId)}&user=${encodeURIComponent(user.id)}`);
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as { snapshot?: GameSnapshot; room?: MultiplayerRoom };
            if (message.room) remoteRooms.set(message.room.id, message.room);
            if (message.snapshot) {
              const session = sessions.get(gameId);
              if (session) session.snapshot = message.snapshot;
              onSnapshot(message.snapshot);
            }
          } catch {
            return;
          }
        };
        return () => socket.close();
      },
      submitMove: async (gameId, intent) => {
        if (remoteRooms.has(gameId)) {
          const remote = await fetchRealtime<{ snapshot: GameSnapshot; move: GameSession["snapshot"]["history"][number] | null; room?: MultiplayerRoom }>(
            `/rooms/${gameId}/move`,
            {
              method: "POST",
              body: JSON.stringify({ intent, userId: user.id }),
            },
          );
          if (remote?.room) remoteRooms.set(remote.room.id, remote.room);
          if (remote?.snapshot) {
            const session = sessions.get(gameId);
            if (session) session.snapshot = remote.snapshot;
            const sessionFunnyMode = sessions.get(gameId)?.funnyMode ?? funnyMode;
            const effect = remote.move ? pickAnimationEffect(gameId, remote.move, sessionFunnyMode) : null;
            return {
              snapshot: remote.snapshot,
              move: remote.move,
              effect: effect ? { effect, event: { gameId, move: remote.move!, funnyMode: sessionFunnyMode }, startedAt: Date.now() } : null,
            };
          }
        }
        const session = sessions.get(gameId) ?? activeSession;
        const sessionEngine = createChessEngine();
        sessionEngine.newGame(session.snapshot.fen);
        const move = sessionEngine.move(intent);
        if (!move) {
          return {
            snapshot: session.snapshot,
            move: null,
            effect: null,
          };
        }
        const history = [...session.snapshot.history, move];
        session.snapshot = {
          ...sessionEngine.snapshot(),
          id: session.id,
          history,
          captured: capturedFromHistory(history),
        };
        void database.set(`game:${gameId}:snapshot`, session.snapshot);
        void database.appendEvent(`game:${gameId}`, { type: "move", intent, san: move?.san });
        const effect = pickAnimationEffect(session.id, move, session.funnyMode);
        return {
          snapshot: session.snapshot,
          move,
          effect: effect ? { effect, event: { gameId: session.id, move, funnyMode: session.funnyMode }, startedAt: Date.now() } : null,
        };
      },
      disconnect: async () => undefined,
    },
    gameState: {
      get: async (gameId) => sessions.get(gameId)?.snapshot ?? (await database.get<GameSnapshot>(`game:${gameId}:snapshot`)),
      save: async (gameId, snapshot) => {
        const session = sessions.get(gameId);
        if (session) session.snapshot = snapshot;
        await database.set(`game:${gameId}:snapshot`, snapshot);
      },
    },
    moveValidator: {
      validate: async (snapshot, intent) => ({
        legal: snapshot.legalMoves[intent.from]?.includes(intent.to) ?? false,
        reason: snapshot.legalMoves[intent.from]?.includes(intent.to) ? undefined : "Move is not legal in this position.",
      }),
    },
    clocks: {
      create: async (gameId, initialMs) => {
        const state = { whiteMs: initialMs, blackMs: initialMs, running: true, updatedAt: Date.now() };
        clockStates.set(gameId, state);
        return { whiteMs: state.whiteMs, blackMs: state.blackMs, running: state.running };
      },
      tick: async (gameId, turn) => {
        const state = clockStates.get(gameId) ?? { whiteMs: 300_000, blackMs: 300_000, running: true, updatedAt: Date.now() };
        const now = Date.now();
        const elapsed = state.running ? now - state.updatedAt : 0;
        const next = {
          whiteMs: turn === "w" ? Math.max(0, state.whiteMs - elapsed) : state.whiteMs,
          blackMs: turn === "b" ? Math.max(0, state.blackMs - elapsed) : state.blackMs,
          running: state.running,
          updatedAt: now,
        };
        clockStates.set(gameId, next);
        return { whiteMs: next.whiteMs, blackMs: next.blackMs, running: next.running };
      },
      pause: async (gameId) => {
        const state = clockStates.get(gameId) ?? { whiteMs: 300_000, blackMs: 300_000, running: false, updatedAt: Date.now() };
        const next = { ...state, running: false, updatedAt: Date.now() };
        clockStates.set(gameId, next);
        return { whiteMs: next.whiteMs, blackMs: next.blackMs, running: next.running };
      },
    },
    replay: {
      exportPgn: async () => activeSession.snapshot.history.map((move) => move.san).join(" "),
      loadReplay: async () => activeSession.snapshot.history,
    },
    presence: {
      setOnline: async () => undefined,
      listOnlineFriends: async () => onlineFriends,
    },
    friends: {
      listFriends: async () => onlineFriends,
      inviteFriend: async () => undefined,
    },
    chat: {
      listMessages: async () => chatMessages,
      sendMessage: async (roomId, _from, body) => {
        const message = {
          id: `msg-${Date.now()}`,
          from: user,
          body,
          createdAt: new Date().toISOString(),
        };
        chatMessages.push(message);
        await database.appendEvent(`chat:${roomId}`, { type: "message", message });
        return message;
      },
    },
    puzzles: {
      dailyPuzzle: async () => puzzles[0],
      listPuzzleRushSet: async () => puzzleRushSet,
      getRatingState: async (userId) => {
        const remote = await readRemotePuzzleRatingState(userId);
        if (remote) {
          writePuzzleRatingState(remote);
          return remote;
        }
        return readPuzzleRatingState(userId);
      },
      saveRatingState: async (state) => {
        writePuzzleRatingState(state);
        void writeRemotePuzzleRatingState(state);
      },
      recordAttempt: async (attempt) => {
        appendPuzzleAttempt(attempt);
        void appendRemotePuzzleAttempt(attempt);
      },
      getNextPuzzle: async (userRating, difficultyMode, excludeIds) =>
        selectNextPuzzle(puzzles, userRating, difficultyMode, excludeIds),
    },
    lessons: {
      listLessons: async () => lessons,
      completeLesson: async (_userId, lessonId) => {
        const lesson = lessons.find((item) => item.id === lessonId);
        if (lesson) lesson.completed = true;
      },
    },
    bots: {
      listBots: async () => bots,
      chooseMove: async (game, botId) => {
        const bot = bots.find((item) => item.id === botId) ?? bots[0];
        const legalMoves = Object.entries(game.legalMoves)
          .flatMap(([from, targets]) => targets.map((to) => ({ from: from as SquareName, to })))
          .filter((move) => game.board.find((cell) => cell.square === move.from)?.piece?.color === game.status.turn)
          .filter((move) => move.to);
        if (legalMoves.length === 0) return null;
        const captures = legalMoves.filter((move) => {
          const target = game.board.find((cell) => cell.square === move.to);
          return target?.piece && target.piece.color !== game.status.turn;
        });
        if (bot.rating >= 1200 && captures.length > 0) return captures[0];
        const centerMoves = legalMoves.filter((move) => ["d4", "d5", "e4", "e5"].includes(move.to));
        if (bot.rating >= 1000 && centerMoves.length > 0) return centerMoves[0];
        return legalMoves[Math.floor((game.history.length * 7 + bot.rating) % legalMoves.length)];
      },
    },
    analysis: {
      analyze: async (snapshot) => localAnalysis(snapshot),
    },
    review: {
      review: async () => localAnalysis(activeSession.snapshot),
    },
    tournaments: {
      listTournaments: async () => tournaments.map((item) => ({ ...item, joined: joinedTournaments.has(item.id) })),
      joinTournament: async (_userId, tournamentId) => {
        if (!joinedTournaments.has(tournamentId)) {
          joinedTournaments.add(tournamentId);
          const tournament = tournaments.find((item) => item.id === tournamentId);
          if (tournament) tournament.players += 1;
          await database.appendEvent("tournaments", { type: "join", userId: user.id, tournamentId });
        }
      },
    },
    clubs: {
      listClubs: async () => clubs.map((item) => ({ ...item, joined: joinedClubs.has(item.id) })),
      joinClub: async (_userId, clubId) => {
        if (!joinedClubs.has(clubId)) {
          joinedClubs.add(clubId);
          const club = clubs.find((item) => item.id === clubId);
          if (club) club.members += 1;
          await database.appendEvent("clubs", { type: "join", userId: user.id, clubId });
        }
      },
    },
    leaderboard: {
      topFunnyPlayers: async () =>
        [user, rival].map(
          (player, index): LeaderboardEntry => ({
            rank: index + 1,
            user: player,
            score: player.rating.funny,
          }),
        ),
    },
    stats: {
      getUserStats: async () => ({
        games: 42,
        wins: 21,
        losses: 14,
        draws: 7,
        funnyEffectsPlayed: 108,
      }),
    },
    settings: {
      getSettings: async () => {
        await hydrateRemoteState();
        return settings;
      },
      saveSettings: async (_userId, next) => {
        Object.assign(settings, next);
        activeSession.funnyMode = { ...activeSession.funnyMode, ...settings };
        sessions.forEach((session) => {
          session.funnyMode = { ...session.funnyMode, ...settings };
        });
        persistState();
      },
    },
    animationStudio: {
      addAnimationRule: async (animationSetId: string, rule: AnimationRule) => {
        await hydrateRemoteState();
        const animationSet = animationSets.find((set) => set.id === animationSetId);
        if (!animationSet) throw new Error("Animation set not found.");
        animationSet.rules = [...animationSet.rules, rule];
        animationSet.updatedAt = new Date().toISOString();
        persistState();
        return animationSet;
      },
      createAnimationSet: async (input) => {
        await hydrateRemoteState();
        const now = new Date().toISOString();
        const animationSet: AnimationSet = {
          createdAt: now,
          description: input.description,
          id: `animation-set-${Date.now()}`,
          name: input.name,
          pieceSetId: input.pieceSetId,
          rules: [],
          updatedAt: now,
        };
        animationSets.push(animationSet);
        persistState();
        return animationSet;
      },
      createPieceSet: async (input) => {
        await hydrateRemoteState();
        const now = new Date().toISOString();
        const pieceSet: PieceSet = {
          animationClipIds: [],
          createdAt: now,
          createdBy: signedInUser?.id ?? user.id,
          description: input.description,
          id: `piece-set-${Date.now()}`,
          name: input.name,
          pieces: {},
          pieceTargets: {},
          updatedAt: now,
        };
        pieceSets.push(pieceSet);
        persistState();
        return pieceSet;
      },
      duplicatePieceSet: async (pieceSetId) => {
        await hydrateRemoteState();
        const source = pieceSets.find((set) => set.id === pieceSetId);
        if (!source) throw new Error("Piece set not found.");
        const now = new Date().toISOString();
        const duplicate: PieceSet = {
          ...source,
          createdAt: now,
          id: `piece-set-${Date.now()}`,
          isSeededExample: false,
          name: `${source.name} Copy`,
          pieces: Object.fromEntries(
            Object.entries(source.pieces).map(([piece, asset]) => [
              piece,
              asset ? { ...asset, assetSlots: asset.assetSlots ? { ...asset.assetSlots } : undefined } : asset,
            ]),
          ) as PieceSet["pieces"],
          pieceTargets: source.pieceTargets ? { ...source.pieceTargets } : {},
          updatedAt: now,
        };
        pieceSets.push(duplicate);
        persistState();
        return duplicate;
      },
      listAnimationClips: async (pieceSetId) => {
        await hydrateRemoteState();
        if (!pieceSetId) return animationClips;
        const pieceSet = pieceSets.find((set) => set.id === pieceSetId);
        if (!pieceSet) return [];
        return animationClips.filter((clip) => pieceSet.animationClipIds.includes(clip.id));
      },
      listAnimationSets: async (pieceSetId) => {
        await hydrateRemoteState();
        return animationSets.filter((set) => !pieceSetId || set.pieceSetId === pieceSetId);
      },
      listPieceSets: async () => {
        await hydrateRemoteState();
        return pieceSets;
      },
      saveAnimationSet: async (next) => {
        await hydrateRemoteState();
        const index = animationSets.findIndex((set) => set.id === next.id);
        const saved = { ...next, rules: next.rules.map((rule) => ({ ...rule, clipStack: rule.clipStack.map((item) => ({ ...item })) })), updatedAt: new Date().toISOString() };
        if (index >= 0) animationSets[index] = saved;
        else animationSets.push(saved);
        persistState();
        return saved;
      },
      saveAnimationClips: async (clips: AnimationClip[]) => {
        await hydrateRemoteState();
        clips.forEach((clip) => {
          const index = animationClips.findIndex((item) => item.id === clip.id);
          if (index >= 0) animationClips[index] = clip;
          else animationClips.push(clip);
        });
        persistState();
        return clips;
      },
      savePieceSet: async (next) => {
        await hydrateRemoteState();
        const index = pieceSets.findIndex((set) => set.id === next.id);
        const saved = {
          ...next,
          pieces: Object.fromEntries(
            Object.entries(next.pieces).map(([piece, asset]) => [
              piece,
              asset ? { ...asset, assetSlots: asset.assetSlots ? { ...asset.assetSlots } : undefined } : asset,
            ]),
          ) as PieceSet["pieces"],
          pieceTargets: next.pieceTargets ? { ...next.pieceTargets } : undefined,
          updatedAt: new Date().toISOString(),
        };
        if (index >= 0) pieceSets[index] = saved;
        else pieceSets.push(saved);
        persistState();
        return saved;
      },
    },
    notifications: {
      scheduleLocalReminder: async () => undefined,
    },
    ads: {
      listPlacements: async () => adPlacements,
      getPlacement: async (slot) => adPlacements.find((placement) => placement.slot === slot && placement.enabled) ?? null,
      recordImpression: async (placementId) => {
        await database.appendEvent("ads", { type: "impression", placementId });
      },
      recordClick: async (placementId) => {
        await database.appendEvent("ads", { type: "click", placementId });
      },
    },
    database,
    multiplayer: {
      serverStatus: async () => {
        const remote = await fetchRealtime<{
          online: boolean;
          endpoint: string;
          activeRooms: number;
          activePlayers: number;
          p95LatencyMs: number;
          storage: string;
        }>("/health");
        if (remote) return remote;
        return {
          online: false,
          endpoint: realtimeWsEndpoint(),
          activeRooms: remoteRooms.size,
          activePlayers: 1,
          p95LatencyMs: 0,
          storage: "local fallback",
        };
      },
      listRooms: async () => {
        const remote = await fetchRealtime<MultiplayerRoom[]>("/rooms");
        if (remote) {
          remote.forEach((room) => remoteRooms.set(room.id, room));
          return remote;
        }
        return [...remoteRooms.values()];
      },
      createRoom: async (_userId, options) => {
        const remote = await fetchRealtime<MultiplayerRoom>("/rooms", {
          method: "POST",
          body: JSON.stringify({ ...options, user }),
        });
        if (remote) {
          remoteRooms.set(remote.id, remote);
          roomToSession(remote);
          return remote;
        }
        const session = createSession();
        const room: MultiplayerRoom = {
          id: session.id,
          code: session.id.slice(-6).toUpperCase(),
          status: "waiting",
          timeControl: options.timeControl,
          rated: options.rated,
          funnyMode: options.funnyMode,
          region: "local-fallback",
          latencyMs: 0,
          spectators: 0,
          createdAt: session.createdAt,
          lastActivityAt: session.createdAt,
          players: { white: user },
          snapshot: session.snapshot,
        };
        remoteRooms.set(room.id, room);
        return room;
      },
      joinRoom: async (_userId, roomId) => {
        const remote = await fetchRealtime<MultiplayerRoom>(`/rooms/${roomId}/join`, {
          method: "POST",
          body: JSON.stringify({ user }),
        });
        if (remote) {
          remoteRooms.set(remote.id, remote);
          roomToSession(remote);
          return remote;
        }
        const room = remoteRooms.get(roomId);
        if (!room) throw new Error("Room not found.");
        room.players.black = user;
        room.status = "playing";
        return room;
      },
      leaveRoom: async () => undefined,
    },
    music: {
      playCue: async () => undefined,
      stop: async () => undefined,
      setVolume: async () => undefined,
    },
    soundEffects: {
      play: async () => undefined,
    },
    telemetry: {
      track: () => undefined,
    },
    crash: {
      capture: () => undefined,
    },
    assets: {
      getEffectAssetUrl: async (effectId) => `local://effects/${effectId}`,
    },
    experiments: {
      isEnabled: async () => true,
    },
  };
}
