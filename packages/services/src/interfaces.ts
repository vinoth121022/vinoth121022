import { ChessMove, GameSnapshot, MoveIntent } from "@chessalive/chess-core";
import {
  ActiveFunnyEffect,
  AnimationClip,
  AnimationRule,
  AnimationSet,
  PieceSet,
  FunnyModeSettings,
} from "@chessalive/funny-mode";

export type UserId = string;
export type GameId = string;

export interface UserProfile {
  id: UserId;
  displayName: string;
  avatarEmoji: string;
  email?: string;
  rating: {
    blitz: number;
    rapid: number;
    bullet: number;
    funny: number;
  };
}

export type AuthProvider = "google" | "facebook" | "apple";

export interface GoogleAuthProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthService {
  currentUser(): Promise<UserProfile | null>;
  signInWithProvider(provider: AuthProvider): Promise<UserProfile>;
  signInWithGoogleProfile(profile: GoogleAuthProfile): Promise<UserProfile>;
  requestEmailOtp(email: string): Promise<{ delivery: "email" | "dev"; email: string; expiresInSeconds: number; previewCode?: string }>;
  verifyEmailOtp(email: string, code: string): Promise<UserProfile>;
  signInAsGuest(displayName?: string): Promise<UserProfile>;
  signOut(): Promise<void>;
}

export interface ProfileService {
  getProfile(userId: UserId): Promise<UserProfile>;
  updateProfile(userId: UserId, patch: Partial<UserProfile>): Promise<UserProfile>;
}

export interface MatchRequest {
  userId: UserId;
  timeControl: "bullet" | "blitz" | "rapid" | "daily" | "custom";
  rated: boolean;
  funnyMode: boolean;
  preferredRating?: number;
  ratingWindow?: number;
}

export interface GameSession {
  id: GameId;
  white: UserProfile;
  black: UserProfile;
  snapshot: GameSnapshot;
  funnyMode: FunnyModeSettings;
  createdAt: string;
}

export interface MatchmakingService {
  findGame(request: MatchRequest): Promise<GameSession>;
  cancelSearch(userId: UserId): Promise<void>;
}

export interface RealtimeGameService {
  connect(gameId: GameId): Promise<void>;
  subscribe(gameId: GameId, onSnapshot: (snapshot: GameSnapshot) => void): Promise<() => void>;
  submitMove(gameId: GameId, intent: MoveIntent): Promise<{ snapshot: GameSnapshot; move: ChessMove | null; effect: ActiveFunnyEffect | null }>;
  disconnect(gameId: GameId): Promise<void>;
}

export interface GameStateStore {
  get(gameId: GameId): Promise<GameSnapshot | null>;
  save(gameId: GameId, snapshot: GameSnapshot): Promise<void>;
}

export interface MoveValidator {
  validate(snapshot: GameSnapshot, intent: MoveIntent): Promise<{ legal: boolean; reason?: string }>;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  running: boolean;
}

export interface ClockService {
  create(gameId: GameId, initialMs: number, incrementMs: number): Promise<ClockState>;
  tick(gameId: GameId, turn: "w" | "b"): Promise<ClockState>;
  pause(gameId: GameId): Promise<ClockState>;
}

export interface GameReplayService {
  exportPgn(gameId: GameId): Promise<string>;
  loadReplay(gameId: GameId): Promise<ChessMove[]>;
}

export interface PresenceService {
  setOnline(userId: UserId): Promise<void>;
  listOnlineFriends(userId: UserId): Promise<UserProfile[]>;
}

export interface FriendService {
  listFriends(userId: UserId): Promise<UserProfile[]>;
  inviteFriend(userId: UserId, friendId: UserId): Promise<void>;
}

export interface ChatMessage {
  id: string;
  from: UserProfile;
  body: string;
  createdAt: string;
}

export interface ChatService {
  listMessages(roomId: string): Promise<ChatMessage[]>;
  sendMessage(roomId: string, from: UserId, body: string): Promise<ChatMessage>;
}

export type PuzzleDifficulty = "beginner" | "easy" | "intermediate" | "hard" | "expert";
export type PuzzleCategory = "checkmate" | "winning-material" | "promotion" | "draw";

export interface Puzzle {
  id: string;
  title: string;
  fen: string;
  goal: string;
  hint?: string;
  rating: number;
  /** The type of objective this puzzle teaches. */
  category?: PuzzleCategory;
  /** SAN moves for the full solution sequence (player moves + opponent responses interleaved). */
  solution: string[];
  /** LAN moves mirroring the solution array (e.g. "e2e4"). Used for move validation. */
  solutionLan?: string[];
  motif?: string;
  attempts?: number;
  successRate?: number;
  difficulty?: PuzzleDifficulty;
  xp?: number;
  sideToMove?: "w" | "b";
  expectedTime?: number;
  themes?: string[];
}

export type PuzzleDifficultyMode = "standard" | "hard" | "extra-hard";
export type PuzzleBonus = "speed" | "streak" | "flawless" | "brilliant";

export interface PuzzleRatingState {
  userId: string;
  /** Glicko-2 style puzzle Elo estimate. Starts at 800 for new users. */
  puzzleRating: number;
  /** Rating uncertainty. Starts at 350, decays toward 80 after ~20 puzzles. */
  ratingDeviation: number;
  /** Total puzzles ever solved (across all sessions). */
  puzzlesSolved: number;
  /** Current consecutive solve streak. */
  currentStreak: number;
  /** All-time best streak. */
  bestStreak: number;
  /** Difficulty offset mode selected by the user. */
  difficultyMode: PuzzleDifficultyMode;
  /** True once ratingDeviation has fallen to ≤ 200 (first ~20 puzzles). */
  calibrationComplete: boolean;
  /** Total XP accumulated from bonuses. */
  totalBonusXp: number;
}

export interface PuzzleAttempt {
  puzzleId: string;
  userId: string;
  startedAt: number;
  solvedAt: number | null;
  timeTakenSeconds: number;
  hintsUsed: number;
  wrongMoves: number;
  outcome: "solved" | "gave-up" | "skipped";
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  bonuses: PuzzleBonus[];
  bonusXp: number;
  performanceScore: number;
}

export interface PuzzleService {
  dailyPuzzle(): Promise<Puzzle>;
  listPuzzleRushSet(): Promise<Puzzle[]>;
  getRatingState(userId: string): Promise<PuzzleRatingState>;
  saveRatingState(state: PuzzleRatingState): Promise<void>;
  recordAttempt(attempt: PuzzleAttempt): Promise<void>;
  getNextPuzzle(userRating: number, difficultyMode: PuzzleDifficultyMode, excludeIds?: string[]): Promise<Puzzle | null>;
}

export interface LessonStep {
  id: string;
  title: string;
  body: string;
  boardFen?: string;
  move?: string;
  coachNote: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  completed: boolean;
  level?: "beginner" | "intermediate" | "advanced";
  track?: "openings" | "tactics" | "endgames" | "funny-mode";
  xp?: number;
  steps?: LessonStep[];
}

export interface LessonService {
  listLessons(userId: UserId): Promise<Lesson[]>;
  completeLesson(userId: UserId, lessonId: string): Promise<void>;
}

export interface BotProfile {
  id: string;
  name: string;
  rating: number;
  personality: string;
  avatarEmoji: string;
}

export interface BotService {
  listBots(): Promise<BotProfile[]>;
  chooseMove(game: GameSnapshot, botId: string): Promise<MoveIntent | null>;
}

export interface AnalysisSummary {
  accuracyWhite: number;
  accuracyBlack: number;
  bestMove?: string;
  mistakes: string[];
  brilliant: string[];
}

export interface AnalysisService {
  analyze(snapshot: GameSnapshot): Promise<AnalysisSummary>;
}

export interface GameReviewService {
  review(gameId: GameId): Promise<AnalysisSummary>;
}

export interface Tournament {
  id: string;
  name: string;
  format: "arena" | "swiss" | "knockout";
  players: number;
  startsAt: string;
  funnyMode: boolean;
  joined?: boolean;
}

export interface TournamentService {
  listTournaments(): Promise<Tournament[]>;
  joinTournament(userId: UserId, tournamentId: string): Promise<void>;
}

export interface Club {
  id: string;
  name: string;
  members: number;
  description: string;
  joined?: boolean;
}

export interface ClubService {
  listClubs(): Promise<Club[]>;
  joinClub(userId: UserId, clubId: string): Promise<void>;
}

export interface LeaderboardEntry {
  rank: number;
  user: UserProfile;
  score: number;
}

export interface LeaderboardService {
  topFunnyPlayers(): Promise<LeaderboardEntry[]>;
}

export interface StatsService {
  getUserStats(userId: UserId): Promise<{
    games: number;
    wins: number;
    losses: number;
    draws: number;
    funnyEffectsPlayed: number;
  }>;
}

export interface BoardColorSettings {
  danger: string;
  dark: string;
  highlight: string;
  legal: string;
  light: string;
  name?: string;
}

export interface CustomFunRule {
  description: string;
  enabled: boolean;
  id: string;
  name: string;
}

export interface PlayerSettings extends FunnyModeSettings {
  animationSetId?: string;
  animationsEnabled: boolean;
  boardTheme: string;
  customBoardTheme?: BoardColorSettings;
  customRules: CustomFunRule[];
  pieceSetId?: string;
  soundVolume: number;
}

export interface SettingsService {
  getSettings(userId: UserId): Promise<PlayerSettings>;
  saveSettings(userId: UserId, settings: PlayerSettings): Promise<void>;
}

export interface AnimationStudioService {
  addAnimationRule(animationSetId: string, rule: AnimationRule): Promise<AnimationSet>;
  createAnimationSet(input: Pick<AnimationSet, "description" | "name" | "pieceSetId">): Promise<AnimationSet>;
  createPieceSet(input: Pick<PieceSet, "description" | "name">): Promise<PieceSet>;
  duplicatePieceSet(pieceSetId: string): Promise<PieceSet>;
  listAnimationClips(pieceSetId?: string): Promise<AnimationClip[]>;
  listAnimationSets(pieceSetId?: string): Promise<AnimationSet[]>;
  listPieceSets(): Promise<PieceSet[]>;
  saveAnimationSet(animationSet: AnimationSet): Promise<AnimationSet>;
  saveAnimationClips(clips: AnimationClip[]): Promise<AnimationClip[]>;
  savePieceSet(pieceSet: PieceSet): Promise<PieceSet>;
}

export interface NotificationService {
  scheduleLocalReminder(userId: UserId, title: string, body: string): Promise<void>;
}

export type AdSlotId = "home-hero" | "home-rail" | "play-rail" | "puzzle-feed" | "lesson-feed" | "review-rail";

export interface AdPlacement {
  id: string;
  slot: AdSlotId;
  network: "google-adsense" | "google-admob" | "house";
  format: "banner" | "rectangle" | "native";
  advertiser: string;
  headline: string;
  body: string;
  cta: string;
  enabled: boolean;
  testMode: boolean;
  refreshSeconds: number;
  platformHints: {
    webSlotId?: string;
    iosUnitId?: string;
    androidUnitId?: string;
  };
}

export interface AdService {
  listPlacements(): Promise<AdPlacement[]>;
  getPlacement(slot: AdSlotId): Promise<AdPlacement | null>;
  recordImpression(placementId: string): Promise<void>;
  recordClick(placementId: string): Promise<void>;
}

export interface DatabaseHealth {
  driver: "browser-local" | "memory" | "jsonl" | "postgres-ready" | "gcp-firestore" | "gcp-firestore-gcs";
  hotStore: string;
  durableStore: string;
  estimatedMonthlyCostUsd: number;
  latencyBudgetMs: number;
  records: number;
}

export interface DatabaseService {
  health(): Promise<DatabaseHealth>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  appendEvent(stream: string, event: Record<string, unknown>): Promise<void>;
  listEvents(stream: string, limit?: number): Promise<Record<string, unknown>[]>;
}

export interface MultiplayerRoom {
  id: string;
  code: string;
  status: "waiting" | "playing" | "completed";
  timeControl: string;
  rated: boolean;
  funnyMode: boolean;
  region: string;
  latencyMs: number;
  spectators: number;
  createdAt: string;
  lastActivityAt: string;
  players: {
    white?: UserProfile;
    black?: UserProfile;
  };
  snapshot?: GameSnapshot;
}

export interface MultiplayerService {
  serverStatus(): Promise<{
    online: boolean;
    endpoint: string;
    activeRooms: number;
    activePlayers: number;
    p95LatencyMs: number;
    storage: string;
  }>;
  listRooms(): Promise<MultiplayerRoom[]>;
  createRoom(userId: UserId, options: Pick<MultiplayerRoom, "timeControl" | "rated" | "funnyMode">): Promise<MultiplayerRoom>;
  joinRoom(userId: UserId, roomId: string): Promise<MultiplayerRoom>;
  leaveRoom(userId: UserId, roomId: string): Promise<void>;
}

export interface MusicService {
  playCue(cueId: string): Promise<void>;
  stop(): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

export interface SoundEffectService {
  play(effectId: string): Promise<void>;
}

export interface TelemetryService {
  track(event: string, properties?: Record<string, unknown>): void;
}

export interface CrashReportingService {
  capture(error: unknown, context?: Record<string, unknown>): void;
}

export interface AssetCDNService {
  getEffectAssetUrl(effectId: string): Promise<string>;
}

export interface ExperimentService {
  isEnabled(flag: string, userId: UserId): Promise<boolean>;
}

export interface ChessAliveServices {
  auth: AuthService;
  profile: ProfileService;
  matchmaking: MatchmakingService;
  realtime: RealtimeGameService;
  gameState: GameStateStore;
  moveValidator: MoveValidator;
  clocks: ClockService;
  replay: GameReplayService;
  presence: PresenceService;
  friends: FriendService;
  chat: ChatService;
  puzzles: PuzzleService;
  lessons: LessonService;
  bots: BotService;
  analysis: AnalysisService;
  review: GameReviewService;
  tournaments: TournamentService;
  clubs: ClubService;
  leaderboard: LeaderboardService;
  stats: StatsService;
  settings: SettingsService;
  animationStudio: AnimationStudioService;
  notifications: NotificationService;
  ads: AdService;
  database: DatabaseService;
  multiplayer: MultiplayerService;
  music: MusicService;
  soundEffects: SoundEffectService;
  telemetry: TelemetryService;
  crash: CrashReportingService;
  assets: AssetCDNService;
  experiments: ExperimentService;
}
