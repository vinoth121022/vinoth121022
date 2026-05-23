import { BoardTheme, boardThemes } from "@chessalive/assets";
import { BoardCell, ChessMove, GameSnapshot, MoveIntent, PieceKind, SquareName, createChessEngine } from "@chessalive/chess-core";
import {
  ActiveFunnyEffect,
  AnimationAction,
  AnimationChoreographyStep,
  AnimationClip,
  AnimationRule,
  AnimationSet,
  AnimationSpeed,
  FunnyModeSettings,
  PieceAsset,
  PieceAssetSlotKey,
  PieceSet,
  PieceTargetSpec,
  animationActionLabel,
  effectFromAnimationRule,
  genericActionOptions,
  pieceActionOptions,
  seededAnimationSetId,
  seededPieceSetId,
  speedMultiplier,
} from "@chessalive/funny-mode";
import { AlphaPieceKey, alphaPiecePaths } from "./alphaPieces";
import { IconTone, Screen, primaryScreens, screenFromPath, screenMeta, screenPaths } from "./app-shell/routes";
import naturalEarthLand from "./assets/ne_110m_land.json";
import {
  BrowserP2PChessPeer,
  P2PChessMessage,
  P2PConnectionState,
  P2PMatchMeta,
  P2PPlayerProfile,
  p2pInviteUrl,
  readP2PInviteIdFromLocation,
  readP2PInviteTokenFromLocation,
} from "./p2p";
import { BrowserGameReview, ReviewMoveClassification, ReviewProgress, analyzeGameInBrowser } from "./review/stockfishReview";
import {
  AnalysisSummary,
  AdPlacement,
  AuthProvider,
  BotProfile,
  ChatMessage,
  ChessAliveServices,
  Club,
  CustomFunRule,
  DatabaseHealth,
  GameSession,
  GoogleAuthProfile,
  LeaderboardEntry,
  Lesson,
  MultiplayerRoom,
  PlayerSettings,
  Puzzle,
  PuzzleAttempt,
  PuzzleBonus,
  PuzzleDifficultyMode,
  PuzzleRatingState,
  Tournament,
  UserProfile,
  createLocalServices,
} from "@chessalive/services";
import { colors, radii, spacing, typography } from "@chessalive/ui";
import {
  Award,
  BarChart3,
  Bot,
  BookOpen,
  Brain,
  CheckCircle2,
  Crown,
  Database,
  Flame,
  Flag,
  Gauge,
  Gem,
  Globe2,
  GraduationCap,
  Home,
  MessageCircle,
  Maximize2,
  Play,
  Rocket,
  Send,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCcw,
  Search,
  Settings,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react-native";
import { ReactNode, Ref, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Image,
  View,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Asset } from "expo-asset";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

declare const require: (assetPath: string) => number;

type PawnAnimationVariant = "move" | "capture" | "promotion";
type PieceAnimationVariant = PawnAnimationVariant;

const pawnAnimationSpriteAssets: Record<"w" | "b", Record<PawnAnimationVariant, number>> = {
  w: {
    move: require("./assets/pawn_animation_w_move_sprite.png"),
    capture: require("./assets/pawn_animation_w_capture_sprite.png"),
    promotion: require("./assets/pawn_animation_w_promotion_sprite.png"),
  },
  b: {
    move: require("./assets/pawn_animation_b_move_sprite.png"),
    capture: require("./assets/pawn_animation_b_capture_sprite.png"),
    promotion: require("./assets/pawn_animation_b_promotion_sprite.png"),
  },
};
const pieceAnimationSpriteAssets: Record<"w" | "b", Partial<Record<PieceKind, Record<PieceAnimationVariant, number>>>> = {
  w: {
    b: {
      move: require("./assets/piece_animation_w_b_move_sprite.png"),
      capture: require("./assets/piece_animation_w_b_capture_sprite.png"),
      promotion: require("./assets/piece_animation_w_b_promotion_sprite.png"),
    },
    n: {
      move: require("./assets/piece_animation_w_n_move_sprite.png"),
      capture: require("./assets/piece_animation_w_n_capture_sprite.png"),
      promotion: require("./assets/piece_animation_w_n_promotion_sprite.png"),
    },
    q: {
      move: require("./assets/piece_animation_w_q_move_sprite.png"),
      capture: require("./assets/piece_animation_w_q_capture_sprite.png"),
      promotion: require("./assets/piece_animation_w_q_promotion_sprite.png"),
    },
    r: {
      move: require("./assets/piece_animation_w_r_move_sprite.png"),
      capture: require("./assets/piece_animation_w_r_capture_sprite.png"),
      promotion: require("./assets/piece_animation_w_r_promotion_sprite.png"),
    },
  },
  b: {
    b: {
      move: require("./assets/piece_animation_b_b_move_sprite.png"),
      capture: require("./assets/piece_animation_b_b_capture_sprite.png"),
      promotion: require("./assets/piece_animation_b_b_promotion_sprite.png"),
    },
    n: {
      move: require("./assets/piece_animation_b_n_move_sprite.png"),
      capture: require("./assets/piece_animation_b_n_capture_sprite.png"),
      promotion: require("./assets/piece_animation_b_n_promotion_sprite.png"),
    },
    q: {
      move: require("./assets/piece_animation_b_q_move_sprite.png"),
      capture: require("./assets/piece_animation_b_q_capture_sprite.png"),
      promotion: require("./assets/piece_animation_b_q_promotion_sprite.png"),
    },
    r: {
      move: require("./assets/piece_animation_b_r_move_sprite.png"),
      capture: require("./assets/piece_animation_b_r_capture_sprite.png"),
      promotion: require("./assets/piece_animation_b_r_promotion_sprite.png"),
    },
  },
};
const pawnAnimationFrameCount = 192;
const pawnAnimationColumns = 16;
const pawnAnimationRows = Math.ceil(pawnAnimationFrameCount / pawnAnimationColumns);
const pieceAnimationFrameCount = 72;
const pieceAnimationColumns = 12;
const pieceAnimationRows = Math.ceil(pieceAnimationFrameCount / pieceAnimationColumns);
const pieceAnimationBoardScale = 2.7;
const pieceAnimationPreviewScale = 2.7;
const pieceAnimationSpriteVerticalBias = 0.25;
const bundledHorseGlbAsset = require("./assets/knight_horse_game.glb");
const bundledHorseGlbPath = "chessalive-asset://knight-horse-game";

type PlayPanelTab = "moves" | "chat" | "players" | "info";
type PlayPhase = "setup" | "searching" | "game";
type CeremonyClipType = "pre-game-handshake" | "checkmate-finisher";

interface ActiveBoardCeremony {
  durationMs: number;
  effect?: ActiveFunnyEffect;
  gameId: string;
  opponentKingGlbPath?: string;
  move?: ChessMove;
  resultText?: string;
  startedAt: number;
  type: CeremonyClipType;
}

interface ShareableCeremonyClip {
  durationMs: number;
  gameId: string;
  move?: ChessMove;
  resultText?: string;
  text: string;
  title: string;
  type: CeremonyClipType;
  url: string;
}

interface CeremonyReplayRequest {
  color?: "w" | "b";
  from?: SquareName;
  gameId?: string;
  piece?: PieceKind;
  resultText?: string;
  to?: SquareName;
  type: CeremonyClipType;
}

type GoogleOAuthTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken(options?: { prompt?: string }): void;
};

type GoogleIdentityGlobal = {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleOAuthTokenResponse) => void;
      }): GoogleTokenClient;
    };
  };
};

type RazorpayCheckoutResponse = {
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
};

type RazorpayCheckoutInstance = {
  on(event: "payment.failed", handler: (response: unknown) => void): void;
  open(): void;
};

type RazorpayCheckoutConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;

type TimePresetId = "1|0" | "3|2" | "5|0" | "10|0" | "15|10";

interface TimePreset {
  id: TimePresetId;
  label: string;
  group: "Bullet" | "Blitz" | "Rapid";
  baseMs: number;
  incrementMs: number;
}

interface GlobePlayer {
  city: string;
  country: string;
  id: string;
  lat: number;
  lon: number;
  name: string;
  pingMs: number;
  rating: number;
  timeControl: TimePresetId;
}

interface GlobeLocation {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

type GeoJsonPosition = [number, number];
type GeoJsonPolygon = GeoJsonPosition[][];
type GeoJsonGeometry =
  | { coordinates: GeoJsonPolygon; type: "Polygon" }
  | { coordinates: GeoJsonPolygon[]; type: "MultiPolygon" };
type GeoJsonFeatureCollection = {
  features: Array<{ geometry: GeoJsonGeometry | null; type: "Feature" }>;
  type: "FeatureCollection";
};

interface ChallengeRequest {
  from: string;
  id: string;
  mode: "draft" | "incoming" | "modify" | "counter";
  rated: boolean;
  target: GlobePlayer;
  timeControl: TimePresetId;
}

interface HomeLiveMatch {
  black: string;
  id: string;
  meta: string;
  onPress: () => void;
  signal: string;
  snapshot: GameSnapshot;
  spectators: number;
  status: string;
  white: string;
}

interface DashboardData {
  user: UserProfile | null;
  puzzle: Puzzle | null;
  puzzleRush: Puzzle[];
  lessons: Lesson[];
  bots: BotProfile[];
  review: AnalysisSummary | null;
  tournaments: Tournament[];
  clubs: Club[];
  leaderboard: LeaderboardEntry[];
  stats: Awaited<ReturnType<ChessAliveServices["stats"]["getUserStats"]>> | null;
  chat: ChatMessage[];
  friends: UserProfile[];
  onlineFriends: UserProfile[];
  ads: AdPlacement[];
  databaseHealth: DatabaseHealth | null;
  multiplayerStatus: Awaited<ReturnType<ChessAliveServices["multiplayer"]["serverStatus"]>> | null;
  rooms: MultiplayerRoom[];
  pieceSets: PieceSet[];
  animationSets: AnimationSet[];
  animationClips: AnimationClip[];
}

type P2PRole = "idle" | "host" | "join";
type BoardOrientation = "w" | "b";

interface P2PPanelState {
  answerToken: string;
  connection: P2PConnectionState;
  error: string | null;
  inviteId: string;
  inviteToken: string;
  inviteUrl: string;
  mode: P2PRole;
  rated: boolean;
  remoteSignal: string;
}

interface P2PInviteApiResponse {
  answerReady: boolean;
  answerToken?: string | null;
  error?: string;
  expiresAt: string;
  id: string;
  inviteUrl: string;
  meta: P2PMatchMeta;
  offerToken?: string;
  status: "waiting" | "answered";
}

const adminEmail = "lakshminathanlaky@gmail.com";
const localhostDevProfile: GoogleAuthProfile = {
  sub: "localhost-dev-user",
  email: adminEmail,
  name: "Localhost Dev",
};
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
const blackPerspectiveRanks = [1, 2, 3, 4, 5, 6, 7, 8];
const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const blackPerspectiveFiles = ["h", "g", "f", "e", "d", "c", "b", "a"] as const;
const defaultClockMs = 5 * 60 * 1000;
const timePresets: TimePreset[] = [
  { id: "1|0", label: "1 min", group: "Bullet", baseMs: 60_000, incrementMs: 0 },
  { id: "3|2", label: "3 | 2", group: "Blitz", baseMs: 180_000, incrementMs: 2_000 },
  { id: "5|0", label: "5 min", group: "Blitz", baseMs: 300_000, incrementMs: 0 },
  { id: "10|0", label: "10 min", group: "Rapid", baseMs: 600_000, incrementMs: 0 },
  { id: "15|10", label: "15 | 10", group: "Rapid", baseMs: 900_000, incrementMs: 10_000 },
];

function browserRoute() {
  return globalThis as unknown as {
    addEventListener?: (type: string, listener: () => void) => void;
    history?: {
      pushState: (data: unknown, title: string, url?: string) => void;
      replaceState: (data: unknown, title: string, url?: string) => void;
    };
    location?: { hash?: string; hostname?: string; pathname?: string; search?: string };
    removeEventListener?: (type: string, listener: () => void) => void;
  };
}

function isLocalhostRuntime() {
  const hostname = browserRoute().location?.hostname ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function currentRouteScreen() {
  return screenFromPath(browserRoute().location?.pathname ?? "/");
}

function p2pProfileFromUser(user: UserProfile): P2PPlayerProfile {
  return {
    avatarEmoji: user.avatarEmoji,
    displayName: user.displayName,
    id: user.id,
    rapidRating: user.rating.rapid,
  };
}

function userProfileFromP2P(profile: P2PPlayerProfile): UserProfile {
  return {
    avatarEmoji: profile.avatarEmoji,
    displayName: profile.displayName,
    id: profile.id,
    rating: {
      blitz: profile.rapidRating,
      bullet: profile.rapidRating,
      funny: profile.rapidRating,
      rapid: profile.rapidRating,
    },
  };
}

function p2pWaitingPlayer(): UserProfile {
  return {
    avatarEmoji: "⏳",
    displayName: "Friend joining",
    id: "p2p-waiting",
    rating: { blitz: 400, bullet: 400, funny: 400, rapid: 400 },
  };
}

function logP2PApp(label: string, details?: unknown) {
  const consoleLike = (globalThis as { console?: Console }).console;
  if (!consoleLike) return;
  if (details === undefined) {
    consoleLike.info(`[ChessAlive P2P UI] ${label}`);
  } else {
    consoleLike.info(`[ChessAlive P2P UI] ${label}`, details);
  }
}

function logP2PAppError(label: string, error?: unknown) {
  const consoleLike = (globalThis as { console?: Console }).console;
  if (!consoleLike) return;
  consoleLike.error(`[ChessAlive P2P UI] ${label}`, error);
}

function validSquareName(value: string | null): SquareName | undefined {
  if (!value || value.length !== 2) return undefined;
  const file = value[0] as (typeof files)[number];
  const rank = Number(value[1]);
  if (!files.includes(file) || !ranks.includes(rank)) return undefined;
  return value as SquareName;
}

function validPieceKind(value: string | null): PieceKind | undefined {
  return value === "p" || value === "n" || value === "b" || value === "r" || value === "q" || value === "k" ? value : undefined;
}

function validPieceColor(value: string | null): "w" | "b" | undefined {
  return value === "w" || value === "b" ? value : undefined;
}

function ceremonyReplayRequestFromRoute(): CeremonyReplayRequest | null {
  const search = browserRoute().location?.search;
  if (!search) return null;
  const params = new URLSearchParams(search);
  const rawClip = params.get("clip");
  if (rawClip !== "pre-game-handshake" && rawClip !== "checkmate-finisher") return null;
  return {
    color: validPieceColor(params.get("color")),
    from: validSquareName(params.get("from")),
    gameId: params.get("game") ?? undefined,
    piece: validPieceKind(params.get("piece")),
    resultText: params.get("result") ?? undefined,
    to: validSquareName(params.get("to")),
    type: rawClip,
  };
}

function writeRouteForScreen(nextScreen: Screen, mode: "push" | "replace" = "push") {
  const route = browserRoute();
  if (!route.history || !route.location) return;
  const nextPath = screenPaths[nextScreen];
  const currentPath = route.location.pathname || "/";
  if (currentPath === nextPath) return;
  if (mode === "replace") {
    route.history.replaceState({ screen: nextScreen }, "", nextPath);
    return;
  }
  route.history.pushState({ screen: nextScreen }, "", nextPath);
}

function scrollHomeGlobeIntoView() {
  const documentRef = (globalThis as unknown as {
    document?: { getElementById?: (id: string) => { scrollIntoView?: (options?: unknown) => void } | null };
  }).document;
  documentRef?.getElementById?.("home-world-arena")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}
const appFontFamily = "Inter, Google Sans, Avenir Next, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
const displayFontFamily = "Inter, Google Sans, Avenir Next, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
const aiCanvas = "#ffffff";
const aiSurface = "#ffffff";
const aiInk = "#1f1f1f";
const aiMuted = "#5f6368";
const aiLine = "rgba(31, 31, 31, 0.10)";
const aiBlue = "#1a73e8";
const aiTeal = "#1597a7";
const aiShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.035,
  shadowRadius: 14,
};
const aiSoftShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.026,
  shadowRadius: 10,
};
const motionDuration = {
  fast: 180,
  normal: 300,
  page: 440,
};
const motionEasing = {
  enter: Easing.bezier(0.2, 0, 0, 1),
  exit: Easing.bezier(0.4, 0, 0.2, 1),
};
const aiPanelSurface = {
  backgroundColor: aiSurface,
  borderColor: aiLine,
  borderRadius: 12,
  borderWidth: 1,
  ...aiSoftShadow,
};
const aiInsetSurface = {
  backgroundColor: "#f8fafc",
  borderColor: aiLine,
  borderRadius: 8,
  borderWidth: 1,
};
const aiPillSurface = {
  backgroundColor: aiSurface,
  borderColor: aiLine,
  borderRadius: 999,
  borderWidth: 1,
};
const verticalScrollOnly = {
  overflowX: "hidden",
  overflowY: "auto",
} as unknown as ViewStyle;
const boardGestureSurface = {
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
} as unknown as ViewStyle;

function useReplayEntrance(trigger: unknown, options: { distance?: number; duration?: number } = {}) {
  const entrance = useRef(new Animated.Value(1)).current;
  const distance = options.distance ?? 12;
  const duration = options.duration ?? motionDuration.normal;
  useEffect(() => {
    entrance.stopAnimation();
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration,
      easing: motionEasing.enter,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [distance, duration, entrance, trigger]);

  return {
    opacity: entrance.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0, 0.72, 1],
    }),
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };
}
const screenOrder: Screen[] = ["Premium", "Home", "Play", "Learn", "Puzzles", "Review", "Social", "Profile", "Admin", "Lessons", "Bots", "Tournaments"];
const naturalEarthMap = naturalEarthLand as unknown as GeoJsonFeatureCollection;
const customBoardThemeId = "custom-board-studio";
const defaultGoogleOAuthClientId = "229048990138-t8cd45u1n45tehkacmf8e593i62id4jb.apps.googleusercontent.com";
const defaultCustomBoardTheme: BoardTheme = {
  id: customBoardThemeId,
  name: "My Pink Board",
  light: "#fff1f8",
  dark: "#e879b7",
  highlight: "#facc15",
  legal: "rgba(190, 24, 93, 0.24)",
  danger: "rgba(220, 38, 38, 0.44)",
};
const boardLightSwatches = ["#fbfcfb", "#f8fafc", "#fff1f8", "#fef3c7", "#e0f2fe", "#f5f4ea"];
const boardDarkSwatches = ["#15979f", "#78a9c4", "#e879b7", "#db2777", "#286ca8", "#76a99a", "#6f9fc7", "#697f91"];
const boardHighlightSwatches = ["#facc15", "#f59e0b", "#fb7185", "#a78bfa", "#38bdf8", "#6ee7b7"];
const defaultCustomRules: CustomFunRule[] = [
  {
    id: "rule-king-queen",
    name: "Royal Queen Walk",
    description: "The king can move like a queen.",
    enabled: false,
  },
  {
    id: "rule-knight-double",
    name: "Double Hop Knight",
    description: "Knights can hop twice in one turn.",
    enabled: false,
  },
  {
    id: "rule-rook-dance",
    name: "Dancing Rook",
    description: "Rooks may sidestep before a straight move.",
    enabled: false,
  },
  {
    id: "rule-bishop-curve",
    name: "Curved Bishop",
    description: "Bishops can bend once around a piece.",
    enabled: false,
  },
  {
    id: "rule-pawn-sprint",
    name: "Pawn Sprint",
    description: "Pawns may sprint three squares from home.",
    enabled: false,
  },
];

function resolveBoardTheme(settings: PlayerSettings): BoardTheme {
  if (settings.boardTheme === customBoardThemeId) {
    return {
      ...defaultCustomBoardTheme,
      ...settings.customBoardTheme,
      id: customBoardThemeId,
      name: settings.customBoardTheme?.name ?? defaultCustomBoardTheme.name,
    };
  }
  return boardThemes.find((item) => item.id === settings.boardTheme) ?? boardThemes[0];
}

function normalizeCustomRules(rules?: CustomFunRule[]) {
  return defaultCustomRules.map((fallback, index) => ({ ...fallback, ...(rules?.[index] ?? {}) }));
}

function isAdminUser(userProfile: UserProfile | null | undefined) {
  return userProfile?.email?.trim().toLowerCase() === adminEmail;
}

const initialData: DashboardData = {
  user: null,
  puzzle: null,
  puzzleRush: [],
  lessons: [],
  bots: [],
  review: null,
  tournaments: [],
  clubs: [],
  leaderboard: [],
  stats: null,
  chat: [],
  friends: [],
  onlineFriends: [],
  ads: [],
  databaseHealth: null,
  multiplayerStatus: null,
  rooms: [],
  pieceSets: [],
  animationSets: [],
  animationClips: [],
};

function publicEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

const adsenseClientId = publicEnv("EXPO_PUBLIC_ADSENSE_CLIENT") ?? "ca-pub-2256537545539534";
const adsenseSlotEnvByPlacement = {
  homeRail: "EXPO_PUBLIC_ADSENSE_HOME_RAIL_SLOT",
  homeTop: "EXPO_PUBLIC_ADSENSE_HOME_TOP_SLOT",
  lessonFeed: "EXPO_PUBLIC_ADSENSE_LESSON_FEED_SLOT",
  playRail: "EXPO_PUBLIC_ADSENSE_PLAY_RAIL_SLOT",
  puzzleFeed: "EXPO_PUBLIC_ADSENSE_PUZZLE_FEED_SLOT",
  reviewRail: "EXPO_PUBLIC_ADSENSE_REVIEW_RAIL_SLOT",
} as const;

type AdsensePlacement = keyof typeof adsenseSlotEnvByPlacement;

function adsenseSlotId(placement: AdsensePlacement) {
  return publicEnv(adsenseSlotEnvByPlacement[placement]);
}

function browserHttpLocation() {
  return (globalThis as { location?: { hostname?: string; origin?: string } }).location;
}

function localHostName(hostname?: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function assetServerHttpEndpoint() {
  const configured = publicEnv("EXPO_PUBLIC_CHESSALIVE_REALTIME_HTTP");
  if (configured) return configured.replace(/\/$/, "");
  const location = browserHttpLocation();
  if (location?.origin && !localHostName(location.hostname)) return `${location.origin}/api`;
  return "http://localhost:8982";
}

async function uploadAssetFileToServer(file: File, piece: PieceKind, slot: PieceAssetSlotKey) {
  const endpoint = `${assetServerHttpEndpoint()}/assets/upload?piece=${encodeURIComponent(piece)}&slot=${encodeURIComponent(slot)}&fileName=${encodeURIComponent(file.name)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": file.type || (file.name.toLowerCase().endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream"),
      "X-File-Name": file.name,
    },
    body: file,
  });
  const payload = (await response.json().catch(() => ({}))) as { assetId?: string; assetUrl?: string; error?: string; kind?: "glb" | "image" };
  if (!response.ok || !payload.assetUrl) throw new Error(payload.error ?? "Asset server upload failed.");
  return payload as { assetId: string; assetUrl: string; kind: "glb" | "image" };
}

function loadRazorpayCheckoutScript() {
  const documentRef = (globalThis as { document?: Document }).document;
  if (!documentRef) return Promise.reject(new Error("Razorpay checkout is only available in the web app."));
  if ((globalThis as { Razorpay?: RazorpayCheckoutConstructor }).Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = documentRef.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), { once: true });
      return;
    }
    const script = documentRef.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    documentRef.head.appendChild(script);
  });
}

async function createRazorpayPremiumSubscription(user: UserProfile) {
  const response = await fetch(`${assetServerHttpEndpoint()}/billing/razorpay/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: {
        displayName: user.displayName,
        email: user.email,
        id: user.id,
      },
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    amount?: number;
    currency?: string;
    error?: string;
    keyId?: string;
    productName?: string;
    subscriptionId?: string;
  };
  if (!response.ok || !payload.keyId || !payload.subscriptionId) {
    throw new Error(payload.error ?? "Could not create Razorpay subscription.");
  }
  return payload as {
    amount: number;
    currency: string;
    keyId: string;
    productName: string;
    subscriptionId: string;
  };
}

async function verifyRazorpayPremiumPayment(user: UserProfile, payment: RazorpayCheckoutResponse) {
  const response = await fetch(`${assetServerHttpEndpoint()}/billing/razorpay/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payment,
      user: {
        email: user.email,
        id: user.id,
      },
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    premiumActive?: boolean;
    subscriptionId?: string;
    verifiedAt?: string;
  };
  if (!response.ok || !payload.premiumActive) {
    throw new Error(payload.error ?? "Razorpay payment verification failed.");
  }
  return payload;
}

function loadGoogleIdentityScript() {
  const documentRef = (globalThis as { document?: Document }).document;
  if (!documentRef) return Promise.reject(new Error("Google sign-in is only available in the web app."));
  if ((globalThis as { google?: GoogleIdentityGlobal }).google?.accounts?.oauth2) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = documentRef.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }
    const script = documentRef.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    documentRef.head.appendChild(script);
  });
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleAuthProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Google profile could not be loaded.");
  return (await response.json()) as GoogleAuthProfile;
}

async function requestGoogleProfile(): Promise<GoogleAuthProfile> {
  const clientId = publicEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID") ?? defaultGoogleOAuthClientId;
  if (!clientId) {
    throw new Error("Set EXPO_PUBLIC_GOOGLE_CLIENT_ID to enable real Google sign-in.");
  }
  await loadGoogleIdentityScript();
  const google = (globalThis as { google?: GoogleIdentityGlobal }).google;
  if (!google?.accounts?.oauth2) throw new Error("Google sign-in is not ready yet.");
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google did not return an access token."));
          return;
        }
        void fetchGoogleProfile(response.access_token).then(resolve).catch(reject);
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}

function capturedFromMoves(history: GameSnapshot["history"]) {
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

function replaySnapshot(snapshot: GameSnapshot, replayPly: number | null) {
  if (replayPly === null) return snapshot;
  const boundedPly = Math.max(0, Math.min(replayPly, snapshot.history.length));
  const history = snapshot.history.slice(0, boundedPly);
  const fen = boundedPly === 0 ? snapshot.history[0]?.before ?? snapshot.fen : history[history.length - 1]?.after ?? snapshot.fen;
  const engine = createChessEngine(fen);
  const replay = engine.snapshot();
  return {
    ...replay,
    id: snapshot.id,
    history,
    captured: capturedFromMoves(history),
    status: {
      ...replay.status,
      resultText: boundedPly === snapshot.history.length ? snapshot.status.resultText : boundedPly === 0 ? "Starting position" : `Viewing move ${boundedPly}`,
    },
  };
}

function applyPremovesToBoard(board: BoardCell[], premoves: MoveIntent[], playerColor: "w" | "b") {
  const nextBoard = board.map((cell) => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null }));
  for (const premove of premoves) {
    const fromCell = nextBoard.find((cell) => cell.square === premove.from);
    const toCell = nextBoard.find((cell) => cell.square === premove.to);
    if (!fromCell?.piece || !toCell || fromCell.piece.color !== playerColor || premove.from === premove.to) continue;
    toCell.piece = fromCell.piece;
    fromCell.piece = null;
  }
  return nextBoard;
}

function firstLegalMoveForTurn(position: GameSnapshot): MoveIntent | null {
  for (const [from, targets] of Object.entries(position.legalMoves)) {
    const piece = position.board.find((cell) => cell.square === from)?.piece;
    const to = targets[0];
    if (piece?.color === position.status.turn && to) return { from: from as SquareName, to };
  }
  return null;
}

async function chooseBotMoveForTurn(services: ChessAliveServices, position: GameSnapshot, botId: string) {
  const intent = await services.bots.chooseMove(position, botId);
  const piece = intent ? position.board.find((cell) => cell.square === intent.from)?.piece : null;
  if (intent && piece?.color === position.status.turn) return intent;
  return firstLegalMoveForTurn(position);
}

function snapshotFromMoves(moves: MoveIntent[]) {
  const demoEngine = createChessEngine();
  demoEngine.newGame();
  moves.forEach((move) => demoEngine.move(move));
  return demoEngine.snapshot();
}

function snapshotFromFen(fen?: string) {
  return createChessEngine(fen).snapshot();
}

const homeLiveSnapshots = [
  snapshotFromMoves([
    { from: "e2", to: "e4" },
    { from: "c7", to: "c5" },
    { from: "g1", to: "f3" },
    { from: "d7", to: "d6" },
    { from: "d2", to: "d4" },
  ]),
  snapshotFromMoves([
    { from: "d2", to: "d4" },
    { from: "g8", to: "f6" },
    { from: "c2", to: "c4" },
    { from: "e7", to: "e6" },
    { from: "b1", to: "c3" },
    { from: "f8", to: "b4" },
  ]),
  snapshotFromMoves([
    { from: "e2", to: "e4" },
    { from: "e7", to: "e5" },
    { from: "g1", to: "f3" },
    { from: "b8", to: "c6" },
    { from: "f1", to: "b5" },
  ]),
];

const reviewDemoSnapshot = snapshotFromMoves([
  { from: "e2", to: "e4" },
  { from: "e7", to: "e5" },
  { from: "f1", to: "c4" },
  { from: "b8", to: "c6" },
  { from: "d1", to: "h5" },
  { from: "g8", to: "f6" },
  { from: "h5", to: "f7" },
]);

function normalizeLongitude(lon: number) {
  let next = lon;
  while (next < -180) next += 360;
  while (next > 180) next -= 360;
  return next;
}

function currentSunPoint(date = new Date()): GlobeLocation {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lat = 23.44 * Math.sin(((360 / 365) * (day - 81) * Math.PI) / 180);
  const lon = normalizeLongitude((12 - utcHours) * 15);
  return { city: "Subsolar point", country: "Sun", lat, lon };
}

function inferUserGlobeLocation(): GlobeLocation {
  const timeZone = (globalThis as { Intl?: typeof Intl }).Intl?.DateTimeFormat().resolvedOptions().timeZone ?? "";
  if (timeZone.includes("Kolkata") || timeZone.includes("Calcutta")) return { city: "Chennai", country: "India", lat: 13.0827, lon: 80.2707 };
  if (timeZone.includes("Los_Angeles")) return { city: "San Francisco", country: "USA", lat: 37.7749, lon: -122.4194 };
  if (timeZone.includes("New_York")) return { city: "New York", country: "USA", lat: 40.7128, lon: -74.006 };
  if (timeZone.includes("London")) return { city: "London", country: "UK", lat: 51.5072, lon: -0.1276 };
  if (timeZone.includes("Tokyo")) return { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 };
  return { city: "Chicago", country: "USA", lat: 41.8781, lon: -87.6298 };
}

function buildGlobePlayers(data: DashboardData, selectedTimeControl: TimePresetId): GlobePlayer[] {
  const namedPlayers = [...data.onlineFriends, ...data.leaderboard.map((entry) => entry.user), data.user].filter(Boolean) as UserProfile[];
  const globalSeats = [
    { city: "San Francisco", country: "USA", lat: 37.7749, lon: -122.4194, pingMs: 28 },
    { city: "New York", country: "USA", lat: 40.7128, lon: -74.006, pingMs: 34 },
    { city: "Chennai", country: "India", lat: 13.0827, lon: 80.2707, pingMs: 18 },
    { city: "London", country: "UK", lat: 51.5072, lon: -0.1276, pingMs: 42 },
    { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, pingMs: 55 },
    { city: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, pingMs: 71 },
    { city: "Sao Paulo", country: "Brazil", lat: -23.5558, lon: -46.6396, pingMs: 63 },
    { city: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473, pingMs: 66 },
  ];
  return globalSeats.map((seat, index) => {
    const player = namedPlayers[index % Math.max(1, namedPlayers.length)];
    return {
      ...seat,
      id: `globe-${seat.city.toLowerCase().replace(/\s+/g, "-")}`,
      name: player?.displayName ?? ["Rook Racer", "Knight Pilot", "Queen Signal", "Pawn Poet"][index % 4],
      rating: player?.rating.rapid ?? 900 + index * 85,
      timeControl: index % 3 === 0 ? "3|2" : index % 3 === 1 ? selectedTimeControl : "10|0",
    };
  });
}

function latLonToVector(lat: number, lon: number, radius = 1) {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lonRad = THREE.MathUtils.degToRad(lon);
  const cosLat = Math.cos(latRad);
  return new THREE.Vector3(
    radius * cosLat * Math.sin(lonRad),
    radius * Math.sin(latRad),
    radius * cosLat * Math.cos(lonRad),
  );
}

export function App() {
  const services = useMemo(() => createLocalServices(), []);
  const { width, height } = useWindowDimensions();
  const isWide = width >= 1020;
  const compactHeader = width < 760;
  const contentScrollRef = useRef<ScrollView | null>(null);
  const screenMotion = useRef(new Animated.Value(1)).current;
  const resultMotion = useRef(new Animated.Value(0)).current;
  const sideDockMotion = useRef(new Animated.Value(1)).current;
  const [screen, setScreen] = useState<Screen>(() => currentRouteScreen());
  const screenRef = useRef<Screen>(screen);
  const [transitionFromScreen, setTransitionFromScreen] = useState<Screen | null>(null);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [gameDockExpanded, setGameDockExpanded] = useState(true);
  const [playPhase, setPlayPhase] = useState<PlayPhase>("setup");
  const [session, setSession] = useState<GameSession | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [selected, setSelected] = useState<SquareName | null>(null);
  const [premoves, setPremovesState] = useState<MoveIntent[]>([]);
  const [activeEffect, setActiveEffect] = useState<ActiveFunnyEffect | null>(null);
  const [activeCeremony, setActiveCeremony] = useState<ActiveBoardCeremony | null>(null);
  const [shareableClip, setShareableClip] = useState<ShareableCeremonyClip | null>(null);
  const [clipRendering, setClipRendering] = useState(false);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [clock, setClock] = useState({ whiteMs: defaultClockMs, blackMs: defaultClockMs, running: true });
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimePresetId>("5|0");
  const [matchSearch, setMatchSearch] = useState<"idle" | "searching" | "matched">("idle");
  const [p2pPanel, setP2pPanel] = useState<P2PPanelState>({
    answerToken: "",
    connection: "idle",
    error: null,
    inviteId: "",
    inviteToken: "",
    inviteUrl: "",
    mode: "idle",
    rated: false,
    remoteSignal: "",
  });
  const [p2pMatchMeta, setP2pMatchMeta] = useState<P2PMatchMeta | null>(null);
  const p2pPeerRef = useRef<BrowserP2PChessPeer | null>(null);
  const p2pAcceptingAnswerRef = useRef(false);
  const p2pGameStartedRef = useRef(false);
  const p2pInviteConsumedRef = useRef(false);
  const p2pAnswerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const p2pMessageHandlerRef = useRef<(message: P2PChessMessage) => void>(() => undefined);
  const sessionRef = useRef<GameSession | null>(null);
  const snapshotRef = useRef<GameSnapshot | null>(null);
  const [playPanelTab, setPlayPanelTab] = useState<PlayPanelTab>("moves");
  const [manualResult, setManualResult] = useState<string | null>(null);
  const [replayPly, setReplayPly] = useState<number | null>(null);
  const [resultExpanded, setResultExpanded] = useState(true);
  const [message, setMessage] = useState("Ready for an Alive chess match.");
  const [data, setData] = useState<DashboardData>(initialData);
  const premovesRef = useRef<MoveIntent[]>([]);
  const premovePlaybackRef = useRef(false);
  const ceremonyReplayConsumedRef = useRef(false);
  const resultClipStageRef = useRef<unknown>(null);
  const [settings, setSettings] = useState<PlayerSettings>({
    animationSetId: seededAnimationSetId,
    animationsEnabled: true,
    enabled: true,
    musicEnabled: true,
    pieceSetId: seededPieceSetId,
    intensity: "cinema",
    boardTheme: "clarity-ivory",
    customBoardTheme: defaultCustomBoardTheme,
    customRules: defaultCustomRules,
    soundVolume: 0.7,
  });

  const theme = useMemo(() => resolveBoardTheme(settings), [settings]);
  const userIsAdmin = isAdminUser(data.user);
  const localhostAutoLoginPending = isLocalhostRuntime() && !data.user;
  const availableScreens = useMemo(() => primaryScreens.filter((item) => item !== "Admin" || userIsAdmin), [userIsAdmin]);
  const availablePrimaryScreens = useMemo(() => primaryScreens.filter((item) => item !== "Admin" || userIsAdmin), [userIsAdmin]);
  const navigationTabs = width >= 720 ? availableScreens : availablePrimaryScreens;
  const boardSnapshot = useMemo(() => (snapshot ? replaySnapshot(snapshot, replayPly) : null), [replayPly, snapshot]);
  const premoveDisplayBoard = useMemo(
    () => (snapshot ? applyPremovesToBoard(snapshot.board, premoves, localPlayerColor()) : []),
    [data.user?.id, playerColor, practiceMode, premoves, session?.black.id, snapshot?.fen],
  );
  const isPlayScreen = screen === "Play";
  const showGlobalRail = isWide;
  const playLeftWidth = showGlobalRail ? 48 : 0;
  const playSideTargetWidth = isWide ? Math.min(310, Math.max(270, width * 0.18)) : Math.min(360, Math.max(280, width - 28));
  const playSideWidth = isWide && gameDockExpanded ? playSideTargetWidth : 0;
  const hasResultBoard = Boolean(isPlayScreen && manualResult);
  const resultLaneReserveWidth = 0;
  const mobilePageGutter = width < 390 ? 18 : 28;
  const mobileAvailableBoardWidth = Math.max(260, width - mobilePageGutter);
  const availableBoardWidth = isWide ? width - playLeftWidth - playSideWidth - resultLaneReserveWidth - 108 : mobileAvailableBoardWidth;
  const availableBoardHeight = height - (isPlayScreen ? (showGlobalRail ? 24 : 136) : isWide ? 180 : 500);
  const boardLimit = Math.min(Math.max(280, availableBoardWidth), Math.max(280, availableBoardHeight));
  const boardFloor = isWide
    ? Math.min(isPlayScreen ? 340 : 280, Math.max(280, availableBoardWidth))
    : Math.min(isPlayScreen ? 320 : 280, availableBoardWidth);
  const baseBoardSize = Math.max(boardFloor, boardLimit);
  const resultBoardScale = hasResultBoard ? (isWide ? 0.96 : 0.78) : 1;
  const resultBoardMax = hasResultBoard ? (isWide ? Math.max(520, width - playLeftWidth - playSideWidth - resultLaneReserveWidth - 96) : mobileAvailableBoardWidth) : baseBoardSize;
  const resultBoardMin = hasResultBoard ? (isWide ? 420 : Math.min(320, Math.max(260, mobileAvailableBoardWidth))) : 0;
  const boardSize = Math.round(resultBoardScale < 1 ? Math.max(resultBoardMin, Math.min(baseBoardSize * resultBoardScale, resultBoardMax)) : baseBoardSize);
  const isCompactNav = width < 720;
  const navIconSize: keyof typeof eliteIconSizes = isCompactNav || isPlayScreen ? "xs" : "sm";
  const navCards = navigationTabs.map((item) => {
    const meta = screenMeta[item];
    const Icon = meta.icon;
    const active = screen === item;
    const hideNavText = isCompactNav;
    return (
      <Pressable key={item} onPress={() => navigateTo(item)} style={[styles.navCard, !isWide && styles.navCardMobile, isPlayScreen && styles.playNavCard, hideNavText && styles.playNavCardIconOnly, active && styles.navCardActive]}>
        <EliteIcon icon={Icon} tone={meta.tone} size={navIconSize} active={active} rune={meta.rune} />
        {!hideNavText && (
          <View style={styles.navCardCopy}>
            <Text style={[styles.navCardText, isPlayScreen && styles.playNavCardText, active && styles.navCardTextActive]}>{item}</Text>
            {!isPlayScreen && !isCompactNav && <Text style={[styles.navCardCaption, active && styles.navCardCaptionActive]}>{meta.caption}</Text>}
          </View>
        )}
      </Pressable>
    );
  });

  function transitionToScreen(nextScreen: Screen) {
    const currentScreen = screenRef.current;
    if (nextScreen === currentScreen) return;
    const currentIndex = screenOrder.indexOf(currentScreen);
    const nextIndex = screenOrder.indexOf(nextScreen);
    setTransitionDirection(nextIndex >= currentIndex ? 1 : -1);
    setTransitionFromScreen(currentScreen);
    screenRef.current = nextScreen;
    setScreen(nextScreen);
    if (nextScreen === "Play") {
      setPlayPhase("setup");
      setTimeout(() => contentScrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
    }
  }

  function navigateTo(nextScreen: Screen) {
    if (nextScreen === "Admin" && !userIsAdmin) return;
    if (nextScreen === screenRef.current) return;
    writeRouteForScreen(nextScreen);
    transitionToScreen(nextScreen);
  }

  function setPremoves(next: MoveIntent[] | ((current: MoveIntent[]) => MoveIntent[])) {
    const resolved = typeof next === "function" ? next(premovesRef.current) : next;
    premovesRef.current = resolved;
    setPremovesState(resolved);
  }

  useEffect(() => {
    const runtime = globalThis as unknown as {
      addEventListener?: (type: string, listener: (event: Event) => void) => void;
      removeEventListener?: (type: string, listener: (event: Event) => void) => void;
    };
    const logErrorEvent = (event: Event) => {
      const errorEvent = event as ErrorEvent;
      logP2PAppError("global browser error", {
        error: errorEvent.error,
        message: errorEvent.message,
        source: errorEvent.filename,
      });
    };
    const logRejectionEvent = (event: Event) => {
      logP2PAppError("unhandled browser promise rejection", (event as PromiseRejectionEvent).reason ?? event);
    };
    runtime.addEventListener?.("error", logErrorEvent);
    runtime.addEventListener?.("unhandledrejection", logRejectionEvent);
    void bootstrap();
    return () => {
      runtime.removeEventListener?.("error", logErrorEvent);
      runtime.removeEventListener?.("unhandledrejection", logRejectionEvent);
      if (p2pAnswerPollRef.current) clearInterval(p2pAnswerPollRef.current);
      p2pPeerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    p2pMessageHandlerRef.current = handleP2PMessage;
  });

  useEffect(() => {
    if (data.user || screen === "Home" || localhostAutoLoginPending) return;
    writeRouteForScreen("Home", "replace");
    transitionToScreen("Home");
  }, [data.user, localhostAutoLoginPending, screen]);

  useEffect(() => {
    if (!data.user || p2pInviteConsumedRef.current) return;
    const inviteId = readP2PInviteIdFromLocation();
    const inviteToken = readP2PInviteTokenFromLocation();
    if (!inviteId && !inviteToken) return;
    p2pInviteConsumedRef.current = true;
    if (inviteId) {
      void joinP2PInvite(inviteId);
      return;
    }
    setP2pPanel((current) => ({
      ...current,
      connection: "idle",
      error: null,
      inviteId: "",
      mode: "join",
      remoteSignal: inviteToken ?? "",
    }));
    writeRouteForScreen("Play", "replace");
    transitionToScreen("Play");
    setPlayPhase("setup");
    setMessage("Legacy P2P invite detected. Use the current friend-link flow for automatic pairing.");
  }, [data.user?.id]);

  useEffect(() => {
    const route = browserRoute();
    if (!route.addEventListener) return undefined;
    const handlePopState = () => {
      const nextScreen = currentRouteScreen();
      if (nextScreen === "Admin" && !userIsAdmin && !localhostAutoLoginPending) {
        writeRouteForScreen("Home", "replace");
        transitionToScreen("Home");
        return;
      }
      transitionToScreen(nextScreen);
    };
    route.addEventListener("popstate", handlePopState);
    return () => route.removeEventListener?.("popstate", handlePopState);
  }, [localhostAutoLoginPending, userIsAdmin]);

  useEffect(() => {
    if (!activeEffect) return undefined;
    const timer = setTimeout(() => setActiveEffect(null), activeEffect.effect.durationMs);
    return () => clearTimeout(timer);
  }, [activeEffect]);

  useEffect(() => {
    if (!activeCeremony) return undefined;
    const timer = setTimeout(() => setActiveCeremony(null), activeCeremony.durationMs);
    return () => clearTimeout(timer);
  }, [activeCeremony]);

  useEffect(() => {
    const request = ceremonyReplayRequestFromRoute();
    if (!request || ceremonyReplayConsumedRef.current || !session || !snapshot || data.animationSets.length === 0) return;
    ceremonyReplayConsumedRef.current = true;
    setActiveEffect(null);
    setManualResult(null);
    setReplayPly(null);
    setPremoves([]);
    setPlayPhase("game");
    if (screenRef.current !== "Play") transitionToScreen("Play");

    const gameId = request.gameId ?? session.id;
    if (request.type === "pre-game-handshake") {
      const durationMs = ceremonyRuleDuration(ceremonyRule("game-start-handshake", "k"), 5200) ?? 5200;
      const effect = activeOpeningCeremonyEffect(gameId);
      setActiveCeremony({ durationMs, effect: effect ?? undefined, gameId, opponentKingGlbPath: selectedKingGlbPath(), startedAt: Date.now(), type: "pre-game-handshake" });
      setShareableClip(buildShareableClip("pre-game-handshake", gameId));
      setMessage("Replaying the ChessAlive opening handshake clip.");
      return;
    }

    const move = replayMoveFromCeremonyRequest(request, snapshot);
    const resultText = request.resultText ?? `${move.color === "w" ? "White" : "Black"} won by checkmate`;
    const effect = activeCheckmateEffectForMove(gameId, move);
    const durationMs = Math.max(4200, effect?.effect.durationMs ?? ceremonyRuleDuration(ceremonyRule("checkmate-finisher", move.piece), 4800) ?? 4800);
    setManualResult(resultText);
    setResultExpanded(true);
    setActiveCeremony({ durationMs, effect: effect ?? undefined, gameId, move, opponentKingGlbPath: selectedKingGlbPath(), resultText, startedAt: Date.now(), type: "checkmate-finisher" });
    setShareableClip(buildShareableClip("checkmate-finisher", gameId, resultText, move));
    setMessage("Replaying the ChessAlive checkmate finisher clip.");
  }, [data.animationClips.length, data.animationSets.length, session?.id, snapshot?.fen, settings.animationSetId, settings.pieceSetId]);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: true });
    screenMotion.stopAnimation();
    screenMotion.setValue(0);
    Animated.timing(screenMotion, {
      toValue: 1,
      duration: motionDuration.page,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start(() => setTransitionFromScreen(null));
  }, [screen]);

  useEffect(() => {
    if (manualResult) setResultExpanded(true);
  }, [manualResult]);

  useEffect(() => {
    Animated.timing(resultMotion, {
      toValue: manualResult ? (resultExpanded ? 1 : 0) : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [manualResult, resultExpanded, resultMotion]);

  useEffect(() => {
    Animated.timing(sideDockMotion, {
      toValue: gameDockExpanded ? 1 : 0,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [gameDockExpanded, sideDockMotion]);

  useEffect(() => {
    if (!isPlayScreen) setGameDockExpanded(true);
  }, [isPlayScreen]);

  useEffect(() => {
    premovesRef.current = premoves;
  }, [premoves]);

  useEffect(() => {
    if (!snapshot || !session || premovesRef.current.length === 0) return undefined;
    if (snapshot.status.isGameOver) {
      setPremoves([]);
      return undefined;
    }
    if (snapshot.status.turn !== localPlayerColor()) return undefined;
    const timer = setTimeout(() => void playNextPremove(120, snapshot), 80);
    return () => clearTimeout(timer);
  }, [data.user?.id, session?.black.id, session?.id, snapshot?.fen]);

  useEffect(() => {
    if (screen === "Admin" && !userIsAdmin && !localhostAutoLoginPending) {
      writeRouteForScreen("Home", "replace");
      transitionToScreen("Home");
    }
  }, [localhostAutoLoginPending, screen, userIsAdmin]);

  const planeTravel = width < 720 ? 18 : Math.min(44, Math.max(22, width * 0.026));
  const screenTransitionStyle = {
    opacity: screenMotion.interpolate({
      inputRange: [0, 0.16, 0.58, 1],
      outputRange: [0, 0, 0.82, 1],
    }),
    transform: [
      {
        translateX: screenMotion.interpolate({
          inputRange: [0, 0.58, 1],
          outputRange: [transitionDirection * planeTravel, transitionDirection * (planeTravel * 0.22), 0],
        }),
      },
      {
        translateY: screenMotion.interpolate({
          inputRange: [0, 0.58, 1],
          outputRange: [10, 5, 0],
        }),
      },
      {
        scale: screenMotion.interpolate({
          inputRange: [0, 0.58, 1],
          outputRange: [0.992, 0.997, 1],
        }),
      },
    ],
  };
  const screenExitStyle = {
    opacity: screenMotion.interpolate({
      inputRange: [0, 0.36, 1],
      outputRange: [1, 0.08, 0],
    }),
    transform: [
      {
        translateX: screenMotion.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [0, -transitionDirection * (planeTravel * 0.28), -transitionDirection * (planeTravel * 0.34)],
        }),
      },
      {
        translateY: screenMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
      {
        scale: screenMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.996],
        }),
      },
    ],
  };
  const screenTransitionGlowStyle = {
    opacity: screenMotion.interpolate({
      inputRange: [0, 0.22, 0.68, 1],
      outputRange: [0, 0.22, 0.13, 0],
    }),
    transform: [
      {
        translateX: screenMotion.interpolate({
          inputRange: [0, 0.58, 1],
          outputRange: [transitionDirection * (planeTravel * 1.2), 0, -transitionDirection * (planeTravel * 0.4)],
        }),
      },
      {
        scale: screenMotion.interpolate({
          inputRange: [0, 0.58, 1],
          outputRange: [0.96, 1.05, 1.02],
        }),
      },
    ],
  };
  const resultPanelStyle = {
    opacity: resultMotion,
    transform: [
      {
        translateY: resultMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
      {
        scale: resultMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [0.86, 1],
        }),
      },
    ],
  };
  const resultChipStyle = {
    opacity: resultMotion.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateY: resultMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 18],
        }),
      },
      {
        scale: resultMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.7],
        }),
      },
    ],
  };
  const sideDockStyle = isWide
    ? {
        opacity: sideDockMotion,
        transform: [
          {
            translateX: sideDockMotion.interpolate({
              inputRange: [0, 1],
              outputRange: [34, 0],
            }),
          },
        ],
        width: sideDockMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, playSideTargetWidth],
        }),
      }
    : {
        maxHeight: sideDockMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1200],
        }),
        opacity: sideDockMotion,
        transform: [
          {
            translateY: sideDockMotion.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      };
  const sideDockChipStyle = {
    opacity: sideDockMotion.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateX: sideDockMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 28],
        }),
      },
      {
        scale: sideDockMotion.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.86],
        }),
      },
    ],
  };


  useEffect(() => {
    if (!isPlayScreen) return undefined;
    const timer = setTimeout(() => contentScrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [boardSize, isPlayScreen]);

  useEffect(() => {
    if (!session) return undefined;
    let unsubscribe: (() => void) | undefined;
    void services.realtime.subscribe(session.id, (nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setMessage("Online board synced.");
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });
    return () => unsubscribe?.();
  }, [services, session?.id]);

  useEffect(() => {
    if (screen !== "Play" || !snapshot || snapshot.status.isGameOver || !clock.running) return undefined;
    const timer = setInterval(() => {
      setClock((current) => {
        if (snapshot.status.turn === "w") return { ...current, whiteMs: Math.max(0, current.whiteMs - 1000) };
        return { ...current, blackMs: Math.max(0, current.blackMs - 1000) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [clock.running, screen, snapshot?.fen, snapshot?.status.isGameOver, snapshot?.status.turn]);

  useEffect(() => {
    if (clock.whiteMs === 0 || clock.blackMs === 0) {
      setClock((current) => ({ ...current, running: false }));
      setManualResult(clock.whiteMs === 0 ? "Black won on time" : "White won on time");
      setMessage(clock.whiteMs === 0 ? "White flagged on time." : "Black flagged on time.");
    }
  }, [clock.whiteMs, clock.blackMs]);

  async function signedInActor() {
    return data.user ?? (await services.auth.currentUser());
  }

  async function guestActor() {
    return services.profile.getProfile("guest-1");
  }

  async function activeActor() {
    return (await signedInActor()) ?? (await guestActor());
  }

  async function refreshFeatureData(currentSnapshot: GameSnapshot, actorOverride?: UserProfile) {
    const currentUser = await signedInActor();
    await loadFeatureData(currentUser, currentSnapshot, actorOverride ?? currentUser ?? undefined);
  }

  async function bootstrap() {
    let currentUser = await services.auth.currentUser();
    if (!currentUser && isLocalhostRuntime()) {
      currentUser = await services.auth.signInWithGoogleProfile(localhostDevProfile);
    }
    const actor = currentUser ?? (await guestActor());
    const currentSettings = await services.settings.getSettings(actor.id);
    const game = await services.matchmaking.findGame({
      userId: actor.id,
      timeControl: "rapid",
      rated: false,
      funnyMode: true,
    });
    setSession(game);
    setSnapshot(game.snapshot);
    setSettings(currentSettings);
    await loadFeatureData(currentUser, game.snapshot, actor);
  }

  async function loadFeatureData(currentUser: UserProfile | null, currentSnapshot: GameSnapshot, actorOverride?: UserProfile) {
    const actor = actorOverride ?? currentUser ?? (await guestActor());
    const [
      puzzle,
      puzzleRush,
      lessons,
      bots,
      review,
      tournaments,
      clubs,
      leaderboard,
      stats,
      chat,
      friends,
      onlineFriends,
      ads,
      databaseHealth,
      multiplayerStatus,
      rooms,
      pieceSets,
      animationSets,
      animationClips,
    ] = await Promise.all([
      services.puzzles.dailyPuzzle(),
      services.puzzles.listPuzzleRushSet(),
      services.lessons.listLessons(actor.id),
      services.bots.listBots(),
      services.analysis.analyze(currentSnapshot),
      services.tournaments.listTournaments(),
      services.clubs.listClubs(),
      services.leaderboard.topFunnyPlayers(),
      services.stats.getUserStats(actor.id),
      services.chat.listMessages("lobby"),
      services.friends.listFriends(actor.id),
      services.presence.listOnlineFriends(actor.id),
      services.ads.listPlacements(),
      services.database.health(),
      services.multiplayer.serverStatus(),
      services.multiplayer.listRooms(),
      services.animationStudio.listPieceSets(),
      services.animationStudio.listAnimationSets(),
      services.animationStudio.listAnimationClips(),
    ]);
    setData({
      user: currentUser,
      puzzle,
      puzzleRush,
      lessons,
      bots,
      review,
      tournaments,
      clubs,
      leaderboard,
      stats,
      chat,
      friends,
      onlineFriends,
      ads,
      databaseHealth,
      multiplayerStatus,
      rooms,
      pieceSets,
      animationSets,
      animationClips,
    });
  }

  function selectedAnimationSetForSettings() {
    return (
      data.animationSets.find((set) => set.id === settings.animationSetId) ??
      data.animationSets.find((set) => set.isDefault) ??
      data.animationSets[0]
    );
  }

  function selectedPieceSetForSettings() {
    const animationSet = selectedAnimationSetForSettings();
    return (
      data.pieceSets.find((set) => set.id === (settings.pieceSetId ?? animationSet?.pieceSetId)) ??
      data.pieceSets.find((set) => set.id === animationSet?.pieceSetId) ??
      data.pieceSets[0]
    );
  }

  function selectedKingGlbPath() {
    const pieceSet = selectedPieceSetForSettings();
    const kingAsset = pieceSet?.pieces.k;
    return kingAsset?.assetSlots?.celebrate?.path ?? kingAsset?.assetSlots?.move?.path ?? kingAsset?.assetSlots?.static?.path ?? kingAsset?.glbPath;
  }

  function ceremonyRule(action: AnimationAction, piece: PieceKind) {
    return selectedAnimationSetForSettings()?.rules.find((rule) => rule.enabled && rule.action === action && rule.piece === piece) ?? null;
  }

  function ceremonyRuleDuration(rule: AnimationRule | null, fallbackMs: number) {
    if (!rule) return null;
    return animationStackDurationMs(rule.clipStack.map((item) => item.clipId), data.animationClips, rule.speed) || fallbackMs;
  }

  function ceremonyEnabled() {
    return settings.animationsEnabled !== false;
  }

  function ceremonyShareUrl(type: CeremonyClipType, gameId: string, move?: ChessMove, resultText?: string) {
    const location = (globalThis as { location?: { origin?: string } }).location;
    const origin = location?.origin ?? "https://chessalive.com";
    const params = new URLSearchParams({ clip: type, game: gameId });
    if (move) {
      params.set("color", move.color);
      params.set("piece", move.piece);
      params.set("from", move.from);
      params.set("to", move.to);
    }
    if (resultText) params.set("result", resultText);
    return `${origin}/play?${params.toString()}`;
  }

  function buildShareableClip(
    type: CeremonyClipType,
    gameId: string,
    resultText?: string,
    move?: ChessMove,
    durationMs?: number,
  ): ShareableCeremonyClip {
    if (type === "pre-game-handshake") {
      return {
        durationMs: durationMs ?? 5200,
        gameId,
        text: "The ChessAlive kings met at center board before the game started.",
        title: "ChessAlive opening handshake",
        type,
        url: ceremonyShareUrl(type, gameId),
      };
    }
    return {
      durationMs: durationMs ?? 4800,
      gameId,
      move,
      resultText,
      text: resultText ? `ChessAlive checkmate finisher: ${resultText}.` : "ChessAlive checkmate finisher.",
      title: "ChessAlive checkmate clip",
      type,
      url: ceremonyShareUrl(type, gameId, move, resultText),
    };
  }

  function replayMoveFromCeremonyRequest(request: CeremonyReplayRequest, currentSnapshot: GameSnapshot): ChessMove {
    const color = request.color ?? "w";
    const piece = request.piece ?? "q";
    const from = request.from ?? (color === "w" ? "h5" : "h4");
    const to = request.to ?? (color === "w" ? "e7" : "e2");
    return {
      after: currentSnapshot.fen,
      before: currentSnapshot.fen,
      captured: "k",
      color,
      from,
      lan: `${from}${to}`,
      piece,
      san: `${piece === "p" ? "" : piece.toUpperCase()}${to}#`,
      to,
    };
  }

  function activeCheckmateEffectForMove(gameId: string, move: ChessMove): ActiveFunnyEffect | null {
    const animationSet = selectedAnimationSetForSettings();
    const pieceSet = selectedPieceSetForSettings();
    const rule = ceremonyRule("checkmate-finisher", move.piece);
    if (!animationSet || !pieceSet || !rule) return null;
    const event = { gameId, move, funnyMode: settings };
    return {
      effect: effectFromAnimationRule(rule, animationSet, pieceSet, data.animationClips, event),
      event,
      startedAt: Date.now(),
    };
  }

  function activeOpeningCeremonyEffect(gameId: string, currentSnapshot = snapshot): ActiveFunnyEffect | null {
    const animationSet = selectedAnimationSetForSettings();
    const pieceSet = selectedPieceSetForSettings();
    const rule = ceremonyRule("game-start-handshake", "k");
    if (!animationSet || !pieceSet || !rule || !currentSnapshot) return null;
    const event = {
      gameId,
      funnyMode: settings,
      move: {
        after: currentSnapshot.fen,
        before: currentSnapshot.fen,
        color: "w" as const,
        from: "e1" as SquareName,
        lan: "e1e4",
        piece: "k" as PieceKind,
        san: "Opening handshake",
        to: "e4" as SquareName,
      },
    };
    return {
      effect: effectFromAnimationRule(rule, animationSet, pieceSet, data.animationClips, event),
      event,
      startedAt: Date.now(),
    };
  }

  function startOpeningCeremony(gameId: string, _funnyMode = true, currentSnapshot = snapshot) {
    if (!ceremonyEnabled()) return;
    const durationMs = ceremonyRuleDuration(ceremonyRule("game-start-handshake", "k"), 5200);
    if (!durationMs) return;
    const effect = activeOpeningCeremonyEffect(gameId, currentSnapshot);
    if (!effect) {
      setMessage("Opening ceremony needs a configured king GLB animation.");
      return;
    }
    const clip = buildShareableClip("pre-game-handshake", gameId, undefined, undefined, durationMs);
    setActiveCeremony({ durationMs, effect, gameId, opponentKingGlbPath: selectedKingGlbPath(), startedAt: Date.now(), type: "pre-game-handshake" });
    setShareableClip(clip);
  }

  function startCheckmateCeremony(gameId: string, move: ChessMove, resultText: string, effect: ActiveFunnyEffect | null) {
    if (!ceremonyEnabled()) return;
    const resolvedEffect = effect ?? activeCheckmateEffectForMove(gameId, move);
    if (!resolvedEffect) return;
    const durationMs = Math.max(4200, resolvedEffect.effect.durationMs ?? 4800);
    const clip = buildShareableClip("checkmate-finisher", gameId, resultText, move, durationMs);
    setActiveCeremony({ durationMs, effect: resolvedEffect, gameId, move, opponentKingGlbPath: selectedKingGlbPath(), resultText, startedAt: Date.now(), type: "checkmate-finisher" });
    setShareableClip(clip);
  }

  async function shareCurrentClip() {
    if (!shareableClip) return;
    const navigatorRef = globalThis as {
      navigator?: {
        clipboard?: { writeText: (text: string) => Promise<void> };
        canShare?: (data: { files?: File[]; text?: string; title?: string }) => boolean;
        share?: (data: { files?: File[]; text?: string; title?: string; url?: string }) => Promise<void>;
      };
    };
    try {
      setMessage(shareableClip.type === "checkmate-finisher" ? "Rendering checkmate ceremony video..." : "Rendering opening ceremony video...");
      const videoBlob = await renderShareableClipVideo(shareableClip);
      const fileExtension = videoBlob.type.includes("mp4") ? "mp4" : "webm";
      const videoFile = new File([videoBlob], `chessalive-${shareableClip.type}-${Date.now()}.${fileExtension}`, {
        type: videoBlob.type || "video/webm",
      });
      if (navigatorRef.navigator?.share && navigatorRef.navigator.canShare?.({ files: [videoFile] })) {
        await navigatorRef.navigator.share({ files: [videoFile], title: shareableClip.title, text: shareableClip.text });
        setMessage("Clip video share sheet opened.");
        return;
      }
      downloadBlob(videoBlob, videoFile.name);
      setMessage("Clip video downloaded.");
    } catch (error) {
      console.error("[ChessAlive clip share] video render failed", error);
      const detail = error instanceof Error ? error.message : "Unknown renderer error";
      setMessage(`Could not render the ceremony video: ${detail}`);
    }
  }

  async function renderShareableClipVideo(clip: ShareableCeremonyClip) {
    const runtime = globalThis as {
      document?: Document;
      Image?: { new (): HTMLImageElement };
      MediaRecorder?: typeof MediaRecorder;
      requestAnimationFrame?: (callback: FrameRequestCallback) => number;
    };
    const node = resultClipStageRef.current as HTMLElement | null;
    if (!runtime.document || !runtime.Image || !runtime.MediaRecorder || !node) {
      throw new Error("Video rendering is only available in the web app.");
    }
    if (clip.type === "checkmate-finisher" && clip.move) {
      const effect = activeCheckmateEffectForMove(clip.gameId, clip.move);
      setResultExpanded(true);
      setManualResult(clip.resultText ?? manualResult);
      setActiveCeremony({
        durationMs: clip.durationMs,
        effect: effect ?? undefined,
        gameId: clip.gameId,
        move: clip.move,
        opponentKingGlbPath: selectedKingGlbPath(),
        resultText: clip.resultText,
        startedAt: Date.now(),
        type: "checkmate-finisher",
      });
    } else if (clip.type === "pre-game-handshake") {
      const effect = activeOpeningCeremonyEffect(clip.gameId);
      setActiveCeremony({ durationMs: clip.durationMs, effect: effect ?? undefined, gameId: clip.gameId, opponentKingGlbPath: selectedKingGlbPath(), startedAt: Date.now(), type: "pre-game-handshake" });
    }
    setClipRendering(true);
    await waitMs(320);
    try {
      const durationMs = Math.min(9000, Math.max(2600, clip.durationMs));
      try {
        return await renderElementToWebVideo(node, durationMs, (progress) => {
          if (progress === 0 || progress === 1 || progress % 0.25 < 0.04) {
            setMessage(`Rendering ceremony video ${Math.round(progress * 100)}%...`);
          }
        });
      } catch (error) {
        console.warn("[ChessAlive clip share] DOM recorder failed, using canvas fallback", error);
        setMessage("Rendering ceremony video with fallback renderer...");
        return await renderCeremonyFallbackVideo(clip, durationMs);
      }
    } finally {
      setClipRendering(false);
    }
  }

  async function startNewGame(funnyMode = true, options?: { botId?: string; color?: "w" | "b"; practice?: boolean }) {
    if (p2pMatchMeta || p2pPeerRef.current) resetP2PMatch();
    const currentUser = await activeActor();
    const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
    const game = await services.matchmaking.findGame({
      userId: currentUser.id,
      timeControl: preset.group.toLowerCase() as "bullet" | "blitz" | "rapid",
      rated: false,
      funnyMode: true,
    });
    setSession(game);
    setSnapshot(game.snapshot);
    setSelected(null);
    setActiveEffect(null);
    setActiveCeremony(null);
    setShareableClip(null);
    setActiveBotId(options?.botId ?? null);
    setPracticeMode(Boolean(options?.practice));
    setPlayerColor(options?.color ?? "w");
    setMatchSearch("idle");
    setManualResult(null);
    setReplayPly(null);
    setPremoves([]);
    setPlayPanelTab("moves");
    setClock({ whiteMs: preset.baseMs, blackMs: preset.baseMs, running: true });
    navigateTo("Play");
    setPlayPhase("game");
    setMessage(options?.practice ? "Practice match started. The bot will move automatically." : "Game ready. Opening and checkmate ceremonies are enabled.");
    startOpeningCeremony(game.id, true, game.snapshot);
    await refreshFeatureData(game.snapshot, currentUser);
    if (options?.practice && (options.color ?? "w") === "b" && options.botId) {
      const botId = options.botId;
      setTimeout(() => void chooseBotMoveForTurn(services, game.snapshot, botId).then(async (intent) => {
        if (!intent) return;
        const result = await services.realtime.submitMove(game.id, intent);
        setSnapshot(result.snapshot);
        setActiveEffect(null);
        setMessage(result.move ? `${result.move.san}: bot opened as White.` : "Bot opening was not legal.");
      }), 350);
    }
  }

  async function startPracticeGame(color: "w" | "b" = playerColor) {
    const botId = data.bots[0]?.id ?? "drama-bot";
    await startNewGame(true, { botId, color, practice: true });
  }

  async function findLiveMatch() {
    if (p2pMatchMeta || p2pPeerRef.current) resetP2PMatch();
    const currentUser = await activeActor();
    const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
    setMatchSearch("searching");
    setPlayPhase("searching");
    setMessage(`Preparing a quick local ${preset.label} board.`);
    navigateTo("Play");
    setPlayPhase("searching");
    contentScrollRef.current?.scrollTo({ y: 0, animated: true });
    await new Promise((resolve) => setTimeout(resolve, 900));
    const game = await services.matchmaking.findGame({
      userId: currentUser.id,
      timeControl: preset.group.toLowerCase() as "bullet" | "blitz" | "rapid",
      rated: true,
      funnyMode: true,
      preferredRating: currentUser.rating.rapid,
      ratingWindow: 150,
    });
    setSession(game);
    setSnapshot(game.snapshot);
    setSelected(null);
    setActiveEffect(null);
    setMatchSearch("idle");
    setActiveBotId(null);
    setPracticeMode(false);
    setPlayerColor("w");
    setManualResult(null);
    setReplayPly(null);
    setPremoves([]);
    setPlayPanelTab("moves");
    setClock({ whiteMs: preset.baseMs, blackMs: preset.baseMs, running: true });
    setMatchSearch("matched");
    setPlayPhase("game");
    setMessage(`Quick local ${preset.label} board ready. Use friend match for TURN-relayed P2P play.`);
    startOpeningCeremony(game.id, true, game.snapshot);
    await refreshFeatureData(game.snapshot, currentUser);
  }

  function setP2PConnection(connection: P2PConnectionState) {
    logP2PApp("connection state", { connection, hasSession: Boolean(sessionRef.current), hasSnapshot: Boolean(snapshotRef.current) });
    setP2pPanel((current) => ({ ...current, connection }));
    if (connection === "connected" && sessionRef.current && snapshotRef.current && !p2pGameStartedRef.current) {
      p2pGameStartedRef.current = true;
      setPlayPhase("game");
      setMatchSearch("matched");
      setP2pPanel((current) => ({ ...current, connection, error: null }));
      stopP2PAnswerPolling();
      setMessage("TURN-relayed P2P connection established. You can play now.");
      startOpeningCeremony(sessionRef.current.id, true, snapshotRef.current);
    } else if (connection === "connected") {
      setPlayPhase("game");
      setMatchSearch("matched");
      stopP2PAnswerPolling();
      setP2pPanel((current) => ({ ...current, connection, error: null }));
    } else if (connection === "error") {
      setMatchSearch("idle");
      if (!p2pGameStartedRef.current) setPlayPhase("setup");
      setP2pPanel((current) => ({
        ...current,
        connection,
        error: "TURN-relayed P2P failed. Check Cloudflare TURN credentials and both browser consoles.",
      }));
      setMessage("TURN-relayed P2P connection failed. Check console logs and the Cloudflare TURN credential endpoint.");
    }
  }

  function createP2PPeer() {
    logP2PApp("creating peer");
    p2pPeerRef.current?.close();
    const peer = new BrowserP2PChessPeer({
      onConnectionStateChange: setP2PConnection,
      onMessage: (payload) => p2pMessageHandlerRef.current(payload),
    });
    p2pPeerRef.current = peer;
    return peer;
  }

  function stopP2PAnswerPolling() {
    if (!p2pAnswerPollRef.current) return;
    clearInterval(p2pAnswerPollRef.current);
    p2pAnswerPollRef.current = null;
  }

  async function p2pApi<T>(path: string, init?: RequestInit): Promise<T> {
    const fetcher = (globalThis as { fetch?: typeof fetch }).fetch;
    if (!fetcher) throw new Error("This browser cannot contact the ChessAlive signaling service.");
    const extraHeaders = (init?.headers ?? {}) as Record<string, string>;
    const response = await fetcher(path, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? `ChessAlive signaling failed with HTTP ${response.status}.`);
    }
    return payload as T;
  }

  async function pollP2PAnswerOnce(inviteId: string) {
    if (p2pAcceptingAnswerRef.current || p2pPeerRef.current?.isOpen()) return;
    const invite = await p2pApi<P2PInviteApiResponse>(`/p2p/invites/${encodeURIComponent(inviteId)}/answer`);
    if (!invite.answerToken) return;
    setP2pPanel((current) => ({ ...current, answerToken: invite.answerToken ?? "", remoteSignal: invite.answerToken ?? "" }));
    await acceptP2PAnswerToken(invite.answerToken);
  }

  function startP2PAnswerPolling(inviteId: string) {
    stopP2PAnswerPolling();
    void pollP2PAnswerOnce(inviteId).catch((error) => {
      logP2PAppError("failed to poll P2P answer", error);
      setP2pPanel((current) => ({ ...current, error: error instanceof Error ? error.message : "Could not poll P2P invite answer." }));
    });
    p2pAnswerPollRef.current = setInterval(() => {
      void pollP2PAnswerOnce(inviteId).catch((error) => {
        logP2PAppError("failed to poll P2P answer", error);
        setP2pPanel((current) => ({ ...current, error: error instanceof Error ? error.message : "Could not poll P2P invite answer." }));
      });
    }, 1500);
  }

  async function copyP2PText(value: string, successMessage: string) {
    const clipboard = (globalThis as { navigator?: { clipboard?: { writeText: (text: string) => Promise<void> } } }).navigator?.clipboard;
    if (!clipboard) {
      setMessage("Clipboard is unavailable in this browser. Select and copy the code manually.");
      return;
    }
    await clipboard.writeText(value);
    setMessage(successMessage);
  }

  async function startP2PHost(rated: boolean) {
    logP2PApp("host flow started", { rated, selectedTimeControl });
    const currentUser = await activeActor();
    const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
    const game = await services.matchmaking.findGame({
      userId: currentUser.id,
      timeControl: preset.group.toLowerCase() as "bullet" | "blitz" | "rapid",
      rated,
      funnyMode: true,
    });
    const nextSession = {
      ...game,
      black: p2pWaitingPlayer(),
      white: currentUser,
    };
    const meta: P2PMatchMeta = {
      createdAt: new Date().toISOString(),
      funnyMode: true,
      gameId: `p2p-${game.id}`,
      host: p2pProfileFromUser(currentUser),
      rated,
      timeControl: preset.id,
      witnessCount: 0,
    };
    setSession(nextSession);
    sessionRef.current = nextSession;
    setSnapshot(game.snapshot);
    snapshotRef.current = game.snapshot;
    setP2pMatchMeta(meta);
    setPlayerColor("w");
    setPracticeMode(false);
    setActiveBotId(null);
    setActiveEffect(null);
    setActiveCeremony(null);
    setShareableClip(null);
    setManualResult(null);
    setReplayPly(null);
    setPremoves([]);
    setClock({ whiteMs: preset.baseMs, blackMs: preset.baseMs, running: true });
    p2pGameStartedRef.current = false;
    const peer = createP2PPeer();
    try {
      const inviteToken = await peer.createOffer(meta, p2pProfileFromUser(currentUser));
      const invite = await p2pApi<P2PInviteApiResponse>("/p2p/invites", {
        body: JSON.stringify({
          host: p2pProfileFromUser(currentUser),
          meta,
          offerToken: inviteToken,
        }),
        method: "POST",
      });
      startP2PAnswerPolling(invite.id);
      setP2pPanel((current) => ({
        ...current,
        answerToken: "",
        connection: "waiting-answer",
        error: null,
        inviteId: invite.id,
        inviteToken,
        inviteUrl: invite.inviteUrl || p2pInviteUrl(invite.id),
        mode: "host",
        rated,
        remoteSignal: "",
      }));
      navigateTo("Play");
      setPlayPhase("setup");
      setMessage("Friend invite ready. Share the link; the game will connect automatically when your friend opens it.");
    } catch (error) {
      logP2PAppError("failed to create host invite", error);
      setP2pPanel((current) => ({
        ...current,
        connection: "error",
        error: error instanceof Error ? error.message : "Could not create P2P invite.",
        mode: "host",
        rated,
      }));
    }
  }

  async function createP2PAnswer() {
    logP2PApp("answer flow started", { selectedTimeControl });
    const currentUser = await activeActor();
    const offerToken = p2pPanel.remoteSignal.trim();
    if (!offerToken) {
      setP2pPanel((current) => ({ ...current, error: "Paste the host invite code first." }));
      return;
    }
    const peer = createP2PPeer();
    try {
      const { answerToken, meta } = await peer.createAnswer(offerToken, p2pProfileFromUser(currentUser));
      logP2PApp("answer token generated", { gameId: meta.gameId, rated: meta.rated, timeControl: meta.timeControl });
      const preset = timePresets.find((item) => item.id === meta.timeControl) ?? timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
      const game = await services.matchmaking.findGame({
        userId: currentUser.id,
        timeControl: preset.group.toLowerCase() as "bullet" | "blitz" | "rapid",
        rated: meta.rated,
        funnyMode: true,
      });
      const nextSession = {
        ...game,
        black: currentUser,
        funnyMode: { ...settings, enabled: true },
        white: userProfileFromP2P(meta.host),
      };
      setSession(nextSession);
      sessionRef.current = nextSession;
      setSnapshot(game.snapshot);
      snapshotRef.current = game.snapshot;
      setP2pMatchMeta(meta);
      setSelectedTimeControl(preset.id);
      setPlayerColor("b");
      setPracticeMode(false);
      setActiveBotId(null);
      setActiveEffect(null);
      setActiveCeremony(null);
      setShareableClip(null);
      setManualResult(null);
      setReplayPly(null);
      setPremoves([]);
      setClock({ whiteMs: preset.baseMs, blackMs: preset.baseMs, running: true });
      p2pGameStartedRef.current = false;
      setP2pPanel((current) => ({
        ...current,
        answerToken,
        connection: "answer-ready",
        error: null,
        inviteId: "",
        inviteToken: "",
        inviteUrl: "",
        mode: "join",
        rated: meta.rated,
      }));
      navigateTo("Play");
      setPlayPhase("setup");
      setMessage("Answer code ready. Send it back to the host to connect directly.");
    } catch (error) {
      logP2PAppError("failed to create answer", error);
      setP2pPanel((current) => ({
        ...current,
        connection: "error",
        error: error instanceof Error ? error.message : "Could not generate answer code.",
        mode: "join",
      }));
    }
  }

  async function joinP2PInvite(inviteId: string) {
    logP2PApp("auto join flow started", { inviteId });
    const currentUser = await activeActor();
    setP2pPanel((current) => ({
      ...current,
      answerToken: "",
      connection: "creating-answer",
      error: null,
      inviteId,
      inviteToken: "",
      inviteUrl: p2pInviteUrl(inviteId),
      mode: "join",
      remoteSignal: "",
    }));
    writeRouteForScreen("Play", "replace");
    transitionToScreen("Play");
    setPlayPhase("setup");
    setMessage("Opening friend invite and preparing TURN relay...");
    const peer = createP2PPeer();
    try {
      const invite = await p2pApi<P2PInviteApiResponse>(`/p2p/invites/${encodeURIComponent(inviteId)}`);
      if (!invite.offerToken) throw new Error("This friend invite is missing its WebRTC offer.");
      const { answerToken, meta } = await peer.createAnswer(invite.offerToken, p2pProfileFromUser(currentUser));
      logP2PApp("auto answer generated", { gameId: meta.gameId, inviteId, rated: meta.rated, timeControl: meta.timeControl });
      const preset = timePresets.find((item) => item.id === meta.timeControl) ?? timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
      const game = await services.matchmaking.findGame({
        userId: currentUser.id,
        timeControl: preset.group.toLowerCase() as "bullet" | "blitz" | "rapid",
        rated: meta.rated,
        funnyMode: true,
      });
      const nextSession = {
        ...game,
        black: currentUser,
        funnyMode: { ...settings, enabled: true },
        white: userProfileFromP2P(meta.host),
      };
      setSession(nextSession);
      sessionRef.current = nextSession;
      setSnapshot(game.snapshot);
      snapshotRef.current = game.snapshot;
      setP2pMatchMeta(meta);
      setSelectedTimeControl(preset.id);
      setPlayerColor("b");
      setPracticeMode(false);
      setActiveBotId(null);
      setActiveEffect(null);
      setActiveCeremony(null);
      setShareableClip(null);
      setManualResult(null);
      setReplayPly(null);
      setPremoves([]);
      setClock({ whiteMs: preset.baseMs, blackMs: preset.baseMs, running: true });
      p2pGameStartedRef.current = false;
      await p2pApi<P2PInviteApiResponse>(`/p2p/invites/${encodeURIComponent(inviteId)}/answer`, {
        body: JSON.stringify({
          answerToken,
          guest: p2pProfileFromUser(currentUser),
        }),
        method: "POST",
      });
      setP2pPanel((current) => ({
        ...current,
        answerToken,
        connection: "connecting",
        error: null,
        inviteId,
        inviteToken: invite.offerToken ?? "",
        inviteUrl: invite.inviteUrl || p2pInviteUrl(inviteId),
        mode: "join",
        rated: meta.rated,
        remoteSignal: "",
      }));
      setMessage("Joined friend invite. Waiting for the TURN-relayed data channel to open.");
    } catch (error) {
      logP2PAppError("failed to join P2P invite", error);
      setP2pPanel((current) => ({
        ...current,
        connection: "error",
        error: error instanceof Error ? error.message : "Could not join this friend invite.",
        mode: "join",
      }));
      setMessage("Could not join the friend invite. Check console logs for the signaling error.");
    }
  }

  async function acceptP2PAnswerToken(answerToken: string) {
    if (p2pAcceptingAnswerRef.current) return;
    p2pAcceptingAnswerRef.current = true;
    if (!answerToken) {
      setP2pPanel((current) => ({ ...current, error: "Paste your friend's answer code first." }));
      p2pAcceptingAnswerRef.current = false;
      return;
    }
    try {
      if (!p2pPeerRef.current) throw new Error("No active P2P host peer. Create a P2P invite again, then paste the answer code.");
      const status = await p2pPeerRef.current.acceptAnswer(answerToken);
      stopP2PAnswerPolling();
      logP2PApp("answer accepted; waiting for data channel");
      setP2pPanel((current) => ({ ...current, connection: "connecting", error: null }));
      setPlayPhase("setup");
      setMessage(status === "already-applied" ? "Answer was already applied. Waiting for the data channel to open." : "Friend joined. Waiting for the TURN-relayed data channel to open.");
    } catch (error) {
      logP2PAppError("failed to accept answer", error);
      setP2pPanel((current) => ({
        ...current,
        connection: "error",
        error: error instanceof Error ? error.message : "Could not accept answer code.",
      }));
    } finally {
      p2pAcceptingAnswerRef.current = false;
    }
  }

  async function acceptP2PAnswer() {
    logP2PApp("accept answer requested");
    await acceptP2PAnswerToken(p2pPanel.remoteSignal.trim());
  }

  function resetP2PMatch() {
    logP2PApp("reset match");
    stopP2PAnswerPolling();
    p2pPeerRef.current?.close();
    p2pPeerRef.current = null;
    p2pAcceptingAnswerRef.current = false;
    p2pGameStartedRef.current = false;
    setP2pMatchMeta(null);
    setP2pPanel({
      answerToken: "",
      connection: "idle",
      error: null,
      inviteId: "",
      inviteToken: "",
      inviteUrl: "",
      mode: "idle",
      rated: false,
      remoteSignal: "",
    });
    setMessage("P2P match reset.");
  }

  function handleP2PMessage(payload: P2PChessMessage) {
    logP2PApp("message received", { type: payload.type });
    if (payload.type === "hello") {
      const remoteUser = userProfileFromP2P(payload.player);
      setSession((current) => {
        if (!current) return current;
        return payload.color === "w" ? { ...current, white: remoteUser } : { ...current, black: remoteUser };
      });
      setMessage(`${payload.player.displayName} connected by TURN-relayed P2P. Chess moves are on the data channel.`);
      setPlayPhase("game");
      const currentSession = sessionRef.current;
      const currentSnapshot = snapshotRef.current;
      if (currentSession && currentSnapshot && !p2pGameStartedRef.current) {
        p2pGameStartedRef.current = true;
        startOpeningCeremony(currentSession.id, true, currentSnapshot);
      }
      return;
    }
    if (payload.type === "move") {
      void submitMove(payload.intent, "peer").catch((error) => {
        logP2PAppError("failed to apply peer move", error);
        setMessage("Received a P2P move, but applying it failed. Check console logs.");
      });
      return;
    }
    if (payload.type === "resign") {
      const resultText = payload.color === "w" ? "Black won by resignation" : "White won by resignation";
      setClock((current) => ({ ...current, running: false }));
      setManualResult(resultText);
      setResultExpanded(true);
      setMessage("Your friend resigned over P2P.");
    }
  }

  async function startBotGame(botId: string) {
    if (p2pMatchMeta || p2pPeerRef.current) resetP2PMatch();
    const currentUser = await activeActor();
    const game = await services.matchmaking.findGame({
      userId: currentUser.id,
      timeControl: "rapid",
      rated: false,
      funnyMode: true,
    });
    setActiveBotId(botId);
    setPracticeMode(true);
    setPlayerColor("w");
    setSession(game);
    setSnapshot(game.snapshot);
    setSelected(null);
    setActiveEffect(null);
    setActiveCeremony(null);
    setShareableClip(null);
    setManualResult(null);
    setReplayPly(null);
    setPremoves([]);
    setPlayPanelTab("moves");
    setClock({ whiteMs: defaultClockMs, blackMs: defaultClockMs, running: true });
    navigateTo("Play");
    setPlayPhase("game");
    setMessage(`${data.bots.find((bot) => bot.id === botId)?.name ?? "Bot"} joined as Black.`);
    startOpeningCeremony(game.id, true, game.snapshot);
    await refreshFeatureData(game.snapshot, currentUser);
  }

  async function toggleFunnyMode() {
    const currentUser = await activeActor();
    const next = { ...settings, enabled: !settings.enabled };
    setSettings(next);
    await services.settings.saveSettings(currentUser.id, next);
    await startNewGame(next.enabled);
  }

  async function startTrialGame() {
    const currentUser = await activeActor();
    if (!settings.enabled) {
      const next = { ...settings, enabled: true };
      setSettings(next);
      await services.settings.saveSettings(currentUser.id, next);
    }
    await startNewGame(true);
  }

  function sessionFromRoom(room: MultiplayerRoom, fallbackUser = data.user): GameSession | null {
    if (!room.snapshot || !fallbackUser) return null;
    return {
      id: room.id,
      white: room.players.white ?? fallbackUser,
      black: room.players.black ?? {
        id: "waiting",
        displayName: "Waiting for opponent",
        avatarEmoji: "⏳",
        rating: { blitz: 1000, rapid: 1000, bullet: 1000, funny: 1000 },
      },
      snapshot: room.snapshot,
      funnyMode: { enabled: room.funnyMode, musicEnabled: settings.musicEnabled, intensity: settings.intensity },
      createdAt: room.createdAt,
    };
  }

  async function startOnlineRoom() {
    if (p2pMatchMeta || p2pPeerRef.current) resetP2PMatch();
    const currentUser = await activeActor();
    const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
    const room = await services.multiplayer.createRoom(currentUser.id, {
      timeControl: preset.id,
      rated: false,
      funnyMode: true,
    });
    const nextSession = sessionFromRoom(room, currentUser);
    if (nextSession) {
      setSession(nextSession);
      setSnapshot(nextSession.snapshot);
      setActiveBotId(null);
      setActiveEffect(null);
      setActiveCeremony(null);
      setShareableClip(null);
      setPracticeMode(false);
      setPlayerColor(nextSession.black.id === currentUser.id ? "b" : "w");
      setMatchSearch("idle");
      setManualResult(null);
      setReplayPly(null);
      setPremoves([]);
      setPlayPanelTab("moves");
      setClock({ whiteMs: preset.baseMs, blackMs: preset.baseMs, running: true });
      navigateTo("Play");
      setPlayPhase("game");
      setMessage(`Online room ${room.code} is ready. Share it from another tab to join.`);
      startOpeningCeremony(nextSession.id, true, nextSession.snapshot);
    }
    await refreshFeatureData(room.snapshot ?? snapshot ?? createChessEngine().newGame(), currentUser);
  }

  async function joinOnlineRoom(roomId: string) {
    const currentUser = await activeActor();
    const room = await services.multiplayer.joinRoom(currentUser.id, roomId);
    const nextSession = sessionFromRoom(room, currentUser);
    if (nextSession) {
      setSession(nextSession);
      setSnapshot(nextSession.snapshot);
      setActiveBotId(null);
      setActiveEffect(null);
      setActiveCeremony(null);
      setShareableClip(null);
      setPracticeMode(false);
      setPlayerColor(nextSession.black.id === currentUser.id ? "b" : "w");
      setMatchSearch("idle");
      setManualResult(null);
      setReplayPly(null);
      setPremoves([]);
      setPlayPanelTab("moves");
      setClock({ whiteMs: defaultClockMs, blackMs: defaultClockMs, running: true });
      navigateTo("Play");
      setPlayPhase("game");
      setMessage(`Joined live room ${room.code}. Moves sync through the realtime server.`);
      startOpeningCeremony(nextSession.id, true, nextSession.snapshot);
    }
    await refreshFeatureData(room.snapshot ?? snapshot ?? createChessEngine().newGame(), currentUser);
  }

  async function viewOnlineRoom(roomId: string) {
    const currentUser = await activeActor();
    const rooms = await services.multiplayer.listRooms();
    const room = rooms.find((item) => item.id === roomId);
    const nextSession = room ? sessionFromRoom(room, currentUser) : null;
    if (!room || !nextSession) {
      setMessage("That live match is no longer available.");
      navigateTo("Social");
      return;
    }
    setSession(nextSession);
    setSnapshot(nextSession.snapshot);
    setActiveBotId(null);
    setPracticeMode(false);
    setPlayerColor(nextSession.black.id === currentUser.id ? "b" : "w");
    setMatchSearch("idle");
    setManualResult(null);
    setReplayPly(null);
    setPremoves([]);
    setPlayPanelTab("moves");
    setClock({ whiteMs: defaultClockMs, blackMs: defaultClockMs, running: true });
    navigateTo("Play");
    setPlayPhase("game");
    setMessage(`Viewing ${room.code}: ${nextSession.white.displayName} vs ${nextSession.black.displayName}.`);
    await refreshFeatureData(room.snapshot ?? nextSession.snapshot, currentUser);
  }

  async function openTournament(tournament: Tournament) {
    const currentUser = await activeActor();
    if (!tournament.joined) {
      await services.tournaments.joinTournament(currentUser.id, tournament.id);
    }
    await startNewGame(tournament.funnyMode);
    setMessage(`${tournament.name} board opened. You are paired for a ${tournament.format} event.`);
  }

  async function reloadCurrentData() {
    const currentSnapshot = snapshot ?? createChessEngine().newGame();
    await refreshFeatureData(currentSnapshot);
  }

  async function finishAuth(nextUser: UserProfile) {
    const currentSnapshot = snapshot ?? createChessEngine().newGame();
    const currentSettings = await services.settings.getSettings(nextUser.id);
    setSettings({ ...currentSettings, customRules: normalizeCustomRules(currentSettings.customRules) });
    await loadFeatureData(nextUser, currentSnapshot, nextUser);
    setMessage(`Signed in as ${nextUser.displayName}. Your board is ready.`);
  }

  function offerDraw() {
    setPlayPanelTab("chat");
    setMessage("Draw offer sent. Waiting for opponent response.");
  }

  function resignGame() {
    p2pPeerRef.current?.sendResign(localPlayerColor());
    setClock((current) => ({ ...current, running: false }));
    setManualResult(localPlayerColor() === "w" ? "Black won by resignation" : "White won by resignation");
    setMessage(p2pMatchMeta ? "You resigned. Your friend was notified over P2P." : "You resigned. Game review and rematch are ready.");
    setPlayPanelTab("moves");
  }

  function localPlayerColor(): "w" | "b" {
    if (p2pMatchMeta) return playerColor;
    if (practiceMode) return playerColor;
    if (data.user && session?.black.id === data.user.id) return "b";
    return "w";
  }

  function swapPracticeColor() {
    if (!practiceMode) return;
    const nextColor = playerColor === "w" ? "b" : "w";
    setMessage(nextColor === "w" ? "Restarting practice as White." : "Restarting practice as Black. The bot will open as White.");
    void startPracticeGame(nextColor).then(() => setPlayPanelTab("info"));
  }

  function queuePremove(from: SquareName, to: SquareName) {
    if (!snapshot || from === to) return;
    const inputBoard = applyPremovesToBoard(snapshot.board, premovesRef.current, localPlayerColor());
    const piece = inputBoard.find((item) => item.square === from)?.piece;
    if (!piece || piece.color !== localPlayerColor() || snapshot.status.turn === localPlayerColor()) return;
    setPremoves((current) => [...current, { from, to }]);
    setSelected(null);
    setMessage(`Premove ${premovesRef.current.length + 1} queued: ${from.toUpperCase()} to ${to.toUpperCase()}.`);
  }

  async function playNextPremove(delay = 160, currentSnapshot = snapshot) {
    if (!session || !currentSnapshot || premovesRef.current.length === 0) return;
    if (currentSnapshot.status.turn !== localPlayerColor()) return;
    if (premovePlaybackRef.current) return;
    premovePlaybackRef.current = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, delay));
      let workingSnapshot = currentSnapshot;
      while (premovesRef.current.length > 0 && workingSnapshot.status.turn === localPlayerColor() && !workingSnapshot.status.isGameOver) {
        const [next, ...rest] = premovesRef.current;
        setPremoves(rest);
        const result = await submitMove(next, "premove");
        if (!result?.snapshot) break;
        workingSnapshot = result.snapshot;
        if (result.move) break;
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    } finally {
      premovePlaybackRef.current = false;
    }
  }

  async function submitMove(intent: MoveIntent, source: "live" | "premove" | "peer" = "live") {
    if (!session) return null;
    if (p2pMatchMeta && source !== "peer" && !p2pPeerRef.current?.isOpen()) {
      setMessage("Connect your P2P friend before making the first move.");
      return null;
    }
    const result = await services.realtime.submitMove(session.id, intent);
    if (!result.move) {
      setMessage(source === "premove" ? "Premove skipped because the position changed." : "That move is not legal in this position.");
      return result;
    }
    setSnapshot(result.snapshot);
    snapshotRef.current = result.snapshot;
    setReplayPly(null);
    setSelected(null);
    if (source !== "peer" && p2pPeerRef.current?.isOpen()) {
      p2pPeerRef.current.sendMove(intent, result.snapshot.history.length, result.move.san, result.snapshot.fen);
    }
    const isCheckmateMove = result.move.san.includes("#");
    setActiveEffect(null);
    setMessage(isCheckmateMove && result.effect ? `${result.move.san}: ${result.effect.effect.title}` : `${result.move.san} played.`);
    if (result.snapshot.status.isGameOver) {
      setClock((current) => ({ ...current, running: false }));
      setManualResult(result.snapshot.status.resultText);
      setResultExpanded(true);
      if (isCheckmateMove) startCheckmateCeremony(session.id, result.move, result.snapshot.status.resultText, result.effect);
    }
    await refreshFeatureData(result.snapshot);
    if (activeBotId && result.move.color === localPlayerColor() && !result.snapshot.status.isGameOver) {
      setTimeout(() => {
        void chooseBotMoveForTurn(services, result.snapshot, activeBotId).then((intent) => {
          if (intent) void submitMove(intent);
        });
      }, 450);
    } else if (source !== "premove" && !result.snapshot.status.isGameOver && result.snapshot.status.turn === localPlayerColor() && premovesRef.current.length > 0) {
      setTimeout(() => void playNextPremove(160, result.snapshot), 120);
    }
    return result;
  }

  async function askBotToMove(botId: string) {
    if (!snapshot) return;
    const intent = await chooseBotMoveForTurn(services, snapshot, botId);
    if (intent) await submitMove(intent);
  }

  function handleSquarePress(square: SquareName) {
    if (!snapshot) return;
    if (replayPly !== null) {
      setReplayPly(null);
      setSelected(null);
      setMessage("Back to the live board.");
      return;
    }
    const inputBoard = applyPremovesToBoard(snapshot.board, premovesRef.current, localPlayerColor());
    const cell = inputBoard.find((item) => item.square === square);
    const selectedPiece = selected ? inputBoard.find((item) => item.square === selected)?.piece : null;
    if (selected && snapshot.status.turn === localPlayerColor() && snapshot.legalMoves[selected]?.includes(square)) {
      void submitMove({ from: selected, to: square });
      return;
    }
    if (selected && selectedPiece?.color === localPlayerColor() && snapshot.status.turn !== localPlayerColor()) {
      queuePremove(selected, square);
      return;
    }
    if (cell?.piece && cell.piece.color === localPlayerColor()) {
      setSelected(square);
      setMessage(snapshot.status.turn === localPlayerColor() ? `${square.toUpperCase()} selected.` : `Premove from ${square.toUpperCase()} selected.`);
      return;
    }
    setSelected(null);
  }

  function handlePieceDrop(from: SquareName, to: SquareName) {
    if (!snapshot) return;
    if (replayPly !== null) {
      setReplayPly(null);
      setSelected(null);
      setMessage("Back to the live board.");
      return;
    }
    const inputBoard = applyPremovesToBoard(snapshot.board, premovesRef.current, localPlayerColor());
    const cell = inputBoard.find((item) => item.square === from);
    if (snapshot.status.turn === localPlayerColor() && snapshot.legalMoves[from]?.includes(to)) {
      void submitMove({ from, to });
      return;
    }
    if (cell?.piece && cell.piece.color === localPlayerColor() && snapshot.status.turn !== localPlayerColor()) {
      queuePremove(from, to);
      return;
    }
    if (cell?.piece && cell.piece.color === localPlayerColor()) {
      setSelected(from);
      setMessage(`${from.toUpperCase()} selected.`);
    }
  }

  function renderMain(targetScreen: Screen = screen) {
    if (!snapshot || !session) return <Panel title="Loading">Preparing the board.</Panel>;
    if (targetScreen === "Premium") return <PremiumScreen user={data.user} onNavigate={navigateTo} />;
    if (targetScreen === "Home") {
      return (
        <HomeScreen
          data={data}
          session={session}
          services={services}
          snapshot={snapshot}
          theme={theme}
          onSignedIn={(user) => void finishAuth(user)}
          onNavigate={navigateTo}
          onViewRoom={(roomId) => void viewOnlineRoom(roomId)}
          selectedTimeControl={selectedTimeControl}
          onFindLiveMatch={() => void findLiveMatch()}
        />
      );
    }
    if (targetScreen === "Play") {
      if (playPhase !== "game") {
        return (
          <PlaySetupScreen
            bots={data.bots}
            matchSearch={matchSearch}
            onAcceptP2PAnswer={() => void acceptP2PAnswer()}
            onCopyP2PAnswer={() => void copyP2PText(p2pPanel.answerToken, "Answer code copied. Send it back to the host.")}
            onCopyP2PInvite={() => void copyP2PText(p2pPanel.inviteUrl || p2pPanel.inviteToken, "P2P invite copied. Send it to your friend.")}
            onCreateP2PAnswer={() => void createP2PAnswer()}
            onFindLiveMatch={() => void findLiveMatch()}
            onResetP2P={resetP2PMatch}
            onSelectTimeControl={setSelectedTimeControl}
            onSetP2PRated={(rated) => setP2pPanel((current) => ({ ...current, rated }))}
            onSetP2PRemoteSignal={(remoteSignal) => setP2pPanel((current) => ({ ...current, remoteSignal }))}
            onStartP2PHost={(rated) => void startP2PHost(rated)}
            onStartBot={(botId) => void startBotGame(botId)}
            onStartPractice={() => void startPracticeGame("w")}
            p2pPanel={p2pPanel}
            selectedTimeControl={selectedTimeControl}
            user={data.user}
          />
        );
      }
      const visibleSnapshot = boardSnapshot ?? snapshot;
      const displayStatus = manualResult ?? visibleSnapshot.status.resultText;
      const mobilePlay = !isWide;
      const resultMode = Boolean(manualResult);
      const fixedResultBoardColumnStyle =
        resultMode && isWide
          ? {
              flexBasis: boardSize,
              flexGrow: 0,
              flexShrink: 0,
              maxWidth: boardSize,
              minWidth: boardSize,
              width: boardSize,
            }
          : null;
      const fixedResultSideColumnStyle =
        resultMode && isWide
          ? {
              flexBasis: playSideTargetWidth,
              flexGrow: 0,
              flexShrink: 0,
              maxWidth: playSideTargetWidth,
              minWidth: playSideTargetWidth,
              width: playSideTargetWidth,
            }
          : null;
      const resultOverlayWidth = Math.min(isWide ? 390 : 420, Math.max(292, boardSize * (isWide ? 0.48 : 0.76)));
      const resultOverlayPlacement = {
        left: Math.max(10, (boardSize - resultOverlayWidth) / 2),
        top: Math.max(14, boardSize * 0.035),
        width: resultOverlayWidth,
      };
      const resultPanel = manualResult ? (
        <Animated.View
          pointerEvents={resultExpanded ? "auto" : "none"}
          style={[
            styles.resultOverlay,
            resultOverlayPlacement,
            resultPanelStyle,
          ]}
        >
          <Pressable accessibilityLabel="Collapse result" onPress={() => setResultExpanded(false)} style={styles.resultCloseButton}>
            <X size={16} color="#ffffff" strokeWidth={3} />
          </Pressable>
          <WinnerCard
            result={manualResult}
            session={session}
            onAddFriend={() => setMessage(`Friend request ready for ${session.black.displayName}.`)}
            onQuickMatch={() => void findLiveMatch()}
            onRematch={() => void startNewGame(true)}
            onSeek={() => void startOnlineRoom()}
          />
        </Animated.View>
      ) : null;
      const gameControls = (
        <GameControlRail
          status={displayStatus}
          message={message}
          onNewGame={() => void startNewGame(true)}
          onOnlineGame={() => void startOnlineRoom()}
          selectedTimeControl={selectedTimeControl}
          onSelectTimeControl={setSelectedTimeControl}
          onFindLiveMatch={() => void findLiveMatch()}
          matchSearch={matchSearch}
        />
      );
      return (
        <View
          ref={resultClipStageRef as Ref<View>}
          style={[styles.playLayout, isWide && styles.playLayoutWide, resultMode && isWide && styles.playLayoutWideResult]}
        >
          <View style={[styles.boardColumn, resultMode && isWide && styles.boardColumnResult, fixedResultBoardColumnStyle]}>
            {mobilePlay && (
              <MobileGameHud
                clock={clock}
                displayStatus={displayStatus}
                selectedTimeControl={selectedTimeControl}
                session={session}
                snapshot={visibleSnapshot}
              />
            )}
            <View style={[styles.boardStageWrap, { width: boardSize }]}>
              <ChessBoard
                displayBoard={replayPly === null ? premoveDisplayBoard : visibleSnapshot.board}
                snapshot={visibleSnapshot}
                selected={selected}
                premoves={replayPly === null ? premoves : []}
                onPressSquare={handleSquarePress}
                onDropPiece={handlePieceDrop}
                playerColor={localPlayerColor()}
                theme={theme}
                activeEffect={activeEffect}
                activeCeremony={activeCeremony}
                size={boardSize}
              />
              {manualResult && (
                <View
                  pointerEvents="box-none"
                  style={[
                    styles.resultBoardDockLayer,
                    {
                      height: boardSize,
                      width: boardSize,
                    },
                  ]}
                >
                  {resultPanel}
                  <Animated.View pointerEvents={resultExpanded ? "none" : "auto"} style={[styles.resultChip, resultChipStyle]}>
                    <Pressable accessibilityLabel="Open result" onPress={() => setResultExpanded(true)} style={styles.resultChipButton}>
                      <EliteIcon icon={Maximize2} tone="gold" size="xs" rune="!" />
                      <Text style={styles.resultChipText}>Result</Text>
                    </Pressable>
                  </Animated.View>
                </View>
              )}
            </View>
            {shareableClip && !clipRendering && (
              <View style={styles.clipShareBar}>
                <View style={styles.clipShareCopy}>
                  <Text style={styles.clipShareTitle}>{shareableClip.type === "pre-game-handshake" ? "Opening video ready" : "Checkmate video ready"}</Text>
                  <Text numberOfLines={1} style={styles.clipShareText}>{shareableClip.text}</Text>
                </View>
                <ActionButton label={clipRendering ? "Rendering..." : "Share Video"} onPress={() => void shareCurrentClip()} accent />
              </View>
            )}
            {mobilePlay && gameControls}
          </View>
          <Animated.View
            pointerEvents={gameDockExpanded ? "auto" : "none"}
            style={[
              styles.sideColumn,
              resultMode && isWide && styles.sideColumnResult,
              mobilePlay && styles.sideColumnMobile,
              gameDockExpanded && styles.sideColumnOpen,
              mobilePlay && styles.sideColumnMobileOpen,
              sideDockStyle,
              fixedResultSideColumnStyle,
            ]}
          >
            <GameSidePanel
              activeTab={playPanelTab}
              clock={clock}
              data={data}
              displayStatus={displayStatus}
              matchSearch={matchSearch}
              message={message}
              onFindLiveMatch={() => void findLiveMatch()}
              onOfferDraw={offerDraw}
              onPracticeColorSwap={swapPracticeColor}
              onRefreshData={() => void reloadCurrentData()}
              onResign={resignGame}
              onSelectTab={setPlayPanelTab}
              onSelectTimeControl={setSelectedTimeControl}
              onNewGame={() => void startNewGame(true)}
              selected={selected}
              selectedTimeControl={selectedTimeControl}
              services={services}
              session={session}
              settings={settings}
              snapshot={snapshot}
              displaySnapshot={visibleSnapshot}
              mobile={mobilePlay}
              onMinimize={() => setGameDockExpanded(false)}
              replayPly={replayPly}
              onReplayPly={setReplayPly}
              playerColor={localPlayerColor()}
              practiceMode={practiceMode}
            />
          </Animated.View>
          <Animated.View pointerEvents={gameDockExpanded ? "none" : "auto"} style={[styles.sideDockChip, isWide && styles.sideDockChipWide, sideDockChipStyle]}>
            <Pressable accessibilityLabel="Open game center" onPress={() => setGameDockExpanded(true)} style={styles.sideDockChipButton}>
              <EliteIcon icon={Maximize2} tone="sky" size="xs" rune="GC" />
              <Text style={styles.sideDockChipText}>Game Center</Text>
            </Pressable>
          </Animated.View>
        </View>
      );
    }
    if (targetScreen === "Learn") return <LearnScreen data={data} services={services} onNavigate={navigateTo} snapshot={snapshot} theme={theme} />;
    if (targetScreen === "Puzzles") return <LearnScreen data={data} services={services} onNavigate={navigateTo} snapshot={snapshot} theme={theme} />;
    if (targetScreen === "Lessons")
      return (
        <LessonsScreen
          data={data}
          services={services}
          theme={theme}
          reload={() => {
            return refreshFeatureData(snapshot);
          }}
        />
      );
    if (targetScreen === "Bots") return <BotsScreen data={data} onBotMove={askBotToMove} onStartBot={startBotGame} theme={theme} />;
    if (targetScreen === "Review") return <GameReviewScreen snapshot={snapshot} theme={theme} />;
    if (targetScreen === "Tournaments")
      return (
        <TournamentsScreen
          data={data}
          services={services}
          onOpenTournament={(tournament) => void openTournament(tournament)}
          reload={() => {
            return refreshFeatureData(snapshot);
          }}
        />
      );
    if (targetScreen === "Social")
      return (
        <SocialScreen
          data={data}
          onNavigate={navigateTo}
          services={services}
          theme={theme}
          onViewRoom={(roomId) => void viewOnlineRoom(roomId)}
          reload={() => {
            return refreshFeatureData(snapshot);
          }}
        />
      );
    if (targetScreen === "Profile")
      return <ProfileScreen data={data} settings={settings} setSettings={setSettings} services={services} onSignedIn={(user) => void finishAuth(user)} />;
    if (targetScreen === "Admin" && !userIsAdmin) return <Panel title="Admin">Sign in with the admin account to view operations.</Panel>;
    return <AdminScreen data={data} reload={() => (snapshot ? refreshFeatureData(snapshot) : undefined)} services={services} settings={settings} setSettings={setSettings} />;
  }

  if (!data.user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.appFrame}>
          <View pointerEvents="none" style={styles.backdrop}>
            <View style={[styles.backdropSlab, styles.backdropSlabOne]} />
            <View style={[styles.backdropSlab, styles.backdropSlabTwo]} />
            <View style={[styles.backdropSlab, styles.backdropSlabThree]} />
          </View>
          <GuestRegisterExperience
            locked
            onBack={() => undefined}
            onSignedIn={(user) => void finishAuth(user)}
            services={services}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.appFrame}>
        <View pointerEvents="none" style={styles.backdrop}>
          <View style={[styles.backdropSlab, styles.backdropSlabOne]} />
          <View style={[styles.backdropSlab, styles.backdropSlabTwo]} />
          <View style={[styles.backdropSlab, styles.backdropSlabThree]} />
        </View>
        <View style={[styles.shell, showGlobalRail && styles.shellWithRail, isPlayScreen && styles.playShell]}>
          <View style={[styles.workspace, showGlobalRail && styles.workspaceWide]}>
            {showGlobalRail && <AppLeftRail user={data.user} activeScreen={screen} onNavigate={navigateTo} screens={availableScreens} />}
            <View style={[styles.workspaceMain, showGlobalRail && !isPlayScreen && styles.workspaceMainWithRail]}>
          {!showGlobalRail && (
            <View style={[styles.planeChrome, isPlayScreen && styles.playPlaneChrome]}>
              {!isPlayScreen && (
                <View style={styles.header}>
                  <View style={styles.brandLockup}>
                    <EliteIcon icon={Crown} tone="gold" size={compactHeader ? "sm" : "md"} />
                    <View>
                      <Text style={styles.logo}>ChessAlive</Text>
                      {!compactHeader && <Text style={styles.subtitle}>Premium chess, built to feel alive.</Text>}
                    </View>
                  </View>
                  {!compactHeader && (
                    <View style={styles.headerActions}>
                      <View style={styles.headerBadge}>
                        <EliteIcon icon={Sparkles} tone="rose" size="xs" rune="AL" />
                        <Text style={styles.headerBadgeText}>Ceremonies On</Text>
                      </View>
                      <Pressable onPress={() => void startTrialGame()} style={styles.headerPlayButton}>
                        <EliteIcon icon={Rocket} tone="gold" size="xs" rune="7D" />
                        <Text style={styles.headerPlayText}>Start Trial</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
              <View style={[styles.navDock, isPlayScreen && styles.playNavDock]}>
                {isCompactNav ? (
                  <View style={[styles.mobileTabsContent, styles.mobilePlayTabsContent]}>{navCards}</View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={[styles.tabsContent, isPlayScreen && styles.playTabsContent]}>
                    {navCards}
                  </ScrollView>
                )}
                {width >= 700 && <View style={[styles.planeContextRow, isPlayScreen && styles.playContextRow]}>
                  <View style={styles.planeContextPill}>
                    <EliteIcon icon={screenMeta[screen].icon} tone={screenMeta[screen].tone} size="xs" rune={screenMeta[screen].rune} />
                    <Text style={styles.planeContextText}>{screen}</Text>
                  </View>
                  <View style={styles.planeContextPill}>
                    <EliteIcon icon={Swords} tone="gold" size="xs" rune={selectedTimeControl} />
                    <Text style={styles.planeContextText}>
                      {isPlayScreen ? `${selectedTimeControl} · ${snapshot?.status.turn === "w" ? "White" : "Black"} to move` : "Ceremonies ready"}
                    </Text>
                  </View>
                </View>}
              </View>
            </View>
          )}
          <ScrollView
            ref={contentScrollRef}
            style={[styles.content, isPlayScreen && styles.playContent]}
            contentContainerStyle={[styles.contentInner, isPlayScreen && styles.playContentInner]}
          >
            <View style={styles.screenPlane}>
              {transitionFromScreen && transitionFromScreen !== screen && (
                <Animated.View pointerEvents="none" style={[styles.screenTransitionGhost, screenExitStyle]}>
                  {renderMain(transitionFromScreen)}
                </Animated.View>
              )}
              {transitionFromScreen && transitionFromScreen !== screen && (
                <Animated.View pointerEvents="none" style={[styles.screenTransitionGlow, screenTransitionGlowStyle]} />
              )}
              <Animated.View style={[styles.screenTransition, screenTransitionStyle]}>
                {renderMain()}
              </Animated.View>
            </View>
          </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({
  data,
  session,
  services,
  snapshot,
  theme,
  onSignedIn,
  onNavigate,
  onViewRoom,
  selectedTimeControl,
  onFindLiveMatch,
}: {
  data: DashboardData;
  session: GameSession;
  services: ChessAliveServices;
  snapshot: GameSnapshot;
  theme: BoardTheme;
  onSignedIn: (user: UserProfile) => void;
  onNavigate: (screen: Screen) => void;
  onViewRoom: (roomId: string) => void;
  selectedTimeControl: TimePresetId;
  onFindLiveMatch: () => void;
}) {
  const { width } = useWindowDimensions();
  const isMobileHome = width < 720;
  const nextLesson = data.lessons[0];
  const featuredBot = data.bots[0];
  const currentLocation = useMemo(() => inferUserGlobeLocation(), []);
  const sunPoint = useMemo(() => currentSunPoint(), []);
  const globePlayers = useMemo(() => buildGlobePlayers(data, selectedTimeControl), [data.leaderboard, data.onlineFriends, data.user, selectedTimeControl]);
  const [challenge, setChallenge] = useState<ChallengeRequest | null>(null);
  const [guestStep, setGuestStep] = useState<"landing" | "register" | "globe">("landing");
  const liveMatches: HomeLiveMatch[] = data.rooms.slice(0, 3).map((room, index) => ({
    id: room.id,
    white: room.players.white?.displayName ?? "Open seat",
    black: room.players.black?.displayName ?? "Finding rival",
    meta: `${room.timeControl} · ${room.region}`,
    signal: room.latencyMs ? `${room.latencyMs}ms` : "local",
    snapshot: room.snapshot ?? homeLiveSnapshots[index % homeLiveSnapshots.length],
    spectators: room.spectators,
    status: room.status === "waiting" ? "Waiting" : room.status === "completed" ? "Review" : "Live",
    onPress: () => onViewRoom(room.id),
  }));
  const fallbackMatches: HomeLiveMatch[] = [
    { id: "featured-1", white: session.white.displayName, black: session.black.displayName, meta: "5|0 · Alive rapid", signal: "18ms", snapshot: homeLiveSnapshots[0], spectators: 128, status: "Live", onPress: () => onNavigate("Play") },
    { id: "featured-2", white: data.leaderboard[0]?.user.displayName ?? "Blitz Queen", black: featuredBot?.name ?? "Drama Bot", meta: "3|2 · Rated", signal: "24ms", snapshot: homeLiveSnapshots[1], spectators: 86, status: "Live", onPress: () => onNavigate("Play") },
    { id: "featured-3", white: data.friends[0]?.displayName ?? "Rook Star", black: data.leaderboard[1]?.user.displayName ?? "Tactic Guru", meta: "10|0 · Rapid", signal: "31ms", snapshot: homeLiveSnapshots[2], spectators: 64, status: "Live", onPress: () => onNavigate("Play") },
  ];
  const topLiveMatches = [...liveMatches, ...fallbackMatches].slice(0, 3);
  const winRate = data.stats?.games ? Math.round((data.stats.wins / data.stats.games) * 100) : 0;
  const activeRoomCount = data.rooms.filter((room) => room.status !== "completed").length;
  function openChallenge(player: GlobePlayer) {
    setChallenge({
      from: data.user?.displayName ?? "Guest Player",
      id: `challenge-${Date.now()}`,
      mode: "draft",
      rated: true,
      target: player,
      timeControl: player.timeControl,
    });
  }

  function sendChallenge() {
    setChallenge((current) => current ? { ...current, mode: "incoming" } : current);
  }

  function acceptChallenge() {
    setChallenge(null);
    onFindLiveMatch();
    onNavigate("Play");
  }

  function modifyChallenge() {
    setChallenge((current) => current ? { ...current, mode: "modify" } : current);
  }

  function sendCounterChallenge() {
    setChallenge((current) => current ? { ...current, mode: "counter" } : current);
  }

  if (!data.user) {
    return guestStep === "globe" ? (
      <GuestGlobeExperience
        challenge={challenge}
        currentLocation={currentLocation}
        onAcceptChallenge={acceptChallenge}
        onBack={() => setGuestStep("landing")}
        onChallengePlayer={openChallenge}
        onCloseChallenge={() => setChallenge(null)}
        onGetStarted={() => setGuestStep("register")}
        onModifyChallenge={modifyChallenge}
        onRejectChallenge={() => setChallenge(null)}
        onSelectChallengeTime={(timeControl) => setChallenge((current) => current ? { ...current, timeControl } : current)}
        onSendChallenge={sendChallenge}
        onSendCounter={sendCounterChallenge}
        players={globePlayers}
        sunPoint={sunPoint}
      />
    ) : guestStep === "register" ? (
      <GuestRegisterExperience
        onBack={() => setGuestStep("landing")}
        onSignedIn={onSignedIn}
        services={services}
      />
    ) : (
      <GuestLandingExperience
        onGetStarted={() => setGuestStep("register")}
        onOpenGlobe={() => setGuestStep("globe")}
        onLogin={() => setGuestStep("register")}
        onNavigate={onNavigate}
        snapshot={snapshot}
        theme={theme}
      />
    );
  }

  return (
    <View style={styles.homeScreenStack}>
      <View style={[styles.homeHeroLayout, isMobileHome && styles.homeHeroLayoutMobile]}>
        <View style={[styles.homeHeroPrimary, isMobileHome && styles.homeHeroPrimaryMobile]}>
          <HomeDashboardHero
            data={data}
            onLearn={() => onNavigate("Learn")}
            onPlay={() => onNavigate("Play")}
            snapshot={snapshot}
            theme={theme}
          />
        </View>

        <View style={[styles.homeHeroAside, isMobileHome && styles.homeHeroAsideMobile]}>
          {data.user ? (
            <HomeProfileCard user={data.user} stats={data.stats} onOpen={() => onNavigate("Profile")} />
          ) : (
            <AuthPanel services={services} user={data.user} onSignedIn={onSignedIn} compact />
          )}
          <HomePremiumUpgradeStrip onUpgrade={() => onNavigate("Premium")} />
        </View>
      </View>

      <HomeAdCard variant="top" />

      <View style={styles.homeFocusGrid}>
        <HomeFocusCard
          action="Solve now"
          body={data.puzzle ? data.puzzle.goal : "Warm up with one focused tactic before you play."}
          icon={Brain}
          kicker="Learn"
          metric={data.puzzle ? `${data.puzzle.rating}` : "Ready"}
          onPress={() => onNavigate("Learn")}
          rune="PZ"
          title="Daily puzzle"
          tone="violet"
        />
        <HomeFocusCard
          action="Continue"
          body={nextLesson ? nextLesson.summary : "Short lessons and puzzle flow live together in Learn."}
          icon={GraduationCap}
          kicker="Coach"
          metric={nextLesson ? `${nextLesson.minutes} min` : "New"}
          onPress={() => onNavigate("Learn")}
          rune="LN"
          title={nextLesson?.title ?? "Lesson queue"}
          tone="emerald"
        />
        <HomeFocusCard
          action="Open Play"
          body="Choose time controls, rated/casual, bots, and friend links inside the Play tab."
          icon={Swords}
          kicker="Play"
          metric={selectedTimeControl}
          onPress={() => onNavigate("Play")}
          rune="GO"
          title="Game setup"
          tone="gold"
        />
        <HomeFocusCard
          action="View room"
          body={`${activeRoomCount || topLiveMatches.length} active boards, ${topLiveMatches[0]?.signal ?? "local"} best signal.`}
          icon={Globe2}
          kicker="World"
          metric={`${data.onlineFriends.length + activeRoomCount} online`}
          onPress={() => onNavigate("Social")}
          rune="ON"
          title="World pulse"
          tone="sky"
        />
      </View>

      <View style={styles.homeTopMatchesCard}>
        <View style={styles.homeTopMatchesHeader}>
          <View>
            <Text style={styles.liveMatchesTitle}>Watch Live Games</Text>
            <Text style={styles.liveMatchesMeta}>Three clean boards, no noise.</Text>
          </View>
          <Pressable onPress={() => onNavigate("Social")} style={({ pressed }) => [styles.viewAllMatchesButton, pressed && styles.pressed]}>
            <Text style={styles.viewAllMatchesText}>View All Matches</Text>
          </Pressable>
        </View>
        {isMobileHome ? (
          <View style={styles.homeMatchBoardStack}>
            {topLiveMatches.map((match, index) => (
              <View key={match.id} style={styles.homeMatchBoardCardMobile}>
                <LiveMatchBoardCard index={index} match={match} theme={theme} large />
              </View>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeMatchBoardRail}>
            {topLiveMatches.map((match, index) => (
              <View key={match.id} style={styles.homeMatchBoardCard}>
                <LiveMatchBoardCard index={index} match={match} theme={theme} large />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.homeLowerGrid}>
        <View nativeID="home-world-arena" style={styles.homeWorldSection}>
          <HomeWorldPulsePanel
            currentLocation={currentLocation}
            onOpenPlay={() => onNavigate("Play")}
            onOpenSocial={() => onNavigate("Social")}
            players={globePlayers}
            sunPoint={sunPoint}
          />
        </View>
        <View style={styles.homeLeaderboardColumn}>
          <BotRatingRail bots={data.bots} onOpen={() => onNavigate("Bots")} />
          <HomeAdCard variant="rail" />
        </View>
      </View>
      <HomeFooter />
    </View>
  );
}

function HomeDashboardHero({
  data,
  onLearn,
  onPlay,
  snapshot,
  theme,
}: {
  data: DashboardData;
  onLearn: () => void;
  onPlay: () => void;
  snapshot: GameSnapshot;
  theme: BoardTheme;
}) {
  const firstName = data.user?.displayName.split(/\s+/)[0] ?? "Player";
  const winRate = data.stats?.games ? Math.round((data.stats.wins / data.stats.games) * 100) : 0;
  const lastMove = snapshot.history.at(-1)?.san ?? "Ready";
  return (
    <View style={styles.homeDashboardHero}>
      <View pointerEvents="none" style={styles.homeDashboardGlow} />
      <View style={styles.homeDashboardCopy}>
        <View style={styles.conversionKickerRow}>
          <EliteIcon icon={Home} tone="sky" size="xs" rune="CA" />
          <Text style={styles.conversionKicker}>Dashboard</Text>
        </View>
        <Text style={styles.homeDashboardTitle}>Welcome back, {firstName}.</Text>
        <Text style={styles.homeDashboardText}>
          Track your chess day here. Game setup now stays inside Play, so this page can stay calm, useful, and fast to scan.
        </Text>
        <View style={styles.homeDashboardMetricRow}>
          <HomeMetricPill label="Rapid" value={String(data.user?.rating.rapid ?? 400)} />
          <HomeMetricPill label="Win rate" value={winRate ? `${winRate}%` : "New"} />
          <HomeMetricPill label="Alive effects" value={String(data.stats?.funnyEffectsPlayed ?? 0)} />
        </View>
        <View style={styles.homeDashboardActions}>
          <Pressable onPress={onPlay} style={({ pressed }) => [styles.homeDashboardPrimaryAction, pressed && styles.pressed]}>
            <Text style={styles.homeDashboardPrimaryText}>Open Play</Text>
            <Swords size={18} color="#ffffff" strokeWidth={3} />
          </Pressable>
          <Pressable onPress={onLearn} style={({ pressed }) => [styles.homeDashboardSecondaryAction, pressed && styles.pressed]}>
            <Text style={styles.homeDashboardSecondaryText}>Learn Today</Text>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={onPlay} style={({ pressed }) => [styles.homeDashboardBoardPanel, pressed && styles.pressed]}>
        <View style={styles.homeDashboardBoardTop}>
          <Text style={styles.homeDashboardBoardKicker}>Next board</Text>
          <Text style={styles.homeDashboardBoardMove}>{lastMove}</Text>
        </View>
        <View style={styles.homeDashboardBoardWrap}>
          <MiniBoard snapshot={snapshot} theme={theme} />
        </View>
        <Text style={styles.homeDashboardBoardHint}>Pick time, rated/casual, bots, and friend links in Play.</Text>
      </Pressable>
    </View>
  );
}

function HomeMetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.homeMetricPill}>
      <Text style={styles.homeMetricValue}>{value}</Text>
      <Text style={styles.homeMetricLabel}>{label}</Text>
    </View>
  );
}

function HomeFocusCard({
  action,
  body,
  icon: Icon,
  kicker,
  metric,
  onPress,
  rune,
  title,
  tone,
}: {
  action: string;
  body: string;
  icon: typeof Home;
  kicker: string;
  metric: string;
  onPress: () => void;
  rune: string;
  title: string;
  tone: IconTone;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.homeFocusCard, pressed && styles.pressed]}>
      <View style={styles.homeFocusCardTop}>
        <EliteIcon icon={Icon} tone={tone} size="xs" rune={rune} />
        <View style={styles.homeFocusMetric}>
          <Text numberOfLines={1} style={styles.homeFocusMetricText}>{metric}</Text>
        </View>
      </View>
      <Text style={styles.homeFocusKicker}>{kicker}</Text>
      <Text numberOfLines={2} style={styles.homeFocusTitle}>{title}</Text>
      <Text numberOfLines={3} style={styles.homeFocusBody}>{body}</Text>
      <View style={styles.homeFocusFooter}>
        <Text style={styles.homeFocusAction}>{action}</Text>
        <ChevronRight size={16} color={aiBlue} strokeWidth={3} />
      </View>
    </Pressable>
  );
}

function HomeWorldPulsePanel({
  currentLocation,
  onOpenPlay,
  onOpenSocial,
  players,
  sunPoint,
}: {
  currentLocation: GlobeLocation;
  onOpenPlay: () => void;
  onOpenSocial: () => void;
  players: GlobePlayer[];
  sunPoint: GlobeLocation;
}) {
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const visiblePlayers = players.slice(0, 4);
  return (
    <View style={styles.homeWorldPulseCard}>
      <View style={styles.homeWorldPulseHeader}>
        <View>
          <Text style={styles.homeWorldTitle}>World Pulse</Text>
          <Text style={styles.homeWorldMeta}>{currentLocation.city} centered · {players.length} nearby signals</Text>
        </View>
        <EliteIcon icon={Globe2} tone="sky" size="sm" rune="GL" />
      </View>
      <View style={[styles.homeWorldPulseMap, isCompact && styles.homeWorldPulseMapCompact]}>
        <InteractiveGlobe
          currentLocation={currentLocation}
          onChallengePlayer={() => onOpenPlay()}
          players={players}
          sunPoint={sunPoint}
        />
      </View>
      <View style={styles.homeWorldPulseList}>
        {visiblePlayers.map((player) => (
          <View key={player.id} style={styles.homeWorldPulseRow}>
            <View style={styles.homeWorldPulseStatus} />
            <View style={styles.homeWorldPulseCopy}>
              <Text numberOfLines={1} style={styles.homeWorldPulseName}>{player.name}</Text>
              <Text numberOfLines={1} style={styles.homeWorldPulseMeta}>{player.city} · {player.rating} · {player.pingMs}ms</Text>
            </View>
            <Text style={styles.homeWorldPulseTime}>{player.timeControl}</Text>
          </View>
        ))}
      </View>
      <View style={styles.homeWorldPulseActions}>
        <Pressable onPress={onOpenSocial} style={({ pressed }) => [styles.homeWorldPulseButton, pressed && styles.pressed]}>
          <Text style={styles.homeWorldPulseButtonText}>View Social</Text>
        </Pressable>
        <Pressable onPress={onOpenPlay} style={({ pressed }) => [styles.homeWorldPulseButtonPrimary, pressed && styles.pressed]}>
          <Text style={styles.homeWorldPulseButtonPrimaryText}>Challenge in Play</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HomePremiumUpgradeStrip({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.homePremiumStrip}>
      <View style={styles.homePremiumGlow} />
      <View style={styles.homePremiumIcon}>
        <Crown color="#fff8e8" size={23} strokeWidth={2.8} />
      </View>
      <View style={styles.homePremiumCopy}>
        <Text style={styles.homePremiumKicker}>ChessAlive Premium</Text>
        <Text style={styles.homePremiumTitle}>Unlimited rooms, cleaner analysis, early Alive effects.</Text>
      </View>
      <View style={styles.homePremiumPriceBlock}>
        <Text style={styles.homePremiumPrice}>₹100</Text>
        <Text style={styles.homePremiumCycle}>/month</Text>
      </View>
      <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.homePremiumButton, pressed && styles.pressed]}>
        <Text style={styles.homePremiumButtonText}>Upgrade now</Text>
      </Pressable>
    </View>
  );
}

function GuestLandingExperience({
  onGetStarted,
  onOpenGlobe,
  onLogin,
  onNavigate,
  snapshot,
  theme,
}: {
  onGetStarted: () => void;
  onOpenGlobe: () => void;
  onLogin: () => void;
  onNavigate: (screen: Screen) => void;
  snapshot: GameSnapshot;
  theme: BoardTheme;
}) {
  return (
    <View style={styles.guestLanding}>
      <View pointerEvents="none" style={styles.guestAuraNorth} />
      <View pointerEvents="none" style={styles.guestAuraSouth} />
      <View style={styles.guestTopBar}>
        <View style={styles.guestBrandRow}>
          <ChessAliveLogoMark variant="title" />
          <Text style={styles.guestBrandText}>ChessAlive</Text>
        </View>
        <Pressable onPress={onLogin} style={({ pressed }) => [styles.guestLoginButton, pressed && styles.pressed]}>
          <Text style={styles.guestLoginText}>Log In</Text>
        </Pressable>
      </View>

      <View style={styles.guestHero}>
        <View style={styles.guestCopyColumn}>
          <Text style={styles.guestEyebrow}>ChessAlive beta</Text>
          <Text style={styles.guestHeroTitle}>A calm board. A wild button.</Text>
          <Text style={styles.guestHeroSub}>Start with clean, readable chess. Turn on Alive mode when you want captures, jokes, and tiny cinematic surprises.</Text>
          <View style={styles.guestActionRow}>
            <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.guestPrimaryButton, pressed && styles.guestPrimaryButtonPressed]}>
              <Text style={styles.guestPrimaryButtonText}>Start free</Text>
            </Pressable>
            <Pressable onPress={() => onNavigate("Play")} style={({ pressed }) => [styles.guestSecondaryButton, pressed && styles.guestSecondaryButtonPressed]}>
              <Text style={styles.guestSecondaryButtonText}>Play as guest</Text>
            </Pressable>
          </View>
          <View style={styles.guestQuickLinks}>
            <Pressable onPress={() => onNavigate("Learn")} style={({ pressed }) => [styles.guestQuickLink, pressed && styles.pressed]}>
              <Text style={styles.guestQuickLinkText}>Learn</Text>
            </Pressable>
            <Pressable onPress={() => onNavigate("Lessons")} style={({ pressed }) => [styles.guestQuickLink, pressed && styles.pressed]}>
              <Text style={styles.guestQuickLinkText}>Lessons</Text>
            </Pressable>
            <Pressable onPress={onOpenGlobe} style={({ pressed }) => [styles.guestQuickLink, pressed && styles.pressed]}>
              <Text style={styles.guestQuickLinkText}>World globe</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.guestBoardColumn}>
          <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.guestBoardStage, pressed && styles.pressed]}>
            <MiniBoard snapshot={snapshot} theme={theme} />
            <View pointerEvents="none" style={styles.guestBoardHint}>
              <ChessAliveLogoMark variant="title" />
            </View>
            <View pointerEvents="none" style={styles.guestBoardGlass}>
              <Text style={styles.guestBoardGlassTitle}>Clean board first</Text>
              <Text style={styles.guestBoardGlassText}>Start and checkmate ceremonies are built in.</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function GuestGlobeExperience({
  challenge,
  currentLocation,
  onAcceptChallenge,
  onBack,
  onChallengePlayer,
  onCloseChallenge,
  onGetStarted,
  onModifyChallenge,
  onRejectChallenge,
  onSelectChallengeTime,
  onSendChallenge,
  onSendCounter,
  players,
  sunPoint,
}: {
  challenge: ChallengeRequest | null;
  currentLocation: GlobeLocation;
  onAcceptChallenge: () => void;
  onBack: () => void;
  onChallengePlayer: (player: GlobePlayer) => void;
  onCloseChallenge: () => void;
  onGetStarted: () => void;
  onModifyChallenge: () => void;
  onRejectChallenge: () => void;
  onSelectChallengeTime: (timeControl: TimePresetId) => void;
  onSendChallenge: () => void;
  onSendCounter: () => void;
  players: GlobePlayer[];
  sunPoint: GlobeLocation;
}) {
  return (
    <View style={styles.guestLanding}>
      <View pointerEvents="none" style={styles.guestAuraNorth} />
      <View pointerEvents="none" style={styles.guestAuraSouth} />
      <View style={styles.guestTopBar}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.registerTextButton, pressed && styles.pressed]}>
          <Text style={styles.registerTextButtonText}>Back</Text>
        </Pressable>
        <View style={styles.guestBrandRow}>
          <ChessAliveLogoMark variant="title" />
          <Text style={styles.guestBrandText}>ChessAlive</Text>
        </View>
        <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.guestLoginButton, pressed && styles.pressed]}>
          <Text style={styles.guestLoginText}>Start free</Text>
        </Pressable>
      </View>
      <View nativeID="home-world-arena" style={styles.guestGlobeShell}>
        <View style={styles.guestGlobeCopy}>
          <Text style={styles.guestEyebrow}>World Globe</Text>
          <Text style={styles.guestGlobeTitle}>Pick a blinking dot. Ask for a game.</Text>
          <Text style={styles.guestGlobeText}>A quieter way to discover players: rotate the earth, find a live dot, and send a challenge when you are ready.</Text>
        </View>
        <GlobeMatchmakingPanel
          challenge={challenge}
          currentLocation={currentLocation}
          onAcceptChallenge={onAcceptChallenge}
          onChallengePlayer={onChallengePlayer}
          onCloseChallenge={onCloseChallenge}
          onModifyChallenge={onModifyChallenge}
          onRejectChallenge={onRejectChallenge}
          onSelectChallengeTime={onSelectChallengeTime}
          onSendChallenge={onSendChallenge}
          onSendCounter={onSendCounter}
          players={players}
          sunPoint={sunPoint}
        />
      </View>
    </View>
  );
}

function LoginMotionStage({ locked = false }: { locked?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const pieceLift = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const pieceRotate = pulse.interpolate({ inputRange: [0, 1], outputRange: ["-2deg", "4deg"] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const chipLift = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const chipDrop = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });
  const chipSoftLift = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <View style={styles.loginMotionStage}>
      <Animated.View style={[styles.loginMotionGlow, { transform: [{ scale: glowScale }] }]} />
      <View style={styles.loginMotionBoard}>
        {[0, 1, 2, 3].map((tile) => (
          <View key={tile} style={[styles.loginMotionTile, tile === 1 || tile === 2 ? styles.loginMotionTileDark : undefined]} />
        ))}
      </View>
      <Animated.View style={[styles.loginMotionPiece, { transform: [{ translateY: pieceLift }, { rotate: pieceRotate }] }]}>
        <ChessAliveLogoMark variant="result" />
      </Animated.View>
      <Animated.View style={[styles.loginMotionChip, styles.loginMotionChipGoogle, { transform: [{ translateY: chipLift }] }]}>
        <Text style={styles.loginMotionChipText}>Google OAuth</Text>
      </Animated.View>
      <Animated.View style={[styles.loginMotionChip, styles.loginMotionChipOtp, { transform: [{ translateY: chipDrop }] }]}>
        <Text style={styles.loginMotionChipText}>{locked ? "Beta gate" : "Email OTP"}</Text>
      </Animated.View>
      <Animated.View style={[styles.loginMotionChip, styles.loginMotionChipRating, { transform: [{ translateY: chipSoftLift }] }]}>
        <Text style={styles.loginMotionChipText}>{locked ? "Ads ready" : "Rating import"}</Text>
      </Animated.View>
    </View>
  );
}

function RegisterValuePill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.registerValuePill}>
      <View style={styles.registerValueIcon}>
        <Icon size={16} color={aiBlue} strokeWidth={2.6} />
      </View>
      <View style={styles.registerValueCopy}>
        <Text style={styles.registerValueLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.registerValueText}>{value}</Text>
      </View>
    </View>
  );
}

function GuestRegisterExperience({
  locked = false,
  onBack,
  onSignedIn,
  services,
}: {
  locked?: boolean;
  onBack: () => void;
  onSignedIn: (user: UserProfile) => void | Promise<void>;
  services: ChessAliveServices;
}) {
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState(locked ? "Private beta access is limited to Google sign-in." : "Choose how you want to create your account.");
  const visibleProviderCards = locked ? authProviderCards.filter((provider) => provider.id === "google") : authProviderCards;

  async function signInWithGoogle() {
    setStatus("Opening Google sign-in...");
    try {
      const profile = await requestGoogleProfile();
      const nextUser = await services.auth.signInWithGoogleProfile(profile);
      setStatus(`Signed in with Google as ${nextUser.displayName}.`);
      await onSignedIn(nextUser);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }

  async function signInWithProvider(provider: AuthProvider) {
    if (locked && provider !== "google") {
      setStatus("This provider opens after beta verification. Use Google for now.");
      return;
    }
    if (provider === "google") {
      await signInWithGoogle();
      return;
    }
    const nextUser = await services.auth.signInWithProvider(provider);
    setStatus(`Signed in with ${authProviderCards.find((item) => item.id === provider)?.label ?? provider}.`);
    await onSignedIn(nextUser);
  }

  async function requestOtp() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus("Enter an email to receive an OTP.");
      return;
    }
    try {
      const result = await services.auth.requestEmailOtp(normalizedEmail);
      setOtpSent(true);
      setStatus(result.delivery === "email" ? `OTP sent to ${result.email}.` : `OTP ready locally. Dev code: ${result.previewCode}.`);
    } catch {
      setStatus("OTP could not be sent. Check the email and try again.");
    }
  }

  async function verifyOtp() {
    try {
      const nextUser = await services.auth.verifyEmailOtp(email, otp);
      setStatus(`Signed in as ${nextUser.displayName}.`);
      await onSignedIn(nextUser);
    } catch {
      setStatus("That OTP is invalid or expired.");
    }
  }

  return (
    <View style={styles.registerPage}>
      <View pointerEvents="none" style={styles.registerAura} />
      <View pointerEvents="none" style={styles.registerAuraTwo} />
      <View pointerEvents="none" style={styles.registerAuraCore} />
      <View style={styles.registerTopBar}>
        {locked ? (
          <View style={styles.registerTextButton}>
            <Text style={styles.registerTextButtonText}>Private beta</Text>
          </View>
        ) : (
          <Pressable onPress={onBack} style={({ pressed }) => [styles.registerTextButton, pressed && styles.pressed]}>
            <Text style={styles.registerTextButtonText}>Back</Text>
          </Pressable>
        )}
        <View style={styles.registerBrand}>
          <ChessAliveLogoMark variant="title" />
          <Text style={styles.registerBrandText}>ChessAlive</Text>
        </View>
        {locked ? (
          <View style={styles.registerTextButton}>
            <Text style={styles.registerTextButtonText}>Google only</Text>
          </View>
        ) : (
          <Pressable onPress={() => setEmailMode(true)} style={({ pressed }) => [styles.registerTextButton, pressed && styles.pressed]}>
            <Text style={styles.registerTextButtonText}>Log In</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.registerShell}>
        <View style={styles.registerStory}>
          <Text style={styles.registerEyebrow}>ChessAlive identity</Text>
          <Text style={styles.registerTitle}>One calm sign-in. Every wild game saved.</Text>
          <Text style={styles.registerStoryText}>Keep your rating, private rooms, puzzle streaks, and shareable ceremony clips tied to one player profile.</Text>
          <LoginMotionStage locked={locked} />
          <View style={styles.registerValueGrid}>
            <RegisterValuePill icon={Shield} label="Secure" value={locked ? "Google sign-in only" : "Google, Apple, Facebook, or OTP"} />
            <RegisterValuePill icon={Crown} label="Rating" value={locked ? "Saved after sign-in" : "Start at 400 and grow from your games"} />
            <RegisterValuePill icon={Sparkles} label="Alive mode" value={locked ? "Preview locked until login" : "Save funny match moments"} />
          </View>
        </View>

          <View style={styles.registerCard}>
          <Text style={styles.registerCardKicker}>Member access</Text>
          <Text style={styles.registerCardTitle}>Create your account</Text>
          <Text style={styles.registerCardCopy}>
            {locked
              ? "The game is locked before release. Google can inspect this page, and beta users can continue with Google."
              : "Google is ready with the configured ChessAlive OAuth client. Email OTP stays available as a fallback."}
          </Text>

          <View style={styles.registerProviderStack}>
            {visibleProviderCards.map((provider) => {
              const primary = provider.id === "google";
              return (
                <Pressable
                  key={provider.id}
                  onPress={() => void signInWithProvider(provider.id)}
                  style={({ pressed }) => [styles.registerProviderButton, primary && styles.registerProviderButtonPrimary, pressed && styles.pressed]}
                >
                  <View style={[styles.registerProviderMarkShell, primary && styles.registerProviderMarkShellPrimary]}>
                    <Text style={[styles.registerProviderMark, provider.id === "google" && styles.registerProviderGoogle]}>{provider.mark}</Text>
                  </View>
                  <Text style={[styles.registerProviderText, primary && styles.registerProviderTextPrimary]}>Continue with {provider.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {!locked && (
            <Pressable onPress={() => setEmailMode((current) => !current)} style={({ pressed }) => [styles.registerEmailButton, pressed && styles.pressed]}>
              <Text style={styles.registerEmailButtonText}>{emailMode ? "Hide email OTP" : "Use email OTP instead"}</Text>
            </Pressable>
          )}

          {!locked && emailMode && (
            <View style={styles.registerEmailPanel}>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#9b9b96"
                style={styles.registerInput}
                value={email}
              />
              <View style={styles.registerOtpRow}>
                <Pressable onPress={requestOtp} style={({ pressed }) => [styles.registerSmallButton, pressed && styles.pressed]}>
                  <Text style={styles.registerSmallButtonText}>Send OTP</Text>
                </Pressable>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setOtp}
                  placeholder="Code"
                  placeholderTextColor="#9b9b96"
                  style={[styles.registerInput, styles.registerCodeInput]}
                  value={otp}
                />
                <Pressable disabled={!otpSent} onPress={verifyOtp} style={({ pressed }) => [styles.registerSmallButton, !otpSent && styles.registerSmallButtonDisabled, pressed && otpSent && styles.pressed]}>
                  <Text style={[styles.registerSmallButtonText, !otpSent && styles.registerSmallButtonTextDisabled]}>Verify</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.registerStatus}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

function LiveMatchBoardCard({ index, large, match, theme }: { index: number; large?: boolean; match: HomeLiveMatch; theme: BoardTheme }) {
  const [ply, setPly] = useState<number | null>(null);
  useEffect(() => {
    const total = match.snapshot.history.length;
    if (total < 2) {
      setPly(null);
      return undefined;
    }
    setPly(Math.max(1, total - 3));
    const interval = setInterval(() => {
      setPly((current) => {
        const next = current === null ? Math.max(1, total - 3) : current + 1;
        return next >= total ? null : next;
      });
    }, 1250 + index * 180);
    return () => clearInterval(interval);
  }, [index, match.id, match.snapshot.history.length]);
  const previewSnapshot = replaySnapshot(match.snapshot, ply);
  const lastMove = previewSnapshot.history.at(-1)?.san ?? "Starting";
  return (
    <Pressable key={match.id} onPress={match.onPress} style={({ pressed }) => [styles.liveMatchCard, large && styles.liveMatchCardLarge, pressed && styles.pressed]}>
      <View style={styles.liveBoardTopline}>
        <Text style={styles.liveMatchRank}>#{index + 1}</Text>
        <View style={styles.liveMovePill}>
          <View style={styles.liveMoveDot} />
          <Text style={styles.liveMoveText}>{lastMove}</Text>
        </View>
      </View>
      <View style={[styles.liveMatchMiniBoardWrap, large && styles.liveMatchMiniBoardWrapLarge]}>
        <MiniBoard snapshot={previewSnapshot} theme={theme} />
      </View>
      <Text numberOfLines={1} style={styles.liveMatchPlayers}>{match.white}</Text>
      <Text numberOfLines={1} style={styles.liveMatchOpponent}>vs {match.black}</Text>
      <Text style={styles.liveMatchMeta}>{match.meta}</Text>
      <View style={styles.liveMatchFooter}>
        <Text style={styles.liveMatchStatus}>{match.status}</Text>
        <Text style={styles.liveMatchSignal}>{match.signal} · active board</Text>
      </View>
    </Pressable>
  );
}

function HomeTopMatchRow({ index, match, theme }: { index: number; match: HomeLiveMatch; theme: BoardTheme }) {
  const previewSnapshot = replaySnapshot(match.snapshot, null);
  const lastMove = previewSnapshot.history.at(-1)?.san ?? "Start";
  return (
    <Pressable onPress={match.onPress} style={({ pressed }) => [styles.homeTopMatchRow, pressed && styles.pressed]}>
      <View style={styles.homeTopMatchBoard}>
        <MiniBoard snapshot={previewSnapshot} theme={theme} />
      </View>
      <View style={styles.homeTopMatchCopy}>
        <View style={styles.homeTopMatchMetaRow}>
          <Text style={styles.liveMatchRank}>#{index + 1}</Text>
          <Text style={styles.homeTopMatchClock}>{match.meta}</Text>
        </View>
        <Text numberOfLines={1} style={styles.homeTopMatchPlayers}>{match.white}</Text>
        <Text numberOfLines={1} style={styles.homeTopMatchOpponent}>vs {match.black}</Text>
        <Text numberOfLines={1} style={styles.homeTopMatchSignal}>{lastMove} · {match.signal} · active board</Text>
      </View>
    </Pressable>
  );
}

function HomeAdCard({ variant = "rail" }: { variant?: "rail" | "top" }) {
  return (
    <AdsenseAdUnit
      format="auto"
      placement={variant === "top" ? "homeTop" : "homeRail"}
      style={[styles.homeAdCard, variant === "top" && styles.homeAdCardTop]}
    />
  );
}

function ensureAdsenseScript(documentRef: Document) {
  if (!adsenseClientId) return;
  const selector = `script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"][src*="${adsenseClientId}"]`;
  if (documentRef.querySelector(selector)) return;
  const script = documentRef.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClientId)}`;
  documentRef.head.appendChild(script);
}

function AdsenseAdUnit({
  format = "auto",
  placement,
  style,
}: {
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  placement: AdsensePlacement;
  style?: StyleProp<ViewStyle>;
}) {
  const mountRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"ready" | "needs-slot" | "native">("ready");
  const slotId = adsenseSlotId(placement);
  const showConfigNotice = status === "needs-slot" && isLocalhostRuntime();

  useEffect(() => {
    const documentRef = (globalThis as { document?: Document }).document;
    const mountNode = mountRef.current as HTMLElement | null;
    if (!documentRef || !mountNode) {
      setStatus("native");
      return undefined;
    }

    ensureAdsenseScript(documentRef);
    mountNode.innerHTML = "";

    if (!slotId) {
      setStatus("needs-slot");
      return undefined;
    }

    const adNode = documentRef.createElement("ins");
    adNode.className = "adsbygoogle";
    adNode.style.display = "block";
    adNode.style.minHeight = "100%";
    adNode.style.width = "100%";
    adNode.setAttribute("data-ad-client", adsenseClientId);
    adNode.setAttribute("data-ad-slot", slotId);
    adNode.setAttribute("data-ad-format", format);
    adNode.setAttribute("data-full-width-responsive", "true");
    mountNode.appendChild(adNode);

    try {
      const runtime = globalThis as { adsbygoogle?: unknown[] };
      runtime.adsbygoogle = runtime.adsbygoogle ?? [];
      runtime.adsbygoogle.push({});
      setStatus("ready");
    } catch {
      setStatus("ready");
    }

    return () => {
      mountNode.innerHTML = "";
    };
  }, [format, placement, slotId]);

  return (
    <View style={[styles.adsenseUnit, style]}>
      <View ref={mountRef as Ref<View>} style={styles.adsenseDomMount} />
      {showConfigNotice && (
        <View pointerEvents="none" style={styles.adsenseConfigNotice}>
          <Text style={styles.adsenseConfigLabel}>AdSense</Text>
          <Text style={styles.adsenseConfigText}>{adsenseSlotEnvByPlacement[placement]}</Text>
        </View>
      )}
      {status === "native" && (
        <View pointerEvents="none" style={styles.adsenseConfigNotice}>
          <Text style={styles.adsenseConfigLabel}>AdMob slot</Text>
        </View>
      )}
    </View>
  );
}

type FooterPolicyKey = "Terms" | "Privacy" | "Fair Play" | "Community" | "Ads" | "Contact";

const footerPolicies: Array<{
  key: FooterPolicyKey;
  title: string;
  updated: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}> = [
  {
    key: "Terms",
    title: "Terms of Service",
    updated: "May 22, 2026",
    intro: "These terms explain the basic rules for using ChessAlive during the public beta.",
    sections: [
      { heading: "Account access", body: "You are responsible for activity from your account. Use accurate sign-in information and do not share access with anyone who should not use your profile." },
      { heading: "Games and ratings", body: "Casual games are for play and testing. Rated games may affect your ChessAlive rating, but beta ratings can be adjusted if abuse, bugs, or invalid games are detected." },
      { heading: "Service changes", body: "Features may change while the product is in beta, including animations, P2P matching, profiles, ads, and premium plans. We will try to avoid disruptive changes, but we may update or remove experimental features." },
      { heading: "Your content", body: "Messages, room names, uploaded assets, and profile details must be legal, respectful, and safe for a chess community. We may remove content that violates policy or harms the service." },
      { heading: "Limits", body: "ChessAlive is provided as-is during beta. We are not liable for lost games, rating changes, local archive loss, outages, or experimental feature behavior." },
    ],
  },
  {
    key: "Privacy",
    title: "Privacy Policy",
    updated: "May 22, 2026",
    intro: "This policy describes what ChessAlive collects and how it is used to run the game.",
    sections: [
      { heading: "Information we collect", body: "We may collect account identifiers, display name, email, profile settings, ratings, match metadata, device/browser information, login events, and basic diagnostic logs." },
      { heading: "Game data", body: "P2P games are designed to minimize server involvement. Local game archives may be stored in your browser. Some game summaries, ratings, or anti-abuse signals may be stored when needed." },
      { heading: "How we use data", body: "We use data to authenticate users, match players, maintain ratings, improve performance, prevent abuse, debug issues, personalize settings, and support ads or premium billing where enabled." },
      { heading: "Third-party services", body: "Google sign-in, Google AdSense, Cloudflare, hosting, analytics, and payment providers may process limited data under their own terms when those features are used." },
      { heading: "Choices", body: "You can sign out, clear local browser storage, export local game data where available, and contact us for account or privacy requests." },
    ],
  },
  {
    key: "Fair Play",
    title: "Fair Play Policy",
    updated: "May 22, 2026",
    intro: "ChessAlive is built for fun chess, but games still need to be fair.",
    sections: [
      { heading: "No outside assistance", body: "Do not use chess engines, another player, opening-book automation, screen readers built for move selection, or any tool that gives live move recommendations during rated games." },
      { heading: "No manipulation", body: "Do not intentionally disconnect, tamper with clocks, falsify results, exploit bugs, create fake opponents, or coordinate rating transfers." },
      { heading: "P2P beta limitations", body: "P2P play reduces server cost, but clients are not fully trusted. Suspicious rated results may be reviewed, limited, or converted to casual until stronger verification is available." },
      { heading: "Reports and review", body: "Players can report abuse or suspicious games. We may use game patterns, timing, connection logs, and reports to investigate, restrict, or reset accounts." },
      { heading: "Consequences", body: "Fair-play violations may lead to warnings, rating resets, temporary restrictions, account closure, or blocked access to rated features." },
    ],
  },
  {
    key: "Community",
    title: "Community Policy",
    updated: "May 22, 2026",
    intro: "ChessAlive should feel competitive, funny, and safe.",
    sections: [
      { heading: "Respect players", body: "No harassment, hate speech, threats, sexual content, doxxing, spam, or targeted abuse in chat, rooms, groups, profile names, or uploaded content." },
      { heading: "Keep rooms safe", body: "Private rooms and social groups are for chess communities. Room owners should moderate clearly and remove content that breaks the rules." },
      { heading: "Funny mode boundaries", body: "Animations and jokes should stay playful. Do not use custom assets or messages that attack protected groups, impersonate others, or promote harmful behavior." },
      { heading: "Moderation", body: "We may remove content, limit messaging, restrict groups, or suspend users to protect the service and community." },
      { heading: "Appeals", body: "If you believe moderation was incorrect, contact support with your account email, room or game ID, and a concise explanation." },
    ],
  },
  {
    key: "Ads",
    title: "Advertising Policy",
    updated: "May 22, 2026",
    intro: "Ads help keep the early ChessAlive experience accessible while premium features are developed.",
    sections: [
      { heading: "Ad providers", body: "ChessAlive may display ads through Google AdSense or other approved ad networks. These providers may use cookies, device identifiers, and contextual signals according to their own policies." },
      { heading: "Placement", body: "Ads should not cover the chessboard, hide clocks, block moves, or imitate game controls. We aim to place ads around the experience without interrupting active play." },
      { heading: "Personalization", body: "Where required, users may be shown consent controls or provider-level options for personalized advertising." },
      { heading: "Premium", body: "Premium plans may reduce or remove ads for signed-in users once the billing system is active." },
      { heading: "Advertiser limits", body: "We do not knowingly approve misleading, unsafe, illegal, or adult ad experiences for the ChessAlive interface." },
    ],
  },
  {
    key: "Contact",
    title: "Contact",
    updated: "May 22, 2026",
    intro: "Use the right mailbox so the request reaches the correct queue.",
    sections: [
      { heading: "Support", body: "For login, match, payment, or account help: support@chessalive.com" },
      { heading: "Privacy", body: "For data access, deletion, or privacy questions: privacy@chessalive.com" },
      { heading: "Fair play", body: "For cheating reports, include the game ID, opponent name, and reason: fairplay@chessalive.com" },
      { heading: "Ads and business", body: "For advertising, partnerships, or sponsorship requests: ads@chessalive.com" },
      { heading: "Legal", body: "For formal legal notices: legal@chessalive.com" },
    ],
  },
];

function HomeFooter() {
  const [activePolicy, setActivePolicy] = useState<FooterPolicyKey | null>(null);
  const policy = footerPolicies.find((item) => item.key === activePolicy) ?? null;
  return (
    <View style={styles.homeFooter}>
      <View>
        <Text style={styles.homeFooterBrand}>ChessAlive</Text>
        <Text style={styles.homeFooterCopy}>Fast chess, clean rooms, and beta policies for a safer launch.</Text>
      </View>
      <View style={styles.homeFooterLinks}>
        {footerPolicies.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setActivePolicy((current) => current === item.key ? null : item.key)}
            style={({ pressed }) => [styles.homeFooterLink, activePolicy === item.key && styles.homeFooterLinkActive, pressed && styles.pressed]}
          >
            <Text style={styles.homeFooterLinkText}>{item.key}</Text>
          </Pressable>
        ))}
      </View>
      {policy && (
        <View style={styles.homeFooterPolicyPanel}>
          <View style={styles.homeFooterPolicyHeader}>
            <View style={styles.homeFooterPolicyHeaderCopy}>
              <Text style={styles.homeFooterPolicyKicker}>Last updated {policy.updated}</Text>
              <Text style={styles.homeFooterPolicyTitle}>{policy.title}</Text>
              <Text style={styles.homeFooterPolicyIntro}>{policy.intro}</Text>
            </View>
            <Pressable onPress={() => setActivePolicy(null)} style={({ pressed }) => [styles.homeFooterPolicyClose, pressed && styles.pressed]}>
              <X color="#5f6f83" size={18} strokeWidth={2.6} />
            </Pressable>
          </View>
          <View style={styles.homeFooterPolicyGrid}>
            {policy.sections.map((section) => (
              <View key={section.heading} style={styles.homeFooterPolicySection}>
                <Text style={styles.homeFooterPolicySectionTitle}>{section.heading}</Text>
                <Text style={styles.homeFooterPolicySectionBody}>{section.body}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.homeFooterPolicyNote}>This summary is product policy content for ChessAlive beta and may be refined before full public launch.</Text>
        </View>
      )}
    </View>
  );
}

function HomeProfileCard({ onOpen, stats, user }: { onOpen: () => void; stats: DashboardData["stats"]; user: UserProfile }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.homeProfileCard, pressed && styles.pressed]}>
      <View style={styles.homeProfileShine} />
      <View style={styles.homeProfileTop}>
        <View style={styles.homeProfileAvatar}>
          <Text style={styles.homeProfileAvatarText}>{user.avatarEmoji}</Text>
        </View>
        <View style={styles.homeProfileCopy}>
          <Text numberOfLines={1} style={styles.homeProfileName}>{user.displayName}</Text>
          <Text style={styles.homeProfileMeta}>ChessAlive member</Text>
        </View>
        <View style={styles.homeProfileRatingBadge}>
          <Text style={styles.homeProfileRatingValue}>{user.rating.rapid}</Text>
          <Text style={styles.homeProfileRatingLabel}>rapid</Text>
        </View>
      </View>
      <View style={styles.homeProfileStats}>
        <View style={styles.homeProfileStat}>
          <Text style={styles.homeProfileStatValue}>{user.rating.blitz}</Text>
          <Text style={styles.homeProfileStatLabel}>Blitz</Text>
        </View>
        <View style={styles.homeProfileStat}>
          <Text style={styles.homeProfileStatValue}>{user.rating.funny}</Text>
          <Text style={styles.homeProfileStatLabel}>Alive</Text>
        </View>
        <View style={styles.homeProfileStat}>
          <Text style={styles.homeProfileStatValue}>{stats?.games ?? 0}</Text>
          <Text style={styles.homeProfileStatLabel}>Games</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BotRatingRail({ bots, onOpen }: { bots: BotProfile[]; onOpen: () => void }) {
  return (
    <View style={styles.botRatingPanel}>
      <View style={styles.botRatingHeader}>
        <View>
          <Text style={styles.botRatingKicker}>Leaderboard</Text>
          <Text style={styles.botRatingTitle}>Bot Ratings</Text>
        </View>
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.botRatingOpen, pressed && styles.pressed]}>
          <Text style={styles.botRatingOpenText}>View</Text>
        </Pressable>
      </View>
      {bots.map((bot, index) => (
        <Pressable key={bot.id} onPress={onOpen} style={({ pressed }) => [styles.botRatingRow, pressed && styles.pressed]}>
          <Text style={styles.botRatingRank}>#{index + 1}</Text>
          <Text style={styles.botRatingAvatar}>{bot.avatarEmoji}</Text>
          <View style={styles.botRatingCopy}>
            <Text numberOfLines={1} style={styles.botRatingName}>{bot.name}</Text>
            <Text numberOfLines={1} style={styles.botRatingMeta}>{bot.personality}</Text>
          </View>
          <Text style={styles.botRatingScore}>{bot.rating}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function GlobeMatchmakingPanel({
  challenge,
  currentLocation,
  onAcceptChallenge,
  onChallengePlayer,
  onCloseChallenge,
  onModifyChallenge,
  onRejectChallenge,
  onSelectChallengeTime,
  onSendChallenge,
  onSendCounter,
  players,
  sunPoint,
}: {
  challenge: ChallengeRequest | null;
  currentLocation: GlobeLocation;
  onAcceptChallenge: () => void;
  onChallengePlayer: (player: GlobePlayer) => void;
  onCloseChallenge: () => void;
  onModifyChallenge: () => void;
  onRejectChallenge: () => void;
  onSelectChallengeTime: (timeControl: TimePresetId) => void;
  onSendChallenge: () => void;
  onSendCounter: () => void;
  players: GlobePlayer[];
  sunPoint: GlobeLocation;
}) {
  return (
    <View style={styles.globePanel}>
      <View style={styles.globeHeader}>
        <View>
          <View style={styles.globeTitleRow}>
            <ChessAliveLogoMark variant="title" />
            <Text style={styles.globeTitle}>ChessAlive</Text>
          </View>
          <Text style={styles.globePrompt}>Tap a glowing player dot to send a quick game request anywhere on the globe.</Text>
        </View>
      </View>
      <View style={styles.globeStage}>
        <InteractiveGlobe
          currentLocation={currentLocation}
          onChallengePlayer={onChallengePlayer}
          players={players}
          sunPoint={sunPoint}
        />
        {challenge && (
          <ChallengeRequestOverlay
            challenge={challenge}
            onAccept={onAcceptChallenge}
            onClose={onCloseChallenge}
            onModify={onModifyChallenge}
            onReject={onRejectChallenge}
            onSelectTime={onSelectChallengeTime}
            onSend={onSendChallenge}
            onSendCounter={onSendCounter}
          />
        )}
      </View>
    </View>
  );
}

function ChallengeRequestOverlay({
  challenge,
  onAccept,
  onClose,
  onModify,
  onReject,
  onSelectTime,
  onSend,
  onSendCounter,
}: {
  challenge: ChallengeRequest;
  onAccept: () => void;
  onClose: () => void;
  onModify: () => void;
  onReject: () => void;
  onSelectTime: (timeControl: TimePresetId) => void;
  onSend: () => void;
  onSendCounter: () => void;
}) {
  const isDraft = challenge.mode === "draft";
  const isModify = challenge.mode === "modify";
  const isCounter = challenge.mode === "counter";
  const title = isDraft ? `Challenge ${challenge.target.name}` : isModify ? "Modify request" : isCounter ? "Counter sent" : "Incoming challenge";
  const body = isDraft
    ? `${challenge.target.city} · ${challenge.target.rating} · ${challenge.target.pingMs}ms`
    : isModify
      ? `${challenge.target.name} is changing the game type before agreeing.`
      : isCounter
        ? `${challenge.target.name} proposed ${challenge.timeControl}.`
        : `${challenge.from} requested ${challenge.timeControl} ${challenge.rated ? "rated" : "casual"} with ${challenge.target.name}.`;
  return (
    <View style={styles.challengeOverlay}>
      <View style={styles.challengeCard}>
        <Pressable accessibilityLabel="Close challenge" onPress={onClose} style={styles.challengeClose}>
          <X size={15} color="#ffffff" strokeWidth={3} />
        </Pressable>
        <Text style={styles.challengeTitle}>{title}</Text>
        <Text style={styles.challengeBody}>{body}</Text>
        {(isDraft || isModify) && (
          <View style={styles.challengeTimeBox}>
            <TimeControlPicker selected={challenge.timeControl} onSelect={onSelectTime} compact />
          </View>
        )}
        <View style={styles.challengeActionRow}>
          {isDraft && <ActionButton label="Send Request" onPress={onSend} accent />}
          {isDraft && <ActionButton label="Cancel" onPress={onClose} />}
          {challenge.mode === "incoming" && <ActionButton label="Agree" onPress={onAccept} accent />}
          {challenge.mode === "incoming" && <ActionButton label="Modify" onPress={onModify} />}
          {challenge.mode === "incoming" && <ActionButton label="Reject" onPress={onReject} />}
          {isModify && <ActionButton label="Send Counter" onPress={onSendCounter} accent />}
          {isModify && <ActionButton label="Reject" onPress={onReject} />}
          {isCounter && <ActionButton label="Agree" onPress={onAccept} accent />}
          {isCounter && <ActionButton label="Reject" onPress={onReject} />}
        </View>
      </View>
    </View>
  );
}

const cityLightPoints: Array<GlobeLocation & { intensity: number }> = [
  { city: "Chennai", country: "India", lat: 13.0827, lon: 80.2707, intensity: 0.95 },
  { city: "Bengaluru", country: "India", lat: 12.9716, lon: 77.5946, intensity: 0.9 },
  { city: "Hyderabad", country: "India", lat: 17.385, lon: 78.4867, intensity: 0.86 },
  { city: "Kolkata", country: "India", lat: 22.5726, lon: 88.3639, intensity: 0.9 },
  { city: "Pune", country: "India", lat: 18.5204, lon: 73.8567, intensity: 0.82 },
  { city: "Ahmedabad", country: "India", lat: 23.0225, lon: 72.5714, intensity: 0.78 },
  { city: "Lahore", country: "Pakistan", lat: 31.5204, lon: 74.3587, intensity: 0.78 },
  { city: "Karachi", country: "Pakistan", lat: 24.8607, lon: 67.0011, intensity: 0.82 },
  { city: "Dhaka", country: "Bangladesh", lat: 23.8103, lon: 90.4125, intensity: 0.9 },
  { city: "Mumbai", country: "India", lat: 19.076, lon: 72.8777, intensity: 1 },
  { city: "Delhi", country: "India", lat: 28.6139, lon: 77.209, intensity: 1 },
  { city: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, intensity: 0.88 },
  { city: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018, intensity: 0.86 },
  { city: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456, intensity: 0.9 },
  { city: "Manila", country: "Philippines", lat: 14.5995, lon: 120.9842, intensity: 0.84 },
  { city: "Hong Kong", country: "China", lat: 22.3193, lon: 114.1694, intensity: 0.9 },
  { city: "Shanghai", country: "China", lat: 31.2304, lon: 121.4737, intensity: 0.95 },
  { city: "Beijing", country: "China", lat: 39.9042, lon: 116.4074, intensity: 0.92 },
  { city: "Guangzhou", country: "China", lat: 23.1291, lon: 113.2644, intensity: 0.9 },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, intensity: 1 },
  { city: "Osaka", country: "Japan", lat: 34.6937, lon: 135.5023, intensity: 0.88 },
  { city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978, intensity: 0.92 },
  { city: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, intensity: 0.78 },
  { city: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631, intensity: 0.72 },
  { city: "London", country: "UK", lat: 51.5072, lon: -0.1276, intensity: 0.92 },
  { city: "Paris", country: "France", lat: 48.8566, lon: 2.3522, intensity: 0.9 },
  { city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405, intensity: 0.82 },
  { city: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038, intensity: 0.74 },
  { city: "Milan", country: "Italy", lat: 45.4642, lon: 9.19, intensity: 0.78 },
  { city: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, intensity: 0.86 },
  { city: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173, intensity: 0.78 },
  { city: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, intensity: 0.8 },
  { city: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lon: 46.6753, intensity: 0.68 },
  { city: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, intensity: 0.86 },
  { city: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792, intensity: 0.75 },
  { city: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473, intensity: 0.72 },
  { city: "New York", country: "USA", lat: 40.7128, lon: -74.006, intensity: 1 },
  { city: "Washington", country: "USA", lat: 38.9072, lon: -77.0369, intensity: 0.84 },
  { city: "Boston", country: "USA", lat: 42.3601, lon: -71.0589, intensity: 0.8 },
  { city: "Atlanta", country: "USA", lat: 33.749, lon: -84.388, intensity: 0.78 },
  { city: "Dallas", country: "USA", lat: 32.7767, lon: -96.797, intensity: 0.76 },
  { city: "Chicago", country: "USA", lat: 41.8781, lon: -87.6298, intensity: 0.82 },
  { city: "Los Angeles", country: "USA", lat: 34.0522, lon: -118.2437, intensity: 0.9 },
  { city: "San Francisco", country: "USA", lat: 37.7749, lon: -122.4194, intensity: 0.82 },
  { city: "Seattle", country: "USA", lat: 47.6062, lon: -122.3321, intensity: 0.72 },
  { city: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, intensity: 0.85 },
  { city: "Sao Paulo", country: "Brazil", lat: -23.5558, lon: -46.6396, intensity: 0.9 },
  { city: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729, intensity: 0.78 },
  { city: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428, intensity: 0.72 },
  { city: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816, intensity: 0.75 },
];

const cityLightCorridors: Array<{ from: GeoJsonPosition; to: GeoJsonPosition; intensity: number; lanes?: number }> = [
  { from: [72.8777, 19.076], to: [77.209, 28.6139], intensity: 0.68, lanes: 3 },
  { from: [77.209, 28.6139], to: [88.3639, 22.5726], intensity: 0.62, lanes: 3 },
  { from: [72.8777, 19.076], to: [80.2707, 13.0827], intensity: 0.58, lanes: 2 },
  { from: [77.5946, 12.9716], to: [80.2707, 13.0827], intensity: 0.55, lanes: 2 },
  { from: [78.4867, 17.385], to: [88.3639, 22.5726], intensity: 0.5, lanes: 2 },
  { from: [90.4125, 23.8103], to: [100.5018, 13.7563], intensity: 0.54, lanes: 2 },
  { from: [103.8198, 1.3521], to: [120.9842, 14.5995], intensity: 0.5, lanes: 2 },
  { from: [113.2644, 23.1291], to: [121.4737, 31.2304], intensity: 0.72, lanes: 4 },
  { from: [116.4074, 39.9042], to: [121.4737, 31.2304], intensity: 0.62, lanes: 3 },
  { from: [126.978, 37.5665], to: [139.6503, 35.6762], intensity: 0.5, lanes: 2 },
  { from: [135.5023, 34.6937], to: [139.6503, 35.6762], intensity: 0.7, lanes: 3 },
  { from: [-0.1276, 51.5072], to: [2.3522, 48.8566], intensity: 0.72, lanes: 3 },
  { from: [2.3522, 48.8566], to: [13.405, 52.52], intensity: 0.64, lanes: 3 },
  { from: [9.19, 45.4642], to: [28.9784, 41.0082], intensity: 0.46, lanes: 2 },
  { from: [28.9784, 41.0082], to: [55.2708, 25.2048], intensity: 0.38, lanes: 2 },
  { from: [31.2357, 30.0444], to: [55.2708, 25.2048], intensity: 0.46, lanes: 2 },
  { from: [-74.006, 40.7128], to: [-71.0589, 42.3601], intensity: 0.72, lanes: 3 },
  { from: [-77.0369, 38.9072], to: [-74.006, 40.7128], intensity: 0.82, lanes: 4 },
  { from: [-84.388, 33.749], to: [-77.0369, 38.9072], intensity: 0.5, lanes: 2 },
  { from: [-96.797, 32.7767], to: [-84.388, 33.749], intensity: 0.42, lanes: 2 },
  { from: [-87.6298, 41.8781], to: [-74.006, 40.7128], intensity: 0.5, lanes: 2 },
  { from: [-122.4194, 37.7749], to: [-118.2437, 34.0522], intensity: 0.66, lanes: 3 },
  { from: [-122.3321, 47.6062], to: [-122.4194, 37.7749], intensity: 0.44, lanes: 2 },
  { from: [-46.6396, -23.5558], to: [-43.1729, -22.9068], intensity: 0.6, lanes: 2 },
  { from: [-58.3816, -34.6037], to: [-46.6396, -23.5558], intensity: 0.38, lanes: 2 },
];

const populationLightRegions: Array<{ center: GeoJsonPosition; populationM: number; spreadLat: number; spreadLon: number; intensity: number }> = [
  { center: [78.9, 22.5], populationM: 1420, spreadLat: 13, spreadLon: 16, intensity: 1 },
  { center: [104.2, 34.6], populationM: 1410, spreadLat: 13, spreadLon: 22, intensity: 0.95 },
  { center: [-97.1, 38.8], populationM: 340, spreadLat: 13, spreadLon: 24, intensity: 0.76 },
  { center: [106.8, -6.2], populationM: 280, spreadLat: 7, spreadLon: 18, intensity: 0.8 },
  { center: [69.3, 30.4], populationM: 240, spreadLat: 8, spreadLon: 8, intensity: 0.82 },
  { center: [8.7, 9.1], populationM: 225, spreadLat: 9, spreadLon: 8, intensity: 0.74 },
  { center: [-53.2, -10.8], populationM: 215, spreadLat: 14, spreadLon: 14, intensity: 0.68 },
  { center: [90.4, 23.7], populationM: 172, spreadLat: 3.8, spreadLon: 4.6, intensity: 0.95 },
  { center: [37.6, 55.7], populationM: 145, spreadLat: 10, spreadLon: 28, intensity: 0.62 },
  { center: [138.2, 37.3], populationM: 125, spreadLat: 5, spreadLon: 7, intensity: 0.95 },
  { center: [-102.5, 23.6], populationM: 130, spreadLat: 8, spreadLon: 9, intensity: 0.68 },
  { center: [122.4, 12.9], populationM: 114, spreadLat: 6, spreadLon: 7, intensity: 0.78 },
  { center: [30.8, 26.9], populationM: 112, spreadLat: 5, spreadLon: 5, intensity: 0.82 },
  { center: [108.3, 15.9], populationM: 100, spreadLat: 6, spreadLon: 6, intensity: 0.74 },
  { center: [45.0, 32.4], populationM: 89, spreadLat: 6, spreadLon: 7, intensity: 0.68 },
  { center: [35.2, 39.0], populationM: 85, spreadLat: 6, spreadLon: 7, intensity: 0.72 },
  { center: [10.4, 51.1], populationM: 84, spreadLat: 4, spreadLon: 5, intensity: 0.85 },
  { center: [-2.5, 54.1], populationM: 68, spreadLat: 3.5, spreadLon: 3.5, intensity: 0.9 },
  { center: [2.5, 46.2], populationM: 68, spreadLat: 4, spreadLon: 4, intensity: 0.86 },
  { center: [100.9, 15.8], populationM: 71, spreadLat: 5, spreadLon: 5, intensity: 0.74 },
  { center: [127.8, 36.5], populationM: 52, spreadLat: 2.6, spreadLon: 2.8, intensity: 0.94 },
  { center: [24.9, -29.0], populationM: 60, spreadLat: 7, spreadLon: 6, intensity: 0.58 },
  { center: [-63.6, -34.0], populationM: 46, spreadLat: 7, spreadLon: 8, intensity: 0.54 },
  { center: [134.5, -25.7], populationM: 26, spreadLat: 12, spreadLon: 18, intensity: 0.42 },
  { center: [-106.3, 56.1], populationM: 40, spreadLat: 9, spreadLon: 22, intensity: 0.46 },
  { center: [44.6, 23.9], populationM: 37, spreadLat: 5, spreadLon: 6, intensity: 0.54 },
  { center: [54.4, 24.4], populationM: 10, spreadLat: 1.8, spreadLon: 2.2, intensity: 0.82 },
  { center: [31.2, 49.0], populationM: 37, spreadLat: 4.5, spreadLon: 6, intensity: 0.52 },
  { center: [19.1, 52.1], populationM: 38, spreadLat: 3, spreadLon: 4, intensity: 0.78 },
  { center: [12.8, 42.8], populationM: 59, spreadLat: 4, spreadLon: 4, intensity: 0.8 },
  { center: [-3.7, 40.4], populationM: 48, spreadLat: 3.6, spreadLon: 4.4, intensity: 0.74 },
  { center: [-8.2, 39.5], populationM: 10, spreadLat: 2, spreadLon: 2, intensity: 0.62 },
  { center: [5.3, 52.1], populationM: 18, spreadLat: 1.5, spreadLon: 1.7, intensity: 0.86 },
  { center: [14.5, 47.5], populationM: 9, spreadLat: 1.4, spreadLon: 1.8, intensity: 0.76 },
  { center: [30.5, -3.3], populationM: 120, spreadLat: 8, spreadLon: 8, intensity: 0.62 },
  { center: [38.8, 9.1], populationM: 125, spreadLat: 8, spreadLon: 7, intensity: 0.58 },
  { center: [37.9, 0.3], populationM: 55, spreadLat: 5, spreadLon: 5, intensity: 0.56 },
  { center: [-1.0, 7.9], populationM: 34, spreadLat: 4, spreadLon: 4, intensity: 0.56 },
  { center: [-75.0, -9.2], populationM: 34, spreadLat: 7, spreadLon: 5, intensity: 0.52 },
  { center: [-70.7, -30.0], populationM: 19, spreadLat: 8, spreadLon: 4, intensity: 0.5 },
  { center: [-74.3, 4.6], populationM: 52, spreadLat: 5, spreadLon: 5, intensity: 0.6 },
];

const earthVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragmentShader = `
  #define PI 3.141592653589793

  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec2 sunPosition;
  varying vec2 vUv;

  vec3 geoToVector(float lonDeg, float latDeg) {
    float lon = lonDeg * PI / 180.0;
    float lat = latDeg * PI / 180.0;
    float cosLat = cos(lat);
    return vec3(cosLat * sin(lon), sin(lat), cosLat * cos(lon));
  }

  void main() {
    vec2 mapUv = vec2(fract(vUv.x + 0.25), vUv.y);
    float lon = mapUv.x * 360.0 - 180.0;
    float lat = vUv.y * 180.0 - 90.0;
    float intensity = dot(normalize(geoToVector(lon, lat)), normalize(geoToVector(sunPosition.x, sunPosition.y)));
    vec4 dayColor = texture2D(dayTexture, mapUv);
    vec4 nightColor = texture2D(nightTexture, mapUv);
    float blendFactor = smoothstep(-0.12, 0.16, intensity);
    float twilight = 1.0 - abs(blendFactor - 0.5) * 2.0;
    vec3 terminatorGlow = vec3(0.10, 0.22, 0.34) * twilight * 0.16;
    gl_FragColor = vec4(mix(nightColor.rgb, dayColor.rgb, blendFactor) + terminatorGlow, 1.0);
  }
`;

function InteractiveGlobe({
  currentLocation,
  onChallengePlayer,
  players,
  sunPoint,
}: {
  currentLocation: GlobeLocation;
  onChallengePlayer: (player: GlobePlayer) => void;
  players: GlobePlayer[];
  sunPoint: GlobeLocation;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playersRef = useRef(players);
  const onChallengeRef = useRef(onChallengePlayer);
  useEffect(() => {
    playersRef.current = players;
    onChallengeRef.current = onChallengePlayer;
  }, [onChallengePlayer, players]);

  useEffect(() => {
    const mount = mountRef.current;
    const documentRef = (globalThis as { document?: Document }).document;
    if (!mount || !documentRef) return undefined;
    const mountElement = mount;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 3.45);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.width = "100%";
    mountElement.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = THREE.MathUtils.degToRad(currentLocation.lat);
    globeGroup.rotation.y = THREE.MathUtils.degToRad(-currentLocation.lon);
    scene.add(globeGroup);

    const fallbackDayTexture = createEarthTexture(documentRef);
    const fallbackNightTexture = createNightEarthTexture(documentRef);
    const skyTexture = createSkyTexture(documentRef);
    scene.background = skyTexture;
    const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
    const sunPositionUniform = new THREE.Vector2(sunPoint.lon, sunPoint.lat);
    const globeMaterial = new THREE.ShaderMaterial({
      fragmentShader: earthFragmentShader,
      uniforms: {
        dayTexture: { value: fallbackDayTexture },
        nightTexture: { value: fallbackNightTexture },
        sunPosition: { value: sunPositionUniform },
      },
      vertexShader: earthVertexShader,
    });
    const earth = new THREE.Mesh(earthGeometry, globeMaterial);
    globeGroup.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.035, 96, 96),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0x7dd3fc,
        opacity: 0.16,
        transparent: true,
      }),
    );
    globeGroup.add(atmosphere);

    scene.add(new THREE.AmbientLight(0x355270, 0.34));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    const sunVector = latLonToVector(sunPoint.lat, sunPoint.lon, 4.5);
    sunLight.position.copy(sunVector);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x78d9ff, 0.8);
    rimLight.position.set(-2.8, 1.7, 2.2);
    scene.add(rimLight);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dotMeshes: THREE.Mesh[] = [];
    const dotGeometry = new THREE.SphereGeometry(0.018, 18, 18);
    const haloGeometry = new THREE.SphereGeometry(0.031, 18, 18);
    const homePosition = latLonToVector(currentLocation.lat, currentLocation.lon, 1.045);
    const homeDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xfff2a8,
        emissive: 0xffd166,
        emissiveIntensity: 2.5,
        roughness: 0.12,
      }),
    );
    const homeHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 20, 20),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0xffd166,
        opacity: 0.28,
        transparent: true,
      }),
    );
    homeDot.position.copy(homePosition);
    homeHalo.position.copy(homePosition.clone().multiplyScalar(1.002));
    globeGroup.add(homeHalo);
    globeGroup.add(homeDot);
    dotMeshes.push(homeDot, homeHalo);
    playersRef.current.forEach((player, index) => {
      const position = latLonToVector(player.lat, player.lon, 1.035);
      const dot = new THREE.Mesh(
        dotGeometry,
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0xfacc15 : 0x22ff8a,
          emissive: index === 0 ? 0xfacc15 : 0x00ff78,
          emissiveIntensity: 1.9,
          roughness: 0.2,
        }),
      );
      dot.position.copy(position);
      dot.userData.playerId = player.id;
      const halo = new THREE.Mesh(
        haloGeometry,
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: 0x22ff8a,
          opacity: 0.22,
          transparent: true,
        }),
      );
      halo.position.copy(position.clone().multiplyScalar(1.003));
      halo.userData.playerId = player.id;
      globeGroup.add(halo);
      globeGroup.add(dot);
      dotMeshes.push(dot, halo);
    });

    let frame = 0;
    let dragging = false;
    let moved = 0;
    let previousX = 0;
    let previousY = 0;

    function resize() {
      const rect = mountElement.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function updatePointer(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(event: PointerEvent) {
      dragging = true;
      moved = 0;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging) return;
      const dx = event.clientX - previousX;
      const dy = event.clientY - previousY;
      moved += Math.abs(dx) + Math.abs(dy);
      globeGroup.rotation.y += dx * 0.006;
      globeGroup.rotation.x = Math.max(-1.25, Math.min(1.25, globeGroup.rotation.x + dy * 0.006));
      previousX = event.clientX;
      previousY = event.clientY;
    }

    function onPointerUp(event: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (moved > 8) return;
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(dotMeshes, false)[0];
      const playerId = hit?.object.userData.playerId;
      const player = playersRef.current.find((item) => item.id === playerId);
      if (player) onChallengeRef.current(player);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(mountElement);
    resize();

    let lastSunUpdate = -1;
    function animate(time = 0) {
      frame = requestAnimationFrame(animate);
      const t = time / 1000;
      const currentSecond = Math.floor(t);
      if (currentSecond !== lastSunUpdate) {
        lastSunUpdate = currentSecond;
        const liveSunPoint = currentSunPoint();
        sunPositionUniform.set(liveSunPoint.lon, liveSunPoint.lat);
        sunLight.position.copy(latLonToVector(liveSunPoint.lat, liveSunPoint.lon, 4.5));
      }
      dotMeshes.forEach((mesh, index) => {
        const pulse = 1 + Math.max(0, Math.sin(t * 3.2 + index * 0.9)) * (index % 2 === 0 ? 0.42 : 1.15);
        mesh.scale.setScalar(pulse);
      });
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      if (renderer.domElement.parentNode === mountElement) mountElement.removeChild(renderer.domElement);
      fallbackDayTexture.dispose();
      fallbackNightTexture.dispose();
      skyTexture.dispose();
      dotMeshes.forEach((mesh) => disposeMeshMaterial(mesh));
      homeDot.geometry.dispose();
      homeHalo.geometry.dispose();
      earthGeometry.dispose();
      globeMaterial.dispose();
      dotGeometry.dispose();
      haloGeometry.dispose();
      renderer.dispose();
    };
  }, [currentLocation.lat, currentLocation.lon, sunPoint.lat, sunPoint.lon]);

  return <View ref={mountRef as unknown as Ref<View>} style={styles.globeCanvasMount} />;
}

function disposeMeshMaterial(mesh: THREE.Mesh) {
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((material) => material.dispose());
    return;
  }
  mesh.material.dispose();
}

function createEarthTexture(documentRef: Document) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#0b4f84");
  ocean.addColorStop(0.45, "#157eb8");
  ocean.addColorStop(1, "#042a54");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const landGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  landGradient.addColorStop(0, "#d0b66e");
  landGradient.addColorStop(0.35, "#6fbf75");
  landGradient.addColorStop(0.68, "#2d8f6d");
  landGradient.addColorStop(1, "#c8a862");
  drawNaturalEarthLand(context, canvas.width, canvas.height, landGradient, "rgba(255,255,255,0.2)", 0.65);
  const texture = new THREE.CanvasTexture(canvas);
  configureEarthTexture(texture);
  return texture;
}

function createNightEarthTexture(documentRef: Document) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const landMask = createLandMask(documentRef, canvas.width, canvas.height);
  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#020817");
  ocean.addColorStop(0.55, "#06172b");
  ocean.addColorStop(1, "#01040b");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawNaturalEarthLand(context, canvas.width, canvas.height, "#09233c", "rgba(114, 184, 209, 0.14)", 0.5);
  drawGlobalLandLights(context, canvas.width, canvas.height, landMask);
  drawPopulationWeightedLights(context, canvas.width, canvas.height, landMask);
  drawCityLightCorridors(context, canvas.width, canvas.height, landMask);
  cityLightPoints.forEach((point) => drawCityLight(context, canvas.width, canvas.height, point));
  drawCityLightScatter(context, canvas.width, canvas.height, landMask);
  drawCityLightMicroTexture(context, canvas.width, canvas.height, landMask);
  drawNaturalEarthBorders(context, canvas.width, canvas.height, "rgba(3, 12, 24, 0.52)", 1.45);
  drawNaturalEarthBorders(context, canvas.width, canvas.height, "rgba(178, 228, 244, 0.38)", 0.72);
  const texture = new THREE.CanvasTexture(canvas);
  configureEarthTexture(texture);
  return texture;
}

function createLandMask(documentRef: Document, width: number, height: number) {
  const maskCanvas = documentRef.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext("2d");
  if (!maskContext) return null;
  maskContext.clearRect(0, 0, width, height);
  drawNaturalEarthLand(maskContext, width, height, "#ffffff", "rgba(255,255,255,0)", 0);
  return maskContext.getImageData(0, 0, width, height).data;
}

function createSkyTexture(documentRef: Document) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const space = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  space.addColorStop(0, "#020716");
  space.addColorStop(0.5, "#06142a");
  space.addColorStop(1, "#01030b");
  context.fillStyle = space;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,0.72)";
  for (let index = 0; index < 180; index += 1) {
    const x = (index * 139 + 31) % canvas.width;
    const y = (index * 83 + 17) % canvas.height;
    const radius = index % 11 === 0 ? 1.2 : 0.55;
    context.globalAlpha = index % 7 === 0 ? 0.95 : 0.45;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawNaturalEarthLand(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  fillStyle: CanvasGradient | string,
  strokeStyle: string,
  lineWidth: number,
) {
  context.save();
  context.beginPath();
  naturalEarthMap.features.forEach((feature) => {
    if (!feature.geometry) return;
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    polygons.forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.forEach(([lon, lat], index) => {
          const { x, y } = lonLatToCanvas(lon, lat, width, height);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
      });
    });
  });
  context.fillStyle = fillStyle;
  context.fill("evenodd");
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

function drawNaturalEarthBorders(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokeStyle: string,
  lineWidth: number,
  compositeOperation: GlobalCompositeOperation = "source-over",
) {
  context.save();
  context.globalCompositeOperation = compositeOperation;
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  context.lineCap = "round";
  naturalEarthMap.features.forEach((feature) => {
    if (!feature.geometry) return;
    context.beginPath();
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    polygons.forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.forEach(([lon, lat], index) => {
          const { x, y } = lonLatToCanvas(lon, lat, width, height);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
      });
    });
    context.stroke();
  });
  context.restore();
}

function lonLatToCanvas(lon: number, lat: number, width: number, height: number) {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

function isLandPixel(mask: Uint8ClampedArray | null, x: number, y: number, width: number, height: number) {
  if (!mask) return true;
  const clampedX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const clampedY = Math.max(0, Math.min(height - 1, Math.round(y)));
  return mask[(clampedY * width + clampedX) * 4 + 3] > 24;
}

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function drawTinyLight(context: CanvasRenderingContext2D, x: number, y: number, intensity: number, size: number) {
  context.globalAlpha = Math.max(0.12, Math.min(0.92, intensity));
  context.fillStyle = intensity > 0.62 ? "#fff2bd" : "#ffc86f";
  context.beginPath();
  context.arc(x, y, size, 0, Math.PI * 2);
  context.fill();
  if (intensity > 0.5) {
    context.globalAlpha = Math.min(0.18, intensity * 0.18);
    context.fillStyle = "#fbbf6a";
    context.beginPath();
    context.arc(x, y, size * 2.4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawCityLight(context: CanvasRenderingContext2D, width: number, height: number, point: GlobeLocation & { intensity: number }) {
  const { x, y } = lonLatToCanvas(point.lon, point.lat, width, height);
  const glowRadius = 2.2 + point.intensity * 3.2;
  const coreRadius = 0.38 + point.intensity * 0.52;
  const glow = context.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, `rgba(255, 244, 197, ${0.94 * point.intensity})`);
  glow.addColorStop(0.34, `rgba(255, 188, 82, ${0.38 * point.intensity})`);
  glow.addColorStop(0.78, `rgba(255, 188, 82, ${0.08 * point.intensity})`);
  glow.addColorStop(1, "rgba(255, 179, 72, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, glowRadius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `rgba(255, 247, 207, ${0.95 * point.intensity})`;
  context.beginPath();
  context.arc(x, y, coreRadius, 0, Math.PI * 2);
  context.fill();
}

function drawGlobalLandLights(context: CanvasRenderingContext2D, width: number, height: number, landMask: Uint8ClampedArray | null) {
  context.save();
  for (let index = 0; index < 2600; index += 1) {
    const lon = seededUnit(index, 1) * 360 - 180;
    const lat = seededUnit(index, 2) * 148 - 74;
    const { x, y } = lonLatToCanvas(lon, lat, width, height);
    if (!isLandPixel(landMask, x, y, width, height)) continue;
    drawTinyLight(context, x, y, 0.16 + seededUnit(index, 3) * 0.22, 0.26 + seededUnit(index, 4) * 0.28);
  }
  context.restore();
}

function drawPopulationWeightedLights(context: CanvasRenderingContext2D, width: number, height: number, landMask: Uint8ClampedArray | null) {
  context.save();
  populationLightRegions.forEach((region, regionIndex) => {
    const count = Math.max(12, Math.min(360, Math.round(region.populationM / 3.7)));
    for (let index = 0; index < count; index += 1) {
      const lonNoise = (seededUnit(index, regionIndex * 5 + 11) - 0.5) * region.spreadLon;
      const latNoise = (seededUnit(index, regionIndex * 5 + 17) - 0.5) * region.spreadLat;
      const secondaryLonNoise = (seededUnit(index, regionIndex * 5 + 19) - 0.5) * region.spreadLon * 0.34;
      const secondaryLatNoise = (seededUnit(index, regionIndex * 5 + 23) - 0.5) * region.spreadLat * 0.34;
      const lon = normalizeLongitude(region.center[0] + lonNoise + secondaryLonNoise);
      const lat = Math.max(-72, Math.min(72, region.center[1] + latNoise + secondaryLatNoise));
      const { x, y } = lonLatToCanvas(lon, lat, width, height);
      if (!isLandPixel(landMask, x, y, width, height)) continue;
      const sparkle = seededUnit(index, regionIndex * 7 + 29);
      const size = sparkle > 0.985 ? 1.05 : sparkle > 0.86 ? 0.68 : 0.34 + sparkle * 0.18;
      const intensity = region.intensity * (0.26 + seededUnit(index, regionIndex * 7 + 31) * 0.52);
      drawTinyLight(context, x, y, intensity, size);
    }
  });
  context.restore();
}

function drawCityLightScatter(context: CanvasRenderingContext2D, width: number, height: number, landMask: Uint8ClampedArray | null) {
  context.save();
  for (let index = 0; index < 1400; index += 1) {
    const point = cityLightPoints[index % cityLightPoints.length];
    const spread = index % 6 === 0 ? 6 : index % 3 === 0 ? 3.2 : 1.45;
    const lon = point.lon + ((((index * 37) % 100) - 50) / 50) * spread;
    const lat = point.lat + ((((index * 53) % 100) - 50) / 50) * spread * 0.72;
    const { x, y } = lonLatToCanvas(normalizeLongitude(lon), Math.max(-72, Math.min(72, lat)), width, height);
    if (!isLandPixel(landMask, x, y, width, height)) continue;
    const size = index % 17 === 0 ? 0.74 : index % 5 === 0 ? 0.52 : 0.3;
    const intensity = 0.2 + (index % 7) * 0.06;
    drawTinyLight(context, x, y, intensity, size);
  }
  context.restore();
}

function drawCityLightCorridors(context: CanvasRenderingContext2D, width: number, height: number, landMask: Uint8ClampedArray | null) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  cityLightCorridors.forEach((corridor) => {
    const from = lonLatToCanvas(corridor.from[0], corridor.from[1], width, height);
    const to = lonLatToCanvas(corridor.to[0], corridor.to[1], width, height);
    const lanes = corridor.lanes ?? 2;
    for (let lane = 0; lane < lanes; lane += 1) {
      const laneOffset = (lane - (lanes - 1) / 2) * 2.2;
      context.globalAlpha = corridor.intensity * (0.28 - lane * 0.035);
      context.strokeStyle = "#ffd98a";
      context.lineWidth = 0.55 + (lanes - lane) * 0.15;
      context.beginPath();
      context.moveTo(from.x, from.y + laneOffset);
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 10 - laneOffset;
      context.quadraticCurveTo(midX, midY, to.x, to.y - laneOffset);
      context.stroke();
    }
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * -8;
      if (!isLandPixel(landMask, x, y, width, height)) continue;
      context.globalAlpha = corridor.intensity * (0.18 + ((step % 3) * 0.09));
      context.fillStyle = "#fff2bd";
      context.beginPath();
      context.arc(x, y, step % 4 === 0 ? 1.05 : 0.58, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.restore();
}

function drawCityLightMicroTexture(context: CanvasRenderingContext2D, width: number, height: number, landMask: Uint8ClampedArray | null) {
  context.save();
  const belts = [
    { lat: 50, lonStart: -10, lonEnd: 35, density: 180, intensity: 0.26 },
    { lat: 35, lonStart: 105, lonEnd: 140, density: 150, intensity: 0.23 },
    { lat: 24, lonStart: 67, lonEnd: 91, density: 170, intensity: 0.28 },
    { lat: 39, lonStart: -97, lonEnd: -70, density: 150, intensity: 0.22 },
  ];
  belts.forEach((belt, beltIndex) => {
    for (let index = 0; index < belt.density; index += 1) {
      const lon = belt.lonStart + ((belt.lonEnd - belt.lonStart) * ((index * 17) % belt.density)) / belt.density;
      const lat = belt.lat + ((((index * 41 + beltIndex * 19) % 100) - 50) / 50) * 5.5;
      const { x, y } = lonLatToCanvas(lon, lat, width, height);
      if (!isLandPixel(landMask, x, y, width, height)) continue;
      drawTinyLight(context, x, y, belt.intensity + (index % 5) * 0.035, index % 13 === 0 ? 0.72 : 0.28);
    }
  });
  context.restore();
}

function configureEarthTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function TrialOfferPanel({
  settings,
  winRate,
  spotlightRoom,
  onStartTrial,
  onNavigate,
}: {
  settings: FunnyModeSettings & { boardTheme: string; soundVolume: number };
  winRate: number;
  spotlightRoom?: MultiplayerRoom;
  onStartTrial: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <View style={styles.trialPanel}>
      <View style={styles.trialPanelHeader}>
        <View style={styles.trialPanelTitleBlock}>
          <Text style={styles.trialPanelKicker}>Starter access</Text>
          <Text style={styles.trialPanelTitle}>Everything is free right now.</Text>
        </View>
        <View style={styles.trialPricePill}>
          <Text style={styles.trialPriceText}>$0</Text>
        </View>
      </View>
      <View style={styles.trialPerkGrid}>
        <View style={styles.trialPerk}>
          <EliteIcon icon={Sparkles} tone="rose" size="xs" rune="AL" />
          <View style={styles.trialPerkCopy}>
            <Text style={styles.trialPerkTitle}>Alive Mode</Text>
            <Text style={styles.trialPerkMeta}>{settings.enabled ? "Ready now" : "Starts on trial"}</Text>
          </View>
        </View>
        <View style={styles.trialPerk}>
          <EliteIcon icon={BarChart3} tone="emerald" size="xs" rune={`${winRate || 64}%`} />
          <View style={styles.trialPerkCopy}>
            <Text style={styles.trialPerkTitle}>Game Review</Text>
            <Text style={styles.trialPerkMeta}>Included</Text>
          </View>
        </View>
        <View style={styles.trialPerk}>
          <EliteIcon icon={Shield} tone="cobalt" size="xs" rune="AD" />
          <View style={styles.trialPerkCopy}>
              <Text style={styles.trialPerkTitle}>Private room</Text>
              <Text style={styles.trialPerkMeta}>1 free room</Text>
          </View>
        </View>
        <View style={styles.trialPerk}>
          <EliteIcon icon={Users} tone="gold" size="xs" rune="2P" />
          <View style={styles.trialPerkCopy}>
            <Text style={styles.trialPerkTitle}>Live rooms</Text>
            <Text style={styles.trialPerkMeta}>{spotlightRoom ? spotlightRoom.timeControl : "5|0 ready"}</Text>
          </View>
        </View>
      </View>
      <Pressable onPress={onStartTrial} style={({ pressed }) => [styles.trialPanelButton, pressed && styles.pressed]}>
        <Text style={styles.trialPanelButtonText}>Start playing</Text>
        <Rocket size={18} color="#111827" strokeWidth={3} />
      </Pressable>
      <Pressable onPress={() => onNavigate("Profile")} style={({ pressed }) => [styles.trialPanelLink, pressed && styles.pressed]}>
        <Text style={styles.trialPanelLinkText}>View player profile</Text>
      </Pressable>
    </View>
  );
}

const authProviderCards: Array<{ id: AuthProvider; label: string; mark: string; background: string; color: string }> = [
  { id: "google", label: "Google", mark: "G", background: "#ffffff", color: "#2563eb" },
  { id: "facebook", label: "Facebook", mark: "f", background: "#1877f2", color: "#ffffff" },
  { id: "apple", label: "Apple", mark: "A", background: "#111827", color: "#ffffff" },
];

function AuthPanel({
  services,
  user,
  onSignedIn,
  compact,
}: {
  services: ChessAliveServices;
  user: UserProfile | null;
  onSignedIn: (user: UserProfile) => void | Promise<void>;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState(user ? `Signed in as ${user.displayName}` : "Choose a provider to continue.");
  const compactStatus = status === "Choose a provider to continue." ? "Save your rating, rooms, and match history." : status;

  async function signInWithGoogle() {
    setStatus("Opening Google sign-in...");
    try {
      const profile = await requestGoogleProfile();
      const nextUser = await services.auth.signInWithGoogleProfile(profile);
      setStatus(`Signed in with Google as ${nextUser.displayName}.`);
      await onSignedIn(nextUser);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }

  async function signInWithProvider(provider: AuthProvider) {
    if (provider === "google") {
      await signInWithGoogle();
      return;
    }
    const nextUser = await services.auth.signInWithProvider(provider);
    setStatus(`Signed in with ${authProviderCards.find((item) => item.id === provider)?.label ?? provider}.`);
    await onSignedIn(nextUser);
  }

  async function requestOtp() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus("Enter an email to receive an OTP.");
      return;
    }
    try {
      const result = await services.auth.requestEmailOtp(normalizedEmail);
      setOtpSent(true);
      setStatus(result.delivery === "email" ? `OTP sent to ${result.email}.` : `OTP ready locally. Dev code: ${result.previewCode}.`);
    } catch {
      setStatus("OTP could not be sent. Check the email and try again.");
    }
  }

  async function verifyOtp() {
    try {
      const nextUser = await services.auth.verifyEmailOtp(email, otp);
      setStatus(`Signed in as ${nextUser.displayName}.`);
      await onSignedIn(nextUser);
    } catch {
      setStatus("That OTP is invalid or expired.");
    }
  }

  const otpNode = (
    <View style={[styles.otpPanel, compact && styles.otpPanelCompact]}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email for OTP"
        placeholderTextColor="#8aa0b6"
        keyboardType="email-address"
        autoCapitalize="none"
        style={[styles.authInput, compact && styles.authInputCompact]}
      />
      <View style={styles.otpActionRow}>
        <Pressable onPress={requestOtp} style={({ pressed }) => [styles.otpButton, compact && styles.otpButtonCompact, pressed && styles.pressed]}>
          <Text style={styles.otpButtonText}>Send OTP</Text>
        </Pressable>
        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder="Code"
          placeholderTextColor="#8aa0b6"
          keyboardType="number-pad"
          style={[styles.authInput, styles.otpInput, compact && styles.authInputCompact]}
        />
        <Pressable onPress={verifyOtp} disabled={!otpSent} style={({ pressed }) => [styles.otpButton, compact && styles.otpButtonCompact, !otpSent && styles.otpButtonDisabled, pressed && styles.pressed]}>
          <Text style={[styles.otpButtonText, !otpSent && styles.otpButtonTextDisabled]}>Verify</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Panel title={compact ? "Member Access" : "Sign In"}>
      <View style={[styles.authPremiumCard, compact && styles.authPremiumCardCompact]}>
        <View pointerEvents="none" style={styles.authPremiumGlow} />
        <View style={styles.authPremiumHeader}>
          <View style={styles.authPremiumLogo}>
            <ChessAliveLogoMark variant="title" />
          </View>
          <View style={styles.authPremiumCopy}>
            <Text style={styles.authPremiumTitle}>{compact ? "Save your run" : "ChessAlive account"}</Text>
            <Text numberOfLines={compact ? 2 : undefined} style={[styles.authStatus, compact && styles.authStatusCompact]}>{compact ? compactStatus : status}</Text>
          </View>
        </View>
        <View style={[styles.authProviderGrid, compact && styles.authProviderGridCompact]}>
          {authProviderCards.map((provider) => {
            const primary = provider.id === "google";
            return (
              <Pressable
                key={provider.id}
                onPress={() => void signInWithProvider(provider.id)}
                style={({ pressed }) => [styles.authProviderButton, primary && styles.authProviderButtonPrimary, compact && styles.authProviderButtonCompact, pressed && styles.pressed]}
              >
                <View style={[styles.providerMark, primary && styles.providerMarkPrimary, { backgroundColor: primary ? "#ffffff" : provider.background, borderColor: primary ? "#d7e1ee" : provider.background }]}>
                  <Text style={[styles.providerMarkText, { color: provider.color }]}>{provider.mark}</Text>
                </View>
                <Text style={[styles.authProviderText, primary && styles.authProviderTextPrimary]}>{compact ? provider.label : `Continue with ${provider.label}`}</Text>
              </Pressable>
            );
          })}
        </View>
        {otpNode}
      </View>
    </Panel>
  );
}

const iconPalettes: Record<IconTone, { shell: string; core: string; border: string; glyph: string; jewel: string }> = {
  cobalt: { shell: "#e9edff", core: "#3f55b7", border: "#b7c1ee", glyph: "#ffffff", jewel: "#f8c65a" },
  gold: { shell: "#fff1ca", core: "#d99019", border: "#f0bc5e", glyph: "#1f2937", jewel: "#ffffff" },
  violet: { shell: "#eee6ff", core: "#7154c8", border: "#bba5f0", glyph: "#ffffff", jewel: "#f7c948" },
  rose: { shell: "#ffe3e8", core: "#c84766", border: "#efa0ae", glyph: "#ffffff", jewel: "#ffe6a3" },
  emerald: { shell: "#dff8ea", core: "#268a64", border: "#8ad3b0", glyph: "#ffffff", jewel: "#d9f99d" },
  slate: { shell: "#e9eef5", core: "#334155", border: "#a8b5c6", glyph: "#ffffff", jewel: "#93c5fd" },
  sky: { shell: "#e6f1ff", core: "#426ab5", border: "#a9c7ee", glyph: "#ffffff", jewel: "#fff8ec" },
};

const eliteIconSizes = {
  xs: { box: 28, core: 21, icon: 13 },
  sm: { box: 38, core: 29, icon: 17 },
  md: { box: 46, core: 36, icon: 20 },
  lg: { box: 52, core: 41, icon: 23 },
};

function EliteIcon({
  icon: Icon,
  tone,
  size = "md",
  active,
  rune,
}: {
  icon: typeof Home;
  tone: IconTone;
  size?: keyof typeof eliteIconSizes;
  active?: boolean;
  rune?: string;
}) {
  const palette = iconPalettes[tone];
  const dimensions = eliteIconSizes[size];
  return (
    <View
      style={[
        styles.eliteIcon,
        {
          height: dimensions.box,
          width: dimensions.box,
        },
      ]}
    >
      <View style={[styles.eliteIconDepth, { backgroundColor: palette.core }]} />
      <View
        style={[
          styles.eliteIconFace,
          {
            backgroundColor: active ? palette.core : palette.shell,
            borderColor: active ? palette.jewel : palette.border,
          },
        ]}
      >
        <View style={[styles.eliteIconGlow, { backgroundColor: active ? "rgba(255,255,255,0.24)" : palette.jewel }]} />
        <View style={[styles.eliteIconCore, { backgroundColor: active ? "rgba(255,255,255,0.16)" : palette.core }]}>
          <Icon size={dimensions.icon} color={palette.glyph} strokeWidth={3} />
        </View>
        <Text style={[styles.eliteIconRune, { color: active ? palette.jewel : palette.core }]}>{rune ?? "♟"}</Text>
      </View>
    </View>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  rune,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
  tone: IconTone;
  rune?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <EliteIcon icon={Icon} tone={tone} size="md" rune={rune} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function QuickActionCard({
  icon: Icon,
  tone,
  title,
  body,
  value,
  onPress,
  rune,
}: {
  icon: typeof Flame;
  tone: IconTone;
  title: string;
  body: string;
  value: string;
  onPress: () => void;
  rune?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickActionCard}>
      <View style={[styles.quickActionTopLine, { backgroundColor: iconPalettes[tone].core }]} />
      <View style={styles.quickActionTop}>
        <EliteIcon icon={Icon} tone={tone} size="lg" rune={rune} />
        <Text style={styles.quickActionValue}>{value}</Text>
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text numberOfLines={2} style={styles.quickActionBody}>{body}</Text>
      <View style={styles.quickActionFooter}>
        <Text style={styles.quickActionFooterText}>Start</Text>
        <View style={styles.quickActionArrow}>
          <Text style={styles.quickActionArrowText}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

function MiniBoard({ snapshot, theme }: { snapshot: GameSnapshot; theme: BoardTheme }) {
  const isJewelBoard = theme.id === "jewel-cobalt";
  const isClarityBoard = theme.id === "clarity-ivory" || theme.id === "graphite-glass" || theme.id === "mint-studio";

  return (
    <View style={[styles.miniBoard, { borderColor: theme.dark }, isJewelBoard && styles.miniBoardJewel, isClarityBoard && styles.miniBoardClarity]}>
      {ranks.map((rank) => (
        <View key={rank} style={styles.miniBoardRow}>
          {files.map((file) => {
            const square = `${file}${rank}` as SquareName;
            const cell = snapshot.board.find((item) => item.square === square) as BoardCell;
            const piece = cell.piece;
            const fileIndex = files.indexOf(file);
            const isLight = (fileIndex + rank) % 2 === 1;
            const isLastMove = snapshot.history.at(-1)?.from === square || snapshot.history.at(-1)?.to === square;
            const squareColor = getSquareColor(theme, isLight, fileIndex, rank);
            return (
              <View
                key={square}
                style={[
                  styles.miniSquare,
                  { backgroundColor: squareColor },
                  isLastMove && { backgroundColor: blendSquare(theme.highlight, squareColor) },
                ]}
              >
                {(isJewelBoard || isClarityBoard) && <View pointerEvents="none" style={[styles.squareFacet, isLight ? styles.squareFacetLight : styles.squareFacetDark]} />}
                {cell.piece && (
                  <View style={styles.miniBoardPieceWrap}>
                    <PremiumPiece color={cell.piece.color} kind={cell.piece.kind} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ChessBoard({
  activeCeremony,
  displayBoard,
  snapshot,
  selected,
  premoves,
  onPressSquare,
  onDropPiece,
  playerColor,
  theme,
  activeEffect,
  size,
}: {
  activeCeremony: ActiveBoardCeremony | null;
  displayBoard?: BoardCell[];
  snapshot: GameSnapshot;
  selected: SquareName | null;
  premoves: MoveIntent[];
  onPressSquare: (square: SquareName) => void;
  onDropPiece: (from: SquareName, to: SquareName) => void;
  playerColor: "w" | "b";
  theme: BoardTheme;
  activeEffect: ActiveFunnyEffect | null;
  size: number;
}) {
  const isJewelBoard = theme.id === "jewel-cobalt";
  const isClarityBoard = theme.id === "clarity-ivory" || theme.id === "graphite-glass" || theme.id === "mint-studio";
  const [boardPixelSize, setBoardPixelSize] = useState(Math.max(1, size - 28));
  const squareSize = Math.max(1, boardPixelSize / 8);
  const boardRef = useRef<View | null>(null);
  const boardMetricsRef = useRef({ height: squareSize * 8, pageX: 0, pageY: 0, width: squareSize * 8 });
  const [activeEffectProgress, setActiveEffectProgress] = useState(0);
  const [activeCeremonyProgress, setActiveCeremonyProgress] = useState(0);
  const displayRanks = playerColor === "b" ? blackPerspectiveRanks : ranks;
  const displayFiles = playerColor === "b" ? blackPerspectiveFiles : files;
  const rankLabelFile = displayFiles[0];
  const fileLabelRank = displayRanks[displayRanks.length - 1];
  const [dragState, setDragState] = useState<{
    color: "w" | "b";
    dx: number;
    dy: number;
    isDragging: boolean;
    kind: PieceKind;
    pointerX: number;
    pointerY: number;
    square: SquareName;
    startX: number;
    startY: number;
  } | null>(null);
  const dragStateRef = useRef<typeof dragState>(null);
  const pointerStartRef = useRef<{ square: SquareName; x: number; y: number } | null>(null);
  const activeWebPointerRef = useRef<number | null>(null);
  const activeFrom = dragState?.square ?? selected;
  const legalTargets = activeFrom ? snapshot.legalMoves[activeFrom] ?? [] : [];
  const dragLeft = dragState ? dragState.pointerX - squareSize / 2 : 0;
  const dragTop = dragState ? dragState.pointerY - squareSize / 2 : 0;
  const boardForDisplay = displayBoard ?? snapshot.board;
  const activeMove = activeEffect?.event.move;
  const activeActorSquare = activeMove?.to;
  const activeAnimationVariant = activeEffect ? activeEffect.effect.animationVariant ?? pawnAnimationVariant(activeEffect.effect.id) : "move";
  const activeEffectIsCeremony = activeEffect?.effect.action === "checkmate-finisher";
  const activeGlbClipName = activeEffectClipName(activeEffect, activeEffectProgress);
  const activeGlbPath = activeMove?.piece !== "p" ? activeEffectClipGlbPath(activeEffect, activeEffectProgress) : undefined;
  const hasActiveGlb = Boolean(activeGlbPath && canLoadGlbPath(activeGlbPath));
  const activeTravelMorph = morphTransitionPose(morphFrameForMoveProgress(activeEffectProgress), squareSize);
  const hasActiveTravelSprite = Boolean(
    activeEffect &&
      !activeEffectIsCeremony &&
      activeMove &&
      (activeMove.piece === "p" || hasActiveGlb || pieceAnimationSpriteAssets[activeMove.color][activeMove.piece]?.[activeAnimationVariant]),
  );
  const activeTravelFrom = activeMove ? squareRect(activeMove.from, squareSize, playerColor) : null;
  const activeTravelTo = activeMove ? squareRect(activeMove.to, squareSize, playerColor) : null;
  const activeTravelProgress = smoothNumber(Math.max(0, Math.min(1, (activeEffectProgress - 0.06) / 0.68)));
  const activeTravelLeft =
    activeTravelFrom && activeTravelTo ? activeTravelFrom.left + (activeTravelTo.left - activeTravelFrom.left) * activeTravelProgress : 0;
  const activeTravelTop =
    activeTravelFrom && activeTravelTo
      ? activeTravelFrom.top + (activeTravelTo.top - activeTravelFrom.top) * activeTravelProgress - Math.sin(activeTravelProgress * Math.PI) * squareSize * 0.08
      : 0;
  const ceremonyHiddenSquares = useMemo(() => getCeremonyHiddenSquares(activeCeremony, snapshot), [activeCeremony, snapshot.fen]);

  useEffect(() => {
    setBoardPixelSize(Math.max(1, size - 28));
  }, [size]);

  useEffect(() => {
    if (!activeEffect) {
      setActiveEffectProgress(0);
      return undefined;
    }
    let frame = 0;
    const startedAt = activeEffect.startedAt;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setActiveEffectProgress(Math.min(1, elapsed / activeEffect.effect.durationMs));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [activeEffect]);

  useEffect(() => {
    if (!activeCeremony) {
      setActiveCeremonyProgress(0);
      return undefined;
    }
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - activeCeremony.startedAt;
      setActiveCeremonyProgress(Math.min(1, elapsed / activeCeremony.durationMs));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [activeCeremony]);

  function updateDragState(next: typeof dragState) {
    dragStateRef.current = next;
    setDragState(next);
  }

  function measureBoard() {
    boardRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      if (width > 0 && height > 0) {
        const boardSide = Math.min(width, height);
        boardMetricsRef.current = { height: boardSide, pageX, pageY, width: boardSide };
        setBoardPixelSize((current) => (Math.abs(current - boardSide) > 0.5 ? boardSide : current));
      }
    });
  }

  function pointFromPage(pageX: number, pageY: number) {
    const metrics = boardMetricsRef.current;
    const rawX = pageX - metrics.pageX;
    const rawY = pageY - metrics.pageY;
    const virtualBoardSize = squareSize * 8;
    const normalizedX = metrics.width > 0 ? rawX * (virtualBoardSize / metrics.width) : rawX;
    const normalizedY = metrics.height > 0 ? rawY * (virtualBoardSize / metrics.height) : rawY;
    return {
      x: Math.max(0, Math.min(virtualBoardSize - 1, normalizedX)),
      y: Math.max(0, Math.min(virtualBoardSize - 1, normalizedY)),
    };
  }

  function canStartPieceDrag(event: { nativeEvent?: { locationX?: number; locationY?: number; pageX?: number; pageY?: number } }) {
    const native = event.nativeEvent;
    if (!native) return false;
    const metrics = boardMetricsRef.current;
    const pageX = typeof native.pageX === "number"
      ? native.pageX
      : typeof native.locationX === "number"
        ? metrics.pageX + native.locationX
        : null;
    const pageY = typeof native.pageY === "number"
      ? native.pageY
      : typeof native.locationY === "number"
        ? metrics.pageY + native.locationY
        : null;
    if (pageX === null || pageY === null) return false;
    const point = pointFromPage(pageX, pageY);
    const square = squareFromBoardPoint(point.x, point.y, squareSize, playerColor);
    const piece = boardForDisplay.find((cell) => cell.square === square)?.piece;
    return Boolean(piece && piece.color === playerColor);
  }

  function pagePointFromResponderEvent(event: any) {
    const native = event?.nativeEvent ?? event;
    const pageX = typeof native?.pageX === "number"
      ? native.pageX
      : typeof native?.clientX === "number"
        ? native.clientX + ((globalThis as any).window?.scrollX ?? 0)
        : null;
    const pageY = typeof native?.pageY === "number"
      ? native.pageY
      : typeof native?.clientY === "number"
        ? native.clientY + ((globalThis as any).window?.scrollY ?? 0)
        : null;
    if (pageX === null || pageY === null) return null;
    return pointFromPage(pageX, pageY);
  }

  function beginBoardDrag(point: { x: number; y: number }) {
    const square = squareFromBoardPoint(point.x, point.y, squareSize, playerColor);
    pointerStartRef.current = { square, x: point.x, y: point.y };
    const piece = boardForDisplay.find((cell) => cell.square === square)?.piece;
    if (!piece || piece.color !== playerColor) {
      updateDragState(null);
      return false;
    }
    const fromRect = squareRect(square, squareSize, playerColor);
    updateDragState({
      color: piece.color,
      dx: point.x - (fromRect.left + squareSize / 2),
      dy: point.y - (fromRect.top + squareSize / 2),
      isDragging: false,
      kind: piece.kind,
      pointerX: point.x,
      pointerY: point.y,
      square,
      startX: fromRect.left + squareSize / 2,
      startY: fromRect.top + squareSize / 2,
    });
    return true;
  }

  function moveBoardDrag(point: { x: number; y: number }) {
    const current = dragStateRef.current;
    if (!current) return;
    const dx = point.x - current.startX;
    const dy = point.y - current.startY;
    updateDragState({ ...current, dx, dy, isDragging: true, pointerX: point.x, pointerY: point.y });
  }

  function releaseBoardDrag(point: { x: number; y: number }) {
    const start = pointerStartRef.current;
    const current = dragStateRef.current;
    pointerStartRef.current = null;
    if (!current) {
      if (start && Math.abs(point.x - start.x) + Math.abs(point.y - start.y) < 10) onPressSquare(start.square);
      return;
    }

    const dx = point.x - current.startX;
    const dy = point.y - current.startY;
    const target =
      squareFromDragOverlap(current.square, dx, dy, squareSize, snapshot.legalMoves[current.square] ?? [], playerColor) ??
      squareFromBoardPoint(point.x, point.y, squareSize, playerColor);

    const moved = Math.abs(dx) + Math.abs(dy);
    if (moved < 10 || target === current.square) {
      updateDragState(null);
      onPressSquare(current.square);
      return;
    }

    if (snapshot.legalMoves[current.square]?.includes(target)) {
      const fromRect = squareRect(current.square, squareSize, playerColor);
      const toRect = squareRect(target, squareSize, playerColor);
      updateDragState({
        ...current,
        dx: toRect.left - fromRect.left,
        dy: toRect.top - fromRect.top,
        isDragging: true,
        pointerX: toRect.left + squareSize / 2,
        pointerY: toRect.top + squareSize / 2,
      });
      onDropPiece(current.square, target);
      setTimeout(() => updateDragState(null), 120);
      return;
    }

    updateDragState(null);
    onDropPiece(current.square, target);
  }

  const webDragHandlers = useMemo(() => ({
    onPointerDown: (event: any) => {
      if (event?.isPrimary === false) return;
      if (typeof event?.button === "number" && event.button !== 0) return;
      measureBoard();
      const point = pagePointFromResponderEvent(event);
      if (!point || !beginBoardDrag(point)) return;
      activeWebPointerRef.current = typeof event?.pointerId === "number" ? event.pointerId : -1;
      event?.currentTarget?.setPointerCapture?.(event.pointerId);
      event?.preventDefault?.();
      event?.stopPropagation?.();
    },
    onPointerMove: (event: any) => {
      if (activeWebPointerRef.current === null || !dragStateRef.current) return;
      const point = pagePointFromResponderEvent(event);
      if (!point) return;
      moveBoardDrag(point);
      event?.preventDefault?.();
      event?.stopPropagation?.();
    },
    onPointerUp: (event: any) => {
      if (activeWebPointerRef.current === null && !pointerStartRef.current && !dragStateRef.current) return;
      const point = pagePointFromResponderEvent(event);
      activeWebPointerRef.current = null;
      if (!point) return;
      releaseBoardDrag(point);
      event?.preventDefault?.();
      event?.stopPropagation?.();
    },
    onPointerCancel: () => {
      activeWebPointerRef.current = null;
      pointerStartRef.current = null;
      updateDragState(null);
    },
    onMouseDown: (event: any) => {
      if (activeWebPointerRef.current !== null) return;
      if (typeof event?.button === "number" && event.button !== 0) return;
      measureBoard();
      const point = pagePointFromResponderEvent(event);
      if (!point || !beginBoardDrag(point)) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
    },
    onMouseMove: (event: any) => {
      if (activeWebPointerRef.current !== null) return;
      if (!dragStateRef.current) return;
      const point = pagePointFromResponderEvent(event);
      if (!point) return;
      moveBoardDrag(point);
      event?.preventDefault?.();
      event?.stopPropagation?.();
    },
    onMouseUp: (event: any) => {
      if (activeWebPointerRef.current !== null) return;
      if (!pointerStartRef.current && !dragStateRef.current) return;
      const point = pagePointFromResponderEvent(event);
      if (!point) return;
      releaseBoardDrag(point);
      event?.preventDefault?.();
      event?.stopPropagation?.();
    },
  }), [boardForDisplay, onDropPiece, onPressSquare, playerColor, snapshot, squareSize]);

  const boardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
        onMoveShouldSetPanResponderCapture: (_event, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
        onPanResponderGrant: (_event, gesture) => {
          measureBoard();
          const point = pointFromPage(gesture.x0, gesture.y0);
          beginBoardDrag(point);
        },
        onPanResponderMove: (_event, gesture) => {
          const point = pointFromPage(gesture.moveX, gesture.moveY);
          moveBoardDrag(point);
        },
        onPanResponderRelease: (_event, gesture) => {
          const point = pointFromPage(gesture.moveX, gesture.moveY);
          releaseBoardDrag(point);
        },
        onPanResponderTerminate: () => {
          activeWebPointerRef.current = null;
          pointerStartRef.current = null;
          updateDragState(null);
        },
        onStartShouldSetPanResponder: (event) => canStartPieceDrag(event),
        onStartShouldSetPanResponderCapture: (event) => canStartPieceDrag(event),
      }),
    [boardForDisplay, onDropPiece, onPressSquare, playerColor, snapshot, squareSize],
  );

  return (
    <View style={[styles.boardShell, { width: size }, isJewelBoard && styles.boardShellJewel, isClarityBoard && styles.boardShellClarity]}>
      <View style={[styles.boardGlow, { backgroundColor: theme.highlight }, isJewelBoard && styles.boardGlowJewel]} />
      <View
        ref={boardRef}
        {...boardPanResponder.panHandlers}
        {...webDragHandlers}
        onLayout={measureBoard}
        style={[styles.board, boardGestureSurface, { borderColor: theme.dark }, isJewelBoard && styles.boardJewel, isClarityBoard && styles.boardClarity]}
      >
      {displayRanks.map((rank) => {
        const isDraggingRank = dragState?.square[1] === String(rank);
        return (
        <View key={rank} style={[styles.boardRow, isDraggingRank && styles.boardRowDragging]}>
          {displayFiles.map((file) => {
            const square = `${file}${rank}` as SquareName;
            const cell = boardForDisplay.find((item) => item.square === square) as BoardCell;
            const piece = cell.piece;
            const isPremoveFrom = premoves.some((move) => move.from === square);
            const isPremoveTo = premoves.some((move) => move.to === square);
            const fileIndex = files.indexOf(file);
            const isLight = (fileIndex + rank) % 2 === 1;
            const isSelected = selected === square;
            const isDraggingSquare = dragState?.square === square;
            const isLegal = legalTargets.includes(square);
            const isLastMove = snapshot.history.at(-1)?.from === square || snapshot.history.at(-1)?.to === square;
            const squareColor = getSquareColor(theme, isLight, fileIndex, rank);
            const isCaptureActorSquare = activeActorSquare === square;
            const isCeremonyHidden = ceremonyHiddenSquares.includes(square);
            const isTravelTargetPiece = Boolean(
              hasActiveTravelSprite && activeMove && piece && activeMove.to === square && piece.kind === activeMove.piece && piece.color === activeMove.color,
            );
            const isActiveBoardPiece = Boolean(
              !activeEffectIsCeremony &&
                !hasActiveTravelSprite &&
                isCaptureActorSquare &&
                activeEffect &&
                piece &&
                piece.kind === activeEffect.event.move.piece &&
                piece.color === activeEffect.event.move.color,
            );
            const isActivePawnAnimation = Boolean(isActiveBoardPiece && activeEffect?.event.move.piece === "p" && piece?.kind === "p");
            const isActivePieceSpriteAnimation = Boolean(
              isActiveBoardPiece &&
                piece &&
                piece.kind !== "p" &&
                !hasActiveGlb &&
                pieceAnimationSpriteAssets[piece.color][piece.kind]?.[activeAnimationVariant],
            );
            const isActiveSpriteAnimation = isActivePawnAnimation || isActivePieceSpriteAnimation;
            const activePieceEnter = smoothNumber(activeEffectProgress / 0.16);
            const activePieceExit = smoothNumber((activeEffectProgress - 0.86) / 0.14);
            const activePieceEnergy = activePieceEnter * (1 - activePieceExit);
            const activePieceDip = Math.sin(Math.min(1, activeEffectProgress / 0.1) * Math.PI) * squareSize * 0.045;
            const activePieceLift =
              Math.sin(Math.max(0, Math.min(1, (activeEffectProgress - 0.18) / 0.62)) * Math.PI) * squareSize * 0.08;
            const activePieceDance = Math.sin(Math.max(0, Math.min(1, (activeEffectProgress - 0.18) / 0.62)) * Math.PI * 4);
            // Alive effects animate only the board piece that already exists on this square.
            const activePieceStyle =
              isActiveBoardPiece
                ? {
                    opacity: isActiveSpriteAnimation ? activePieceEnter : 1,
                    transform: [
                      { translateY: activePieceDip - activePieceLift },
                      { rotate: `${isActiveSpriteAnimation ? 0 : activePieceDance * activePieceEnergy * 4}deg` },
                      { scale: isActiveSpriteAnimation ? 1 : 1 + activePieceEnergy * 0.28 },
                    ],
                    zIndex: 96,
                  }
                : null;
            return (
              <Pressable
                {...webDragHandlers}
                key={square}
                accessibilityLabel={`square ${square}`}
                accessibilityRole="button"
                onPress={() => onPressSquare(square)}
                style={[
                  styles.square,
                  boardGestureSurface,
                  { backgroundColor: squareColor },
                  isLastMove && { backgroundColor: blendSquare(theme.highlight, squareColor) },
                  isSelected && { backgroundColor: theme.highlight },
                  (isPremoveFrom || isPremoveTo) && styles.squarePremove,
                  (isPremoveFrom || isPremoveTo) && { backgroundColor: blendSquare("#fb7185", squareColor) },
                  isDraggingSquare && styles.squareDragging,
                  isActiveBoardPiece && styles.squareDragging,
                ]}
              >
                {(isJewelBoard || isClarityBoard) && (
                  <>
                    <View pointerEvents="none" style={[styles.squareFacet, isLight ? styles.squareFacetLight : styles.squareFacetDark]} />
                    {isJewelBoard && (fileIndex + rank) % 4 === 0 && <View pointerEvents="none" style={styles.squareSpark} />}
                  </>
                )}
                {isLegal && <View style={[piece ? styles.legalRing : styles.legalDot, { borderColor: theme.legal, backgroundColor: piece ? "transparent" : theme.legal }]} />}
                {isPremoveFrom && (
                  <View pointerEvents="none" style={styles.premoveFlag}>
                    <Text style={styles.premoveFlagText}>PM</Text>
                  </View>
                )}
                {isPremoveTo && <View pointerEvents="none" style={styles.premoveTargetRing} />}
                {piece && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.assembledPiece,
                      isDraggingSquare && dragState?.isDragging && styles.draggablePieceHidden,
                      isTravelTargetPiece && styles.draggablePieceHidden,
                      isCeremonyHidden && styles.draggablePieceHidden,
                      activePieceStyle,
                    ]}
                  >
                    <View style={styles.draggablePiece}>
                      <PremiumPiece
                        active3d={isActivePieceSpriteAnimation}
                        color={piece.color}
                        kind={piece.kind}
                        pawnProgress={isActivePawnAnimation ? activeEffectProgress : undefined}
                        pawnSize={isActivePawnAnimation ? squareSize * 1.34 : undefined}
                        pawnVariant={isActivePawnAnimation ? activeAnimationVariant : undefined}
                        pieceProgress={isActivePieceSpriteAnimation ? activeEffectProgress : undefined}
                        pieceSize={isActivePieceSpriteAnimation ? squareSize * pieceAnimationBoardScale : undefined}
                        pieceVariant={isActivePieceSpriteAnimation ? activeAnimationVariant : undefined}
                      />
                    </View>
                  </View>
                )}
                {file === rankLabelFile && <Text style={[styles.rankLabel, isLight ? styles.squareLabelDark : styles.squareLabelLight]}>{rank}</Text>}
                {rank === fileLabelRank && <Text style={[styles.fileLabel, isLight ? styles.squareLabelDark : styles.squareLabelLight]}>{file}</Text>}
              </Pressable>
            );
          })}
        </View>
        );
      })}
      {hasActiveTravelSprite && activeEffect && activeMove && activeTravelFrom && activeTravelTo && (
        <View
          pointerEvents="none"
          style={[
            styles.activeTravelPieceLayer,
            {
              height: squareSize,
              left: activeTravelLeft,
              top: activeTravelTop,
              width: squareSize,
            },
          ]}
        >
          {activeMove.piece !== "p" && hasActiveGlb && activeGlbPath ? (
              <PieceLifeMorph
                color={activeMove.color}
                containerSize={squareSize * 2.5}
                flipX={activeTravelTo.left < activeTravelFrom.left}
                morph={activeTravelMorph}
                piece={activeMove.piece}
                pieceSize={squareSize}
              >
              <GlbModelPreview key={`${activeGlbPath}:${activeGlbClipName ?? ""}:${activeEffect.effect.id}`} clipName={activeGlbClipName} color={activeMove.color} glbPath={activeGlbPath} piece={activeMove.piece} />
            </PieceLifeMorph>
          ) : (
            <PremiumPiece
              active3d={activeMove.piece !== "p"}
              color={activeMove.color}
              kind={activeMove.piece}
              pawnProgress={activeMove.piece === "p" ? activeEffectProgress : undefined}
              pawnSize={activeMove.piece === "p" ? squareSize * 1.34 : undefined}
              pawnVariant={activeMove.piece === "p" ? activeAnimationVariant : undefined}
              pieceProgress={activeMove.piece !== "p" ? activeEffectProgress : undefined}
              pieceSize={activeMove.piece !== "p" ? squareSize * pieceAnimationBoardScale : undefined}
              pieceVariant={activeMove.piece !== "p" ? activeAnimationVariant : undefined}
            />
          )}
        </View>
      )}
      {activeCeremony && (
        <GameCeremonyOverlay
          ceremony={activeCeremony}
          progress={activeCeremonyProgress}
          snapshot={snapshot}
          squareSize={squareSize}
          orientation={playerColor}
        />
      )}
      {dragState?.isDragging && (
        <View
          pointerEvents="none"
          style={[
            styles.dragPieceOverlay,
            {
              height: squareSize,
              left: dragLeft,
              top: dragTop,
              width: squareSize,
            },
          ]}
        >
          <PremiumPiece color={dragState.color} kind={dragState.kind} />
        </View>
      )}
      </View>
    </View>
  );
}

function getCeremonyHiddenSquares(ceremony: ActiveBoardCeremony | null, snapshot: GameSnapshot) {
  if (!ceremony) return [] as SquareName[];
  if (ceremony.type === "pre-game-handshake") {
    return [kingSquare(snapshot, "w"), kingSquare(snapshot, "b")].filter(Boolean) as SquareName[];
  }
  if (!ceremony.move) return [] as SquareName[];
  return [ceremony.move.to, kingSquare(snapshot, ceremony.move.color === "w" ? "b" : "w")].filter(Boolean) as SquareName[];
}

function kingSquare(snapshot: GameSnapshot, color: "w" | "b") {
  return snapshot.board.find((cell) => cell.piece?.kind === "k" && cell.piece.color === color)?.square ?? null;
}

function squareCenter(square: SquareName, squareSize: number) {
  const rect = squareRect(square, squareSize);
  return { x: rect.left + squareSize / 2, y: rect.top + squareSize / 2 };
}

function orientedSquareCenter(square: SquareName, squareSize: number, orientation: BoardOrientation) {
  const rect = squareRect(square, squareSize, orientation);
  return { x: rect.left + squareSize / 2, y: rect.top + squareSize / 2 };
}

function lerpPoint(from: { x: number; y: number }, to: { x: number; y: number }, progress: number) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function CeremonyGlbPiece({
  clipName,
  color,
  glbPath,
  kind,
  point,
  scale = 1,
  squareSize,
}: {
  clipName?: string;
  color: "w" | "b";
  glbPath?: string;
  kind: PieceKind;
  point: { x: number; y: number };
  scale?: number;
  squareSize: number;
}) {
  const size = squareSize * 2.45 * scale;
  const canRenderGlb = canLoadGlbPath(glbPath);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.ceremonyGlbPieceLayer,
        {
          height: size,
          left: point.x - size / 2,
          top: point.y - size * 0.72,
          width: size,
        },
      ]}
    >
      {canRenderGlb ? (
        <GlbModelPreview key={`${glbPath}:${clipName ?? ""}:${color}:${kind}`} clipName={clipName} color={color} glbPath={glbPath} piece={kind} />
      ) : (
        <View style={styles.ceremonyMissingGlb}>
          <PreviewAlphaPiece color={color} piece={kind} />
          <Text style={styles.ceremonyMissingText}>Attach GLB</Text>
        </View>
      )}
    </View>
  );
}

function mirroredSquare(square: SquareName): SquareName {
  return `${square[0]}${9 - Number(square[1])}` as SquareName;
}

function pointFromChoreographySteps(
  steps: AnimationChoreographyStep[] | undefined,
  progress: number,
  squareSize: number,
  fallback: { x: number; y: number },
  orientation: BoardOrientation,
  mirror = false,
) {
  if (!steps?.length) return fallback;
  const totalMs = choreographyTotalDuration(steps);
  const elapsedMs = Math.max(0, Math.min(0.999, progress)) * totalMs;
  const activeStep = steps.find((step) => elapsedMs >= step.startsAtMs && elapsedMs <= step.startsAtMs + step.durationMs) ?? steps.at(-1);
  if (!activeStep) return fallback;
  const fromSquare = activeStep.from ? (mirror ? mirroredSquare(activeStep.from) : activeStep.from) : undefined;
  const toSquare = activeStep.to ? (mirror ? mirroredSquare(activeStep.to) : activeStep.to) : fromSquare;
  if (!fromSquare && !toSquare) return fallback;
  const fromPoint = orientedSquareCenter(fromSquare ?? toSquare!, squareSize, orientation);
  const toPoint = orientedSquareCenter(toSquare ?? fromSquare!, squareSize, orientation);
  if (activeStep.kind !== "walk" && activeStep.kind !== "return") return toPoint;
  const localProgress = activeStep.durationMs > 0 ? smoothNumber((elapsedMs - activeStep.startsAtMs) / activeStep.durationMs) : 1;
  return lerpPoint(fromPoint, toPoint, localProgress);
}

function GameCeremonyOverlay({
  ceremony,
  progress,
  snapshot,
  squareSize,
  orientation,
}: {
  ceremony: ActiveBoardCeremony;
  orientation: BoardOrientation;
  progress: number;
  snapshot: GameSnapshot;
  squareSize: number;
}) {
  if (ceremony.type === "pre-game-handshake") {
    const clipName = activeEffectClipName(ceremony.effect ?? null, progress);
    const glbPath = activeEffectClipGlbPath(ceremony.effect ?? null, progress) ?? ceremony.opponentKingGlbPath;
    const configuredSteps = ceremony.effect?.effect.choreographySteps;
    const whitePoint = pointFromChoreographySteps(configuredSteps, progress, squareSize, { x: squareSize * 3.25, y: squareSize * 4.2 }, orientation);
    const blackPoint = pointFromChoreographySteps(configuredSteps, progress, squareSize, { x: squareSize * 4.75, y: squareSize * 4.2 }, orientation, true);
    return (
      <View pointerEvents="none" style={styles.ceremonyLayer}>
        <CeremonyGlbPiece clipName={clipName} color="w" glbPath={glbPath} kind="k" point={whitePoint} scale={1.04} squareSize={squareSize} />
        <CeremonyGlbPiece clipName={clipName} color="b" glbPath={glbPath} kind="k" point={blackPoint} scale={1.04} squareSize={squareSize} />
      </View>
    );
  }

  if (!ceremony.move) return null;
  const attacker = ceremony.move;
  const loserColor = attacker.color === "w" ? "b" : "w";
  const attackerHome = orientedSquareCenter(attacker.to, squareSize, orientation);
  const loserSquare = kingSquare(snapshot, loserColor);
  const loserHome = orientedSquareCenter(loserSquare ?? (loserColor === "w" ? "e1" : "e8"), squareSize, orientation);
  const strikePoint = lerpPoint(attackerHome, loserHome, 0.72);
  const clipName = activeEffectClipName(ceremony.effect ?? null, progress);
  const glbPath = activeEffectClipGlbPath(ceremony.effect ?? null, progress);
  const attackerPoint = pointFromChoreographySteps(ceremony.effect?.effect.choreographySteps, progress, squareSize, strikePoint, orientation);
  return (
    <View pointerEvents="none" style={styles.ceremonyLayer}>
      <CeremonyGlbPiece
        clipName={clipName}
        color={attacker.color}
        glbPath={glbPath}
        kind={attacker.piece}
        point={attackerPoint}
        scale={1.16}
        squareSize={squareSize}
      />
      <CeremonyGlbPiece color={loserColor} glbPath={ceremony.opponentKingGlbPath} kind="k" point={loserHome} scale={0.95} squareSize={squareSize} />
    </View>
  );
}

function getSquareColor(theme: BoardTheme, isLight: boolean, fileIndex: number, rank: number) {
  if (theme.id === "clarity-ivory") {
    const lightSquares = ["#fbfcfb", "#f2f5f3"];
    const darkSquares = ["#1fa2aa", "#15979f"];
    return isLight ? lightSquares[(fileIndex + rank) % 2] : darkSquares[(fileIndex + rank) % 2];
  }
  if (theme.id === "graphite-glass") {
    const lightSquares = ["#f6f2e8", "#ebe6d9"];
    const darkSquares = ["#7b8fa1", "#63788b"];
    return isLight ? lightSquares[(fileIndex + rank) % 2] : darkSquares[(fileIndex + rank) % 2];
  }
  if (theme.id === "mint-studio") {
    const lightSquares = ["#faf8ed", "#e9f3e8"];
    const darkSquares = ["#83b4a5", "#6d9d90"];
    return isLight ? lightSquares[(fileIndex + rank) % 2] : darkSquares[(fileIndex + rank) % 2];
  }
  if (theme.id !== "jewel-cobalt") return isLight ? theme.light : theme.dark;
  const lightSquares = ["#ffefc5", "#f4dbad", "#e9f2ff", "#f1e2c1"];
  const darkSquares = ["#1f67a4", "#2c80ba", "#18578f", "#347cb4"];
  const index = Math.abs(fileIndex * 3 + rank) % 4;
  return isLight ? lightSquares[index] : darkSquares[index];
}

function blendSquare(highlight: string, fallback: string) {
  return highlight.length === 7 ? `${highlight}cc` : fallback;
}

function squareFromBoardPoint(x: number, y: number, squareSize: number, orientation: BoardOrientation = "w"): SquareName {
  const targetFileIndex = Math.max(0, Math.min(7, Math.floor(x / squareSize)));
  const targetRankIndex = Math.max(0, Math.min(7, Math.floor(y / squareSize)));
  const targetFile = orientation === "b" ? blackPerspectiveFiles[targetFileIndex] : files[targetFileIndex];
  const targetRank = orientation === "b" ? targetRankIndex + 1 : 8 - targetRankIndex;
  return `${targetFile}${targetRank}` as SquareName;
}

function squareRect(square: SquareName, squareSize: number, orientation: BoardOrientation = "w") {
  const fileIndex = files.indexOf(square[0] as (typeof files)[number]);
  const rank = Number(square[1]);
  const left = (orientation === "b" ? 7 - fileIndex : fileIndex) * squareSize;
  const top = (orientation === "b" ? rank - 1 : 8 - rank) * squareSize;
  return {
    bottom: top + squareSize,
    left,
    right: left + squareSize,
    top,
  };
}

function squareFromDragOverlap(
  from: SquareName,
  dx: number,
  dy: number,
  squareSize: number,
  preferredTargets: SquareName[],
  orientation: BoardOrientation = "w",
) {
  const fromRect = squareRect(from, squareSize, orientation);
  const pieceRect = {
    bottom: fromRect.bottom + dy,
    left: fromRect.left + dx,
    right: fromRect.right + dx,
    top: fromRect.top + dy,
  };
  const candidates = preferredTargets.length
    ? preferredTargets
    : ranks.flatMap((rank) => files.map((file) => `${file}${rank}` as SquareName)).filter((square) => square !== from);
  let bestArea = 0;
  let bestSquare: SquareName | null = null;
  candidates.forEach((square) => {
    const target = squareRect(square, squareSize, orientation);
    const overlapWidth = Math.max(0, Math.min(pieceRect.right, target.right) - Math.max(pieceRect.left, target.left));
    const overlapHeight = Math.max(0, Math.min(pieceRect.bottom, target.bottom) - Math.max(pieceRect.top, target.top));
    const area = overlapWidth * overlapHeight;
    if (area > bestArea) {
      bestArea = area;
      bestSquare = square;
    }
  });
  return bestSquare && bestArea >= squareSize * squareSize * 0.025 ? bestSquare : null;
}

const pieceAssetName: Record<PieceKind, string> = {
  p: "P",
  r: "R",
  n: "N",
  b: "B",
  q: "Q",
  k: "K",
};

function alphaPieceKey(color: "w" | "b", kind: PieceKind): AlphaPieceKey {
  return `${color}${pieceAssetName[kind]}` as AlphaPieceKey;
}

const pieceOrder: PieceKind[] = ["p", "n", "b", "r", "q", "k"];
const pieceNames: Record<PieceKind, string> = {
  b: "Bishop",
  k: "King",
  n: "Knight",
  p: "Pawn",
  q: "Queen",
  r: "Rook",
};
const pieceGlyphs: Record<PieceKind, string> = {
  b: "♗",
  k: "♔",
  n: "♘",
  p: "♙",
  q: "♕",
  r: "♖",
};
const speedOptions: AnimationSpeed[] = ["slow", "medium", "fast"];
const pieceAssetSlots: Array<{ key: PieceAssetSlotKey; label: string; accepts: "glb" | "image"; description: string }> = [
  { key: "static", label: "static.glb", accepts: "glb", description: "Base model aligned to the 2D board piece." },
  { key: "move", label: "opening_walk.glb", accepts: "glb", description: "King walk-out / handshake / walk-back source." },
  { key: "capture", label: "checkmate_kick.glb", accepts: "glb", description: "Checkmate finisher source for kicking the king out." },
  { key: "celebrate", label: "share_clip.glb", accepts: "glb", description: "Optional social-share celebration variant." },
  { key: "reference", label: "reference image", accepts: "image", description: "Optional matching reference for model QA." },
];
const pieceTargetSpecFields: Array<{ key: keyof PieceTargetSpec; label: string; placeholder: string }> = [
  { key: "board2dStyle", label: "2D board piece style", placeholder: "Clear ivory/black board silhouette with gold outline" },
  { key: "alive3dModel", label: "Matching 3D alive model", placeholder: "Exact GLB/model to use for this piece" },
  { key: "idleStaticPose", label: "Idle/static pose", placeholder: "Centered, readable, no visual clutter" },
  { key: "moveAnimation", label: "Opening ceremony", placeholder: "For kings: walk to center, handshake, walk back" },
  { key: "captureAnimation", label: "Checkmate finisher", placeholder: "For checkmating pieces: funny action plus king kick-out" },
  { key: "victoryAnimation", label: "Share clip style", placeholder: "Short social-media friendly ending beat" },
];

function defaultPieceTargetSpec(piece: PieceKind): PieceTargetSpec {
  return {
    alive3dModel: `${pieceNames[piece]} GLB aligned to the 2D ${pieceNames[piece].toLowerCase()} silhouette`,
    board2dStyle: "Clean high-contrast 2D chess piece with matching outline and proportions",
    captureAnimation: "Choose the checkmate finisher stack for this piece",
    idleStaticPose: "Centered on the square, readable at board size, no visual clutter",
    moveAnimation: "For kings only: walk to center, handshake, return",
    victoryAnimation: "Choose a short social-share ending beat",
  };
}

const choreographyStepKinds: Array<AnimationChoreographyStep["kind"]> = ["emerge", "walk", "turn", "gesture", "handshake", "kick", "return", "sink"];
const choreographyFacingOptions: Array<NonNullable<AnimationChoreographyStep["facing"]>> = ["toward-opponent", "up", "down", "left", "right"];

function defaultChoreographySteps(piece: PieceKind, action: AnimationAction): AnimationChoreographyStep[] {
  if (action === "game-start-handshake") {
    return [
      { durationMs: 700, from: "e1" as SquareName, id: "opening-emerge-white", kind: "emerge", label: "White king emerges", startsAtMs: 0, to: "e1" as SquareName },
      { durationMs: 1800, facing: "up", from: "e1" as SquareName, id: "opening-walk-white", kind: "walk", label: "White king walks to center", startsAtMs: 700, to: "e4" as SquareName },
      { durationMs: 700, facing: "toward-opponent", from: "e4" as SquareName, id: "opening-handshake", kind: "handshake", label: "Handshake beat", startsAtMs: 2500, to: "e5" as SquareName },
      { durationMs: 1700, facing: "down", from: "e4" as SquareName, id: "opening-return-white", kind: "return", label: "White king returns", startsAtMs: 3200, to: "e1" as SquareName },
      { durationMs: 500, from: "e1" as SquareName, id: "opening-settle-white", kind: "sink", label: "Settle as 2D king", startsAtMs: 4900, to: "e1" as SquareName },
    ];
  }
  const startSquareByPiece: Record<PieceKind, SquareName> = {
    b: "c4" as SquareName,
    k: "e1" as SquareName,
    n: "g5" as SquareName,
    p: "f7" as SquareName,
    q: "f7" as SquareName,
    r: "h8" as SquareName,
  };
  const start = startSquareByPiece[piece];
  return [
    { durationMs: 600, from: start, id: "finisher-emerge", kind: "emerge", label: `${pieceNames[piece]} powers up`, startsAtMs: 0, to: start },
    { durationMs: 1200, facing: "toward-opponent", from: start, id: "finisher-approach", kind: "walk", label: "Move to defeated king", startsAtMs: 600, to: "e8" as SquareName },
    { durationMs: 900, facing: "toward-opponent", from: "e8" as SquareName, id: "finisher-kick", kind: "kick", label: "Kick king out", startsAtMs: 1800, to: "e8" as SquareName },
    { durationMs: 900, from: "e8" as SquareName, id: "finisher-celebrate", kind: "gesture", label: "Funny celebration", startsAtMs: 2700, to: "e8" as SquareName },
    { durationMs: 700, from: "e8" as SquareName, id: "finisher-return", kind: "return", label: "Return to board form", startsAtMs: 3600, to: start },
  ];
}

function choreographyTotalDuration(steps: AnimationChoreographyStep[]) {
  return steps.reduce((total, step) => Math.max(total, step.startsAtMs + step.durationMs), 0);
}

function pieceArtFill(sourceFill: string, color: "w" | "b") {
  const isLightLayer = sourceFill.toLowerCase() !== "#101010";
  if (color === "w") return isLightLayer ? "#fff4cf" : "#9b6809";
  return isLightLayer ? "#dba83a" : "#151b22";
}

function frameRange(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0;
  return smoothNumber((value - start) / (end - start));
}

function morphTransitionPose(frame: number, unit: number) {
  const anticipation = frameRange(frame, 4, 8) * (1 - frameRange(frame, 9, 12));
  const edgeLift = frameRange(frame, 8, 15);
  const relief = frameRange(frame, 12, 24);
  const character = frameRange(frame, 23, 34);
  const settle = frameRange(frame, 26, 34);
  const popHold = edgeLift * (1 - settle);
  return {
    edgeOpacity: edgeLift * (1 - character * 0.42),
    reliefOpacity: relief * (1 - character * 0.22),
    reliefScale: 1 + 0.03 * edgeLift + 0.08 * relief - 0.03 * settle,
    reliefTranslateY: unit * (0.07 * anticipation - 0.12 * relief + 0.05 * settle),
    shadowOpacity: 0.16 * edgeLift + 0.18 * character,
    shadowScale: 0.72 + 0.42 * relief + 0.16 * character,
    modelOpacity: character,
    modelRotate: 10 * (1 - edgeLift) - 4 * popHold + 4 * settle,
    modelScale: 0.46 + 0.66 * character - 0.08 * settle,
    modelTranslateY: unit * (0.16 - 0.34 * character + 0.12 * settle),
    pieceOpacity: 1 - character * 0.82,
    pieceRotate: -3 * anticipation + 9 * popHold - 6 * settle,
    pieceScaleX: 1 + 0.05 * anticipation + 0.18 * popHold - 0.12 * settle,
    pieceScaleY: 1 - 0.1 * anticipation + 0.12 * popHold - 0.02 * settle,
    pieceTranslateY: unit * (0.08 * anticipation - 0.22 * popHold + 0.14 * settle),
  };
}

type MorphTransitionPose = ReturnType<typeof morphTransitionPose>;

function morphFrameForMoveProgress(progress: number) {
  const entering = Math.min(34, (Math.min(1, progress / 0.2) * 34));
  const exit = smoothNumber(Math.max(0, (progress - 0.84) / 0.16));
  return exit > 0 ? (1 - exit) * 34 : entering;
}

function aliveTransitionStages(progress: number) {
  const exit = smoothNumber(Math.max(0, (progress - 0.84) / 0.16));
  const characterIn = smoothNumber(Math.max(0, Math.min(1, (progress - 0.36) / 0.22)));
  const boardOpacity = Math.max(exit * exit, 1 - characterIn);
  const characterOpacity = characterIn * (1 - exit);
  return { boardOpacity, characterOpacity, exit };
}

function PieceLifeMorph({
  children,
  color,
  containerSize,
  flipX = false,
  morph,
  piece,
  pieceSize,
}: {
  children: ReactNode;
  color: "w" | "b";
  containerSize: number;
  flipX?: boolean;
  morph: MorphTransitionPose;
  piece: PieceKind;
  pieceSize: number;
}) {
  const paths = alphaPiecePaths[alphaPieceKey(color, piece)];
  const edgeColors = color === "w" ? ["#7c560a", "#c79822", "#ffe7a3"] : ["#05080b", "#ba8421", "#f5c95d"];
  return (
    <View style={[styles.pieceLifeMorph, { height: containerSize, width: containerSize }]}>
      <View
        style={[
          styles.pieceLifeShadow,
          {
            height: pieceSize * 0.24,
            opacity: morph.shadowOpacity,
            transform: [{ scaleX: morph.shadowScale }, { scaleY: 0.72 }],
            width: pieceSize * 0.86,
          },
        ]}
      />
      {edgeColors.map((tint, index) => {
        const depth = (index + 1) * Math.max(1, pieceSize * 0.028);
        return (
          <View
            key={`${tint}-${index}`}
            style={[
              styles.pieceLifeLayer,
              {
                height: pieceSize,
                opacity: morph.edgeOpacity * (0.44 + index * 0.18),
                transform: [
                  { translateX: depth * 0.38 },
                  { translateY: morph.reliefTranslateY + depth },
                  { scale: morph.reliefScale },
                ],
                width: pieceSize,
                zIndex: 2 + index,
              },
            ]}
          >
            <AlphaPieceSvg opacity={0.9} paths={paths} tint={tint} />
          </View>
        );
      })}
      <View
        style={[
          styles.pieceLifeLayer,
          {
            height: pieceSize,
            opacity: morph.reliefOpacity,
            transform: [{ translateY: morph.reliefTranslateY - pieceSize * 0.035 }, { scale: morph.reliefScale }],
            width: pieceSize,
            zIndex: 6,
          },
        ]}
      >
        <AlphaPieceSvg opacity={0.7} paths={paths} tint={color === "w" ? "#fff6d6" : "#f1bc3f"} />
      </View>
      <View
        style={[
          styles.pieceLifeLayer,
          {
            height: pieceSize,
            opacity: morph.pieceOpacity,
            transform: [
              { translateY: morph.pieceTranslateY },
              { rotate: `${morph.pieceRotate}deg` },
              { scaleX: morph.pieceScaleX },
              { scaleY: morph.pieceScaleY },
            ],
            width: pieceSize,
            zIndex: 8,
          },
        ]}
      >
        <AlphaPieceSvg paths={paths} />
      </View>
      <View
        style={[
          styles.pieceLifeModel,
          {
            height: containerSize,
            opacity: morph.modelOpacity,
            transform: [
              { scaleX: flipX ? -1 : 1 },
              { translateY: morph.modelTranslateY },
              { rotate: `${morph.modelRotate}deg` },
              { scale: morph.modelScale },
            ],
            width: containerSize,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function pawnAnimationVariant(effectId: string): PawnAnimationVariant {
  if (effectId === "pawn-strike-capture") return "capture";
  if (effectId === "pawn-promotion-dance") return "promotion";
  return "move";
}

function activeEffectClipName(effect: ActiveFunnyEffect | null, progress: number) {
  const clipNames = effect?.effect.clipNames ?? [];
  if (clipNames.length === 0) return undefined;
  const index = Math.min(clipNames.length - 1, Math.floor(Math.max(0, Math.min(0.999, progress)) * clipNames.length));
  return clipNames[index];
}

function activeEffectClipGlbPath(effect: ActiveFunnyEffect | null, progress: number) {
  const clipGlbPaths = effect?.effect.clipGlbPaths ?? [];
  if (clipGlbPaths.length === 0) return effect?.effect.pieceAssetGlbPath;
  const index = Math.min(clipGlbPaths.length - 1, Math.floor(Math.max(0, Math.min(0.999, progress)) * clipGlbPaths.length));
  return clipGlbPaths[index] || effect?.effect.pieceAssetGlbPath;
}

function smoothNumber(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function waitMs(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function supportedVideoMimeType(mediaRecorder: typeof MediaRecorder) {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return candidates.find((candidate) => mediaRecorder.isTypeSupported(candidate)) ?? "";
}

function loadImageElement(imageCtor: { new (): HTMLImageElement }, dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new imageCtor();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load rendered clip frame."));
    image.src = dataUrl;
  });
}

function nextBrowserFrame() {
  const runtime = globalThis as { requestAnimationFrame?: (callback: FrameRequestCallback) => number };
  return new Promise<void>((resolve) => {
    if (runtime.requestAnimationFrame) {
      runtime.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 16);
  });
}

async function renderElementToWebVideo(element: HTMLElement, durationMs: number, onProgress?: (progress: number) => void) {
  const runtime = globalThis as {
    document?: Document;
    Image?: { new (): HTMLImageElement };
    MediaRecorder?: typeof MediaRecorder;
  };
  if (!runtime.document || !runtime.Image || !runtime.MediaRecorder) throw new Error("MediaRecorder is not available.");
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) throw new Error("Clip area is not visible.");
  const pixelRatio = Math.min(1.15, Math.max(0.62, 1280 / bounds.width));
  const canvas = runtime.document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(2, Math.round(bounds.height * pixelRatio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas video rendering is not available.");
  const stream = canvas.captureStream(12);
  const mimeType = supportedVideoMimeType(runtime.MediaRecorder);
  const chunks: Blob[] = [];
  const recorder = mimeType ? new runtime.MediaRecorder(stream, { mimeType }) : new runtime.MediaRecorder(stream);
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Video recorder failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" }));
  });
  const { toPng } = await import("html-to-image");
  recorder.start(100);
  const frameMs = 1000 / 12;
  const frameCount = Math.max(16, Math.ceil(durationMs / frameMs));
  for (let frame = 0; frame < frameCount; frame += 1) {
    await nextBrowserFrame();
    const dataUrl = await toPng(element, {
      backgroundColor: "#eaf3ff",
      cacheBust: true,
      height: bounds.height,
      pixelRatio,
      width: bounds.width,
    });
    const image = await loadImageElement(runtime.Image, dataUrl);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    onProgress?.(frame / Math.max(1, frameCount - 1));
    await waitMs(frameMs);
  }
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  return finished;
}

function playerLabelFromClip(clip: ShareableCeremonyClip) {
  if (clip.type === "pre-game-handshake") return { black: "Black King", white: "White King" };
  const winner = clip.resultText ? resultWinner(clip.resultText) : clip.move?.color === "b" ? "Black" : "White";
  return { black: winner === "Black" ? "Winner" : "Opponent King", white: winner === "White" ? "Winner" : "Opponent King" };
}

function fillRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(x, y, width, height, radius);
    context.fill();
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
  context.fill();
}

function drawClipBoard(
  context: CanvasRenderingContext2D,
  clip: ShareableCeremonyClip,
  frameProgress: number,
  boardX: number,
  boardY: number,
  boardSize: number,
) {
  const square = boardSize / 8;
  context.save();
  context.shadowColor = "rgba(15,23,42,0.24)";
  context.shadowBlur = 24;
  context.shadowOffsetY = 14;
  context.fillStyle = "#172033";
  context.fillRect(boardX - 10, boardY - 10, boardSize + 20, boardSize + 20);
  context.restore();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      context.fillStyle = (rank + file) % 2 === 0 ? "#f8fafc" : "#229fa8";
      context.fillRect(boardX + file * square, boardY + rank * square, square, square);
    }
  }
  const drawPiece = (glyph: string, file: number, rank: number, color: string, scale = 1) => {
    context.save();
    context.font = `${square * 0.72 * scale}px serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = Math.max(2, square * 0.025);
    context.strokeStyle = color === "#111827" ? "#d9ad47" : "#9b741f";
    context.fillStyle = color;
    const x = boardX + (file + 0.5) * square;
    const y = boardY + (rank + 0.56) * square;
    context.strokeText(glyph, x, y);
    context.fillText(glyph, x, y);
    context.restore();
  };
  const pieces: Array<[string, number, number, string]> = [
    ["♜", 0, 0, "#111827"],
    ["♞", 1, 0, "#111827"],
    ["♝", 2, 0, "#111827"],
    ["♛", 3, 0, "#111827"],
    ["♚", 4, 0, "#111827"],
    ["♝", 5, 0, "#111827"],
    ["♞", 6, 0, "#111827"],
    ["♜", 7, 0, "#111827"],
    ["♖", 0, 7, "#fff7dd"],
    ["♘", 1, 7, "#fff7dd"],
    ["♗", 2, 7, "#fff7dd"],
    ["♕", 3, 7, "#fff7dd"],
    ["♔", 4, 7, "#fff7dd"],
    ["♗", 5, 7, "#fff7dd"],
    ["♘", 6, 7, "#fff7dd"],
    ["♖", 7, 7, "#fff7dd"],
  ];
  pieces.forEach(([glyph, file, rank, color]) => drawPiece(glyph, file, rank, color));
  for (let file = 0; file < 8; file += 1) {
    drawPiece("♟", file, 1, "#111827", 0.9);
    drawPiece("♙", file, 6, "#fff7dd", 0.9);
  }

  const walk = smoothNumber(Math.min(1, frameProgress / 0.44));
  const returnProgress = smoothNumber(Math.max(0, (frameProgress - 0.68) / 0.32));
  const beat = Math.sin(frameProgress * Math.PI * 8);
  if (clip.type === "pre-game-handshake") {
    const whiteX = boardX + (4.5 - 1.15 * walk + 1.15 * returnProgress) * square;
    const blackX = boardX + (4.5 + 1.15 * walk - 1.15 * returnProgress) * square;
    const centerY = boardY + (4.25 + beat * 0.03) * square;
    drawPiece("♔", (whiteX - boardX) / square - 0.5, (centerY - boardY) / square - 0.56, "#fff7dd", 1.25);
    drawPiece("♚", (blackX - boardX) / square - 0.5, (centerY - boardY) / square - 0.56, "#111827", 1.25);
    if (frameProgress > 0.42 && frameProgress < 0.68) {
      context.save();
      context.strokeStyle = "#a3e635";
      context.lineWidth = 6;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(whiteX + square * 0.18, centerY - square * 0.14);
      context.lineTo(blackX - square * 0.18, centerY - square * 0.14);
      context.stroke();
      context.restore();
    }
    return;
  }

  const attackerGlyph = pieceGlyphs[clip.move?.piece ?? "q"];
  const attackerColor = clip.move?.color === "b" ? "#111827" : "#fff7dd";
  const kickProgress = smoothNumber(Math.max(0, (frameProgress - 0.28) / 0.34));
  const attackerX = boardX + (5.1 - Math.sin(frameProgress * Math.PI) * 0.25) * square;
  const attackerY = boardY + (2.55 + Math.sin(frameProgress * Math.PI * 5) * 0.08) * square;
  const kingX = boardX + (4.4 + kickProgress * 2.4) * square;
  const kingY = boardY + (1.1 - Math.sin(kickProgress * Math.PI) * 1.2 + kickProgress * 0.65) * square;
  drawPiece(attackerGlyph, (attackerX - boardX) / square - 0.5, (attackerY - boardY) / square - 0.56, attackerColor, 1.34);
  drawPiece(clip.move?.color === "b" ? "♔" : "♚", (kingX - boardX) / square - 0.5, (kingY - boardY) / square - 0.56, clip.move?.color === "b" ? "#fff7dd" : "#111827", 1.08);
}

async function renderCeremonyFallbackVideo(clip: ShareableCeremonyClip, durationMs: number) {
  const runtime = globalThis as {
    document?: Document;
    MediaRecorder?: typeof MediaRecorder;
  };
  if (!runtime.document || !runtime.MediaRecorder) throw new Error("Video recording is not available in this browser.");
  const canvas = runtime.document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas video rendering is not available.");
  const stream = canvas.captureStream(24);
  const mimeType = supportedVideoMimeType(runtime.MediaRecorder);
  const chunks: Blob[] = [];
  const recorder = mimeType ? new runtime.MediaRecorder(stream, { mimeType }) : new runtime.MediaRecorder(stream);
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Video recorder failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" }));
  });
  const labels = playerLabelFromClip(clip);
  const frameMs = 1000 / 24;
  const frameCount = Math.max(48, Math.ceil(durationMs / frameMs));
  recorder.start(100);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const progress = frame / Math.max(1, frameCount - 1);
    const glow = context.createRadialGradient(760, 260, 60, 760, 260, 650);
    glow.addColorStop(0, "#d8ecff");
    glow.addColorStop(0.42, "#eef6ff");
    glow.addColorStop(1, "#ffffff");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(37,99,235,0.06)";
    context.save();
    context.rotate(-0.08);
    context.fillRect(650, 210, 520, 240);
    context.restore();
    drawClipBoard(context, clip, progress, 84, 70, 560);
    context.fillStyle = "#0d2743";
    context.font = "900 54px Inter, system-ui, sans-serif";
    context.fillText(clip.type === "pre-game-handshake" ? "Opening Ceremony" : "Checkmate Ceremony", 720, 172);
    context.fillStyle = "#38536f";
    context.font = "700 28px Inter, system-ui, sans-serif";
    context.fillText(clip.resultText ?? clip.text, 720, 220, 480);
    context.fillStyle = "#91b936";
    fillRoundedRect(context, 720, 278, 390, 92, 24);
    context.fillStyle = "#ffffff";
    context.font = "900 34px Inter, system-ui, sans-serif";
    context.fillText(clip.type === "pre-game-handshake" ? `${labels.white} meets ${labels.black}` : "Share this finish", 748, 334);
    context.fillStyle = "#0d2743";
    context.font = "900 28px Inter, system-ui, sans-serif";
    context.fillText("ChessAlive", 720, 612);
    context.fillStyle = "#56708b";
    context.font = "700 20px Inter, system-ui, sans-serif";
    context.fillText("A calm board. A wild button.", 720, 642);
    await waitMs(frameMs);
  }
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  return finished;
}

function downloadBlob(blob: Blob, fileName: string) {
  const runtime = globalThis as { document?: Document; URL?: typeof URL };
  if (!runtime.document || !runtime.URL) return;
  const url = runtime.URL.createObjectURL(blob);
  const anchor = runtime.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  runtime.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => runtime.URL?.revokeObjectURL(url), 1000);
}

function sanitizeGlbPath(path?: string): string {
  if (!path) return "";
  if (path.includes("knight_horse_game.glb") || path.includes("horse_fullset.glb")) {
    return "chessalive-asset://knight-horse-game";
  }
  if (path.includes("Pawn_animation.glb")) {
    return "/uploads/seeded-pawn.glb";
  }
  if (path.includes("Bishop") && path.includes("Walking")) {
    return "/uploads/seeded-bishop-walk.glb";
  }
  if (path.includes("Bishop") && path.includes("Running")) {
    return "/uploads/seeded-bishop-run.glb";
  }
  if (path.includes("Rook") && path.includes("Walking")) {
    return "/uploads/seeded-rook-walk.glb";
  }
  if (path.includes("Rook") && path.includes("Running")) {
    return "/uploads/seeded-rook-run.glb";
  }
  if (path.includes("Rook") && path.includes("static")) {
    return "/uploads/seeded-rook-static.glb";
  }
  if (path.includes("Queen") && path.includes("Walking")) {
    return "/uploads/seeded-queen-walk.glb";
  }
  if (path.includes("Queen") && path.includes("Running")) {
    return "/uploads/seeded-queen-run.glb";
  }
  if (path.includes("Queen") && (path.includes("Dance") || path.includes("All_Night"))) {
    return "/uploads/seeded-queen-dance.glb";
  }
  if (path.includes("Queen") && path.includes("static")) {
    return "/uploads/seeded-queen-static.glb";
  }
  if (path.includes("king") && path.includes("walking")) {
    return "/uploads/seeded-king-walk.glb";
  }
  if (path.includes("king") && path.includes("static")) {
    return "/uploads/seeded-king-static.glb";
  }

  if (path.includes("seeded-pawn")) return "/uploads/seeded-pawn.glb";
  if (path.includes("seeded-bishop-walk")) return "/uploads/seeded-bishop-walk.glb";
  if (path.includes("seeded-bishop-run")) return "/uploads/seeded-bishop-run.glb";
  if (path.includes("seeded-rook-walk")) return "/uploads/seeded-rook-walk.glb";
  if (path.includes("seeded-rook-run")) return "/uploads/seeded-rook-run.glb";
  if (path.includes("seeded-rook-static")) return "/uploads/seeded-rook-static.glb";
  if (path.includes("seeded-queen-walk")) return "/uploads/seeded-queen-walk.glb";
  if (path.includes("seeded-queen-run")) return "/uploads/seeded-queen-run.glb";
  if (path.includes("seeded-queen-dance")) return "/uploads/seeded-queen-dance.glb";
  if (path.includes("seeded-queen-static")) return "/uploads/seeded-queen-static.glb";
  if (path.includes("seeded-king-walk")) return "/uploads/seeded-king-walk.glb";
  if (path.includes("seeded-king-static")) return "/uploads/seeded-king-static.glb";

  return path;
}

function canLoadGlbPath(path?: string): path is string {
  const sanitized = sanitizeGlbPath(path);
  if (!sanitized) return false;
  return /^(blob:|https?:|data:)/.test(sanitized) || sanitized.startsWith("/assets/") || sanitized.startsWith("/uploads/") || sanitized.startsWith("uploads/") || sanitized.startsWith("./") || sanitized.startsWith("indexeddb-glb://") || sanitized === bundledHorseGlbPath;
}

function isBundledKnightHorsePath(path: string) {
  return path === bundledHorseGlbPath || /(?:^|[/\\])(?:knight_horse_game|horse_fullset)\.glb$/i.test(path.trim());
}

function bundledAssetUri(asset: number) {
  return Image.resolveAssetSource(asset)?.uri ?? "";
}

function noCacheAssetUrl(url: string) {
  if (!url || /^(blob:|data:)/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}chessalive_no_cache=${Date.now()}`;
}

function openGlbAssetDatabase() {
  const indexedDBRef = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (!indexedDBRef) return Promise.resolve<IDBDatabase | null>(null);
  return new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDBRef.open("chessalive-glb-assets", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("glbs");
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveGlbBlobToBrowser(assetId: string, blob: Blob) {
  const databaseRef = await openGlbAssetDatabase();
  if (!databaseRef) return false;
  return new Promise<boolean>((resolve) => {
    const transaction = databaseRef.transaction("glbs", "readwrite");
    transaction.objectStore("glbs").put(blob, assetId);
    transaction.oncomplete = () => {
      databaseRef.close();
      resolve(true);
    };
    transaction.onerror = () => {
      databaseRef.close();
      resolve(false);
    };
  });
}

async function loadGlbBlobFromBrowser(assetId: string) {
  const databaseRef = await openGlbAssetDatabase();
  if (!databaseRef) return null;
  return new Promise<Blob | null>((resolve) => {
    const transaction = databaseRef.transaction("glbs", "readonly");
    const request = transaction.objectStore("glbs").get(assetId);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => databaseRef.close();
    transaction.onerror = () => databaseRef.close();
  });
}

async function resolveGlbLoaderUrl(glbPath: string) {
  const sanitized = sanitizeGlbPath(glbPath);
  if (sanitized === bundledHorseGlbPath) return { revoke: false, url: bundledAssetUri(bundledHorseGlbAsset) };
  if (sanitized.startsWith("indexeddb-glb://")) {
    const assetId = sanitized.replace("indexeddb-glb://", "");
    const blob = await loadGlbBlobFromBrowser(assetId);
    if (!blob) return { revoke: false, url: "" };
    return { revoke: true, url: URL.createObjectURL(blob) };
  }
  if (sanitized.startsWith("/uploads/") || sanitized.startsWith("uploads/")) {
    const relativePath = sanitized.startsWith("/") ? sanitized : `/${sanitized}`;
    return { revoke: false, url: noCacheAssetUrl(`${assetServerHttpEndpoint()}${relativePath}`) };
  }
  return { revoke: false, url: noCacheAssetUrl(sanitized) };
}

function slugifyAnimationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function tagsForClipName(name: string) {
  const normalized = name.toLowerCase();
  const tags = new Set<string>();
  if (normalized.includes("walk")) tags.add("walk");
  if (normalized.includes("run")) tags.add("run");
  if (normalized.includes("dance")) tags.add("dance");
  if (normalized.includes("jump")) tags.add("jump");
  if (normalized.includes("attack") || normalized.includes("punch") || normalized.includes("combo")) tags.add("attack");
  if (normalized.includes("fall")) tags.add("reaction");
  if (normalized.includes("idle")) tags.add("idle");
  if (tags.size === 0) tags.add("uploaded");
  return [...tags];
}

async function detectGlbAnimationClips(glbPath: string, piece: PieceKind, sourceAssetId: string): Promise<AnimationClip[]> {
  if (!canLoadGlbPath(glbPath)) return [];
  const resolved = await resolveGlbLoaderUrl(glbPath);
  if (!resolved.url) return [];
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      resolved.url,
      (gltf) => {
        if (resolved.revoke) URL.revokeObjectURL(resolved.url);
        resolve(
          gltf.animations.map((clip, index) => {
            const name = clip.name || `Animation ${index + 1}`;
            return {
              compatiblePieces: [piece],
              durationMs: Math.max(250, Math.round(clip.duration * 1000)),
              id: `${sourceAssetId}-${slugifyAnimationName(name) || `clip-${index + 1}`}`,
              name,
              sourceAssetId,
              sourceGlbPath: glbPath,
              tags: tagsForClipName(name),
            };
          }),
        );
      },
      undefined,
      () => {
        if (resolved.revoke) URL.revokeObjectURL(resolved.url);
        resolve([]);
      },
    );
  });
}

function PremiumPiece({
  active3d = false,
  color,
  kind,
  pawnProgress,
  pawnSize,
  pawnVariant = "move",
  pieceProgress,
  pieceSize,
  pieceVariant = "move",
}: {
  active3d?: boolean;
  color: "w" | "b";
  kind: PieceKind;
  pawnProgress?: number;
  pawnSize?: number;
  pawnVariant?: PawnAnimationVariant;
  pieceProgress?: number;
  pieceSize?: number;
  pieceVariant?: PieceAnimationVariant;
}) {
  if (kind === "p" && typeof pawnProgress === "number" && typeof pawnSize === "number") {
    return (
      <View style={styles.pieceFrame}>
        <BoardPawnPiece color={color} progress={pawnProgress} size={pawnSize} variant={pawnVariant} />
      </View>
    );
  }
  const activePieceSprite = active3d ? pieceAnimationSpriteAssets[color][kind]?.[pieceVariant] : undefined;
  if (activePieceSprite && typeof pieceProgress === "number" && typeof pieceSize === "number") {
    return (
      <View style={styles.pieceFrame}>
        <PieceAnimationSpriteFrame color={color} kind={kind} progress={pieceProgress} size={pieceSize} variant={pieceVariant} />
      </View>
    );
  }
  const paths = alphaPiecePaths[alphaPieceKey(color, kind)];
  return (
    <View style={styles.pieceFrame}>
      <AlphaPieceSvg color={color} paths={paths} />
    </View>
  );
}

function BoardPawnPiece({
  color,
  progress,
  size,
  variant = "move",
}: {
  color: "w" | "b";
  progress?: number;
  size?: number;
  variant?: PawnAnimationVariant;
}) {
  if (typeof progress === "number" && typeof size === "number") {
    return <PawnSpriteFrame color={color} progress={progress} size={size} variant={variant} />;
  }

  const paths = alphaPiecePaths[alphaPieceKey(color, "p")];
  return <AlphaPieceSvg color={color} paths={paths} />;
}

function PreviewAlphaPiece({ color, piece }: { color: "w" | "b"; piece: PieceKind }) {
  const paths = alphaPiecePaths[alphaPieceKey(color, piece)];
  return (
    <View style={styles.previewAlphaPiece}>
      <AlphaPieceSvg color={color} paths={paths} />
    </View>
  );
}

function GlbModelPreview({
  clipName,
  color = "w",
  glbPath,
  piece,
}: {
  clipName?: string;
  color?: "w" | "b";
  glbPath?: string;
  piece: PieceKind;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(!canLoadGlbPath(glbPath));

  useEffect(() => {
    const mount = mountRef.current;
    const documentRef = (globalThis as { document?: Document }).document;
    if (!mount || !documentRef || !canLoadGlbPath(glbPath)) {
      setFailed(true);
      return undefined;
    }
    const mountElement = mount;

    let cancelled = false;
    let frame = 0;
    let mixer: THREE.AnimationMixer | null = null;
    let resolvedObjectUrl: string | null = null;
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.15, 3.6);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.width = "100%";
    mountElement.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb7c1c8, 2.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(2.6, 4.2, 4.6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9eeaf4, 1.5);
    rimLight.position.set(-3.2, 2.1, 2.8);
    scene.add(rimLight);

    function resize() {
      const rect = mountElement.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(mountElement);
    resize();

    const loader = new GLTFLoader();
    void resolveGlbLoaderUrl(glbPath).then((resolved) => {
      if (cancelled || !resolved.url) {
        if (!cancelled) setFailed(true);
        return;
      }
      if (resolved.revoke) resolvedObjectUrl = resolved.url;
      loader.load(
        resolved.url,
        (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
        model.position.sub(center);
        model.scale.setScalar(1.75 / maxDimension);
        model.rotation.y = color === "b" ? -0.32 : 0.32;
        scene.add(model);
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const selectedClip = gltf.animations.find((clip) => clip.name === clipName) ?? gltf.animations[0];
          const action = mixer.clipAction(selectedClip);
          action.reset();
          action.play();
        }
        setFailed(false);
        },
        undefined,
        () => {
          if (!cancelled) setFailed(true);
        },
      );
    });

    function animate() {
      frame = requestAnimationFrame(animate);
      mixer?.update(clock.getDelta());
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if (renderer.domElement.parentNode === mountElement) mountElement.removeChild(renderer.domElement);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose();
      });
      if (resolvedObjectUrl) URL.revokeObjectURL(resolvedObjectUrl);
      renderer.dispose();
    };
  }, [clipName, color, glbPath]);

  return (
    <View style={styles.glbPreviewFrame}>
      <View ref={mountRef as unknown as Ref<View>} style={styles.glbPreviewMount} />
      {failed && (
        <View pointerEvents="none" style={styles.glbPreviewFallback}>
          <PreviewAlphaPiece color={color} piece={piece} />
        </View>
      )}
    </View>
  );
}

function AlphaPieceSvg({ color, opacity = 1, paths, tint }: { color?: "w" | "b"; opacity?: number; paths: Array<{ d: string; fill: string }>; tint?: string }) {
  return (
    <Svg viewBox="0 0 2048 2048" width="100%" height="100%" style={{ opacity }}>
      {paths.map((path, index) => (
        <Path key={`${path.fill}-${index}`} fill={tint ?? (color ? pieceArtFill(path.fill, color) : path.fill)} d={path.d} />
      ))}
    </Svg>
  );
}

const scorePieceOrder: PieceKind[] = ["p", "n", "b", "r", "q", "k"];

function SidebarPieceIcon({ color, kind, muted = false }: { color: "w" | "b"; kind: PieceKind; muted?: boolean }) {
  const paths = alphaPiecePaths[alphaPieceKey(color, kind)];
  return (
    <View style={[styles.sidebarPieceIcon, muted && styles.sidebarPieceIconMuted]}>
      <Svg viewBox="0 0 2048 2048" width="112%" height="112%" style={{ opacity: muted ? 0.22 : 1 }}>
        {paths.map((path, index) => (
          <Path key={`${path.fill}-${index}`} fill={pieceArtFill(path.fill, color)} d={path.d} />
        ))}
      </Svg>
    </View>
  );
}

function CapturedScoreSlots({ captured, color }: { captured: PieceKind[]; color: "w" | "b" }) {
  return (
    <View style={styles.scoreCapturedSide}>
      {scorePieceOrder.map((kind) => {
        const count = captured.filter((piece) => piece === kind).length;
        return (
          <View key={`${color}-${kind}-captured-slot`} style={[styles.scoreCapturedCell, count > 0 && styles.scoreCapturedCellActive]}>
            <SidebarPieceIcon color={color} kind={kind} muted={count === 0} />
            {count > 0 && (
              <View style={styles.scoreCapturedCountPill}>
                <Text style={styles.scoreCapturedCount}>{count}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function renderPieceShape(kind: PieceKind, fill: string, mid: string, accent: string, stroke: string, shine: string) {
  if (kind === "p") {
    return (
      <G>
        <Path d="M39 67 C40 54 60 54 61 67 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        <Circle cx="50" cy="38" r="15" fill={fill} stroke={stroke} strokeWidth="3" />
        <Circle cx="44" cy="32" r="4" fill={shine} />
      </G>
    );
  }
  if (kind === "r") {
    return (
      <G>
        <Path d="M32 66 L36 32 L64 32 L68 66 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        <Path d="M30 22 H39 V31 H45 V22 H55 V31 H61 V22 H70 V38 H30 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        <Line x1="38" y1="45" x2="62" y2="45" stroke={accent} strokeWidth="3" />
      </G>
    );
  }
  if (kind === "n") {
    return (
      <G>
        <Path d="M34 67 C34 55 39 48 47 40 C42 36 41 29 47 23 C58 28 70 39 71 55 C72 62 68 66 61 66 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        <Path d="M48 39 C57 39 64 44 68 51" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
        <Circle cx="55" cy="35" r="2.8" fill={stroke} />
        <Path d="M42 28 L35 20 L37 35" fill={mid} stroke={stroke} strokeWidth="2.5" />
      </G>
    );
  }
  if (kind === "b") {
    return (
      <G>
        <Path d="M35 67 C36 53 43 45 50 35 C57 45 64 53 65 67 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        <Ellipse cx="50" cy="31" rx="14" ry="17" fill={fill} stroke={stroke} strokeWidth="3" />
        <Line x1="56" y1="19" x2="42" y2="42" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      </G>
    );
  }
  if (kind === "q") {
    return (
      <G>
        <Path d="M32 66 C34 51 40 45 50 33 C60 45 66 51 68 66 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        <Path d="M28 34 L36 19 L45 34 L50 16 L55 34 L64 19 L72 34 L65 45 H35 Z" fill={fill} stroke={stroke} strokeWidth="3" />
        {[36, 50, 64].map((cx) => (
          <Circle key={cx} cx={cx} cy={18 + (cx === 50 ? -2 : 2)} r="5" fill={accent} stroke={stroke} strokeWidth="2" />
        ))}
      </G>
    );
  }
  return (
    <G>
      <Path d="M33 67 C35 51 43 45 50 34 C57 45 65 51 67 67 Z" fill={fill} stroke={stroke} strokeWidth="3" />
      <Path d="M40 32 H60 V45 H40 Z" fill={fill} stroke={stroke} strokeWidth="3" />
      <Line x1="50" y1="13" x2="50" y2="34" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <Line x1="41" y1="22" x2="59" y2="22" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="50" cy="39" r="11" fill={mid} stroke={stroke} strokeWidth="2.5" />
    </G>
  );
}

function pieceLetter(piece: PieceKind) {
  return piece.toUpperCase();
}

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function SignalBars({ quality, label }: { quality: number; label: string }) {
  return (
    <View style={styles.signalWrap}>
      <View style={styles.signalBars}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <View key={bar} style={[styles.signalBar, { height: 5 + bar * 3 }, bar <= quality && styles.signalBarOn]} />
        ))}
      </View>
      <Text style={styles.signalText}>{label}</Text>
    </View>
  );
}

function ScoreSignal({ quality }: { quality: number }) {
  return (
    <View style={styles.scoreSignalBars}>
      {[1, 2, 3, 4].map((bar) => (
        <View key={bar} style={[styles.scoreSignalBar, { height: 5 + bar * 3 }, bar <= quality && styles.scoreSignalBarOn]} />
      ))}
    </View>
  );
}

function MobileGameHud({
  clock,
  displayStatus,
  selectedTimeControl,
  session,
  snapshot,
}: {
  clock: { whiteMs: number; blackMs: number; running: boolean };
  displayStatus: string;
  selectedTimeControl: TimePresetId;
  session: GameSession;
  snapshot: GameSnapshot;
}) {
  const turnLabel = snapshot.status.turn === "w" ? "White to move" : "Black to move";
  return (
    <View style={styles.mobileGameHud}>
      <View style={styles.mobileHudMetaRow}>
        <Text style={styles.mobileHudStatus} numberOfLines={1}>{displayStatus}</Text>
        <Text style={styles.mobileHudTimeControl}>{selectedTimeControl}</Text>
      </View>
      <View style={styles.mobileClockGrid}>
        <MobileClockCard
          active={snapshot.status.turn === "b"}
          clock={formatClock(clock.blackMs)}
          color="b"
          player={session.black}
          signal={4}
        />
        <MobileClockCard
          active={snapshot.status.turn === "w"}
          clock={formatClock(clock.whiteMs)}
          color="w"
          player={session.white}
          signal={5}
        />
      </View>
      <Text style={styles.mobileTurnLine}>{turnLabel}</Text>
    </View>
  );
}

function MobileClockCard({
  active,
  clock,
  color,
  player,
  signal,
}: {
  active: boolean;
  clock: string;
  color: "w" | "b";
  player: UserProfile;
  signal: number;
}) {
  return (
    <View style={[styles.mobileClockCard, color === "b" && styles.mobileClockCardDark, active && styles.mobileClockCardActive]}>
      <View style={styles.mobileClockIdentity}>
        <View style={[styles.mobileClockAvatar, color === "b" && styles.mobileClockAvatarDark]}>
          <Text style={styles.mobileClockAvatarText}>{player.avatarEmoji}</Text>
        </View>
        <View style={styles.mobileClockNameBlock}>
          <Text numberOfLines={1} style={[styles.mobileClockName, color === "b" && styles.mobileClockNameDark]}>{player.displayName}</Text>
          <Text style={[styles.mobileClockMeta, color === "b" && styles.mobileClockMetaDark]}>{color === "w" ? "White" : "Black"} · {player.rating.rapid}</Text>
        </View>
        <ScoreSignal quality={signal} />
      </View>
      <Text style={[styles.mobileClockText, color === "b" && styles.mobileClockTextDark, active && styles.mobileClockTextActive, color === "b" && active && styles.mobileClockTextActiveDark]}>{clock}</Text>
    </View>
  );
}

function PlayerStrip({ player, color, clock, captured }: { player: UserProfile; color: "w" | "b"; clock: string; captured: PieceKind[] }) {
  return (
    <View style={[styles.playerStrip, color === "w" && styles.playerStripBottom]}>
      <View style={styles.playerIdentity}>
        <View style={[styles.avatar, color === "w" ? styles.avatarWhite : styles.avatarBlack]}>
          <Text style={styles.avatarText}>{player.avatarEmoji}</Text>
        </View>
        <View>
          <Text style={styles.playerName}>{player.displayName}</Text>
          <Text style={styles.playerMeta}>{color === "w" ? "White" : "Black"} · {player.rating.rapid}</Text>
        </View>
      </View>
      <View style={styles.capturedMini}>
        {captured.map((piece, index) => (
          <Text key={`${piece}-${index}`} style={styles.capturedMiniText}>{pieceLetter(piece)}</Text>
        ))}
      </View>
      <SignalBars quality={color === "w" ? 5 : 4} label={color === "w" ? "local" : "42ms"} />
      <View style={[styles.clockBox, color === "b" && styles.clockBoxDark]}>
        <Text style={[styles.clock, color === "b" && styles.clockDark]}>{clock}</Text>
      </View>
    </View>
  );
}

function GameControlRail({
  status,
  message,
  onNewGame,
  onOnlineGame,
  selectedTimeControl,
  onSelectTimeControl,
  onFindLiveMatch,
  matchSearch,
}: {
  status: string;
  message: string;
  onNewGame: () => void;
  onOnlineGame: () => void;
  selectedTimeControl: TimePresetId;
  onSelectTimeControl: (timeControl: TimePresetId) => void;
  onFindLiveMatch: () => void;
  matchSearch: "idle" | "searching" | "matched";
}) {
  return (
    <View style={styles.controlRail}>
      <View style={styles.statusBlock}>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.messageText}>{message}</Text>
      </View>
      <TimeControlPicker selected={selectedTimeControl} onSelect={onSelectTimeControl} compact />
      <View style={styles.controlRailActions}>
        <ActionButton label={matchSearch === "searching" ? "Preparing..." : "Quick Local"} onPress={onFindLiveMatch} accent />
        <ActionButton label="New Game" onPress={onNewGame} />
        <ActionButton label="P2P Invite" onPress={onOnlineGame} />
      </View>
    </View>
  );
}

function PlaySetupScreen({
  bots,
  matchSearch,
  onAcceptP2PAnswer,
  onCopyP2PAnswer,
  onCopyP2PInvite,
  onCreateP2PAnswer,
  onFindLiveMatch,
  onResetP2P,
  onSelectTimeControl,
  onSetP2PRated,
  onSetP2PRemoteSignal,
  onStartP2PHost,
  onStartBot,
  onStartPractice,
  p2pPanel,
  selectedTimeControl,
  user,
}: {
  bots: BotProfile[];
  matchSearch: "idle" | "searching" | "matched";
  onAcceptP2PAnswer: () => void;
  onCopyP2PAnswer: () => void;
  onCopyP2PInvite: () => void;
  onCreateP2PAnswer: () => void;
  onFindLiveMatch: () => void;
  onResetP2P: () => void;
  onSelectTimeControl: (timeControl: TimePresetId) => void;
  onSetP2PRated: (rated: boolean) => void;
  onSetP2PRemoteSignal: (signal: string) => void;
  onStartP2PHost: (rated: boolean) => void;
  onStartBot: (botId: string) => void;
  onStartPractice: () => void;
  p2pPanel: P2PPanelState;
  selectedTimeControl: TimePresetId;
  user: UserProfile | null;
}) {
  const selectedPreset = timePresets.find((preset) => preset.id === selectedTimeControl) ?? timePresets[2];
  const botLevels = bots.slice(0, 4);
  const rapidRating = user?.rating.rapid ?? 400;
  return (
    <View style={styles.playSetup}>
      <View style={styles.playSetupHero}>
        <View style={styles.playSetupCopy}>
          <Text style={styles.playSetupTitle}>Choose a game</Text>
          <Text style={styles.playSetupSubtitle}>Pick a clock, then start a friend link, quick local match, or bot practice.</Text>
          <View style={styles.playSetupHeroActions}>
            <ActionButton label="Create Friend Link" onPress={() => onStartP2PHost(p2pPanel.rated)} accent />
            <ActionButton label={matchSearch === "searching" ? "Preparing..." : "Quick Local Match"} onPress={onFindLiveMatch} />
            <ActionButton label="Practice Board" onPress={onStartPractice} />
          </View>
        </View>
        <View style={styles.playSetupRating}>
          <Text style={styles.playSetupRatingLabel}>Your rapid</Text>
          <Text style={styles.playSetupRatingValue}>{rapidRating}</Text>
        </View>
      </View>
      <View style={styles.playSetupGrid}>
        <View style={styles.playSetupPanel}>
          <Text style={styles.playSetupSectionTitle}>Time control</Text>
          <TimeControlPicker selected={selectedTimeControl} onSelect={onSelectTimeControl} />
          <View style={styles.matchSummaryCard}>
            <SignalBars quality={matchSearch === "searching" ? 3 : 5} label={matchSearch === "searching" ? "Searching" : "Ready"} />
            <View style={styles.matchSummaryCopy}>
              <Text style={styles.matchSummaryTitle}>{matchSearch === "searching" ? "Preparing board..." : `${selectedPreset.label} ${selectedPreset.group}`}</Text>
              <Text style={styles.matchSummaryText}>Friend games pair from a link and use Cloudflare TURN for reliable WebRTC.</Text>
            </View>
          </View>
        </View>
        <View style={styles.playSetupPanel}>
          <Text style={styles.playSetupSectionTitle}>Play a bot</Text>
          <View style={styles.botChoiceGrid}>
            {botLevels.map((bot) => (
              <Pressable key={bot.id} onPress={() => onStartBot(bot.id)} style={({ pressed }) => [styles.botChoiceCard, pressed && styles.pressed]}>
                <Text style={styles.botChoiceAvatar}>{bot.avatarEmoji}</Text>
                <View style={styles.botChoiceCopy}>
                  <Text style={styles.botChoiceName}>{bot.name}</Text>
                  <Text style={styles.botChoiceMeta}>Level {Math.max(1, Math.round(bot.rating / 250))} · {bot.rating}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        <P2PFriendMatchPanel
          onAcceptAnswer={onAcceptP2PAnswer}
          onCopyAnswer={onCopyP2PAnswer}
          onCopyInvite={onCopyP2PInvite}
          onCreateAnswer={onCreateP2PAnswer}
          onReset={onResetP2P}
          onSetRated={onSetP2PRated}
          onSetRemoteSignal={onSetP2PRemoteSignal}
          onStartHost={onStartP2PHost}
          state={p2pPanel}
        />
      </View>
    </View>
  );
}

function P2PFriendMatchPanel({
  onAcceptAnswer,
  onCopyAnswer,
  onCopyInvite,
  onCreateAnswer,
  onReset,
  onSetRated,
  onSetRemoteSignal,
  onStartHost,
  state,
}: {
  onAcceptAnswer: () => void;
  onCopyAnswer: () => void;
  onCopyInvite: () => void;
  onCreateAnswer: () => void;
  onReset: () => void;
  onSetRated: (rated: boolean) => void;
  onSetRemoteSignal: (signal: string) => void;
  onStartHost: (rated: boolean) => void;
  state: P2PPanelState;
}) {
  const isHost = state.mode === "host";
  const isJoin = state.mode === "join";
  const connected = state.connection === "connected";
  const connectionLabel =
    state.connection === "idle"
      ? "No invite yet"
      : state.connection === "waiting-answer"
        ? "Waiting for friend"
        : state.connection === "answer-ready"
          ? "Friend ready"
          : state.connection === "connected"
            ? "TURN relay connected"
            : state.connection === "error"
              ? "Needs attention"
              : "Connecting";
  return (
    <View style={[styles.playSetupPanel, styles.p2pPanel]}>
      <View style={styles.p2pHeader}>
        <View style={styles.p2pTitleBlock}>
          <Text style={styles.playSetupSectionTitle}>P2P friend match</Text>
          <Text style={styles.p2pSubtitle}>Create one link. Your friend opens it, pairs automatically, and plays over Cloudflare TURN relay.</Text>
        </View>
        <View style={[styles.p2pStatusPill, connected && styles.p2pStatusPillConnected]}>
          <Text style={[styles.p2pStatusText, connected && styles.p2pStatusTextConnected]}>{connectionLabel}</Text>
        </View>
      </View>

      <View style={styles.p2pModeRow}>
        <Pressable onPress={() => onSetRated(false)} style={[styles.p2pModeButton, !state.rated && styles.p2pModeButtonActive]}>
          <Text style={[styles.p2pModeText, !state.rated && styles.p2pModeTextActive]}>Casual</Text>
        </Pressable>
        <Pressable onPress={() => onSetRated(true)} style={[styles.p2pModeButton, state.rated && styles.p2pModeButtonActive]}>
          <Text style={[styles.p2pModeText, state.rated && styles.p2pModeTextActive]}>Local rated</Text>
        </Pressable>
      </View>

      <View style={styles.p2pActionGrid}>
        <ActionButton label="Create Friend Link" onPress={() => onStartHost(state.rated)} accent />
        <ActionButton label="Reset P2P" onPress={onReset} />
      </View>

      {isHost && (
        <View style={styles.p2pSignalBox}>
          <Text style={styles.p2pSignalLabel}>Send this link to your friend</Text>
          <TextInput
            editable={false}
            multiline
            style={styles.p2pSignalInput}
            value={state.inviteUrl || state.inviteToken}
          />
          <ActionButton label="Copy Invite" onPress={onCopyInvite} />
          <Text style={styles.p2pFootnote}>Waiting here is enough. When your friend opens the link, ChessAlive exchanges the answer automatically.</Text>
        </View>
      )}

      {!isHost && <View style={styles.p2pSignalBox}>
        <Text style={styles.p2pSignalLabel}>{isJoin ? "Joining friend invite" : "Friend invite"}</Text>
        <Text style={styles.p2pSubtitle}>
          {isJoin
            ? "ChessAlive is generating the WebRTC answer and sending it to the host automatically."
            : "Ask your friend to create a link, then open that link in this browser."}
        </Text>
      </View>}

      {state.error && <Text style={styles.p2pError}>{state.error}</Text>}
      <Text style={styles.p2pFootnote}>The game server does not relay chess moves. It only creates the invite and short-lived Cloudflare TURN credentials.</Text>
    </View>
  );
}

function InsightPill({ label, value, tone }: { label: string; value: string; tone: "hot" | "calm" | "quiet" }) {
  return (
    <View style={[styles.insightPill, tone === "hot" && styles.insightHot, tone === "quiet" && styles.insightQuiet]}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.insightValue}>{value}</Text>
    </View>
  );
}

function TimeControlPicker({
  selected,
  onSelect,
  compact,
}: {
  selected: TimePresetId;
  onSelect: (timeControl: TimePresetId) => void;
  compact?: boolean;
}) {
  const groups = ["Bullet", "Blitz", "Rapid"] as const;
  return (
    <View style={[styles.timePicker, compact && styles.timePickerCompact]}>
      {!compact && <Text style={styles.timePickerTitle}>Time Control</Text>}
      {groups.map((group) => (
        <View key={group} style={styles.timeGroup}>
          {!compact && <Text style={styles.timeGroupLabel}>{group}</Text>}
          <View style={styles.timePresetRow}>
            {timePresets
              .filter((preset) => preset.group === group)
              .map((preset) => {
                const active = selected === preset.id;
                return (
                  <Pressable key={preset.id} onPress={() => onSelect(preset.id)} style={[styles.timePreset, active && styles.timePresetActive]}>
                    <Text style={[styles.timePresetText, active && styles.timePresetTextActive]}>{preset.label}</Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}
    </View>
  );
}

function LiveMatchPanel({
  data,
  selectedTimeControl,
  onSelectTimeControl,
  matchSearch,
  onFindLiveMatch,
}: {
  data: DashboardData;
  selectedTimeControl: TimePresetId;
  onSelectTimeControl: (timeControl: TimePresetId) => void;
  matchSearch: "idle" | "searching" | "matched";
  onFindLiveMatch: () => void;
}) {
  const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
  const rating = data.user?.rating.rapid ?? 1000;
  return (
    <Panel title="Live Matching">
      <TimeControlPicker selected={selectedTimeControl} onSelect={onSelectTimeControl} />
      <View style={styles.matchSearchCard}>
        <View style={styles.matchSearchHeader}>
          <EliteIcon icon={Target} tone={matchSearch === "searching" ? "rose" : "emerald"} size="md" rune="MM" />
          <View style={styles.playOnlineCopy}>
            <Text style={styles.cardTitle}>{matchSearch === "searching" ? "Preparing board" : matchSearch === "matched" ? "Board ready" : "Ready to play"}</Text>
            <Text style={styles.muted}>{preset.label} · {preset.group} · rating {rating - 150}-{rating + 150}</Text>
          </View>
        </View>
        <SignalBars quality={matchSearch === "searching" ? 3 : 5} label={matchSearch === "searching" ? "Scanning regions" : "Strong connection"} />
        <ActionButton label={matchSearch === "searching" ? "Preparing..." : "Quick Local"} onPress={onFindLiveMatch} accent />
      </View>
    </Panel>
  );
}

function AppLeftRail({
  activeScreen,
  onNavigate,
  screens: railScreens,
}: {
  user: UserProfile | null;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  screens: Screen[];
}) {
  return (
    <View style={styles.playLeftRail}>
      <View style={styles.playLeftNav}>
        {railScreens.map((item) => {
          const meta = screenMeta[item];
          return <RailNavItem key={item} item={item} meta={meta} active={activeScreen === item} onPress={() => onNavigate(item)} />;
        })}
      </View>
    </View>
  );
}

const railItemColors: Record<Screen, string> = {
  Premium: "rgba(255,255,255,0.9)",
  Home: "rgba(255,255,255,0.86)",
  Play: "rgba(255,255,255,0.86)",
  Learn: "rgba(255,255,255,0.86)",
  Puzzles: "rgba(255,255,255,0.86)",
  Lessons: "rgba(255,255,255,0.86)",
  Bots: "rgba(255,255,255,0.86)",
  Review: "rgba(255,255,255,0.86)",
  Tournaments: "rgba(255,255,255,0.86)",
  Social: "rgba(255,255,255,0.86)",
  Profile: "rgba(255,255,255,0.86)",
  Admin: "rgba(255,255,255,0.86)",
};

function RailNavItem({
  item,
  meta,
  active,
  onPress,
}: {
  item: Screen;
  meta: { icon: typeof Home; caption: string; tone: IconTone; rune: string };
  active: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverMotion = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const Icon = meta.icon;
  const backgroundColor = railItemColors[item];
  const compactRail = width < 1280;
  const collapsedWidth = compactRail ? 56 : 64;
  const expandedWidth = compactRail ? 178 : 204;
  const railIconSize = compactRail ? 22 : 24;
  useEffect(() => {
    Animated.timing(hoverMotion, {
      duration: hovered ? 320 : 220,
      easing: hovered ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      toValue: hovered ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [hoverMotion, hovered]);
  const railWidth = hoverMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedWidth, expandedWidth],
  });
  const labelOpacity = hoverMotion.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.15, 1],
  });
  const labelTranslate = hoverMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });
  return (
    <Animated.View style={[styles.playLeftNavItemWrap, { width: railWidth }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.playLeftNavItem,
          { backgroundColor },
          active && styles.playLeftNavItemActive,
          pressed && styles.playLeftNavItemPressed,
        ]}
      >
        <View style={styles.playLeftIconSlot}>
          <Icon size={railIconSize} color={active ? aiBlue : "#64748b"} strokeWidth={2.8} />
        </View>
        <Animated.Text style={[styles.playLeftNavText, { opacity: labelOpacity, transform: [{ translateX: labelTranslate }] }]}>
          {item}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

function GameScoreCard({ clock, session, snapshot }: { clock: { whiteMs: number; blackMs: number; running: boolean }; session: GameSession; snapshot: GameSnapshot }) {
  return (
    <View style={styles.gameScoreCard}>
      <View style={styles.scoreClockStrip}>
        <View style={[styles.scoreClockBox, snapshot.status.turn === "b" && styles.scoreClockBoxActive]}>
          <ScoreSignal quality={4} />
          <Text style={[styles.scoreClockText, snapshot.status.turn === "b" && styles.scoreClockTextActive]}>{formatClock(clock.blackMs)}</Text>
        </View>
        <View style={[styles.scoreClockBox, snapshot.status.turn === "w" && styles.scoreClockBoxActive]}>
          <Text style={[styles.scoreClockText, snapshot.status.turn === "w" && styles.scoreClockTextActive]}>{formatClock(clock.whiteMs)}</Text>
          <ScoreSignal quality={5} />
        </View>
      </View>
      <View style={styles.scoreNameGrid}>
        <Text style={styles.scoreFlag}>🇮🇳</Text>
        <Text numberOfLines={1} style={styles.scoreName}>{session.white.displayName}</Text>
        <Text numberOfLines={1} style={[styles.scoreName, styles.scoreNameDark]}>{session.black.displayName}</Text>
        <Text style={styles.scoreFlag}>🌐</Text>
      </View>
      <View style={styles.scorePlayerGrid}>
        <View style={[styles.scorePieceBadge, styles.scorePieceBadgeWhite]}>
          <Text style={styles.scorePieceBadgeText}>♘</Text>
        </View>
        <Text style={styles.scoreRating}>({session.white.rating.rapid})</Text>
        <Text style={styles.scorePoint}>0</Text>
        <Text style={styles.scorePoint}>0</Text>
        <Text style={styles.scoreRating}>({session.black.rating.rapid})</Text>
        <View style={styles.scorePieceBadge}>
          <Text style={[styles.scorePieceBadgeText, styles.scorePieceBadgeTextDark]}>♞</Text>
        </View>
      </View>
      <View style={styles.scoreCapturedGrid}>
        <CapturedScoreSlots captured={snapshot.captured.white} color="b" />
        <CapturedScoreSlots captured={snapshot.captured.black} color="w" />
      </View>
    </View>
  );
}

function resultWinner(result: string): "White" | "Black" | "Draw" {
  const normalized = result.toLowerCase();
  if (normalized.includes("white")) return "White";
  if (normalized.includes("black")) return "Black";
  return "Draw";
}

function ChessAliveLogoMark({ variant = "result" }: { variant?: "result" | "title" }) {
  const knightPaths = alphaPiecePaths.wN;
  return (
    <View style={[styles.chessAliveLogoMark, variant === "result" ? styles.winnerLogoMark : styles.globeLogoMark]}>
      <Svg viewBox="0 0 2048 2048" width="112%" height="112%">
        {knightPaths.map((path, index) => (
          <Path key={`${path.fill}-${index}`} fill={pieceArtFill(path.fill, "w")} d={path.d} />
        ))}
      </Svg>
    </View>
  );
}

function WinnerCard({
  onAddFriend,
  onQuickMatch,
  onRematch,
  onSeek,
  result,
  session,
}: {
  onAddFriend: () => void;
  onQuickMatch: () => void;
  onRematch: () => void;
  onSeek: () => void;
  result: string;
  session: GameSession;
}) {
  const winner = resultWinner(result);
  const winnerPlayer = winner === "Black" ? session.black : session.white;
  const opponent = winner === "Black" ? session.white : session.black;
  const isDraw = winner === "Draw";
  const ratingGain = isDraw ? 0 : 29;
  const newRating = winnerPlayer.rating.rapid + ratingGain;
  return (
    <View style={styles.winnerCard}>
      <View style={styles.winnerHero}>
        <View style={styles.winnerCopy}>
          <Text style={styles.winnerTitle}>{isDraw ? "DRAW!" : `${winner} WINS!`}</Text>
          <Text style={styles.winnerSubtitle}>{isDraw ? "Hard-fought game" : `${opponent.displayName} checkmated`}</Text>
          <View style={styles.winnerRatingRow}>
            <Text style={styles.winnerRatingLabel}>New rating:</Text>
            <AnimatedRatingNumber from={winnerPlayer.rating.rapid} to={newRating} />
            {!isDraw && <Text style={styles.ratingGainPop}>+{ratingGain}</Text>}
          </View>
          <Text style={styles.winnerCubits}>Cubits: ◉ 0</Text>
        </View>
        <View style={styles.winnerKnight}>
          <ChessAliveLogoMark />
        </View>
      </View>
      <View style={styles.winnerButtonRow}>
        <Pressable onPress={onRematch} style={[styles.winnerAction, styles.winnerActionBlue]}>
          <Text style={styles.winnerActionText}>Rematch</Text>
        </Pressable>
        <Pressable onPress={onSeek} style={styles.winnerAction}>
          <Text style={styles.winnerActionText}>Seek</Text>
        </Pressable>
        <Pressable onPress={onQuickMatch} style={styles.winnerAction}>
          <Text style={styles.winnerActionText}>Quick Match</Text>
        </Pressable>
      </View>
      <Pressable onPress={onAddFriend} style={styles.winnerFriendButton}>
        <Users size={17} color="#0d2614" strokeWidth={3} />
        <Text style={styles.winnerFriendText}>Add {opponent.displayName} to Friends</Text>
      </Pressable>
    </View>
  );
}

function AnimatedRatingNumber({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const delta = Math.max(1, to - from);
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(1, frame / 24);
      setValue(Math.round(from + delta * (1 - Math.pow(1 - progress, 3))));
      if (progress >= 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [from, to]);
  return <Text style={styles.winnerRatingNumber}>{value}</Text>;
}

function GameToolStrip({
  onMinimize,
  onOfferDraw,
  onReplayPly,
  onResign,
  replayPly,
  snapshot,
}: {
  onMinimize: () => void;
  onOfferDraw: () => void;
  onReplayPly: (ply: number | null) => void;
  onResign: () => void;
  replayPly: number | null;
  snapshot: GameSnapshot;
}) {
  const lastPly = snapshot.history.length;
  const currentPly = replayPly ?? lastPly;
  const tools = [
    { label: "First move", text: "|<", disabled: currentPly === 0, onPress: () => onReplayPly(0) },
    { label: "Previous move", text: "<", disabled: currentPly === 0, onPress: () => onReplayPly(Math.max(0, currentPly - 1)) },
    { label: "Offer draw", icon: Shield, onPress: onOfferDraw },
    { label: "Resign", icon: Flag, onPress: onResign },
    { label: "Live move", text: ">|", disabled: currentPly >= lastPly, onPress: () => onReplayPly(null) },
  ];
  return (
    <View style={styles.cubeToolStrip}>
      {tools.map((tool) => {
        const Icon = "icon" in tool ? tool.icon : null;
        const disabled = "disabled" in tool ? tool.disabled : false;
        return (
          <Pressable
            key={tool.label}
            accessibilityLabel={tool.label}
            disabled={disabled}
            onPress={tool.onPress}
            style={[styles.cubeToolButton, disabled && styles.cubeToolButtonDisabled]}
          >
            {Icon ? <Icon size={17} color="#7f8c95" strokeWidth={2.8} /> : <Text style={styles.cubeToolButtonText}>{tool.text}</Text>}
          </Pressable>
        );
      })}
      <Pressable accessibilityLabel="Collapse game panel" onPress={onMinimize} style={[styles.cubeToolButton, styles.cubeToolButtonEnd]}>
        <Gauge size={18} color="#9aa4aa" strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}

function GameSidePanel({
  activeTab,
  clock,
  data,
  displayStatus,
  displaySnapshot,
  matchSearch,
  message,
  mobile,
  onFindLiveMatch,
  onMinimize,
  onNewGame,
  onOfferDraw,
  onPracticeColorSwap,
  onRefreshData,
  onReplayPly,
  onResign,
  onSelectTab,
  onSelectTimeControl,
  selected,
  selectedTimeControl,
  playerColor,
  practiceMode,
  services,
  session,
  settings,
  snapshot,
  replayPly,
}: {
  activeTab: PlayPanelTab;
  clock: { whiteMs: number; blackMs: number; running: boolean };
  data: DashboardData;
  displayStatus: string;
  displaySnapshot: GameSnapshot;
  matchSearch: "idle" | "searching" | "matched";
  message: string;
  mobile?: boolean;
  onFindLiveMatch: () => void;
  onMinimize: () => void;
  onNewGame: () => void;
  onOfferDraw: () => void;
  onPracticeColorSwap: () => void;
  onRefreshData: () => void;
  onReplayPly: (ply: number | null) => void;
  onResign: () => void;
  onSelectTab: (tab: PlayPanelTab) => void;
  onSelectTimeControl: (timeControl: TimePresetId) => void;
  selected: SquareName | null;
  selectedTimeControl: TimePresetId;
  services: ChessAliveServices;
  session: GameSession;
  settings: FunnyModeSettings & { boardTheme: string; soundVolume: number };
  snapshot: GameSnapshot;
  replayPly: number | null;
  playerColor: "w" | "b";
  practiceMode: boolean;
}) {
  const [draft, setDraft] = useState("");
  const normalizedTab: PlayPanelTab = activeTab === "chat" ? "moves" : activeTab;
  const tabs: Array<{ id: PlayPanelTab; label: string }> = [
    { id: "moves", label: "Game" },
        { id: "players", label: "Peers" },
    { id: "info", label: "Info" },
  ];
  const tabContentMotion = useReplayEntrance(normalizedTab, { distance: 10, duration: 240 });

  async function sendGameChat() {
    const body = draft.trim();
    if (!body || !data.user) return;
    setDraft("");
    await services.chat.sendMessage(session.id, data.user.id, body);
    onRefreshData();
  }

  return (
    <View style={[styles.gameDock, mobile && styles.gameDockMobile]}>
      {!mobile && <GameScoreCard clock={clock} session={session} snapshot={displaySnapshot} />}
      <GameToolStrip
        onMinimize={onMinimize}
        onOfferDraw={onOfferDraw}
        onReplayPly={onReplayPly}
        onResign={onResign}
        replayPly={replayPly}
        snapshot={snapshot}
      />
      <View style={styles.gameDockTabs}>
        {tabs.map((tabItem) => (
          <Pressable
            key={tabItem.id}
            onPress={() => onSelectTab(tabItem.id)}
            style={[styles.gameDockTab, normalizedTab === tabItem.id && styles.gameDockTabActive]}
          >
            <Text style={[styles.gameDockTabText, normalizedTab === tabItem.id && styles.gameDockTabTextActive]}>{tabItem.label}</Text>
          </Pressable>
        ))}
      </View>
      <Animated.View key={normalizedTab} style={tabContentMotion}>
        {normalizedTab === "moves" && (
          <MovesDockContent
            displayStatus={displayStatus}
            message={message}
            selected={selected}
            snapshot={snapshot}
            replayPly={replayPly}
            onReplayPly={onReplayPly}
          />
        )}
        {normalizedTab === "players" && (
          <PlayersDockContent data={data} onFindLiveMatch={onFindLiveMatch} session={session} />
        )}
        {normalizedTab === "info" && (
          <InfoDockContent
            clock={clock}
            data={data}
            matchSearch={matchSearch}
            onFindLiveMatch={onFindLiveMatch}
            onPracticeColorSwap={onPracticeColorSwap}
            onSelectTimeControl={onSelectTimeControl}
            playerColor={playerColor}
            practiceMode={practiceMode}
            selectedTimeControl={selectedTimeControl}
            session={session}
            settings={settings}
            snapshot={displaySnapshot}
          />
        )}
      </Animated.View>
      <CubeChatComposer data={data} draft={draft} onChangeDraft={setDraft} onSend={sendGameChat} />
    </View>
  );
}

function MovesDockContent({
  displayStatus,
  message,
  onReplayPly,
  replayPly,
  selected,
  snapshot,
}: {
  displayStatus: string;
  message: string;
  onReplayPly: (ply: number | null) => void;
  replayPly: number | null;
  selected: SquareName | null;
  snapshot: GameSnapshot;
}) {
  const pairs = movePairs(snapshot);
  const lastPly = snapshot.history.length;
  const currentPly = replayPly ?? lastPly;
  const statusBody = replayPly !== null ? "Replay view. Use the arrows to inspect or jump back live." : selected ? `Selected ${selected.toUpperCase()}. Pick a highlighted target.` : message;
  return (
    <View style={styles.gameDockBody}>
      <View style={styles.cubeGameBody}>
        <Text style={styles.cubeOpeningTitle}>A06: {openingName(snapshot)}</Text>
        <Text style={styles.cubeGameMeta}>🟡 70. [5 min] Rated, Public</Text>
        <Text style={styles.cubeOpeningCode}>B00: King's pawn Opening</Text>
        <View style={styles.moveTable}>
          {pairs.length === 0 ? (
            <View style={styles.moveTableRow}>
              <Text style={styles.moveNumberCell}>1</Text>
              <Text style={styles.moveCell}>...</Text>
              <Text style={styles.moveCell}>...</Text>
            </View>
          ) : (
            pairs.map((pair, index) => {
              const whitePly = index * 2 + 1;
              const blackPly = whitePly + 1;
              return (
                <View key={`${pair.join("-")}-${index}`} style={styles.moveTableRow}>
                  <Text style={styles.moveNumberCell}>{index + 1}</Text>
                  <Pressable
                    disabled={!pair[0]}
                    onPress={() => onReplayPly(whitePly >= lastPly ? null : whitePly)}
                    style={[styles.moveCellButton, currentPly === whitePly && styles.moveCellButtonActive]}
                  >
                    <Text style={[styles.moveCell, currentPly === whitePly && styles.moveCellActive]}>{pair[0]}</Text>
                  </Pressable>
                  <Pressable
                    disabled={!pair[1]}
                    onPress={() => onReplayPly(blackPly >= lastPly ? null : blackPly)}
                    style={[styles.moveCellButton, currentPly === blackPly && styles.moveCellButtonActive]}
                  >
                    <Text style={[styles.moveCell, currentPly === blackPly && styles.moveCellActive]}>{pair[1] ?? ""}</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
        <Text style={styles.cubeStatusLine}>{displayStatus}</Text>
        <Text style={styles.cubeMessageLine}>{statusBody}</Text>
      </View>
    </View>
  );
}

function CubeChatComposer({
  data,
  draft,
  onChangeDraft,
  onSend,
}: {
  data: DashboardData;
  draft: string;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.cubeChatArea}>
      <View style={styles.cubeChatRow}>
        <View style={styles.cubeMoodButton}>
          <Text style={styles.cubeMoodText}>🙂</Text>
        </View>
        <TextInput
          value={draft}
          onChangeText={onChangeDraft}
          placeholder=""
          placeholderTextColor="#8aa0b6"
          style={styles.cubeChatInput}
          onSubmitEditing={onSend}
        />
        <Pressable disabled={!draft.trim() || !data.user} onPress={onSend} style={[styles.cubeSendAllButton, (!draft.trim() || !data.user) && styles.cubeSendAllButtonDisabled]}>
          <Text style={styles.cubeSendAllText}>Send to All ▾</Text>
        </Pressable>
      </View>
      <Text style={styles.cubeReportLink}>Report Abuse</Text>
    </View>
  );
}

function ChatDockContent({
  data,
  draft,
  onChangeDraft,
  onSend,
  session,
}: {
  data: DashboardData;
  draft: string;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  session: GameSession;
}) {
  const messages = data.chat.slice(-6);
  return (
    <View style={styles.gameDockBody}>
      <View style={styles.chatRoomHeader}>
        <Text style={styles.openingName}>Game chat</Text>
        <Text style={styles.openingLine}>{session.white.displayName} vs {session.black.displayName}</Text>
      </View>
      <View style={styles.chatList}>
        {messages.map((item) => (
          <View key={item.id} style={[styles.chatBubble, item.from.id === data.user?.id && styles.chatBubbleOwn]}>
            <Text style={styles.chatAuthor}>{item.from.avatarEmoji} {item.from.displayName}</Text>
            <Text style={styles.chatBody}>{item.body}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chatComposer}>
        <TextInput
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Message opponent or lobby"
          placeholderTextColor="#8aa0b6"
          style={styles.chatInput}
          onSubmitEditing={onSend}
        />
        <Pressable onPress={onSend} style={styles.sendIconButton}>
          <Send color="#ffffff" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function PlayersDockContent({ data, onFindLiveMatch, session }: { data: DashboardData; onFindLiveMatch: () => void; session: GameSession }) {
  const players = [session.black, ...data.onlineFriends, ...data.friends].filter((player, index, list) => list.findIndex((item) => item.id === player.id) === index);
  return (
    <View style={styles.gameDockBody}>
      <View style={styles.playerSearchBox}>
        <Text style={styles.playerSearchText}>Search friends, recent opponents, clubs</Text>
      </View>
      <View style={styles.playersOnlineSummary}>
        <InsightPill label="Online" value={`${Math.max(players.length, 1)} friends`} tone="calm" />
        <InsightPill label="Pool" value="same rating" tone="hot" />
      </View>
      {players.map((player, index) => (
        <View key={`${player.id}-${index}`} style={styles.playerListRow}>
          <View style={styles.playerListAvatar}>
            <Text style={styles.playerListAvatarText}>{player.avatarEmoji}</Text>
          </View>
          <View style={styles.playerListCopy}>
            <Text style={styles.playerListName}>{player.displayName}</Text>
            <Text style={styles.playerListMeta}>{player.rating.rapid} rapid · {index === 0 ? "in game" : "online"}</Text>
          </View>
          <Pressable onPress={onFindLiveMatch} style={styles.challengeButton}>
            <Text style={styles.challengeButtonText}>Play</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function InfoDockContent({
  clock,
  data,
  matchSearch,
  onFindLiveMatch,
  onPracticeColorSwap,
  onSelectTimeControl,
  playerColor,
  practiceMode,
  selectedTimeControl,
  session,
  settings,
  snapshot,
}: {
  clock: { whiteMs: number; blackMs: number; running: boolean };
  data: DashboardData;
  matchSearch: "idle" | "searching" | "matched";
  onFindLiveMatch: () => void;
  onPracticeColorSwap: () => void;
  onSelectTimeControl: (timeControl: TimePresetId) => void;
  playerColor: "w" | "b";
  practiceMode: boolean;
  selectedTimeControl: TimePresetId;
  session: GameSession;
  settings: FunnyModeSettings & { boardTheme: string; soundVolume: number };
  snapshot: GameSnapshot;
}) {
  const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
  const rating = data.user?.rating.rapid ?? session.white.rating.rapid;
  return (
    <View style={styles.gameDockBody}>
      <View style={styles.matchSearchCard}>
        <View style={styles.matchSearchHeader}>
          <EliteIcon icon={Target} tone={matchSearch === "searching" ? "rose" : "emerald"} size="md" rune="MM" />
          <View style={styles.playOnlineCopy}>
            <Text style={styles.cardTitle}>{matchSearch === "searching" ? "Preparing board" : matchSearch === "matched" ? "Board ready" : "P2P and local play"}</Text>
            <Text style={styles.muted}>{preset.label} · {preset.group} · rating {rating - 150}-{rating + 150}</Text>
          </View>
        </View>
        <View style={styles.matchPipeline}>
          {["Time", "Rating", "Region", "Seat"].map((step, index) => (
            <View key={step} style={[styles.matchPipelineStep, (matchSearch === "matched" || index < 3) && styles.matchPipelineStepOn]}>
              <Text style={[styles.matchPipelineText, (matchSearch === "matched" || index < 3) && styles.matchPipelineTextOn]}>{step}</Text>
            </View>
          ))}
        </View>
        <ActionButton label={matchSearch === "searching" ? "Preparing..." : "Quick Local"} onPress={onFindLiveMatch} accent />
      </View>
      {practiceMode && (
        <View style={styles.practiceToolCard}>
          <View style={styles.matchSearchHeader}>
            <EliteIcon icon={Bot} tone="violet" size="sm" rune={playerColor.toUpperCase()} />
            <View style={styles.playOnlineCopy}>
              <Text style={styles.cardTitle}>Practice controls</Text>
              <Text style={styles.muted}>You are playing {playerColor === "w" ? "White" : "Black"}. The bot auto-plays the other side.</Text>
            </View>
          </View>
          <ActionButton label="Swap Colors" onPress={onPracticeColorSwap} />
        </View>
      )}
      <TimeControlPicker selected={selectedTimeControl} onSelect={onSelectTimeControl} compact />
      <View style={styles.infoGrid}>
        <InsightPill label="Ceremonies" value={settings.animationsEnabled === false ? "Disabled" : "Start + end"} tone={settings.animationsEnabled === false ? "calm" : "hot"} />
        <InsightPill label="Turn" value={snapshot.status.turn === "w" ? "White" : "Black"} tone="calm" />
        <InsightPill label="White clock" value={formatClock(clock.whiteMs)} tone="quiet" />
        <InsightPill label="Black clock" value={formatClock(clock.blackMs)} tone="quiet" />
      </View>
      <View style={styles.scaleNote}>
        <Text style={styles.scaleNoteTitle}>Open beta</Text>
        <Text style={styles.scaleNoteBody}>Everything is free at the beginning: live games, bots, review, lessons, and Alive Mode.</Text>
      </View>
    </View>
  );
}

function movePairs(snapshot: GameSnapshot) {
  return snapshot.history.reduce<string[][]>((groups, move, index) => {
    if (index % 2 === 0) groups.push([move.san]);
    else groups[groups.length - 1].push(move.san);
    return groups;
  }, []);
}

function openingName(snapshot: GameSnapshot) {
  const line = snapshot.history.map((move) => move.san).join(" ");
  if (!line) return "Starting Position";
  if (line.startsWith("e4 e5 Nf3")) return "Open Game";
  if (line.startsWith("d4 d5 c4")) return "Queen's Gambit";
  if (line.startsWith("Nf3")) return "Reti Opening";
  if (line.startsWith("b3")) return "Nimzowitsch-Larsen Attack";
  return snapshot.history.length < 6 ? "Developing Opening" : "Middlegame Formation";
}

function MiniCapturedPieces({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <View style={styles.capturedInline}>
      <Text style={styles.capturedInlineTitle}>Captured</Text>
      <Text style={styles.capturedInlineText}>White: {snapshot.captured.white.map(pieceLetter).join(" ") || "-"}</Text>
      <Text style={styles.capturedInlineText}>Black: {snapshot.captured.black.map(pieceLetter).join(" ") || "-"}</Text>
    </View>
  );
}

function PlayOnlineCard({
  data,
  onStartOnline,
  onJoinRoom,
  compact,
  selectedTimeControl,
  onSelectTimeControl,
  matchSearch,
  onFindLiveMatch,
}: {
  data: DashboardData;
  onStartOnline: () => void;
  onJoinRoom: (roomId: string) => void;
  compact?: boolean;
  selectedTimeControl: TimePresetId;
  onSelectTimeControl: (timeControl: TimePresetId) => void;
  matchSearch: "idle" | "searching" | "matched";
  onFindLiveMatch: () => void;
}) {
  const firstRoom = data.rooms[0];
  const isOnline = Boolean(data.multiplayerStatus?.online);
  const preset = timePresets.find((item) => item.id === selectedTimeControl) ?? timePresets[2];
  return (
    <Panel title="P2P Friend Game">
      <View style={styles.playOnlineHero}>
        <EliteIcon icon={Rocket} tone={isOnline ? "emerald" : "slate"} size="lg" rune={selectedTimeControl} />
        <View style={styles.playOnlineCopy}>
          <Text style={styles.cardTitle}>{matchSearch === "searching" ? "Preparing P2P" : "Friend-link match"}</Text>
          <Text style={styles.muted}>
            Create one link. Your friend opens it and ChessAlive pairs both browsers through Cloudflare TURN.
          </Text>
        </View>
      </View>
      {!compact && (
        <TimeControlPicker selected={selectedTimeControl} onSelect={onSelectTimeControl} />
      )}
      {firstRoom && (
        <View style={styles.roomCard}>
          <Text style={styles.roomCode}>Room {firstRoom.code}</Text>
          <Text style={styles.muted}>{firstRoom.players.black ? "Game in progress" : "Open seat waiting"} · {firstRoom.timeControl}</Text>
          <Text style={styles.muted}>{firstRoom.players.white?.displayName ?? "Open"} vs {firstRoom.players.black?.displayName ?? "friend seat"}</Text>
          <ActionButton label="Join Room" onPress={() => onJoinRoom(firstRoom.id)} />
        </View>
      )}
      <View style={styles.rowWrap}>
        <ActionButton label={matchSearch === "searching" ? "Preparing..." : "Quick Local Match"} onPress={onFindLiveMatch} accent />
        <ActionButton label="Create P2P Invite" onPress={onStartOnline} />
      </View>
    </Panel>
  );
}

function AdminOpsPanel({ data }: { data: DashboardData }) {
  const firstRoom = data.rooms[0];
  return (
    <Panel title="Realtime Admin">
      <View style={styles.serverStatusRow}>
        <EliteIcon icon={Gauge} tone={data.multiplayerStatus?.online ? "emerald" : "slate"} size="xs" rune="RT" />
        <View style={[styles.serverDot, data.multiplayerStatus?.online && styles.serverDotOnline]} />
        <Text style={styles.serverStatusText}>
          {data.multiplayerStatus?.online ? `${data.multiplayerStatus.activeRooms} rooms · ${data.multiplayerStatus.p95LatencyMs}ms p95` : "Realtime server offline"}
        </Text>
      </View>
      <StatLine label="Endpoint" value={data.multiplayerStatus?.endpoint ?? "local"} />
      <StatLine label="Storage" value={data.multiplayerStatus?.storage ? "event log" : data.databaseHealth?.driver ?? "local"} />
      <StatLine label="DB cost" value={`$${data.databaseHealth?.estimatedMonthlyCostUsd ?? 0}/mo`} />
      <StatLine label="Records" value={String(data.databaseHealth?.records ?? 0)} />
      {firstRoom && (
        <View style={styles.roomCard}>
          <Text style={styles.roomCode}>{firstRoom.code}</Text>
          <Text style={styles.muted}>{firstRoom.status} · {firstRoom.timeControl} · {firstRoom.region}</Text>
          <Text style={styles.muted}>{firstRoom.players.white?.displayName ?? "Open"} vs {firstRoom.players.black?.displayName ?? "open seat"}</Text>
        </View>
      )}
    </Panel>
  );
}

function MoveList({ snapshot }: { snapshot: GameSnapshot }) {
  const pairs = snapshot.history.reduce<string[][]>((groups, move, index) => {
    if (index % 2 === 0) groups.push([move.san]);
    else groups[groups.length - 1].push(move.san);
    return groups;
  }, []);

  return (
    <Panel title="Move List">
      {snapshot.history.length === 0 ? (
        <Text style={styles.muted}>No moves yet.</Text>
      ) : (
        pairs.map((pair, index) => (
          <Text key={`${pair.join("-")}-${index}`} style={styles.listText}>
            {index + 1}. {pair[0]} {pair[1] ?? ""}
          </Text>
        ))
      )}
    </Panel>
  );
}

function CapturedPieces({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <Panel title="Captured">
      <StatLine label="By White" value={snapshot.captured.white.map((piece) => piece.toUpperCase()).join(" ") || "-"} />
      <StatLine label="By Black" value={snapshot.captured.black.map((piece) => piece.toUpperCase()).join(" ") || "-"} />
    </Panel>
  );
}


// ─── Roadmap Zigzag Connector ────────────────────────────────────────────────
// Draws an L-shaped path segment between two columns (0=left, 1=right, 2=center).
// Rendered as a full-width view so it can span any column gap.
const ROADMAP_CONTENT_W = 388;  // 420px card - 2×16 h-padding
const ROADMAP_NODE_W = 72;       // circular node diameter
const ROADMAP_NODE_MARGIN = 40;  // margin from edge so circles don't hug the wall
const ROADMAP_COL_X: [number, number, number] = [
  ROADMAP_NODE_MARGIN + ROADMAP_NODE_W / 2,                      // col 0 left   ≈ 76
  ROADMAP_CONTENT_W - ROADMAP_NODE_MARGIN - ROADMAP_NODE_W / 2,  // col 1 right  ≈ 312
  ROADMAP_CONTENT_W / 2,                                          // col 2 center ≈ 194
];

function RoadmapConnector({ fromCol, toCol, color }: { fromCol: 0|1|2; toCol: 0|1|2; color: string }) {
  const H = 36;
  const LW = 4; // line width
  const MID = H / 2;
  const fx = ROADMAP_COL_X[fromCol];
  const tx = ROADMAP_COL_X[toCol];
  const minX = Math.min(fx, tx);
  const maxX = Math.max(fx, tx);
  const seg: React.ReactNode[] = [];
  const base: object = { position: "absolute" as const, backgroundColor: color, borderRadius: 2 };

  // Vertical down from previous node
  seg.push(<View key="v1" style={[base, { left: fx - LW / 2, top: 0,   width: LW, height: MID }]} />);
  // Horizontal across at midpoint (only if different columns)
  if (fx !== tx) {
    seg.push(<View key="h" style={[base, { left: minX, top: MID - LW / 2, width: maxX - minX + LW, height: LW }]} />);
  }
  // Vertical down to current node
  seg.push(<View key="v2" style={[base, { left: tx - LW / 2, top: MID, width: LW, height: MID }]} />);

  return <View style={{ height: H, width: ROADMAP_CONTENT_W, position: "relative" as const }}>{seg}</View>;
}

// ─── Living Chessboard Biome Zones ──────────────────────────────────────────

interface BiomeZone {
  id: string;
  label: string;
  rune: string;
  minRating: number;
  nodeColor: string;
  nodeBorder: string;
  solvedColor: string;
  solvedBorder: string;
  textColor: string;
  zoneGradient: string;
}

const biomeZones: BiomeZone[] = [
  { id: "pawn-meadows",    label: "Pawn Meadows",    rune: "🌱", minRating: 0,    nodeColor: "#7aad4f", nodeBorder: "#b6e072", solvedColor: "#a5cf47", solvedBorder: "#d7f285", textColor: "#172b0b", zoneGradient: "rgba(122,173,79,0.12)" },
  { id: "knights-grove",   label: "Knight's Grove",  rune: "🌿", minRating: 1000, nodeColor: "#5a9c3e", nodeBorder: "#9dd462", solvedColor: "#84c23a", solvedBorder: "#c2e87a", textColor: "#172b0b", zoneGradient: "rgba(90,156,62,0.15)" },
  { id: "bishops-hollow",  label: "Bishop's Hollow", rune: "🏚", minRating: 1200, nodeColor: "#b88643", nodeBorder: "#dfbd79", solvedColor: "#a5cf47", solvedBorder: "#d7f285", textColor: "#1a1000", zoneGradient: "rgba(184,134,67,0.12)" },
  { id: "rooks-stronghold",label: "Rook's Stronghold",rune: "🏰", minRating: 1500, nodeColor: "#6e7e8f", nodeBorder: "#a9bccf", solvedColor: "#a5cf47", solvedBorder: "#d7f285", textColor: "#0f1820", zoneGradient: "rgba(110,126,143,0.12)" },
  { id: "queens-domain",   label: "Queen's Domain",  rune: "👑", minRating: 1800, nodeColor: "#9b50c9", nodeBorder: "#d89eff", solvedColor: "#a5cf47", solvedBorder: "#d7f285", textColor: "#1a0030", zoneGradient: "rgba(155,80,201,0.12)" },
  { id: "kings-citadel",   label: "King's Citadel",  rune: "✨", minRating: 2200, nodeColor: "#c8a02a", nodeBorder: "#f0d670", solvedColor: "#ffe066", solvedBorder: "#ffffff", textColor: "#1a1000", zoneGradient: "rgba(200,160,42,0.15)" },
];

function biomeForRating(rating: number): BiomeZone {
  return [...biomeZones].reverse().find((z) => rating >= z.minRating) ?? biomeZones[0];
}

const BONUS_LABELS: Record<PuzzleBonus, string> = {
  speed: "⚡ Speed",
  streak: "🔥 Streak",
  flawless: "✨ Flawless",
  brilliant: "💎 Brilliant",
};

const BONUS_XP: Record<PuzzleBonus, number> = {
  speed: 5,
  streak: 3,
  flawless: 8,
  brilliant: 15,
};

const DIFFICULTY_LABELS: Record<PuzzleDifficultyMode, string> = {
  "standard": "Standard",
  "hard": "Hard",
  "extra-hard": "Extra Hard",
};

function computePerfScore(timeSec: number, hints: number, wrongs: number, puzzleRating: number): number {
  const threshold = Math.max(20, puzzleRating / 60);
  const timePenalty = Math.max(0, (timeSec - threshold) * 0.005);
  const hintPenalty = hints * 0.20;
  const wrongPenalty = wrongs * 0.12;
  return Math.max(0, Math.min(1, 1 - timePenalty - hintPenalty - wrongPenalty));
}

function computeRatingDeltaFromState(ratingState: PuzzleRatingState, puzzleRating: number, perfScore: number): number {
  const K = ratingState.ratingDeviation > 200 ? 40 : 20;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - ratingState.puzzleRating) / 400));
  return Math.round(K * (perfScore - expected));
}

function computeBonuses(timeSec: number, puzzleRating: number, hints: number, wrongs: number, streak: number): { bonuses: PuzzleBonus[]; bonusXp: number } {
  const threshold = Math.max(20, puzzleRating / 60);
  const isSpeed = timeSec < threshold * 0.5;
  const isFlawless = hints === 0 && wrongs === 0;
  const bonuses: PuzzleBonus[] = [];
  let bonusXp = 0;
  if (isSpeed && isFlawless) { bonuses.push("brilliant"); bonusXp += 15; }
  else if (isFlawless) { bonuses.push("flawless"); bonusXp += 8; }
  else if (isSpeed) { bonuses.push("speed"); bonusXp += 5; }
  if (streak >= 1 && !bonuses.includes("brilliant")) { bonuses.push("streak"); bonusXp += Math.min(streak + 1, 5); }
  return { bonuses, bonusXp };
}

// ─── WebAudioSynth ────────────────────────────────────────────────────────────

function getAudioUri(requireResult: any): string | null {
  if (!requireResult) return null;
  let uri: string | null = null;
  if (typeof requireResult === "string") {
    uri = requireResult;
  } else if (typeof requireResult === "number") {
    try {
      const asset = Asset.fromModule(requireResult);
      if (asset && asset.uri) uri = asset.uri;
    } catch (e) {}
    if (!uri) {
      try {
        const resolved = Image.resolveAssetSource(requireResult);
        if (resolved && resolved.uri) uri = resolved.uri;
      } catch (e) {}
    }
  } else if (typeof requireResult === "object") {
    if (requireResult.uri) {
      uri = requireResult.uri;
    } else if (requireResult.default && typeof requireResult.default === "string") {
      uri = requireResult.default;
    }
  }

  if (!uri) return null;

  // Make sure the URI is absolute/fully-qualified for browser Audio
  if (typeof window !== "undefined") {
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
      return uri;
    }
    if (uri.startsWith("/")) {
      return window.location.origin + uri;
    }
    const pathname = window.location.pathname;
    const base = pathname.substring(0, pathname.lastIndexOf("/") + 1);
    return window.location.origin + base + uri;
  }
  return uri;
}

class WebAudioSynth {
  public muted = false;
  private ctx: AudioContext | null = null;
  private initialized = false;

  private initCtx() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof window !== "undefined") {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch (e) {
          console.warn("Failed to create AudioContext:", e);
        }
      }
    }
  }

  playTap() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Web Audio tap failed", e);
    }
  }

  playAnswerCorrect() {
    if (this.muted) return;
    try {
      const uri = getAudioUri(require("../assets/answer-correct.mp3"));
      console.log("[Audio] playAnswerCorrect URI resolved to:", uri);
      if (uri && typeof Audio !== "undefined") {
        const audio = new Audio(uri);
        audio.volume = 0.6;
        audio.play().catch(e => {
          console.warn("[Audio] playAnswerCorrect play failed:", e);
        });
      } else {
        console.warn("[Audio] playAnswerCorrect could not resolve URI or Audio is undefined.");
      }
    } catch (e) {
      console.warn("[Audio] playAnswerCorrect failed", e);
    }
  }


  playStreak() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.22);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.start();
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn("Web Audio streak failed", e);
    }
  }

  playAchievementUnlocked() {
    if (this.muted) return;
    try {
      const uri = getAudioUri(require("../assets/achievement-unlocked.mp3"));
      console.log("[Audio] playAchievementUnlocked URI resolved to:", uri);
      if (uri && typeof Audio !== "undefined") {
        const audio = new Audio(uri);
        audio.volume = 0.6;
        audio.play().catch(e => {
          console.warn("[Audio] playAchievementUnlocked play failed:", e);
        });
      } else {
        console.warn("[Audio] playAchievementUnlocked could not resolve URI or Audio is undefined.");
      }
    } catch (e) {
      console.warn("[Audio] playAchievementUnlocked failed", e);
    }
  }

}

const puzzleSynth = new WebAudioSynth();

interface BoardParticle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

interface StreakParticle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
}

// ─── WoodJigsawBadge ──────────────────────────────────────────────────────────

function WoodJigsawBadge({ value }: { value: number | string }) {
  return (
    <View style={{ width: 38, height: 38, justifyContent: "center", alignItems: "center" }}>
      <Svg width="38" height="38" viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Path
          d="M 25,25 H 40 C 40,12 60,12 60,25 H 75 V 40 C 88,40 88,60 75,60 V 75 H 60 C 60,88 40,88 40,75 H 25 V 60 C 12,60 12,40 25,40 Z"
          fill="rgba(20, 184, 166, 0.20)"
          transform="translate(1, 3)"
        />
        <Path
          d="M 25,25 H 40 C 40,12 60,12 60,25 H 75 V 40 C 88,40 88,60 75,60 V 75 H 60 C 60,88 40,88 40,75 H 25 V 60 C 12,60 12,40 25,40 Z"
          fill="#b7e9ef"
        />
        <Path
          d="M 27,27 H 41 C 41,15 59,15 59,27 H 73 V 41 C 85,41 85,59 73,59 V 73 H 59 C 59,85 41,85 41,73 H 27 V 59 C 15,59 15,41 27,41 Z"
          fill="#ffffff"
        />
        <Path
          d="M 27,27 H 41 C 41,15 59,15 59,27 H 73"
          stroke="#5cc7d5"
          strokeWidth="2"
          fill="none"
        />
      </Svg>
      <Text style={{
        color: "#075569",
        fontSize: 15,
        fontWeight: "900",
        fontFamily: displayFontFamily,
        marginTop: 1,
      }}>{value}</Text>
    </View>
  );
}

function LearnScreen({
  data,
  services,
  onNavigate,
  snapshot,
  theme,
}: {
  data: DashboardData;
  services: ChessAliveServices;
  onNavigate: (screen: Screen) => void;
  snapshot: GameSnapshot | null;
  theme: BoardTheme;
}) {
  const [learnTab, setLearnTab] = useState<"puzzles" | "review">("puzzles");
  const learnTabMotion = useReplayEntrance(learnTab, { distance: 8, duration: 220 });
  const learnTabs: Array<{ id: "puzzles" | "review"; label: string; caption: string }> = [
    { id: "puzzles", label: "Puzzles", caption: "Tactics path" },
    { id: "review", label: "Game Review", caption: "WASM engine" },
  ];

  return (
    <View style={styles.learnExperience}>
      <View style={styles.learnSubtabBar}>
        {learnTabs.map((tab) => {
          const active = learnTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setLearnTab(tab.id)}
              style={({ pressed }) => [
                styles.learnSubtabButton,
                active && styles.learnSubtabButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.learnSubtabLabel, active && styles.learnSubtabLabelActive]}>{tab.label}</Text>
              <Text style={[styles.learnSubtabCaption, active && styles.learnSubtabCaptionActive]}>{tab.caption}</Text>
            </Pressable>
          );
        })}
      </View>
      <Animated.View key={learnTab} style={learnTabMotion}>
        {learnTab === "puzzles" ? (
          <PuzzlesScreen data={data} services={services} onNavigate={onNavigate} />
        ) : (
          <GameReviewScreen snapshot={snapshot} theme={theme} />
        )}
      </Animated.View>
    </View>
  );
}

// ─── PuzzlesScreen ────────────────────────────────────────────────────────────

function PuzzlesScreen({
  data,
  services,
  onNavigate,
}: {
  data: DashboardData;
  services: ChessAliveServices;
  onNavigate?: (screen: Screen) => void;
}) {
  const { width, height } = useWindowDimensions();
  const userId = data.user?.id ?? "guest";
  const avatarEmoji = data.user?.avatarEmoji ?? "♙";

  const initialPuzzles = data.puzzleRush.length ? data.puzzleRush : data.puzzle ? [data.puzzle] : [];
  const [pathPuzzles, setPathPuzzles] = useState<Puzzle[]>(initialPuzzles);
  const [activePuzzleId, setActivePuzzleId] = useState(initialPuzzles[0]?.id ?? "");
  const activePuzzle = pathPuzzles.find((p) => p.id === activePuzzleId) ?? pathPuzzles[0];
  const activeIndex = Math.max(0, pathPuzzles.findIndex((p) => p.id === activePuzzle?.id));

  // Rating state (loaded from localStorage)
  const [ratingState, setRatingState] = useState<PuzzleRatingState>(() => ({
    userId,
    puzzleRating: 800,
    ratingDeviation: 350,
    puzzlesSolved: 0,
    currentStreak: 0,
    bestStreak: 0,
    difficultyMode: "standard",
    calibrationComplete: false,
    totalBonusXp: 0,
  }));

  const [lastRatingDelta, setLastRatingDelta] = useState<number | null>(null);
  const [displayPuzzleRating, setDisplayPuzzleRating] = useState(ratingState.puzzleRating);

  // Board state
  const [puzzleSnapshot, setPuzzleSnapshot] = useState<GameSnapshot | null>(null);
  const [selectedPuzzleSquare, setSelectedPuzzleSquare] = useState<SquareName | null>(null);
  const [puzzleFeedback, setPuzzleFeedback] = useState("Find the forcing move.");

  // Per-attempt tracking
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongMoves, setWrongMoves] = useState(0);
  const [hintSquare, setHintSquare] = useState<SquareName | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solutionTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [solutionMoveIndex, setSolutionMoveIndex] = useState(0);
  const [hintToSquare, setHintToSquare] = useState<SquareName | null>(null);
  const [solutionPlaying, setSolutionPlaying] = useState(false);
  const [solutionDisplay, setSolutionDisplay] = useState<string[]>([]);

  // Celebration & Redesign Animation States
  const [celebPhase, setCelebPhase] = useState<"idle" | "correct" | "blooming" | "done">("idle");
  const [bloomingId, setBloomingId] = useState<string | null>(null);
  const [floatingText, setFloatingText] = useState<string | null>(null);
  const [floatingDelta, setFloatingDelta] = useState<number | null>(null);
  const [activeBonuses, setActiveBonuses] = useState<PuzzleBonus[]>([]);
  const [boardOverlay, setBoardOverlay] = useState<string | null>(null);
  const [avatarIndex, setAvatarIndex] = useState(0);
  
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const bloomAnim = useRef(new Animated.Value(1)).current;
  const avatarAnim = useRef(new Animated.Value(0)).current;
  const pawnJumpY = useRef(new Animated.Value(0)).current;
  const pawnJumpScale = useRef(new Animated.Value(1)).current;

  // New Dopamine Loops & Sound state variables
  const [winningSquare, setWinningSquare] = useState<SquareName | null>(null);
  const [boardParticles, setBoardParticles] = useState<BoardParticle[]>([]);
  const [streakParticles, setStreakParticles] = useState<StreakParticle[]>([]);
  const [xpFloatLabel, setXpFloatLabel] = useState("Perfect!");
  const [xpFloatAmount, setXpFloatAmount] = useState(240);

  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    puzzleSynth.muted = isMuted;
  }, [isMuted]);

  const dimOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const streakScale = useRef(new Animated.Value(1)).current;
  const xpFloatX = useRef(new Animated.Value(0)).current;
  const xpFloatY = useRef(new Animated.Value(0)).current;
  const xpFloatArc = useRef(new Animated.Value(0)).current;
  const xpFloatOpacity = useRef(new Animated.Value(0)).current;
  const xpFloatScale = useRef(new Animated.Value(0.5)).current;
  const ratingCountAnim = useRef(new Animated.Value(ratingState.puzzleRating)).current;
  const ratingCountListenerRef = useRef<string | null>(null);
  const ratingProgressAnim = useRef(new Animated.Value(0)).current;
  const glowAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const boardFrameRef = useRef<View>(null);
  const ratingTextRef = useRef<View>(null);
  const flightCoordsRef = useRef<{ x: number | null, y: number | null }>({ x: null, y: null });

  // Roadmap overlay — shown between puzzles after completion or give-up
  const [showRoadmap, setShowRoadmap] = useState(false);
  const nextPuzzleRef = useRef<Puzzle | null>(null);
  const roadmapScrollRef = useRef<ScrollView>(null);
  const nodeLayoutsRef = useRef<Record<string, number>>({});
  const pendingAvatarIndexRef = useRef<number | null>(null);
  const chessyBounce = useRef(new Animated.Value(1)).current;

  // Board sizing — measure the exact wrap area, fall back to window estimate on first render
  const CHESSY_W = 295;
  const isMobile = width < 768;
  const [boardWrapLayout, setBoardWrapLayout] = useState({ w: 0, h: 0 });
  const mobilePuzzleAvailableWidth = Math.max(260, width - 48);
  
  // Subtract frame offsets (total 36px) to keep layout proportional before measure
  const puzzleBoardSize = boardWrapLayout.w > 0
    ? Math.max(isMobile ? 260 : 300, Math.min(boardWrapLayout.w, boardWrapLayout.h))
    : Math.max(isMobile ? 260 : 300, Math.min(isMobile ? mobilePuzzleAvailableWidth : width - CHESSY_W - 86, height - (isMobile ? 300 : 210), 1000));
  
  const boardSizeToUse = Math.max(isMobile ? 240 : 280, puzzleBoardSize - 28);
  const puzzleExperienceMinH = width >= 1024 ? Math.max(680, height - 160) : Math.max(480, height - 220);

  // Rating bar calculation
  const sideToMove = activePuzzle?.sideToMove ?? puzzleSnapshot?.status.turn ?? "w";
  const currentBiome = biomeForRating(ratingState.puzzleRating);
  const nextBiome = biomeZones.find((z) => z.minRating > ratingState.puzzleRating);
  const biomeMin = currentBiome.minRating;
  const biomeMax = nextBiome?.minRating ?? biomeMin + 400;
  const biomeProgress = Math.min(1, Math.max(0, (ratingState.puzzleRating - biomeMin) / (biomeMax - biomeMin)));

  // Square Layout helper for particle explosions and glowing tile overlays
  function getSquareLayout(square: SquareName) {
    if (!square || !boardSizeToUse) return { left: 0, top: 0, width: 0, height: 0 };
    // clarity-ivory has 12px padding
    const padding = 12;
    const boardPixelSize = Math.max(1, boardSizeToUse - padding * 2);
    const squareSize = boardPixelSize / 8;
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const file = square[0];
    const rank = parseInt(square[1], 10);
    const colIndex = files.indexOf(file);

    const visualCol = sideToMove === "w" ? colIndex : 7 - colIndex;
    const visualRow = sideToMove === "w" ? 8 - rank : rank - 1;

    return {
      left: padding + visualCol * squareSize,
      top: padding + visualRow * squareSize,
      width: squareSize,
      height: squareSize,
    };
  }

  // Load rating from localStorage on mount
  useEffect(() => {
    void services.puzzles.getRatingState(userId).then((state) => {
      setRatingState(state);
      setDisplayPuzzleRating(state.puzzleRating);
      ratingCountAnim.setValue(state.puzzleRating);
      setAvatarIndex(Math.min(state.puzzlesSolved, pathPuzzles.length - 1));
      
      const biome = biomeForRating(state.puzzleRating);
      const nextZone = biomeZones.find((z) => z.minRating > state.puzzleRating);
      const minR = biome.minRating;
      const maxR = nextZone?.minRating ?? minR + 400;
      const initProg = Math.min(1, Math.max(0, (state.puzzleRating - minR) / (maxR - minR)));
      ratingProgressAnim.setValue(initProg);
    });
  }, [userId]);

  useEffect(() => {
    return () => {
      if (ratingCountListenerRef.current) {
        ratingCountAnim.removeListener(ratingCountListenerRef.current);
        ratingCountListenerRef.current = null;
      }
    };
  }, []);

  // Smoothly animate biome progress when rating changes
  useEffect(() => {
    Animated.timing(ratingProgressAnim, {
      toValue: biomeProgress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [biomeProgress]);

  // When roadmap opens: scroll to CURRENT pawn node, then play jump to next node
  useEffect(() => {
    if (!showRoadmap) return;
    const fromIndex = avatarIndex;            // old position (pawn is still here)
    const fromId = pathPuzzles[fromIndex]?.id;
    if (!fromId) return;

    const t = setTimeout(() => {
      // Step 1 — scroll so the current pawn node is in view
      const y = nodeLayoutsRef.current[fromId] ?? 0;
      roadmapScrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });

      // Step 2 — after scroll settles, run the jump animation if a move is staged
      setTimeout(() => {
        const pending = pendingAvatarIndexRef.current;
        if (pending === null || pending === fromIndex) return; // give-up / already at target

        // Launch pawn upward from old node
        pawnJumpY.setValue(0);
        pawnJumpScale.setValue(1);
        Animated.parallel([
          Animated.timing(pawnJumpY,    { toValue: -56, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pawnJumpScale, { toValue: 1.4,  duration: 200, useNativeDriver: true }),
        ]).start(() => {
          // Move pawn to new node — it starts high, then springs down
          setAvatarIndex(pending);
          pendingAvatarIndexRef.current = null;
          pawnJumpY.setValue(-56);
          pawnJumpScale.setValue(1.4);
          Animated.parallel([
            Animated.spring(pawnJumpY,    { toValue: 0, friction: 5, tension: 130, useNativeDriver: true }),
            Animated.spring(pawnJumpScale, { toValue: 1, friction: 5, tension: 130, useNativeDriver: true }),
          ]).start(({ finished }) => {
            // Snap to exact zero once spring settles — avoids floating-point drift
            if (finished) { pawnJumpY.setValue(0); pawnJumpScale.setValue(1); }
          });
        });
      }, 500); // scroll takes ~300ms; 500ms gives it room to settle
    }, 150); // wait for roadmap layout to complete

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoadmap]);

  // When active puzzle changes: reset board + start timer
  useEffect(() => {
    if (!activePuzzle) return;
    const engine = createChessEngine(activePuzzle.fen);
    setPuzzleSnapshot(engine.snapshot());
    setSelectedPuzzleSquare(null);
    setHintSquare(null);
    setPuzzleFeedback(activePuzzle.goal);
    setHintsUsed(0);
    setWrongMoves(0);
    setSolutionMoveIndex(0);
    setHintToSquare(null);
    setSolutionPlaying(false);
    setSolutionDisplay([]);
    setCelebPhase("idle");
    setFloatingText(null);
    setFloatingDelta(null);
    setBoardOverlay(null);
    setLastRatingDelta(null);

    // Clear any active solution playback timeouts
    solutionTimeoutsRef.current.forEach((t) => clearTimeout(t));
    solutionTimeoutsRef.current = [];

    // Cleanup loops / animations
    if (glowAnimRef.current) {
      glowAnimRef.current.stop();
      glowAnimRef.current = null;
    }
    setWinningSquare(null);
    setBoardParticles([]);
    setStreakParticles([]);
    dimOpacity.setValue(0);
    glowScale.setValue(0.6);
    glowOpacity.setValue(0);
    xpFloatX.setValue(0);
    xpFloatY.setValue(0);
    xpFloatArc.setValue(0);
    xpFloatOpacity.setValue(0);
    streakScale.setValue(1);

    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - now) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activePuzzle?.id]);

  function formatTimer(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function animatePuzzleRatingCount(fromValue: number, toValue: number) {
    if (ratingCountListenerRef.current) {
      ratingCountAnim.removeListener(ratingCountListenerRef.current);
      ratingCountListenerRef.current = null;
    }
    ratingCountAnim.setValue(fromValue);
    setDisplayPuzzleRating(fromValue);
    ratingCountListenerRef.current = ratingCountAnim.addListener(({ value }) => {
      setDisplayPuzzleRating(Math.round(value));
    });
    Animated.timing(ratingCountAnim, {
      toValue,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setDisplayPuzzleRating(toValue);
      if (ratingCountListenerRef.current) {
        ratingCountAnim.removeListener(ratingCountListenerRef.current);
        ratingCountListenerRef.current = null;
      }
    });
  }

  async function finishAttempt(solved: boolean, currentHints: number, currentWrongs: number) {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!activePuzzle) return;

    const timeSec = Math.floor((Date.now() - startTime) / 1000);
    const perfScore = solved ? computePerfScore(timeSec, currentHints, currentWrongs, activePuzzle.rating) : 0;
    const delta = computeRatingDeltaFromState(ratingState, activePuzzle.rating, perfScore);
    const { bonuses, bonusXp } = solved ? computeBonuses(timeSec, activePuzzle.rating, currentHints, currentWrongs, ratingState.currentStreak) : { bonuses: [] as PuzzleBonus[], bonusXp: 0 };

    const newRating = Math.max(400, ratingState.puzzleRating + delta);
    const newRD = Math.max(80, ratingState.ratingDeviation * 0.95);
    const newStreak = solved ? ratingState.currentStreak + 1 : 0;
    const newState: PuzzleRatingState = {
      ...ratingState,
      puzzleRating: newRating,
      ratingDeviation: newRD,
      puzzlesSolved: ratingState.puzzlesSolved + (solved ? 1 : 0),
      currentStreak: newStreak,
      bestStreak: Math.max(ratingState.bestStreak, newStreak),
      calibrationComplete: newRD <= 200,
      totalBonusXp: ratingState.totalBonusXp + bonusXp,
    };
    if (!solved) {
      setRatingState(newState);
      setDisplayPuzzleRating(newState.puzzleRating);
      ratingCountAnim.setValue(newState.puzzleRating);
      void services.puzzles.saveRatingState(newState);
    }

    const attempt: PuzzleAttempt = {
      puzzleId: activePuzzle.id,
      userId,
      startedAt: startTime,
      solvedAt: solved ? Date.now() : null,
      timeTakenSeconds: timeSec,
      hintsUsed: currentHints,
      wrongMoves: currentWrongs,
      outcome: solved ? "solved" : "gave-up",
      ratingBefore: ratingState.puzzleRating,
      ratingAfter: newRating,
      ratingDelta: delta,
      bonuses,
      bonusXp,
      performanceScore: perfScore,
    };
    void services.puzzles.recordAttempt(attempt);

    return {
      delta,
      bonuses,
      bonusXp,
      streakIncreased: solved && (newStreak > ratingState.currentStreak),
      xpGained: solved ? (200 + bonusXp * 5) : 0,
      newState
    };
  }

  function runCelebrationSequence(
    delta: number,
    bonuses: PuzzleBonus[],
    levelIndex: number,
    targetSquare: SquareName,
    xpGained: number,
    streakIncreased: boolean,
    newState: PuzzleRatingState
  ) {
    flightCoordsRef.current = { x: null, y: null };
    setLastRatingDelta(delta);

    const boardFrame = boardFrameRef.current;
    const ratingText = ratingTextRef.current;
    if (boardFrame && ratingText) {
      boardFrame.measure((fx, fy, fw, fh, fpx, fpy) => {
        ratingText.measure((tx, ty, tw, th, tpx, tpy) => {
          if (typeof fpx === "number" && typeof tpx === "number" && !isNaN(fpx) && !isNaN(tpx)) {
            const relTargetX = (tpx + tw / 2) - fpx;
            const relTargetY = (tpy + th / 2) - fpy;
            flightCoordsRef.current = {
              x: relTargetX - fw / 2,
              y: relTargetY - fh / 2
            };
          }
        });
      });
    }

    // ─── STAGE 1: Solve success (0ms - 1200ms) ───
    puzzleSynth.playAnswerCorrect();

    setWinningSquare(targetSquare);

    // Board dim overlay
    dimOpacity.setValue(0);
    Animated.timing(dimOpacity, {
      toValue: 0.55,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Target square radiating glow ripple loop
    glowScale.setValue(0.6);
    glowOpacity.setValue(0.8);
    if (glowAnimRef.current) glowAnimRef.current.stop();
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.3, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.timing(glowScale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
      ])
    );
    glowAnimRef.current = glowAnim;
    glowAnim.start();

    // Generate board particles explosion
    const layout = getSquareLayout(targetSquare);
    const padding = 12;
    const boardPixelSize = Math.max(1, boardSizeToUse - padding * 2);
    const sqSize = boardPixelSize / 8;
    const cX = layout.left + sqSize / 2;
    const cY = layout.top + sqSize / 2;

    const colors = ["#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f43f5e"];
    const newBoardParticles: BoardParticle[] = [];
    for (let i = 0; i < 18; i++) {
      const pId = `bp_${Date.now()}_${i}_${Math.random()}`;
      const px = new Animated.Value(0);
      const py = new Animated.Value(0);
      const pOpacity = new Animated.Value(1);
      const pScale = new Animated.Value(0.4 + Math.random() * 0.6);
      
      const theta = (i * 2 * Math.PI) / 18 + (Math.random() - 0.5) * 0.2;
      const distance = 30 + Math.random() * 45;
      const destX = Math.cos(theta) * distance;
      const destY = Math.sin(theta) * distance;

      newBoardParticles.push({
        id: pId,
        x: px,
        y: py,
        opacity: pOpacity,
        scale: pScale,
        color: colors[i % colors.length]
      });

      Animated.parallel([
        Animated.timing(px, { toValue: destX, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(py, { toValue: destY, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        Animated.timing(pScale, { toValue: 1.2, duration: 900, useNativeDriver: true })
      ]).start();
    }
    setBoardParticles(newBoardParticles);

    // ─── STAGE 2: XP Card Flight & Landing (starts at 1200ms) ───
    setTimeout(() => {
      const labels = ["Brilliant!", "Perfect!", "Excellent Move", "Great Solve!", "Fantastic!"];
      const randomLabel = labels[Math.floor(Math.random() * labels.length)];
      setXpFloatLabel(randomLabel);
      setXpFloatAmount(xpGained);

      // Reset values
      xpFloatX.setValue(0);
      xpFloatY.setValue(40);
      xpFloatArc.setValue(0);
      xpFloatOpacity.setValue(0);
      xpFloatScale.setValue(0.5);

      // Appear animation
      Animated.parallel([
        Animated.timing(xpFloatY, { toValue: 0, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(xpFloatOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(xpFloatScale, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start(() => {
        // Hold card in center for 600ms, then fly it to points section
        setTimeout(() => {
          // Dynamic destination coordinates (measured vs. fallback)
          const fallbackX = isMobile ? (width / 2 - 45) : (boardSizeToUse / 2 + 220);
          const fallbackY = isMobile ? (boardSizeToUse / 2 + 115) : -150;

          const destXVal = flightCoordsRef.current.x !== null ? flightCoordsRef.current.x : fallbackX;
          const destYVal = flightCoordsRef.current.y !== null ? flightCoordsRef.current.y : fallbackY;
          const arcPeak = Math.min(-120, destYVal - 80);

          Animated.parallel([
            Animated.timing(xpFloatX, { toValue: destXVal, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(xpFloatY, { toValue: destYVal, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(xpFloatArc, { toValue: arcPeak, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(xpFloatArc, { toValue: 0, duration: 390, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.timing(xpFloatScale, { toValue: 0.25, duration: 750, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(450),
              Animated.timing(xpFloatOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
          ]).start(() => {
            // Landing moment!
            // Stage 2: Silent (no sound played)

            // Apply rating state updates to trigger progress bar fill animation
            animatePuzzleRatingCount(ratingState.puzzleRating, newState.puzzleRating);
            setRatingState(newState);
            void services.puzzles.saveRatingState(newState);

            // Trigger "That's right! ✓" delta badge
            setFloatingText("That's right! ✓");
            setFloatingDelta(delta);
            setActiveBonuses(bonuses);
            setCelebPhase("correct");
            floatAnim.setValue(0);
            floatOpacity.setValue(1);
            Animated.parallel([
              Animated.timing(floatAnim, { toValue: -60, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.sequence([
                Animated.delay(400),
                Animated.timing(floatOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
              ]),
            ]).start();

            // Bloom node
            setBloomingId(activePuzzle?.id ?? null);
            setCelebPhase("blooming");
            bloomAnim.setValue(1);
            Animated.sequence([
              Animated.timing(bloomAnim, { toValue: 1.22, duration: 280, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
              Animated.timing(bloomAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();

            // Level complete overlay
            setBoardOverlay(`You Bloomed Level ${levelIndex + 1}! 🌸`);
            overlayOpacity.setValue(0);
            Animated.sequence([
              Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.delay(900),
              Animated.timing(overlayOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start(() => setBoardOverlay(null));

            // Stage pawn advance & roadmap prefetch
            pendingAvatarIndexRef.current = Math.min(avatarIndex + 1, pathPuzzles.length - 1);

            const solvedIds = new Set(solvedPuzzleIds).add(activePuzzle?.id ?? "");
            void services.puzzles.getNextPuzzle(
              newState.puzzleRating,
              newState.difficultyMode,
              [...solvedIds],
            ).then((next) => {
              nextPuzzleRef.current = next;
              if (next && !pathPuzzles.find((p) => p.id === next.id)) {
                setPathPuzzles((prev) => [...prev, next]);
              }
            });

            // ─── STAGE 3: Streak Badge Celebration (starts at landing + 400ms) ───
            setTimeout(() => {
              if (streakIncreased) {
                // Play streak victory sound
                puzzleSynth.playAchievementUnlocked();

                const newStreakParticles: StreakParticle[] = [];
                for (let i = 0; i < 8; i++) {
                  const sId = `sp_${Date.now()}_${i}_${Math.random()}`;
                  const sx = new Animated.Value(0);
                  const sy = new Animated.Value(0);
                  const sOpacity = new Animated.Value(1);
                  const sScale = new Animated.Value(0.4 + Math.random() * 0.6);

                  const dX = (Math.random() - 0.5) * 40;
                  const dY = -35 - Math.random() * 35;

                  newStreakParticles.push({
                    id: sId,
                    x: sx,
                    y: sy,
                    opacity: sOpacity,
                    scale: sScale
                  });

                  Animated.parallel([
                    Animated.timing(sx, { toValue: dX, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(sy, { toValue: dY, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(sOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
                    Animated.timing(sScale, { toValue: 0.1, duration: 1000, useNativeDriver: true })
                  ]).start();
                }
                setStreakParticles(newStreakParticles);

                // Spring pulse the streak badge
                streakScale.setValue(1);
                Animated.sequence([
                  Animated.spring(streakScale, { toValue: 1.35, friction: 3, tension: 40, useNativeDriver: true }),
                  Animated.spring(streakScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
                ]).start();
              }

              // Finally transition to roadmap overlay
              setTimeout(() => {
                setCelebPhase("done");
                setSolutionMoveIndex(0);
                setSolvedPuzzleIds(solvedIds);
                setShowRoadmap(true);
              }, streakIncreased ? 1200 : 400);

            }, 400);

          });
        }, 600);
      });
    }, 1200);
  }

  function handlePuzzleSquare(square: SquareName) {
    if (!puzzleSnapshot || !activePuzzle || celebPhase !== "idle") return;
    const cell = puzzleSnapshot.board.find((item) => item.square === square);

    if (selectedPuzzleSquare && puzzleSnapshot.legalMoves[selectedPuzzleSquare]?.includes(square)) {
      const engine = createChessEngine(puzzleSnapshot.fen);
      const move = engine.move({ from: selectedPuzzleSquare, to: square });
      if (!move) {
        setPuzzleFeedback("That move is illegal. Try again.");
        setSelectedPuzzleSquare(null);
        setWrongMoves((w) => w + 1);
        return;
      }
      setHintSquare(null);
      puzzleSynth.playTap();

      // Check this move against the expected move at the current solution index.
      const expectedLan = activePuzzle.solutionLan?.[solutionMoveIndex];
      const expectedSan = activePuzzle.solution[solutionMoveIndex];
      const isCorrect = (expectedLan && move.lan === expectedLan) ||
                        (expectedSan && move.san === expectedSan);

      if (isCorrect) {
        const nextIdx = solutionMoveIndex + 1;
        const isLastMove = nextIdx >= activePuzzle.solution.length;

        if (isLastMove) {
          // Puzzle fully solved
          setPuzzleSnapshot(engine.snapshot());
          setPuzzleFeedback("Excellent! ✓");
          const currentWrongs = wrongMoves;
          const currentHints = hintsUsed;
          void finishAttempt(true, currentHints, currentWrongs).then((result) => {
            if (result) runCelebrationSequence(result.delta, result.bonuses, activeIndex, square, result.xpGained, result.streakIncreased, result.newState);
          });
        } else {
          // More moves remain — play the opponent's response automatically
          const opponentLan = activePuzzle.solutionLan?.[nextIdx];
          const opponentSan = activePuzzle.solution[nextIdx];
          if (opponentLan) {
            const oppMove = engine.move({
              from: opponentLan.slice(0, 2) as SquareName,
              to: opponentLan.slice(2, 4) as SquareName,
              promotion: opponentLan[4] as "q" | "r" | "b" | "n" | undefined,
            });
            if (oppMove) {
              setPuzzleSnapshot(engine.snapshot());
              setPuzzleFeedback(`Good — now find the continuation after ${oppMove.san}.`);
              puzzleSynth.playTap();
            }
          } else if (opponentSan) {
            // SAN only fallback
            const legalMoves = Object.entries(engine.snapshot().legalMoves).flatMap(([from, tos]) =>
              tos.map((to) => ({ from: from as SquareName, to }))
            );
            for (const lm of legalMoves) {
              const tryEngine = createChessEngine(engine.snapshot().fen);
              const tryMove = tryEngine.move(lm);
              if (tryMove?.san === opponentSan) {
                setPuzzleSnapshot(tryEngine.snapshot());
                setPuzzleFeedback(`Good — now find the continuation after ${opponentSan}.`);
                puzzleSynth.playTap();
                break;
              }
            }
          }
          setSolutionMoveIndex(nextIdx + 1); // skip over opponent's move
        }
      } else {
        // Capture the FEN before the wrong move so we can revert to it
        const fenBeforeWrong = puzzleSnapshot.fen;
        const newWrongs = wrongMoves + 1;
        setWrongMoves(newWrongs);
        setPuzzleSnapshot(engine.snapshot()); // flash the wrong move briefly
        setPuzzleFeedback(`${move.san} is not the key move. Look for ${activePuzzle.motif ?? "a forcing move"}.`);
        // Revert back to the position the player was at
        setTimeout(() => {
          setPuzzleSnapshot(createChessEngine(fenBeforeWrong).snapshot());
        }, 800);
      }
      setSelectedPuzzleSquare(null);
      return;
    }

    if (cell?.piece && cell.piece.color === puzzleSnapshot.status.turn) {
      setSelectedPuzzleSquare(square);
      setPuzzleFeedback(`${square.toUpperCase()} selected — find the tactic.`);
      return;
    }
    setSelectedPuzzleSquare(null);
  }

  function handleHint() {
    if (!activePuzzle || !puzzleSnapshot || celebPhase !== "idle" || solutionPlaying) return;
    const lan = activePuzzle.solutionLan?.[solutionMoveIndex];
    if (lan && lan.length >= 4) {
      const fromSq = lan.slice(0, 2) as SquareName;
      const toSq = lan.slice(2, 4) as SquareName;
      setHintSquare(fromSq);
      setHintToSquare(toSq);
      setSelectedPuzzleSquare(fromSq);
      const san = activePuzzle.solution[solutionMoveIndex] ?? "";
      setPuzzleFeedback(`💡 Move from ${fromSq.toUpperCase()} → ${toSq.toUpperCase()}${san ? ` (${san})` : ""}`);
    } else {
      const san = activePuzzle.solution[solutionMoveIndex];
      if (san) setPuzzleFeedback(`💡 The best move is ${san}.`);
    }
    setHintsUsed((h) => h + 1);
  }

  async function handleGiveUp() {
    if (!activePuzzle || celebPhase !== "idle" || solutionPlaying) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    await finishAttempt(false, hintsUsed, wrongMoves);

    // Play synthesized sweep / failure
    puzzleSynth.playStreak(); // sweep down/failure hint

    // Auto-play the entire solution move by move
    setSolutionPlaying(true);
    setHintSquare(null);
    setHintToSquare(null);
    setSelectedPuzzleSquare(null);

    // Clear any existing solution timeouts
    solutionTimeoutsRef.current.forEach((t) => clearTimeout(t));
    solutionTimeoutsRef.current = [];

    const lans = activePuzzle.solutionLan ?? [];
    const sans = activePuzzle.solution;
    const sanLabels: string[] = [];

    const engine = createChessEngine(activePuzzle.fen);

    for (let i = 0; i < lans.length; i++) {
      const lan = lans[i];
      const san = sans[i] ?? lan;
      const delay = 600 + i * 900;
      const tId = setTimeout(() => {
        const result = engine.move({
          from: lan.slice(0, 2) as SquareName,
          to: lan.slice(2, 4) as SquareName,
          promotion: lan[4] as "q" | "r" | "b" | "n" | undefined,
        });
        if (result) {
          sanLabels.push(san);
          setPuzzleSnapshot(engine.snapshot());
          setSolutionDisplay([...sanLabels]);
          puzzleSynth.playTap();
          const isLast = i === lans.length - 1;
          setPuzzleFeedback(
            isLast
              ? `Solution: ${sanLabels.join(" → ")}. Study it and try the next puzzle.`
              : `Playing solution: ${san}…`
          );
          if (isLast) {
            setSolutionPlaying(false);
            solutionTimeoutsRef.current = [];
            setTimeout(() => {
              void services.puzzles.getNextPuzzle(ratingState.puzzleRating, ratingState.difficultyMode, [...solvedPuzzleIds]).then((next) => {
                nextPuzzleRef.current = next ?? null;
                if (next && !pathPuzzles.find((p) => p.id === next.id)) setPathPuzzles((prev) => [...prev, next]);
              });
            }, 200);
            setTimeout(() => setShowRoadmap(true), 1800);
          }
        }
      }, delay);
      solutionTimeoutsRef.current.push(tId);
    }

    if (lans.length === 0) {
      const solutionStr = sans.join(" → ");
      setPuzzleFeedback(`Solution: ${solutionStr}. Study it!`);
      setSolutionDisplay(sans);
      setSolutionPlaying(false);
      void services.puzzles.getNextPuzzle(ratingState.puzzleRating, ratingState.difficultyMode, [...solvedPuzzleIds]).then((next) => {
        nextPuzzleRef.current = next ?? null;
        if (next && !pathPuzzles.find((p) => p.id === next.id)) setPathPuzzles((prev) => [...prev, next]);
      });
      setTimeout(() => setShowRoadmap(true), 1600);
    }
  }

  function handleReplay() {
    if (!activePuzzle) return;
    puzzleSynth.playTap();
    
    // Clear any active solution playback timeouts
    solutionTimeoutsRef.current.forEach((t) => clearTimeout(t));
    solutionTimeoutsRef.current = [];

    const engine = createChessEngine(activePuzzle.fen);
    setPuzzleSnapshot(engine.snapshot());
    setSelectedPuzzleSquare(null);
    setHintSquare(null);
    setPuzzleFeedback(activePuzzle.goal);
    setHintsUsed(0);
    setWrongMoves(0);
    setSolutionMoveIndex(0);
    setHintToSquare(null);
    setSolutionPlaying(false);
    setSolutionDisplay([]);
    setCelebPhase("idle");
    setFloatingText(null);
    setFloatingDelta(null);
    setBoardOverlay(null);
    setLastRatingDelta(null);
    
    if (glowAnimRef.current) {
      glowAnimRef.current.stop();
      glowAnimRef.current = null;
    }
    setWinningSquare(null);
    setBoardParticles([]);
    setStreakParticles([]);
    dimOpacity.setValue(0);
    glowScale.setValue(0.6);
    glowOpacity.setValue(0);
    xpFloatX.setValue(0);
    xpFloatY.setValue(0);
    xpFloatArc.setValue(0);
    xpFloatOpacity.setValue(0);
    streakScale.setValue(1);
    
    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - now) / 1000));
    }, 1000);
  }


  function handleContinue() {
    setShowRoadmap(false);
    pawnJumpY.setValue(0);
    pawnJumpScale.setValue(1);
    const next = nextPuzzleRef.current;
    nextPuzzleRef.current = null;
    if (next) {
      setActivePuzzleId(next.id);
    } else {
      const fallback = pathPuzzles[(activeIndex + 1) % pathPuzzles.length];
      if (fallback) setActivePuzzleId(fallback.id);
    }
  }

  function handlePrevPuzzle() {
    if (activeIndex > 0) {
      setActivePuzzleId(pathPuzzles[activeIndex - 1].id);
    }
  }

  function handleNextPuzzle() {
    if (activeIndex < pathPuzzles.length - 1) {
      setActivePuzzleId(pathPuzzles[activeIndex + 1].id);
    }
  }

  const solvedCount = solvedPuzzleIds.size;
  const feedbackPhase: "idle" | "correct" | "wrong" | "hint" | "solution" =
    celebPhase === "correct" || celebPhase === "blooming" ? "correct"
    : solutionPlaying ? "solution"
    : solutionDisplay.length > 0 && celebPhase === "idle" ? "solution"
    : puzzleFeedback.startsWith("💡") ? "hint"
    : puzzleFeedback.includes("not the key move") || puzzleFeedback.includes("illegal") ? "wrong"
    : "idle";

  const category = (activePuzzle as any)?.category ?? "winning-material";
  const categoryMeta: Record<string, { icon: string; label: string; color: string }> = {
    checkmate:          { icon: "👑", label: "Checkmate",     color: "#fbbf24" },
    "winning-material": { icon: "⚔️", label: "Win Material",  color: "#60a5fa" },
    promotion:          { icon: "🎖️", label: "Promotion",     color: "#a78bfa" },
    draw:               { icon: "🤝", label: "Save Draw",     color: "#34d399" },
  };
  const catInfo = categoryMeta[category] ?? { icon: "♟️", label: "Tactics", color: "#94a3b8" };

  const playerMoveCount = Math.ceil((activePuzzle?.solution.length ?? 1) / 2);
  const moveCountLabel = playerMoveCount === 1 ? "in 1 move"
    : playerMoveCount === 2 ? "in 2 moves"
    : `in ${playerMoveCount} moves`;
  const puzzleExplanation = activePuzzle?.goal && activePuzzle.goal.length > 10
    ? activePuzzle.goal
    : category === "checkmate"   ? `Trap the opponent's king and deliver checkmate ${moveCountLabel}.`
    : category === "promotion"   ? `Advance your pawn to the last rank and promote it ${moveCountLabel}.`
    : category === "draw"        ? `Your position looks lost — but you can force a draw ${moveCountLabel}.`
    : `Find the winning tactic that wins material ${moveCountLabel}.`;

  type ChessyMood = "idle" | "correct" | "wrong" | "hint" | "solution";
  const chessyMood: ChessyMood =
    feedbackPhase === "correct"  ? "correct"
    : feedbackPhase === "wrong"  ? "wrong"
    : feedbackPhase === "hint"   ? "hint"
    : feedbackPhase === "solution" ? "solution"
    : "idle";

  const moodColor =
    chessyMood === "correct" ? "#10b981"
    : chessyMood === "wrong" ? "#f43f5e"
    : chessyMood === "hint" ? "#818cf8"
    : chessyMood === "solution" ? "#fbbf24"
    : "#c7d2fe";

  const chessySpeechMap: Record<ChessyMood, { title: string; body: string; bg: string; titleColor: string }> = {
    idle: {
      title: `${sideToMove === "w" ? "White" : "Black"} to move`,
      body: (activePuzzle as any)?.question ?? puzzleExplanation,
      bg: "rgba(22, 27, 48, 0.65)",
      titleColor: "#a5b4fc",
    },
    correct: { title: "Brilliant! ⚡", body: "That's the move! Keep going!", bg: "rgba(16, 185, 129, 0.15)", titleColor: "#34d399" },
    wrong:   { title: "Not quite! 😤", body: `That's not the key move. Look for the ${activePuzzle?.motif ?? "forcing move"}.`, bg: "rgba(244, 63, 94, 0.15)", titleColor: "#fb7185" },
    hint:    { title: "Here's your clue! 💡", body: puzzleFeedback.replace("💡 ", ""), bg: "rgba(129, 140, 248, 0.15)", titleColor: "#a5b4fc" },
    solution:{ title: "Let me show you! 📖", body: `The solution is ${playerMoveCount === 1 ? "just one move" : `${playerMoveCount} moves`}. Watch carefully.`, bg: "rgba(251, 191, 36, 0.15)", titleColor: "#fbbf24" },
  };
  const chessy = chessySpeechMap[chessyMood];

  const fillWidth = ratingProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  if (!activePuzzle) {
    return (
      <View style={[styles.puzzleExperience, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: aiInk, fontSize: 18, fontFamily: appFontFamily, fontWeight: "600" }}>Loading puzzles…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.puzzleExperience, { flexDirection: isMobile ? "column" : "row", minHeight: isMobile ? undefined : puzzleExperienceMinH, gap: isMobile ? 20 : spacing.md }]}>

      {/* ══════════════════════════ BOARD PANEL ══════════════════════════ */}
      <View style={[
        styles.puzzleBoardPanel,
        isMobile && { flex: undefined, minWidth: 0, width: "100%" },
        celebPhase !== "idle" && { position: "relative", zIndex: 50 }
      ]}>

        {/* ── Compact header ── */}
        <View style={styles.puzzleCompactHeader}>
          <View style={[styles.puzzleSideDot, { backgroundColor: sideToMove === "w" ? "#f0f0e8" : "#2a2a2a", borderColor: sideToMove === "w" ? "#bbb" : "#555" }]} />
          <Text style={styles.puzzleSideLabel}>{sideToMove === "w" ? "White" : "Black"} to play</Text>
          <View style={[styles.puzzleCategoryBadge, { backgroundColor: catInfo.color + "22", borderColor: catInfo.color + "66" }]}>
            <Text style={[styles.puzzleCategoryText, { color: catInfo.color }]}>{catInfo.label}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.puzzleTimerChip}>
            <Text style={styles.puzzleTimerText}>{formatTimer(elapsedSeconds)}</Text>
          </View>
        </View>

        {/* ── Chess board wrap ── */}
        <View
          style={[styles.puzzleBoardWrap, { flex: 1 }]}
          onLayout={e => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setBoardWrapLayout(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
          }}
        >
          {/* Walnut wood outer frame */}
          <View ref={boardFrameRef} style={[styles.puzzleBoardWalnutFrame, { width: boardSizeToUse + 28, height: boardSizeToUse + 28 }]}>
            
            {/* Bevel inside wood border */}
            <View style={styles.puzzleBoardInnerBevel}>
              
              {puzzleSnapshot ? (
	                <ChessBoard
	                  activeCeremony={null}
	                  snapshot={puzzleSnapshot}
                  selected={selectedPuzzleSquare}
                  premoves={[]}
                  onPressSquare={celebPhase === "idle" && !solutionPlaying ? handlePuzzleSquare : () => {}}
                  onDropPiece={(from, to) => {
                    if (celebPhase !== "idle" || solutionPlaying) return;
                    setSelectedPuzzleSquare(from);
                    handlePuzzleSquare(to);
                  }}
                  playerColor={sideToMove}
                  theme={boardThemes.find((t) => t.id === "clarity-ivory") ?? boardThemes[0]}
                  activeEffect={null}
                  size={boardSizeToUse}
                />
              ) : (
                <View style={{ width: boardSizeToUse, height: boardSizeToUse, backgroundColor: "#1e2d1e", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#6b8f6b", fontSize: 14 }}>Loading board…</Text>
                </View>
              )}

              {/* Absolute Animation overlays inside the board area */}
              
              {/* Board dim overlay */}
              <Animated.View
                style={[
                  styles.puzzleBoardDimOverlay,
                  {
                    opacity: dimOpacity,
                    width: boardSizeToUse,
                    height: boardSizeToUse,
                  }
                ]}
                pointerEvents="none"
              />

              {/* Winning Square Glow */}
              {winningSquare && (() => {
                const sqLayout = getSquareLayout(winningSquare);
                return (
                  <Animated.View
                    style={[
                      styles.puzzleWinningSquareGlow,
                      {
                        left: sqLayout.left,
                        top: sqLayout.top,
                        width: sqLayout.width,
                        height: sqLayout.height,
                        transform: [{ scale: glowScale }],
                        opacity: glowOpacity,
                      }
                    ]}
                    pointerEvents="none"
                  />
                );
              })()}

            </View>

            {/* Particles Explosion */}
            {boardParticles.map((p) => {
              const layout = getSquareLayout(winningSquare!);
              const cX = layout.left + layout.width / 2;
              const cY = layout.top + layout.height / 2;
              return (
                <Animated.View
                  key={p.id}
                  style={[
                    styles.puzzleParticle,
                    {
                      left: cX - 4 + 19, // Adjusted by +19px offset for frame alignment
                      top: cY - 4 + 19,  // Adjusted by +19px offset for frame alignment
                      backgroundColor: p.color,
                      transform: [
                        { translateX: p.x },
                        { translateY: p.y },
                        { scale: p.scale }
                      ],
                      opacity: p.opacity,
                    }
                  ]}
                  pointerEvents="none"
                />
              );
            })}

            {/* Floating XP Card */}
            <Animated.View
              style={[
                styles.puzzleFloatingXpCard,
                {
                  transform: [
                    { translateX: xpFloatX },
                    { translateY: Animated.add(xpFloatY, xpFloatArc) },
                    { scale: xpFloatScale }
                  ],
                  opacity: xpFloatOpacity,
                  left: (boardSizeToUse + 28 - 170) / 2, // Centered inside the frame
                  top: (boardSizeToUse + 28 - 85) / 2,   // Centered inside the frame
                }
              ]}
              pointerEvents="none"
            >
              <Text style={styles.puzzleFloatingXpLabel}>{xpFloatLabel}</Text>
              <Text style={styles.puzzleFloatingXpAmount}>+{xpFloatAmount} XP</Text>
            </Animated.View>

            {/* Gold Corner Trims */}
            <View style={[styles.puzzleGoldCorner, { top: 3, left: 3 }]} />
            <View style={[styles.puzzleGoldCorner, { top: 3, right: 3 }]} />
            <View style={[styles.puzzleGoldCorner, { bottom: 3, left: 3 }]} />
            <View style={[styles.puzzleGoldCorner, { bottom: 3, right: 3 }]} />
          </View>

          {/* "That's right! ✓" float */}
          {floatingText && (
            <Animated.View
              style={[styles.puzzleFloatBadge, { transform: [{ translateY: floatAnim }], opacity: floatOpacity }]}
              pointerEvents="none"
            >
              <Text style={styles.puzzleFloatText}>{floatingText}</Text>
              {floatingDelta !== null && floatingDelta !== 0 && (
                <Text style={[styles.puzzleFloatDelta, { color: floatingDelta > 0 ? "#86efac" : "#fca5a5" }]}>
                  {floatingDelta > 0 ? "+" : ""}{floatingDelta}
                </Text>
              )}
            </Animated.View>
          )}

          {/* Bonus badges */}
          {activeBonuses.length > 0 && celebPhase === "correct" && (
            <View style={styles.puzzleBonusRow} pointerEvents="none">
              {activeBonuses.map((b) => (
                <View key={b} style={styles.puzzleBonusBadge}>
                  <Text style={styles.puzzleBonusText}>{BONUS_LABELS[b]} +{BONUS_XP[b]}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Level complete overlay */}
          {boardOverlay && (
            <Animated.View style={[styles.puzzleBoardOverlay, { opacity: overlayOpacity }]} pointerEvents="none">
              <Text style={styles.puzzleBoardOverlayText}>{boardOverlay}</Text>
            </Animated.View>
          )}
        </View>

        {/* ── Solution moves strip ── */}
        {solutionDisplay.length > 0 && (
          <View style={styles.puzzleSolutionMoves}>
            {solutionDisplay.map((san, i) => (
              <View key={i} style={styles.puzzleSolutionMovePill}>
                <Text style={styles.puzzleSolutionMoveSan}>{san}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ════════════════════════ INTERACTION PANEL ═══════════════════════ */}
      <View style={[styles.chessyPanel, isMobile && { width: "100%" }]}>

        {/* ── Redesigned Header ── */}
        <View style={styles.redesignedHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => onNavigate?.("Home")}>
              <ArrowLeft size={20} color="#5f6368" />
            </Pressable>
            <WoodJigsawBadge value={activeIndex + 1} />
            <Text style={styles.redesignedHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
              Puzzles
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => setIsMuted(prev => !prev)}>
              {isMuted ? (
                <VolumeX size={20} color="#5f6368" />
              ) : (
                <Volume2 size={20} color="#5f6368" />
              )}
            </Pressable>
            <Layers size={20} color="#5f6368" />
          </View>
        </View>

        {/* ── Tutor Avatar + speech bubble ── */}
        <View style={styles.tutorAvatarSpeechRow}>
          <Animated.View style={{ transform: [{ scale: chessyBounce }] }}>
            <Image
              source={require("./assets/tutor_avatar.png")}
              style={{ width: 60, height: 60, borderRadius: 30, resizeMode: "cover" }}
            />
          </Animated.View>
          <View style={styles.whiteSpeechBubbleWrap}>
            <View style={styles.whiteSpeechBubbleTail} />
            <View style={styles.whiteSpeechBubble}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {feedbackPhase === "correct" ? (
                  <>
                    <View style={styles.solvedCheckmarkBg}>
                      <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900" }}>✓</Text>
                    </View>
                    <Text style={styles.solvedBubbleTitle}>Solved</Text>
                  </>
                ) : feedbackPhase === "wrong" ? (
                  <>
                    <View style={[styles.solvedCheckmarkBg, { backgroundColor: "#ef4444" }]}>
                      <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900" }}>✗</Text>
                    </View>
                    <Text style={[styles.solvedBubbleTitle, { color: "#ef4444" }]}>Incorrect</Text>
                  </>
                ) : (
                  <Text style={styles.solvedBubbleTitle}>
                    {chessy.title}
                  </Text>
                )}
              </View>
              <Text style={styles.whiteSpeechBubbleBody}>
                {chessy.body}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Combined Rating, Streak & Progress Bar Block ── */}
        <View style={styles.combinedRatingProgressBlock}>
          {/* Rating, Delta and Streak Row */}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "nowrap" }}>
            <View ref={ratingTextRef} collapsable={false}>
              <Text style={styles.bigRatingText}>{displayPuzzleRating}</Text>
            </View>
            {lastRatingDelta !== null && lastRatingDelta !== 0 && (
              <Text style={[styles.ratingDeltaText, { color: lastRatingDelta > 0 ? "#81b64c" : "#e11d48" }]}>
                {lastRatingDelta > 0 ? `+${lastRatingDelta}` : lastRatingDelta}
              </Text>
            )}
            {ratingState.currentStreak > 0 && (
              <Animated.View style={{ transform: [{ scale: streakScale }], flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
                <Text style={styles.inlineStreakText}>🔥 {ratingState.currentStreak}</Text>
                {streakParticles.map((sp) => (
                  <Animated.View
                    key={sp.id}
                    style={[
                      styles.puzzleStreakSpark,
                      {
                        transform: [
                          { translateX: sp.x },
                          { translateY: sp.y },
                          { scale: sp.scale }
                        ],
                        opacity: sp.opacity
                      }
                    ]}
                    pointerEvents="none"
                  />
                ))}
              </Animated.View>
            )}
          </View>

          {/* Progress Bar & Next Level Badge Row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
            <View style={styles.thickProgressBarBg}>
              <Animated.View
                style={[
                  styles.thickProgressBarFill,
                  {
                    width: fillWidth,
                    backgroundColor: "#22a6b7",
                  }
                ]}
              />
            </View>
            <WoodJigsawBadge value={activeIndex + 2} />
          </View>
        </View>

        {/* ── Redesigned Action Buttons ── */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={handleReplay}
            disabled={solutionPlaying}
            style={({ pressed }) => [
              styles.squareActionButton,
              solutionPlaying && styles.squareActionDisabled,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <RotateCcw size={20} color="#ffffff" />
          </Pressable>

          <Pressable
            onPress={handleHint}
            disabled={celebPhase !== "idle" || solutionPlaying}
            style={({ pressed }) => [
              styles.squareActionButton,
              (celebPhase !== "idle" || solutionPlaying) && styles.squareActionDisabled,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Search size={20} color="#ffffff" />
          </Pressable>

          {feedbackPhase === "correct" ? (
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.wideNextButtonGreen,
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <ChevronRight size={28} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void handleGiveUp()}
              disabled={celebPhase !== "idle" || solutionPlaying}
              style={({ pressed }) => [
                styles.wideGiveUpButton,
                (celebPhase !== "idle" || solutionPlaying) && styles.squareActionDisabled,
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={styles.giveUpButtonText}>
                {solutionPlaying ? "Playing..." : "Give Up"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Sub-footer ── */}
        <View style={styles.redesignedSubFooter}>
          <Pressable onPress={() => console.log("Settings pressed")}>
            <Settings size={18} color="#6b7280" />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Pressable
              onPress={handlePrevPuzzle}
              disabled={activeIndex === 0}
              style={({ pressed }) => [
                activeIndex === 0 && { opacity: 0.3 },
                pressed && activeIndex > 0 && { opacity: 0.7 },
              ]}
            >
              <ChevronLeft size={22} color="#0f6f7f" />
            </Pressable>
            <Pressable
              onPress={handleNextPuzzle}
              disabled={activeIndex === pathPuzzles.length - 1}
              style={({ pressed }) => [
                activeIndex === pathPuzzles.length - 1 && { opacity: 0.3 },
                pressed && activeIndex < pathPuzzles.length - 1 && { opacity: 0.7 },
              ]}
            >
              <ChevronRight size={22} color="#0f6f7f" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ════════════════════════ GOOGLE ADS RAIL ════════════════════════ */}
      {!isMobile && (
        <AdsenseAdUnit format="auto" placement="puzzleFeed" style={styles.puzzleAdRail} />
      )}

      {/* ════════════════════ Living Kingdom Roadmap Overlay ════════════════════ */}
      {showRoadmap && (() => {
        const groupedRows: Array<{ puzzle: Puzzle; index: number; zoneHeader?: BiomeZone }> = [];
        let lastZoneId = "";
        pathPuzzles.forEach((puzzle, index) => {
          const biome = biomeForRating(puzzle.rating);
          const header = biome.id !== lastZoneId ? biome : undefined;
          if (header) lastZoneId = biome.id;
          groupedRows.push({ puzzle, index, zoneHeader: header });
        });

        return (
          <View style={styles.roadmapOverlay}>
            <View style={styles.roadmapCard}>

              <View style={[styles.roadmapHero, { borderBottomColor: currentBiome.nodeBorder + "55" }]}>
                <Text style={styles.roadmapRuneGiant}>{currentBiome.rune}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roadmapKicker}>Living Kingdom</Text>
                  <Text style={styles.roadmapTitle}>{currentBiome.label}</Text>
                </View>
                <View style={styles.roadmapSolvedBadge}>
                  <Text style={[styles.roadmapSolvedNum, { color: currentBiome.solvedColor }]}>
                    {solvedPuzzleIds.size}
                  </Text>
                  <Text style={styles.roadmapSolvedLabel}>solved</Text>
                </View>
              </View>

              <View style={styles.roadmapRatingWrap}>
                <View style={styles.roadmapRatingBarBg}>
                  <View style={[styles.roadmapRatingBarFill, {
                    width: `${Math.round(biomeProgress * 100)}%`,
                    backgroundColor: currentBiome.solvedColor,
                  }]} />
                </View>
                <Text style={styles.roadmapRatingLabel}>
                  ♟ {ratingState.puzzleRating}
                  {nextBiome ? `  →  ${nextBiome.label} at ${nextBiome.minRating}` : "  👑 Max Zone"}
                </Text>
              </View>

              <ScrollView
                ref={roadmapScrollRef}
                style={styles.roadmapScroll}
                contentContainerStyle={styles.roadmapPathContent}
                showsVerticalScrollIndicator={false}
              >
                {groupedRows.map(({ puzzle, index, zoneHeader }) => {
                  const solved = solvedPuzzleIds.has(puzzle.id);
                  const active = puzzle.id === activePuzzle.id;
                  const isAvatarHere = index === avatarIndex;
                  const biome = biomeForRating(puzzle.rating);
                  const pathCategory = (puzzle as any)?.category ?? "winning-material";
                  const pathMotif = puzzle.motif || categoryMeta[pathCategory]?.label || "Tactic";
                  const statusLabel = solved ? "Solved" : active ? "Current" : index < avatarIndex ? "Reviewed" : "Queued";
                  const col = index % 3;
                  const offsetStyle = col === 1 ? styles.puzzlePathNodeRight
                    : col === 2 ? styles.puzzlePathNodeCenter
                    : styles.puzzlePathNodeLeft;

                  return (
                    <View key={puzzle.id} onLayout={(e) => { nodeLayoutsRef.current[puzzle.id] = e.nativeEvent.layout.y; }}>
                      {zoneHeader && index > 0 && (
                        <View style={[styles.roadmapZoneHeader, { borderColor: zoneHeader.nodeBorder + "55" }]}>
                          <View style={[styles.roadmapZoneLine, { backgroundColor: zoneHeader.nodeBorder + "44" }]} />
                          <View style={[styles.roadmapZonePill, { backgroundColor: zoneHeader.nodeColor + "33", borderColor: zoneHeader.nodeBorder + "66" }]}>
                            <Text style={[styles.roadmapZonePillText, { color: zoneHeader.nodeBorder }]}>
                              {zoneHeader.rune} {zoneHeader.label}
                            </Text>
                          </View>
                          <View style={[styles.roadmapZoneLine, { backgroundColor: zoneHeader.nodeBorder + "44" }]} />
                        </View>
                      )}

                      {index > 0 && (
                        <RoadmapConnector
                          fromCol={(index - 1) % 3 as 0 | 1 | 2}
                          toCol={index % 3 as 0 | 1 | 2}
                          color={biome.nodeBorder + "cc"}
                        />
                      )}

                      <View style={[styles.puzzlePathNodeWrap, offsetStyle]}>
                        <View style={[
                          styles.puzzlePathNode,
                          {
                            backgroundColor: solved ? biome.solvedColor
                              : active ? "#fffbe6"
                              : biome.nodeColor,
                            borderColor: solved ? biome.solvedBorder
                              : active ? "#facc15"
                              : biome.nodeBorder,
                            shadowColor: active ? "#facc15" : biome.solvedColor,
                            shadowOpacity: active ? 0.6 : 0.18,
                          },
                          active && styles.puzzlePathNodeActive,
                          bloomingId === puzzle.id && { transform: [{ scale: bloomAnim }] },
                        ]}>
                          {isAvatarHere ? (
                            <Animated.Text style={[
                              styles.puzzlePathPawn,
                              { transform: [{ translateY: pawnJumpY }, { scale: pawnJumpScale }] },
                            ]}>♙</Animated.Text>
                          ) : (
                            <Text style={[styles.puzzlePathNumber, { color: solved ? biome.textColor : active ? biome.textColor : "#fff" }]}>
                              {String(index + 1)}
                            </Text>
                          )}
                          {solved && !isAvatarHere && (
                            <View style={styles.puzzleNodeSolvedBadge}>
                              <Text style={styles.puzzleNodeSolvedBadgeText}>✓</Text>
                            </View>
                          )}
                        </View>
                        <View style={[
                          styles.puzzlePathInfoCard,
                          solved && styles.puzzlePathInfoCardSolved,
                          active && styles.puzzlePathInfoCardActive,
                        ]}>
                          <View style={styles.puzzlePathInfoTopRow}>
                            <Text style={[
                              styles.puzzlePathInfoStatus,
                              solved && { color: biome.textColor },
                              active && { color: "#854d0e" },
                            ]}>
                              {statusLabel}
                            </Text>
                            <Text style={[
                              styles.puzzlePathInfoRating,
                              solved && { color: biome.textColor },
                              active && { color: "#854d0e" },
                            ]}>
                              {puzzle.rating}
                            </Text>
                          </View>
                          <Text style={[
                            styles.puzzlePathInfoMotif,
                            solved && { color: "rgba(15,23,42,0.72)" },
                            active && { color: "#713f12" },
                          ]} numberOfLines={1}>
                            {pathMotif}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.roadmapContinueBtn,
                  { backgroundColor: currentBiome.solvedColor },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.roadmapContinueText, { color: currentBiome.textColor }]}>
                  Continue on the Path →
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })()}
    </View>
  );
}



function LessonsScreen({ data, services, reload, theme }: { data: DashboardData; services: ChessAliveServices; reload: () => void | Promise<void>; theme: BoardTheme }) {
  const [activeLessonId, setActiveLessonId] = useState(data.lessons[0]?.id ?? "");
  const activeLesson = data.lessons.find((lesson) => lesson.id === activeLessonId) ?? data.lessons[0];
  const activeStep = activeLesson?.steps?.[0];
  const previewSnapshot = snapshotFromFen(activeStep?.boardFen);
  const completedCount = data.lessons.filter((lesson) => lesson.completed).length;
  return (
    <View style={styles.learningExperience}>
      <View style={styles.lessonHeroPanel}>
        <View style={styles.lessonHeroCopy}>
          <Text style={styles.puzzleKicker}>Coach Path</Text>
          <Text style={styles.lessonHeroTitle}>{activeLesson?.title ?? "Lessons"}</Text>
          <Text style={styles.lessonHeroText}>{activeLesson?.summary ?? "Pick a lesson and build one clean chess habit."}</Text>
          <View style={styles.lessonMetaRow}>
            <Text style={styles.lessonChip}>{activeLesson?.level ?? "beginner"}</Text>
            <Text style={styles.lessonChip}>{activeLesson?.track === "funny-mode" ? "alive-mode" : activeLesson?.track ?? "coach"}</Text>
            <Text style={styles.lessonChip}>{activeLesson?.xp ?? 50} XP</Text>
            <Text style={styles.lessonChip}>{activeLesson?.minutes ?? 5} min</Text>
          </View>
        </View>
        <View style={styles.lessonPreviewBoard}>
          <MiniBoard snapshot={previewSnapshot} theme={theme} />
        </View>
      </View>

      <View style={styles.lessonBodyGrid}>
        <View style={styles.lessonStepPanel}>
          <View style={styles.lessonProgressTop}>
            <Text style={styles.cardTitle}>Today’s lesson flow</Text>
            <Text style={styles.lessonProgressText}>{completedCount}/{data.lessons.length} complete</Text>
          </View>
          {(activeLesson?.steps ?? []).map((step, index) => (
            <View key={step.id} style={styles.lessonStep}>
              <Text style={styles.lessonStepTitle}>{index + 1}. {step.title}</Text>
              <Text style={styles.muted}>{step.body}</Text>
              <Text style={styles.lessonCoachNote}>{step.coachNote}</Text>
            </View>
          ))}
          {activeLesson && (
            <ActionButton
              label={activeLesson.completed ? "Completed" : "Complete Lesson"}
              accent={!activeLesson.completed}
              onPress={() => {
                if (data.user) void services.lessons.completeLesson(data.user.id, activeLesson.id).then(() => reload());
              }}
            />
          )}
        </View>

        <View style={styles.lessonPathPanel}>
          {data.lessons.map((lesson, index) => (
            <Pressable key={lesson.id} onPress={() => setActiveLessonId(lesson.id)} style={({ pressed }) => [styles.lessonPathCard, activeLesson?.id === lesson.id && styles.lessonPathCardActive, pressed && styles.pressed]}>
              <View style={styles.lessonPathNumber}>
                <Text style={styles.lessonPathNumberText}>{lesson.completed ? "✓" : index + 1}</Text>
              </View>
              <View style={styles.lessonPathCopy}>
                <Text numberOfLines={1} style={styles.lessonPathTitle}>{lesson.title}</Text>
                <Text numberOfLines={2} style={styles.lessonPathSummary}>{lesson.summary}</Text>
              </View>
              <Text style={styles.lessonPathXp}>{lesson.xp ?? 50} XP</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function BotsScreen({
  data,
  onBotMove,
  onStartBot,
  theme,
}: {
  data: DashboardData;
  onBotMove: (botId: string) => Promise<void>;
  onStartBot: (botId: string) => Promise<void>;
  theme: BoardTheme;
}) {
  const [selectedBotId, setSelectedBotId] = useState(data.bots[0]?.id ?? "");
  const selectedBot = data.bots.find((bot) => bot.id === selectedBotId) ?? data.bots[0];
  return (
    <View style={styles.botExperience}>
      <View style={styles.botHeroPanel}>
        <View style={styles.botHeroAvatar}>
          <Text style={styles.botHeroAvatarText}>{selectedBot?.avatarEmoji ?? "♞"}</Text>
        </View>
        <View style={styles.botHeroCopy}>
          <Text style={styles.puzzleKicker}>Practice Arena</Text>
          <Text style={styles.botHeroTitle}>{selectedBot?.name ?? "Choose a Bot"}</Text>
          <Text style={styles.botHeroText}>{selectedBot?.personality ?? "Pick a sparring partner and start a practice game."}</Text>
          <View style={styles.botHeroStats}>
            <InsightPill label="Rating" value={String(selectedBot?.rating ?? 800)} tone="hot" />
            <InsightPill label="Style" value={selectedBot?.id.includes("endgame") ? "Endgame" : selectedBot?.id.includes("blitz") ? "Tactical" : "Creative"} tone="calm" />
          </View>
          {selectedBot && (
            <View style={styles.rowWrap}>
              <ActionButton label="Play Bot" onPress={() => void onStartBot(selectedBot.id)} accent />
              <ActionButton label="Let Bot Move" onPress={() => void onBotMove(selectedBot.id)} />
            </View>
          )}
        </View>
        <View style={styles.botPreviewBoard}>
          <MiniBoard snapshot={homeLiveSnapshots[1]} theme={theme} />
        </View>
      </View>

      <View style={styles.botGrid}>
        {data.bots.map((bot) => (
          <Pressable key={bot.id} onPress={() => setSelectedBotId(bot.id)} style={({ pressed }) => [styles.botCard, selectedBot?.id === bot.id && styles.botCardActive, pressed && styles.pressed]}>
            <Text style={styles.botCardAvatar}>{bot.avatarEmoji}</Text>
            <Text style={styles.botCardName}>{bot.name}</Text>
            <Text numberOfLines={2} style={styles.botCardPersonality}>{bot.personality}</Text>
            <Text style={styles.botCardRating}>{bot.rating}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const reviewClassMeta: Record<ReviewMoveClassification, { background: string; border: string; color: string; label: string }> = {
  blunder: { background: "#fee2e2", border: "#fca5a5", color: "#991b1b", label: "Blunder" },
  book: { background: "#eef2ff", border: "#c7d2fe", color: "#3730a3", label: "Book" },
  brilliant: { background: "#dcfce7", border: "#86efac", color: "#166534", label: "Brilliant" },
  forced: { background: "#f1f5f9", border: "#cbd5e1", color: "#334155", label: "Forced" },
  good: { background: "#ecfdf5", border: "#a7f3d0", color: "#047857", label: "Good" },
  great: { background: "#dbeafe", border: "#93c5fd", color: "#1d4ed8", label: "Great" },
  inaccuracy: { background: "#fef3c7", border: "#fcd34d", color: "#92400e", label: "Inaccuracy" },
  mistake: { background: "#ffedd5", border: "#fdba74", color: "#9a3412", label: "Mistake" },
};

function formatEval(cp?: number) {
  if (cp === undefined) return "—";
  if (Math.abs(cp) > 9000) return cp > 0 ? "+M" : "-M";
  const pawns = cp / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

function ReviewAccuracyCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.reviewAccuracyCard}>
      <View style={[styles.reviewAccuracyRing, { borderColor: color }]}>
        <Text style={[styles.reviewAccuracyValue, { color }]}>{value}</Text>
        <Text style={styles.reviewAccuracyUnit}>%</Text>
      </View>
      <Text style={styles.reviewAccuracyLabel}>{label}</Text>
    </View>
  );
}

function ReviewMoveCard({
  active,
  insight,
  onPress,
}: {
  active: boolean;
  insight: BrowserGameReview["moveInsights"][number];
  onPress: () => void;
}) {
  const meta = reviewClassMeta[insight.classification];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.reviewMoveCard, active && styles.reviewMoveCardActive, pressed && styles.pressed]}>
      <View style={styles.reviewMoveCardTop}>
        <Text style={styles.reviewMoveNumber}>{insight.color === "w" ? `${insight.moveNumber}.` : `${insight.moveNumber}...`}</Text>
        <Text style={styles.reviewMoveSan}>{insight.played}</Text>
        <View style={[styles.reviewClassBadge, { backgroundColor: meta.background, borderColor: meta.border }]}>
          <Text style={[styles.reviewClassBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={styles.reviewMoveExplanation}>{insight.explanation}</Text>
      <View style={styles.reviewMoveMetaRow}>
        <Text style={styles.reviewMoveMetaText}>Δ {formatEval(-insight.evalLoss)}</Text>
        <Text style={styles.reviewMoveMetaText}>Best {insight.bestSan ?? "—"}</Text>
      </View>
    </Pressable>
  );
}

function GameReviewScreen({ compact = false, snapshot, theme }: { compact?: boolean; snapshot: GameSnapshot | null; theme: BoardTheme }) {
  const { width } = useWindowDimensions();
  const playableSnapshot = snapshot?.history.length ? snapshot : null;
  const activeSnapshot = playableSnapshot ?? reviewDemoSnapshot;
  const demoMode = !playableSnapshot;
  const [review, setReview] = useState<BrowserGameReview | null>(null);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [selectedPly, setSelectedPly] = useState(activeSnapshot.history.length);
  const [running, setRunning] = useState(false);
  const reviewKey = `${activeSnapshot.id}:${activeSnapshot.history.length}:${activeSnapshot.history.at(-1)?.after ?? activeSnapshot.fen}`;

  useEffect(() => {
    setReview(null);
    setProgress(null);
    setReviewError(null);
    setSelectedPly(activeSnapshot.history.length);
  }, [reviewKey]);

  const selectedSnapshot = useMemo(() => replaySnapshot(activeSnapshot, selectedPly), [activeSnapshot, selectedPly]);
  const selectedInsight = review?.moveInsights.find((insight) => insight.ply === selectedPly) ?? review?.moveInsights.at(-1);
  const boardTheme = theme ?? boardThemes[0];
  const progressTotal = Math.max(progress?.total ?? activeSnapshot.history.length, 1);
  const progressRatio = Math.max(0.04, Math.min(1, (progress?.completed ?? 0) / progressTotal));
  const criticalMoves = review?.moveInsights.filter((insight) => insight.classification === "mistake" || insight.classification === "blunder").slice(0, 3) ?? [];
  const goodMoves = review?.moveInsights.filter((insight) => insight.classification === "brilliant" || insight.classification === "great").slice(0, 3) ?? [];

  async function runReview() {
    if (!activeSnapshot.history.length || running) return;
    setRunning(true);
    setReview(null);
    setReviewError(null);
    setProgress({ completed: 0, message: "Preparing browser engine.", phase: "loading-engine", total: activeSnapshot.history.length });
    try {
      const nextReview = await analyzeGameInBrowser(activeSnapshot, {
        maxPlies: width < 700 ? 50 : 80,
        movetimeMs: width < 700 ? 90 : 130,
        onProgress: setProgress,
      });
      setReview(nextReview);
      setSelectedPly(nextReview.moveInsights.at(-1)?.ply ?? activeSnapshot.history.length);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Review failed in this browser.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <View style={[styles.reviewExperience, compact && styles.reviewExperienceCompact]}>
      <View style={styles.reviewHeroPanel}>
        <View style={styles.reviewHeroCopy}>
          <View style={styles.reviewKickerRow}>
            <EliteIcon icon={Brain} tone="sky" size="sm" rune="SF" />
            <Text style={styles.puzzleKicker}>Browser Game Review</Text>
          </View>
          <Text style={styles.reviewTitle}>Stockfish coach, running locally.</Text>
          <Text style={styles.reviewText}>
            {demoMode
              ? "No completed game is loaded yet, so this screen is ready with a demo review. Your real games will be analyzed here without storing move history in the database."
              : "Review this game inside the browser with Stockfish WASM. Moves stay local; only optional future summaries need a tiny API call."}
          </Text>
          <View style={styles.reviewMetricRow}>
            <InsightPill label="Engine" value={review?.engineName ?? "Stockfish WASM"} tone="calm" />
            <InsightPill label="Storage" value="Browser only" tone="quiet" />
            <InsightPill label="Game" value={demoMode ? "Demo loaded" : `${activeSnapshot.history.length} plies`} tone="hot" />
          </View>
        </View>
        <View style={styles.reviewHeroActions}>
          {review ? (
            <View style={styles.reviewAccuracyRow}>
              <ReviewAccuracyCard color="#0f8a67" label="White accuracy" value={review.accuracyWhite} />
              <ReviewAccuracyCard color="#2563eb" label="Black accuracy" value={review.accuracyBlack} />
            </View>
          ) : (
            <View style={[styles.reviewGauge, running ? styles.reviewGaugeActive : styles.reviewGaugeMuted]}>
              <BarChart3 size={38} color={running ? "#0f8a67" : aiBlue} strokeWidth={2.5} />
              <Text style={styles.reviewGaugeLabel}>{running ? "live" : "ready"}</Text>
            </View>
          )}
          <Pressable disabled={running || !activeSnapshot.history.length} onPress={() => void runReview()} style={({ pressed }) => [styles.reviewRunButton, running && styles.reviewRunButtonDisabled, pressed && !running && styles.pressed]}>
            <EliteIcon icon={Zap} tone="gold" size="xs" rune="⚡" />
            <Text style={styles.reviewRunButtonText}>{running ? "Analyzing..." : review ? "Run Again" : "Run Review"}</Text>
          </Pressable>
        </View>
      </View>

      {(progress || reviewError) && (
        <View style={styles.reviewProgressPanel}>
          <View style={styles.reviewProgressTop}>
            <Text style={styles.reviewProgressLabel}>{reviewError ? "Review error" : progress?.message ?? "Preparing review"}</Text>
            {!reviewError && <Text style={styles.reviewProgressCount}>{progress?.completed ?? 0}/{progress?.total ?? activeSnapshot.history.length}</Text>}
          </View>
          {reviewError ? (
            <Text style={styles.reviewErrorText}>{reviewError}</Text>
          ) : (
            <View style={styles.reviewProgressTrack}>
              <View style={[styles.reviewProgressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          )}
        </View>
      )}

      <View style={styles.reviewBoardGrid}>
        <View style={styles.reviewBoardPanel}>
          <MiniBoard snapshot={selectedSnapshot} theme={boardTheme} />
          <View style={styles.reviewBoardFooter}>
            <Text style={styles.reviewBoardFooterTitle}>{selectedPly === 0 ? "Starting position" : `After ${selectedInsight?.played ?? activeSnapshot.history[selectedPly - 1]?.san ?? "move"}`}</Text>
            <Text style={styles.reviewBoardFooterText}>{review?.openingName ?? "Run review to classify every move."}</Text>
          </View>
        </View>

        <View style={styles.reviewCoachPanel}>
          <View style={styles.reviewCoachHeader}>
            <EliteIcon icon={Sparkles} tone="rose" size="sm" rune="AI" />
            <View style={styles.reviewCoachHeaderCopy}>
              <Text style={styles.reviewCoachTitle}>{review ? "Coach Summary" : "What this review will do"}</Text>
              <Text style={styles.reviewCoachText}>
                {review
                  ? review.verdict
                  : "It checks every move, compares the played move with the engine line, then explains the swing in plain chess language."}
              </Text>
            </View>
          </View>

          {selectedInsight ? (
            <View style={styles.reviewSelectedCard}>
              <View style={styles.reviewSelectedTop}>
                <Text style={styles.reviewSelectedMove}>{selectedInsight.moveNumber}{selectedInsight.color === "w" ? "." : "..."} {selectedInsight.played}</Text>
                <View style={[styles.reviewClassBadge, { backgroundColor: reviewClassMeta[selectedInsight.classification].background, borderColor: reviewClassMeta[selectedInsight.classification].border }]}>
                  <Text style={[styles.reviewClassBadgeText, { color: reviewClassMeta[selectedInsight.classification].color }]}>{reviewClassMeta[selectedInsight.classification].label}</Text>
                </View>
              </View>
              <Text style={styles.reviewSelectedExplanation}>{selectedInsight.explanation}</Text>
              <View style={styles.reviewReasonList}>
                {selectedInsight.reasons.map((reason) => (
                  <View key={reason} style={styles.reviewReasonItem}>
                    <CheckCircle2 size={14} color="#0f8a67" strokeWidth={2.5} />
                    <Text style={styles.reviewReasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.reviewEvalRow}>
                <InsightPill label="Before" value={formatEval(selectedInsight.evalBefore)} tone="quiet" />
                <InsightPill label="After" value={formatEval(selectedInsight.evalAfter)} tone="quiet" />
                <InsightPill label="Best" value={selectedInsight.bestSan ?? "—"} tone="calm" />
              </View>
            </View>
          ) : (
            <View style={styles.reviewSelectedCard}>
              <Text style={styles.reviewSelectedMove}>Ready for analysis</Text>
              <Text style={styles.reviewSelectedExplanation}>Click Run Review. The first pass is intentionally frugal: one lightweight WASM worker, no database writes, no cloud engine.</Text>
            </View>
          )}

          {review && (
            <View style={styles.reviewLessonGrid}>
              <View style={styles.reviewLessonCard}>
                <Text style={styles.reviewLessonTitle}>Fix first</Text>
                <Text style={styles.reviewLessonText}>{criticalMoves[0] ? `${criticalMoves[0].played}: ${criticalMoves[0].title}` : "No major tactical collapse found."}</Text>
              </View>
              <View style={styles.reviewLessonCard}>
                <Text style={styles.reviewLessonTitle}>Repeat this</Text>
                <Text style={styles.reviewLessonText}>{goodMoves[0] ? `${goodMoves[0].played}: ${goodMoves[0].title}` : "Keep playing stable developing moves."}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.reviewTimelinePanel}>
        <View style={styles.reviewTimelineHeader}>
          <Text style={styles.reviewTimelineTitle}>Move-by-move coach</Text>
          <Text style={styles.reviewTimelineText}>{review ? `${review.moveInsights.length} moves reviewed locally` : "Run the engine to unlock good/bad labels and explanations."}</Text>
        </View>
        <View style={styles.reviewMoveTimeline}>
          {review ? (
            review.moveInsights.map((insight) => (
              <ReviewMoveCard key={`${insight.ply}-${insight.move.lan}`} insight={insight} active={selectedPly === insight.ply} onPress={() => setSelectedPly(insight.ply)} />
            ))
          ) : (
            activeSnapshot.history.map((move, index) => (
              <Pressable key={`${index}-${move.lan}`} onPress={() => setSelectedPly(index + 1)} style={({ pressed }) => [styles.reviewMoveCard, selectedPly === index + 1 && styles.reviewMoveCardActive, pressed && styles.pressed]}>
                <View style={styles.reviewMoveCardTop}>
                  <Text style={styles.reviewMoveNumber}>{move.color === "w" ? `${Math.floor(index / 2) + 1}.` : `${Math.floor(index / 2) + 1}...`}</Text>
                  <Text style={styles.reviewMoveSan}>{move.san}</Text>
                </View>
                <Text style={styles.reviewMoveExplanation}>Awaiting Stockfish classification.</Text>
              </Pressable>
            ))
          )}
        </View>
      </View>

      {review && (
        <View style={styles.reviewPgnPanel}>
          <Text style={styles.reviewPgnTitle}>Portable game record</Text>
          <Text selectable style={styles.reviewPgnText}>{review.pgn}</Text>
        </View>
      )}
    </View>
  );
}

function TournamentsScreen({
  data,
  services,
  reload,
  onOpenTournament,
}: {
  data: DashboardData;
  services: ChessAliveServices;
  reload: () => void | Promise<void>;
  onOpenTournament: (tournament: Tournament) => void;
}) {
  return (
    <View style={styles.tournamentExperience}>
      <View style={styles.tournamentHero}>
        <EliteIcon icon={Trophy} tone="gold" size="lg" rune="♚" />
        <View style={styles.tournamentHeroCopy}>
          <Text style={styles.puzzleKicker}>Events</Text>
          <Text style={styles.tournamentHeroTitle}>Fast arenas with room for comedy.</Text>
          <Text style={styles.tournamentHeroText}>Join a tournament, get paired, and open the board from the event card. Admin tools stay hidden unless the admin account is signed in.</Text>
        </View>
      </View>
      <View style={styles.tournamentGrid}>
        {data.tournaments.map((tournament) => (
          <View key={tournament.id} style={styles.tournamentCard}>
            <View style={styles.tournamentCardTop}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <Text style={[styles.tournamentModePill, tournament.funnyMode && styles.tournamentModePillAlive]}>{tournament.funnyMode ? "Alive" : "Classic"}</Text>
            </View>
            <Text style={styles.tournamentStart}>{new Date(tournament.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            <View style={styles.tournamentMetaGrid}>
              <InsightPill label="Format" value={tournament.format} tone="quiet" />
              <InsightPill label="Players" value={String(tournament.players)} tone="calm" />
              <InsightPill label="Seat" value={tournament.joined ? "Ready" : "Open"} tone="hot" />
            </View>
            <ActionButton
              label={tournament.joined ? "Play Tournament" : "Join & Play"}
              accent
              onPress={() => {
                if (!data.user) return;
                onOpenTournament(tournament);
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SocialScreen({
  data,
  onNavigate,
  services,
  theme,
  onViewRoom,
  reload,
}: {
  data: DashboardData;
  onNavigate: (screen: Screen) => void;
  services: ChessAliveServices;
  theme: BoardTheme;
  onViewRoom: (roomId: string) => void;
  reload: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [roomName, setRoomName] = useState("");
  const [privateRooms, setPrivateRooms] = useState<Array<{ code: string; id: string; name: string; members: number }>>([]);
  const canCreateRoom = privateRooms.length < 1;
  const liveRooms: HomeLiveMatch[] = data.rooms.slice(0, 8).map((room, index) => ({
    id: room.id,
    white: room.players.white?.displayName ?? "Open seat",
    black: room.players.black?.displayName ?? "Waiting",
    meta: `${room.timeControl} · ${room.region}`,
    signal: room.latencyMs ? `${room.latencyMs}ms` : "edge",
    snapshot: room.snapshot ?? homeLiveSnapshots[index % homeLiveSnapshots.length],
    spectators: room.spectators,
    status: room.status === "waiting" ? "Waiting" : room.status === "completed" ? "Review" : "Live",
    onPress: () => onViewRoom(room.id),
  }));
  const fallbackRooms: HomeLiveMatch[] = [
    { id: "watch-1", white: "Guest Player", black: "Drama Bot", meta: "5|0 · Alive", signal: "18ms", snapshot: homeLiveSnapshots[0], spectators: 128, status: "Live", onPress: () => onNavigate("Play") },
    { id: "watch-2", white: data.leaderboard[0]?.user.displayName ?? "Rook Boss", black: data.leaderboard[1]?.user.displayName ?? "Queen Pilot", meta: "3|2 · Rated", signal: "24ms", snapshot: homeLiveSnapshots[1], spectators: 86, status: "Live", onPress: () => onNavigate("Play") },
    { id: "watch-3", white: data.friends[0]?.displayName ?? "Tactical Mani", black: "Opening Artist", meta: "10|0 · Rapid", signal: "31ms", snapshot: homeLiveSnapshots[2], spectators: 64, status: "Live", onPress: () => onNavigate("Play") },
  ];
  const socialRooms = [...liveRooms, ...fallbackRooms].slice(0, 6);

  function sendChat() {
    const body = draft.trim();
    if (!body || !data.user) return;
    setDraft("");
    void services.chat.sendMessage("lobby", data.user.id, body).then(() => reload());
  }

  function createPrivateRoom() {
    const name = roomName.trim() || `${data.user?.displayName ?? "My"} Room`;
    if (!canCreateRoom) return;
    setPrivateRooms((current) => [
      ...current,
      {
        code: Math.random().toString(36).slice(2, 8).toUpperCase(),
        id: `private-${Date.now()}`,
        members: 1,
        name,
      },
    ]);
    setRoomName("");
  }

  return (
    <FeatureGrid>
      <View style={styles.socialHero}>
        <View>
          <Text style={styles.puzzleKicker}>Social</Text>
          <Text style={styles.socialHeroTitle}>Watch, chat, invite, repeat.</Text>
          <Text style={styles.socialHeroText}>Live boards, private rooms, groups, and premium room controls live together here.</Text>
        </View>
        <View style={styles.socialHeroStat}>
          <Text style={styles.socialHeroStatValue}>{socialRooms.length}</Text>
          <Text style={styles.socialHeroStatLabel}>featured matches</Text>
        </View>
      </View>
      <Panel title="Lobby Chat">
        {data.chat.map((message) => (
          <Text key={message.id} style={styles.listText}>
            {message.from.displayName}: {message.body}
          </Text>
        ))}
        <View style={styles.chatComposer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Send a lobby message"
            placeholderTextColor="#8aa0b6"
            style={styles.chatInput}
            onSubmitEditing={sendChat}
          />
          <ActionButton label="Send" onPress={sendChat} accent />
        </View>
      </Panel>
      <Panel title="Watch Matches">
        <View style={styles.liveMatchGrid}>
          {socialRooms.map((room, index) => (
            <LiveMatchBoardCard key={room.id} index={index} match={room} theme={theme} />
          ))}
        </View>
      </Panel>
      <Panel title="Leaderboard">
        {data.leaderboard.slice(0, 8).map((entry) => (
          <View key={entry.user.id} style={styles.leaderboardRailRow}>
            <Text style={styles.leaderboardRank}>#{entry.rank}</Text>
            <Text numberOfLines={1} style={styles.leaderboardName}>{entry.user.avatarEmoji} {entry.user.displayName}</Text>
            <Text style={styles.leaderboardScore}>{entry.score}</Text>
          </View>
        ))}
      </Panel>
      <Panel title="Private Rooms">
        <Text style={styles.muted}>Free accounts can create 1 private room. Premium unlocks unlimited rooms.</Text>
        <View style={styles.chatComposer}>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="Room name"
            placeholderTextColor="#8aa0b6"
            style={styles.chatInput}
            onSubmitEditing={createPrivateRoom}
          />
          <ActionButton label="Create" onPress={createPrivateRoom} accent={canCreateRoom} />
        </View>
        {!canCreateRoom && <Text style={styles.planHint}>Upgrade to Premium to create more private rooms.</Text>}
        {privateRooms.map((room) => (
          <View key={room.id} style={styles.privateRoomRow}>
            <View>
              <Text style={styles.cardTitle}>{room.name}</Text>
              <Text style={styles.muted}>Code {room.code} · {room.members} member</Text>
            </View>
            <ActionButton label="Open" onPress={() => undefined} />
          </View>
        ))}
      </Panel>
      <Panel title="Groups">
        {data.clubs.map((club) => (
          <View key={club.id} style={styles.groupRow}>
            <View style={styles.groupCopy}>
              <Text style={styles.cardTitle}>{club.name}</Text>
              <Text style={styles.muted}>{club.description}</Text>
              <StatLine label="Members" value={String(club.members)} />
            </View>
            <ActionButton
              label={club.joined ? "Joined" : "Join"}
              accent={club.joined}
              onPress={() => {
                if (data.user) void services.clubs.joinClub(data.user.id, club.id).then(() => reload());
              }}
            />
          </View>
        ))}
      </Panel>
      <Panel title="Premium">
        <View style={styles.planCard}>
          <View>
            <Text style={styles.planTitle}>ChessAlive Premium</Text>
            <Text style={styles.planPrice}>₹100/month</Text>
            <Text style={styles.muted}>Unlimited private rooms, richer room controls, and early Alive experiments.</Text>
          </View>
          <ActionButton label="Upgrade" onPress={() => onNavigate("Premium")} accent />
        </View>
      </Panel>
    </FeatureGrid>
  );
}

function ProfileScreen({
  data,
  settings,
  setSettings,
  services,
  onSignedIn,
}: {
  data: DashboardData;
  settings: PlayerSettings;
  setSettings: (settings: PlayerSettings) => void;
  services: ChessAliveServices;
  onSignedIn: (user: UserProfile) => void | Promise<void>;
}) {
  async function saveSettings(next: PlayerSettings) {
    setSettings(next);
    if (data.user) await services.settings.saveSettings(data.user.id, next);
  }

  async function changeTheme(themeId: string) {
    await saveSettings({ ...settings, boardTheme: themeId });
  }

  async function changeCustomColor(key: "dark" | "highlight" | "light", color: string) {
    const custom = { ...defaultCustomBoardTheme, ...settings.customBoardTheme, [key]: color, name: settings.customBoardTheme?.name ?? "My Board" };
    await saveSettings({ ...settings, boardTheme: customBoardThemeId, customBoardTheme: custom });
  }

  const activeTheme = resolveBoardTheme(settings);

  return (
    <FeatureGrid>
      {data.user ? (
        <Panel title="Account">
          <View style={styles.profileAccountHeader}>
            <Text style={styles.profileAccountAvatar}>{data.user.avatarEmoji}</Text>
            <View style={styles.profileAccountCopy}>
              <Text style={styles.profileAccountName}>{data.user.displayName}</Text>
              <Text style={styles.muted}>Signed in. Your settings and match data stay attached to this profile.</Text>
            </View>
          </View>
        </Panel>
      ) : (
        <AuthPanel services={services} user={data.user} onSignedIn={onSignedIn} />
      )}
      <Panel title="Profile">
        <Text style={styles.cardTitle}>
          {data.user?.avatarEmoji} {data.user?.displayName}
        </Text>
        <StatLine label="Alive rating" value={String(data.user?.rating.funny ?? "-")} />
        <StatLine label="Games" value={String(data.stats?.games ?? "-")} />
        <StatLine label="Alive effects" value={String(data.stats?.funnyEffectsPlayed ?? "-")} />
      </Panel>
      <Panel title="Settings">
        <StatLine label="Music" value={settings.musicEnabled ? "On" : "Off"} />
        <StatLine label="Intensity" value={settings.intensity} />
        <BoardThemeStudio
          activeTheme={activeTheme}
          settings={settings}
          onChangeCustomColor={(key, color) => void changeCustomColor(key, color)}
          onSelectTheme={(themeId) => void changeTheme(themeId)}
        />
        <AnimationSettingsStudio
          animationSets={data.animationSets}
          pieceSets={data.pieceSets}
          settings={settings}
          onSave={(next) => void saveSettings(next)}
        />
      </Panel>
    </FeatureGrid>
  );
}

function FunRulesStudio({
  onUpdate,
  rules,
}: {
  onUpdate: (index: number, patch: Partial<CustomFunRule>) => void;
  rules: CustomFunRule[];
}) {
  return (
    <View style={styles.funRulesStudio}>
      <Text style={styles.muted}>Define up to 5 custom Alive rules for private rooms and casual practice.</Text>
      {rules.slice(0, 5).map((rule, index) => (
        <View key={rule.id} style={styles.funRuleCard}>
          <View style={styles.funRuleHeader}>
            <Text style={styles.funRuleNumber}>{index + 1}</Text>
            <Pressable onPress={() => onUpdate(index, { enabled: !rule.enabled })} style={[styles.funRuleToggle, rule.enabled && styles.funRuleToggleOn]}>
              <Text style={[styles.funRuleToggleText, rule.enabled && styles.funRuleToggleTextOn]}>{rule.enabled ? "On" : "Off"}</Text>
            </Pressable>
          </View>
          <TextInput
            value={rule.name}
            onChangeText={(name) => onUpdate(index, { name })}
            placeholder="Rule name"
            placeholderTextColor="#8aa0b6"
            style={styles.funRuleInput}
          />
          <TextInput
            value={rule.description}
            onChangeText={(description) => onUpdate(index, { description })}
            placeholder="What changes in the game?"
            placeholderTextColor="#8aa0b6"
            multiline
            style={[styles.funRuleInput, styles.funRuleDescriptionInput]}
          />
        </View>
      ))}
    </View>
  );
}

function BoardThemeStudio({
  activeTheme,
  settings,
  onChangeCustomColor,
  onSelectTheme,
}: {
  activeTheme: BoardTheme;
  settings: PlayerSettings;
  onChangeCustomColor: (key: "dark" | "highlight" | "light", color: string) => void;
  onSelectTheme: (themeId: string) => void;
}) {
  const customTheme = resolveBoardTheme({ ...settings, boardTheme: customBoardThemeId });
  const presetThemes = [...boardThemes, customTheme];
  return (
    <View style={styles.boardStudio}>
      <View style={styles.boardStudioHeader}>
        <View>
          <Text style={styles.boardStudioTitle}>Board Studio</Text>
          <Text style={styles.boardStudioMeta}>Choose a preset or build your own colors.</Text>
        </View>
        <View style={styles.boardStudioPreview}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.boardStudioPreviewRow}>
              {[0, 1, 2, 3].map((col) => {
                const isLight = (row + col) % 2 === 0;
                return <View key={`${row}-${col}`} style={[styles.boardStudioPreviewSquare, { backgroundColor: isLight ? activeTheme.light : activeTheme.dark }]} />;
              })}
            </View>
          ))}
          <View style={[styles.boardStudioPreviewGlow, { backgroundColor: activeTheme.highlight }]} />
        </View>
      </View>

      <View style={styles.themePresetGrid}>
        {presetThemes.map((theme) => (
          <ThemePresetCard key={theme.id} active={settings.boardTheme === theme.id} theme={theme} onPress={() => onSelectTheme(theme.id)} />
        ))}
      </View>

      <BoardColorSwatchGroup
        label="Light squares"
        selected={activeTheme.light}
        swatches={boardLightSwatches}
        onSelect={(color) => onChangeCustomColor("light", color)}
      />
      <BoardColorSwatchGroup
        label="Dark squares"
        selected={activeTheme.dark}
        swatches={boardDarkSwatches}
        onSelect={(color) => onChangeCustomColor("dark", color)}
      />
      <BoardColorSwatchGroup
        label="Move highlight"
        selected={activeTheme.highlight}
        swatches={boardHighlightSwatches}
        onSelect={(color) => onChangeCustomColor("highlight", color)}
      />
    </View>
  );
}

function AnimationSettingsStudio({
  animationSets,
  onSave,
  pieceSets,
  settings,
}: {
  animationSets: AnimationSet[];
  onSave: (settings: PlayerSettings) => void;
  pieceSets: PieceSet[];
  settings: PlayerSettings;
}) {
  const selectedPieceSet = pieceSets.find((set) => set.id === settings.pieceSetId) ?? pieceSets[0];
  const compatibleAnimationSets = animationSets.filter((set) => !selectedPieceSet || set.pieceSetId === selectedPieceSet.id);
  const selectedAnimationSet = compatibleAnimationSets.find((set) => set.id === settings.animationSetId) ?? compatibleAnimationSets[0];
  return (
    <View style={styles.animationSettingsStudio}>
      <View style={styles.animationSettingsHeader}>
        <View>
          <Text style={styles.boardStudioTitle}>Ceremony Animation Set</Text>
          <Text style={styles.boardStudioMeta}>Animations now run only before game start and after checkmate.</Text>
        </View>
        <Pressable
          onPress={() => onSave({ ...settings, animationsEnabled: !settings.animationsEnabled })}
          style={({ pressed }) => [styles.animationToggle, settings.animationsEnabled && styles.animationToggleOn, pressed && styles.pressed]}
        >
          <Text style={[styles.animationToggleText, settings.animationsEnabled && styles.animationToggleTextOn]}>{settings.animationsEnabled ? "Animations On" : "Off"}</Text>
        </Pressable>
      </View>
      <View style={styles.animationSelectorGrid}>
        <View style={styles.animationSelectorColumn}>
          <Text style={styles.colorSwatchLabel}>Piece Set</Text>
          {pieceSets.map((pieceSet) => (
            <Pressable
              key={pieceSet.id}
              onPress={() =>
                onSave({
                  ...settings,
                  pieceSetId: pieceSet.id,
                  animationSetId: animationSets.find((set) => set.pieceSetId === pieceSet.id)?.id ?? settings.animationSetId,
                })
              }
              style={({ pressed }) => [styles.animationChoiceCard, settings.pieceSetId === pieceSet.id && styles.animationChoiceCardActive, pressed && styles.pressed]}
            >
              <Text style={styles.animationChoiceTitle}>{pieceSet.name}</Text>
              <Text numberOfLines={2} style={styles.muted}>{pieceSet.description}</Text>
              <View style={styles.pieceSetMiniStrip}>
                {pieceOrder.map((piece) => (
                  <View key={piece} style={[styles.pieceSetMiniPiece, !pieceSet.pieces[piece] && styles.pieceSetMiniPieceMissing]}>
                    <Text style={styles.pieceSetMiniPieceText}>{pieceGlyphs[piece]}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.animationSelectorColumn}>
          <Text style={styles.colorSwatchLabel}>Animation Set</Text>
          {compatibleAnimationSets.map((animationSet) => (
            <Pressable
              key={animationSet.id}
              onPress={() => onSave({ ...settings, animationSetId: animationSet.id })}
              style={({ pressed }) => [styles.animationChoiceCard, settings.animationSetId === animationSet.id && styles.animationChoiceCardActive, pressed && styles.pressed]}
            >
              <Text style={styles.animationChoiceTitle}>{animationSet.name}</Text>
              <Text numberOfLines={2} style={styles.muted}>{animationSet.description}</Text>
              <StatLine label="Ceremonies" value={String(animationSet.rules.length)} />
            </Pressable>
          ))}
          {!selectedAnimationSet && <Text style={styles.muted}>No animation sets are attached to this piece set yet.</Text>}
        </View>
      </View>
    </View>
  );
}

function ThemePresetCard({ active, onPress, theme }: { active: boolean; onPress: () => void; theme: BoardTheme }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.themePresetCard, active && styles.themePresetCardActive, pressed && styles.pressed]}>
      <View style={styles.themePresetBoard}>
        <View style={[styles.themePresetSquare, { backgroundColor: theme.light }]} />
        <View style={[styles.themePresetSquare, { backgroundColor: theme.dark }]} />
        <View style={[styles.themePresetSquare, { backgroundColor: theme.dark }]} />
        <View style={[styles.themePresetSquare, { backgroundColor: theme.light }]} />
      </View>
      <Text numberOfLines={1} style={[styles.themePresetText, active && styles.themePresetTextActive]}>{theme.name}</Text>
    </Pressable>
  );
}

function BoardColorSwatchGroup({
  label,
  onSelect,
  selected,
  swatches,
}: {
  label: string;
  onSelect: (color: string) => void;
  selected: string;
  swatches: string[];
}) {
  return (
    <View style={styles.colorSwatchGroup}>
      <Text style={styles.colorSwatchLabel}>{label}</Text>
      <View style={styles.colorSwatchRow}>
        {swatches.map((color) => {
          const active = color.toLowerCase() === selected.toLowerCase();
          return (
            <Pressable
              key={color}
              accessibilityLabel={`${label} ${color}`}
              onPress={() => onSelect(color)}
              style={({ pressed }) => [styles.colorSwatchButton, active && styles.colorSwatchButtonActive, pressed && styles.pressed]}
            >
              <View style={[styles.colorSwatch, { backgroundColor: color }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


const adminStyles = `
@keyframes rotate-sweep {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes gemini-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
.gemini-button-container {
  position: relative;
  overflow: hidden;
  border-radius: 9999px;
  padding: 2px;
  display: inline-flex;
  cursor: pointer;
}
.gemini-button-glow {
  position: absolute;
  inset: -100%;
  background: conic-gradient(from 0deg, transparent 0%, transparent 30%, #3b82f6 40%, #8b5cf6 50%, #ec4899 60%, transparent 70%);
  animation: rotate-sweep 4s linear infinite;
}
.gemini-button-inner {
  position: relative;
  background-color: #090b11;
  border-radius: 9999px;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  backdrop-filter: blur(10px);
}
.gemini-button-text {
  background: linear-gradient(to right, #60a5fa, #c084fc, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 600;
  font-size: 14px;
}
.gemini-glass-panel {
  background: rgba(255, 255, 255, 0.82) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(104, 124, 151, 0.16) !important;
  box-shadow: 0 10px 36px rgba(91, 111, 144, 0.12) !important;
}
`;

const Div = 'div' as any;
const Span = 'span' as any;
const Style = 'style' as any;

function GeminiButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  const runtime = globalThis as { document?: Document };
  if (!runtime.document) {
    return <ActionButton label={label} onPress={onPress} accent={accent} />;
  }
  return (
    <Div className="gemini-button-container" onClick={onPress}>
      {accent && <Div className="gemini-button-glow" />}
      <Div className="gemini-button-inner" style={{ backgroundColor: accent ? '#090b11' : '#1f293d' }}>
        <Span className="gemini-button-text" style={accent ? {} : { background: 'none', WebkitTextFillColor: '#e2e8f0', color: '#e2e8f0' }}>{label}</Span>
      </Div>
    </Div>
  );
}

function AnimationStudioAdmin({
  data,
  reload,
  services,
  settings,
  setSettings,
}: {
  data: DashboardData;
  reload: () => void | Promise<void>;
  services: ChessAliveServices;
  settings: PlayerSettings;
  setSettings: (settings: PlayerSettings) => void;
}) {
  const [studioPieceSets, setStudioPieceSets] = useState<PieceSet[]>(data.pieceSets);
  const [adminTab, setAdminTab] = useState<"pieceSets" | "animationSets" | "choreography">("pieceSets");
  const [studioAnimationClips, setStudioAnimationClips] = useState<AnimationClip[]>(data.animationClips);
  const activePieceSetId = settings.pieceSetId ?? data.animationSets.find((set) => set.id === settings.animationSetId)?.pieceSetId ?? data.pieceSets[0]?.id ?? seededPieceSetId;
  const [selectedPieceSetId, setSelectedPieceSetId] = useState(activePieceSetId);
  const selectedPieceSet = studioPieceSets.find((set) => set.id === selectedPieceSetId) ?? studioPieceSets[0];
  const availableAnimationSets = data.animationSets.filter((set) => set.pieceSetId === selectedPieceSet?.id);
  const activeAnimationSetId = settings.animationSetId ?? availableAnimationSets[0]?.id ?? seededAnimationSetId;
  const [selectedAnimationSetId, setSelectedAnimationSetId] = useState(activeAnimationSetId);
  const selectedAnimationSet = availableAnimationSets.find((set) => set.id === selectedAnimationSetId) ?? availableAnimationSets[0];
  const [selectedPiece, setSelectedPiece] = useState<PieceKind>("k");
  const [selectedAction, setSelectedAction] = useState<AnimationAction>("game-start-handshake");
  const [selectedSpeed, setSelectedSpeed] = useState<AnimationSpeed>("medium");
  const [selectedAssetSlot, setSelectedAssetSlot] = useState<PieceAssetSlotKey>("static");
  const [stack, setStack] = useState<string[]>(["king-opening-walk"]);
  const [choreographySteps, setChoreographySteps] = useState<AnimationChoreographyStep[]>(() => defaultChoreographySteps("k", "game-start-handshake"));
  const [selectedChoreographyStepId, setSelectedChoreographyStepId] = useState<string>("opening-walk-white");
  const [squareEditField, setSquareEditField] = useState<"from" | "to">("to");
  const [targetDraft, setTargetDraft] = useState<PieceTargetSpec>(() => defaultPieceTargetSpec("p"));
  const [newPieceSetName, setNewPieceSetName] = useState("Untitled Piece Set");
  const [uploadPath, setUploadPath] = useState("/uploads/seeded-pawn.glb");
  const [selectedUploadName, setSelectedUploadName] = useState("seeded-pawn.glb");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [assetFeedback, setAssetFeedback] = useState<{ tone: "error" | "saved" | "saving"; text: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ tone: "error" | "saved" | "saving"; text: string } | null>(null);
  const selectedPieceAsset = selectedPieceSet?.pieces[selectedPiece];
  const selectedSlotMeta = pieceAssetSlots.find((slot) => slot.key === selectedAssetSlot) ?? pieceAssetSlots[0];
  const selectedSlotAsset = selectedPieceAsset?.assetSlots?.[selectedAssetSlot];

  useEffect(() => {
    setStudioPieceSets(data.pieceSets);
  }, [data.pieceSets]);

  useEffect(() => {
    setStudioAnimationClips(data.animationClips);
  }, [data.animationClips]);

  useEffect(() => {
    if (selectedPieceSet && !studioPieceSets.some((set) => set.id === selectedPieceSetId)) setSelectedPieceSetId(selectedPieceSet.id);
  }, [selectedPieceSet?.id, selectedPieceSetId, studioPieceSets]);

  useEffect(() => {
    if (selectedAnimationSet) return;
    const fallback = availableAnimationSets[0]?.id;
    if (fallback) setSelectedAnimationSetId(fallback);
  }, [availableAnimationSets, selectedAnimationSet?.id]);

  useEffect(() => {
    setTargetDraft({ ...defaultPieceTargetSpec(selectedPiece), ...selectedPieceSet?.pieceTargets?.[selectedPiece] });
  }, [selectedPiece, selectedPieceSet?.id]);

  useEffect(() => {
    setSelectedUploadFile(null);
    setSelectedUploadName(selectedSlotAsset?.fileName ?? selectedPieceAsset?.displayName ?? "");
    setUploadPath(selectedSlotAsset?.path ?? (selectedAssetSlot === "static" ? selectedPieceAsset?.glbPath ?? "" : ""));
  }, [selectedAssetSlot, selectedPiece, selectedPieceAsset?.glbPath, selectedPieceSet?.id, selectedSlotAsset?.path]);

  useEffect(() => {
    const existingRule = selectedAnimationSet?.rules.find((rule) => rule.piece === selectedPiece && rule.action === selectedAction);
    if (!existingRule) {
      const nextSteps = defaultChoreographySteps(selectedPiece, selectedAction);
      setSelectedSpeed("medium");
      setStack([]);
      setChoreographySteps(nextSteps);
      setSelectedChoreographyStepId(nextSteps[0]?.id ?? "");
      return;
    }
    setSelectedSpeed(existingRule.speed);
    setStack([...existingRule.clipStack].sort((a, b) => a.order - b.order).map((item) => item.clipId));
    const nextSteps = existingRule.choreographySteps?.length ? existingRule.choreographySteps : defaultChoreographySteps(selectedPiece, selectedAction);
    setChoreographySteps(nextSteps);
    setSelectedChoreographyStepId(nextSteps[0]?.id ?? "");
  }, [selectedAction, selectedAnimationSet?.id, selectedPiece]);

  const actionOptions = useMemo(() => {
    const options = [...pieceActionOptions[selectedPiece], ...genericActionOptions];
    return options.filter((option, index) => options.findIndex((candidate) => candidate.id === option.id) === index);
  }, [selectedPiece]);

  useEffect(() => {
    if (actionOptions.some((option) => option.id === selectedAction)) return;
    const nextAction = actionOptions[0]?.id;
    if (nextAction) setSelectedAction(nextAction);
  }, [actionOptions, selectedAction]);

  const selectedRules = selectedAnimationSet?.rules.filter((rule) => rule.piece === selectedPiece) ?? [];
  const pieceSetClipIds = new Set(selectedPieceSet?.animationClipIds ?? []);
  const selectedAssetClipIds = new Set(selectedPieceAsset?.detectedAnimationClipIds ?? []);
  const pieceSetClips = selectedPieceSet
    ? studioAnimationClips.filter(
        (clip) =>
          pieceSetClipIds.has(clip.id) ||
          selectedAssetClipIds.has(clip.id) ||
          (clip.compatiblePieces.includes(selectedPiece) && (clip.tags.includes("ceremony") || clip.tags.includes(pieceNames[selectedPiece].toLowerCase()))),
      )
    : studioAnimationClips;
  const clips = pieceSetClips.filter((clip) => clip.compatiblePieces.includes(selectedPiece));
  const previewSignature = `${selectedPiece}:${selectedAction}:${selectedSpeed}:${stack.join(">")}`;
  const previewClipNames = stack.map((clipId) => studioAnimationClips.find((item) => item.id === clipId)?.name ?? clipId);
  const previewDuration = animationStackDurationMs(stack, studioAnimationClips, selectedSpeed);
  const selectedChoreographyStep = choreographySteps.find((step) => step.id === selectedChoreographyStepId) ?? choreographySteps[0];
  const selectedPieceSetAnimationSets = data.animationSets.filter((set) => set.pieceSetId === selectedPieceSet?.id);
  const adminTabMotion = useReplayEntrance(adminTab, { distance: 14, duration: 260 });

  useEffect(() => {
    setSaveFeedback(null);
  }, [previewSignature]);

  async function activateForPlay(pieceSetId: string, animationSetId = selectedAnimationSet?.id ?? seededAnimationSetId) {
    const nextSettings: PlayerSettings = {
      ...settings,
      animationsEnabled: true,
      animationSetId,
      enabled: true,
      pieceSetId,
    };
    setSettings(nextSettings);
    await services.settings.saveSettings(data.user?.id ?? "admin-local", nextSettings);
  }

  async function createPieceSet() {
    const created = await services.animationStudio.createPieceSet({
      description: "Upload GLBs for each piece, then build animation behavior on top.",
      name: newPieceSetName.trim() || "Untitled Piece Set",
    });
    setStudioPieceSets((current) => [...current.filter((set) => set.id !== created.id), created]);
    setSelectedPieceSetId(created.id);
    await reload();
  }

  async function duplicatePieceSet() {
    if (!selectedPieceSet) return;
    const created = await services.animationStudio.duplicatePieceSet(selectedPieceSet.id);
    setStudioPieceSets((current) => [...current.filter((set) => set.id !== created.id), created]);
    setSelectedPieceSetId(created.id);
    await reload();
  }

  async function createAnimationSet() {
    if (!selectedPieceSet) return;
    const created = await services.animationStudio.createAnimationSet({
      description: "Opening handshake and checkmate finisher mapping for this piece set.",
      name: `${selectedPieceSet.name} Custom`,
      pieceSetId: selectedPieceSet.id,
    });
    setSelectedAnimationSetId(created.id);
    await activateForPlay(selectedPieceSet.id, created.id);
    await reload();
  }

  async function attachGlbToPiece() {
    const trimmedPath = uploadPath.trim();
    if (!selectedPieceSet) return;
    if (!trimmedPath) {
      setAssetFeedback({ tone: "error", text: "Choose a file or paste an asset path before attaching it to this slot." });
      return;
    }
    const isGlbAsset = selectedSlotMeta.accepts === "glb";
    setAssetFeedback({ tone: "saving", text: `Attaching ${pieceNames[selectedPiece]} ${selectedSlotMeta.label}...` });
    const sourceAssetId = `piece-asset-${selectedPiece}-${selectedAssetSlot}-${Date.now()}`;
    const pieceAssetId = selectedPieceAsset?.id ?? `piece-asset-${selectedPiece}-${Date.now()}`;
    let persistedAssetPath = trimmedPath;
    let detectionGlbPath = isGlbAsset ? trimmedPath : "";
    let uploadScope: "path" | "server" | "browser" = selectedUploadFile ? "server" : "path";
    if (!selectedUploadFile && isBundledKnightHorsePath(trimmedPath)) {
      persistedAssetPath = bundledHorseGlbPath;
      detectionGlbPath = bundledHorseGlbPath;
    }
    if (selectedUploadFile) {
      const objectUrl = isGlbAsset ? URL.createObjectURL(selectedUploadFile) : "";
      detectionGlbPath = objectUrl;
      try {
        const uploaded = await uploadAssetFileToServer(selectedUploadFile, selectedPiece, selectedAssetSlot);
        persistedAssetPath = uploaded.assetUrl;
        uploadScope = "server";
      } catch {
        const savedToBrowser = await saveGlbBlobToBrowser(sourceAssetId, selectedUploadFile);
        if (!savedToBrowser) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          setAssetFeedback({ tone: "error", text: "Could not upload or locally store this asset. Start the realtime server or try a smaller file." });
          return;
        }
        persistedAssetPath = `indexeddb-glb://${sourceAssetId}`;
        uploadScope = "browser";
      }
    }
    const detectedClips = isGlbAsset
      ? (await detectGlbAnimationClips(detectionGlbPath, selectedPiece, sourceAssetId)).map((clip) => ({
          ...clip,
          sourceGlbPath: persistedAssetPath,
        }))
      : [];
    if (selectedUploadFile && detectionGlbPath.startsWith("blob:")) URL.revokeObjectURL(detectionGlbPath);
    if (detectedClips.length > 0) {
      await services.animationStudio.saveAnimationClips(detectedClips);
      setStudioAnimationClips((current) => {
        const merged = new Map(current.map((clip) => [clip.id, clip]));
        detectedClips.forEach((clip) => merged.set(clip.id, clip));
        return [...merged.values()];
      });
    }
    const isSeedPawnAsset = selectedPiece === "p" && (trimmedPath.includes("Pawn_animation.glb") || selectedUploadName.includes("Pawn_animation.glb"));
    const fallbackClipIds = isSeedPawnAsset ? studioAnimationClips.filter((clip) => clip.compatiblePieces.includes("p")).map((clip) => clip.id) : [];
    const clipIds = detectedClips.length > 0 ? detectedClips.map((clip) => clip.id) : fallbackClipIds;
    const previousAsset = selectedPieceSet.pieces[selectedPiece];
    const nextDetectedClipIds = Array.from(new Set([...(previousAsset?.detectedAnimationClipIds ?? []), ...clipIds]));
    const nextGlbPath = isGlbAsset ? persistedAssetPath : previousAsset?.glbPath ?? "";
    const nextAssetSlots = {
      ...previousAsset?.assetSlots,
      ...(isGlbAsset
        ? {
            static: {
              fileName: selectedUploadName || trimmedPath.split("/").pop() || "static.glb",
              kind: "glb" as const,
              path: persistedAssetPath,
              uploadedAt: new Date().toISOString(),
            },
            move: {
              fileName: selectedUploadName || trimmedPath.split("/").pop() || "move.glb",
              kind: "glb" as const,
              path: persistedAssetPath,
              uploadedAt: new Date().toISOString(),
            },
            capture: {
              fileName: selectedUploadName || trimmedPath.split("/").pop() || "capture.glb",
              kind: "glb" as const,
              path: persistedAssetPath,
              uploadedAt: new Date().toISOString(),
            },
            celebrate: {
              fileName: selectedUploadName || trimmedPath.split("/").pop() || "celebrate.glb",
              kind: "glb" as const,
              path: persistedAssetPath,
              uploadedAt: new Date().toISOString(),
            },
          }
        : {
            [selectedAssetSlot]: {
              fileName: selectedUploadName || trimmedPath.split("/").pop() || selectedSlotMeta.label,
              kind: "image" as const,
              path: persistedAssetPath,
              uploadedAt: new Date().toISOString(),
            },
          }),
    };
    const next: PieceSet = {
      ...selectedPieceSet,
      animationClipIds: Array.from(new Set([...selectedPieceSet.animationClipIds, ...clipIds])),
      pieces: {
        ...selectedPieceSet.pieces,
        [selectedPiece]: {
          ...previousAsset,
          assetSlots: nextAssetSlots,
          detectedAnimationClipIds: nextDetectedClipIds,
          displayName: `${pieceNames[selectedPiece]} asset pack`,
          glbPath: nextGlbPath,
          id: pieceAssetId,
          piece: selectedPiece,
          uploadedAt: new Date().toISOString(),
        },
      },
    };
    try {
      const saved = await services.animationStudio.savePieceSet(next);
      setStudioPieceSets((current) => current.map((set) => (set.id === saved.id ? saved : set)));
      setSelectedPieceSetId(saved.id);
      setSelectedUploadFile(null);
      setSelectedUploadName("");
      setUploadPath(persistedAssetPath);
      await activateForPlay(saved.id);
      const clipNote =
        clipIds.length > 0
          ? `${clipIds.length} animation clip${clipIds.length === 1 ? "" : "s"} detected and linked.`
          : isGlbAsset
            ? "Asset attached. No animation clips were detected from this GLB."
            : "Reference image attached.";
      setStack(clipIds.slice(0, Math.min(2, clipIds.length)));
      const storageNote =
        uploadScope === "server"
          ? "Shared server upload."
          : uploadScope === "browser"
            ? "Browser-local fallback; start the realtime server for shared upload."
            : "Path linked.";
      const slotNote = isGlbAsset ? "All GLB slots updated for Play." : `${selectedSlotMeta.label} updated.`;
      setAssetFeedback({ tone: "saved", text: `${pieceNames[selectedPiece]} ${slotNote} ${storageNote} ${clipNote} Active in Play.` });
      await reload();
    } catch (error) {
      setAssetFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not attach this GLB." });
    }
  }

  async function savePieceTargetSpec() {
    if (!selectedPieceSet) return;
    setAssetFeedback({ tone: "saving", text: `Saving ${pieceNames[selectedPiece]} visual target...` });
    try {
      const saved = await services.animationStudio.savePieceSet({
        ...selectedPieceSet,
        pieceTargets: {
          ...selectedPieceSet.pieceTargets,
          [selectedPiece]: targetDraft,
        },
      });
      setStudioPieceSets((current) => current.map((set) => (set.id === saved.id ? saved : set)));
      setSelectedPieceSetId(saved.id);
      setAssetFeedback({ tone: "saved", text: `${pieceNames[selectedPiece]} visual target saved.` });
      await reload();
    } catch (error) {
      setAssetFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not save the visual target." });
    }
  }

  function updateChoreographyStep(stepId: string, patch: Partial<AnimationChoreographyStep>) {
    setChoreographySteps((current) => current.map((step) => (step.id === stepId ? { ...step, ...patch } : step)));
  }

  function addChoreographyStep(kind: AnimationChoreographyStep["kind"] = "walk") {
    const last = choreographySteps[choreographySteps.length - 1];
    const nextStep: AnimationChoreographyStep = {
      durationMs: 900,
      from: last?.to ?? last?.from ?? "e4" as SquareName,
      id: `step-${kind}-${Date.now()}`,
      kind,
      label: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} step`,
      startsAtMs: last ? last.startsAtMs + last.durationMs : 0,
      to: last?.to ?? "e4" as SquareName,
    };
    setChoreographySteps((current) => [...current, nextStep]);
    setSelectedChoreographyStepId(nextStep.id);
  }

  function removeChoreographyStep(stepId: string) {
    setChoreographySteps((current) => {
      const next = current.filter((step) => step.id !== stepId);
      if (!next.some((step) => step.id === selectedChoreographyStepId)) setSelectedChoreographyStepId(next[0]?.id ?? "");
      return next;
    });
  }

  function handleChoreographySquare(square: SquareName) {
    if (!selectedChoreographyStep) return;
    updateChoreographyStep(selectedChoreographyStep.id, { [squareEditField]: square });
    setSquareEditField(squareEditField === "from" ? "to" : "from");
  }

  function resetChoreographyForAction() {
    const nextSteps = defaultChoreographySteps(selectedPiece, selectedAction);
    setChoreographySteps(nextSteps);
    setSelectedChoreographyStepId(nextSteps[0]?.id ?? "");
  }

  function chooseGlbFile() {
    const runtime = globalThis as typeof globalThis & {
      document?: {
        createElement: (tagName: string) => {
          accept: string;
          click: () => void;
          files?: ArrayLike<File>;
          onchange: null | (() => void);
          type: string;
        };
      };
      URL?: { createObjectURL?: (file: unknown) => string };
    };
    if (!runtime.document) {
      setAssetFeedback({ tone: "error", text: "File picker is only available in the web admin." });
      return;
    }
    const input = runtime.document.createElement("input");
    input.type = "file";
    input.accept = selectedSlotMeta.accepts === "image" ? "image/png,image/jpeg,image/webp" : ".glb,.gltf,model/gltf-binary,model/gltf+json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setSelectedUploadFile(file);
      setSelectedUploadName(file.name);
      setUploadPath(file.name);
      setAssetFeedback({ tone: "saved", text: `${file.name} selected for ${selectedSlotMeta.label}. Click Attach to ${pieceNames[selectedPiece]}.` });
    };
    input.click();
  }

  async function saveRule() {
    if (!selectedAnimationSet || stack.length === 0) {
      setSaveFeedback({ tone: "error", text: "Add at least one clip before saving this ceremony." });
      return;
    }
    setSaveFeedback({ tone: "saving", text: "Saving ceremony..." });
    const nextRule: AnimationRule = {
      action: selectedAction,
      choreographySteps: choreographySteps.map((step) => ({ ...step })),
      clipStack: stack.map((clipId, order) => ({ clipId, order })),
      enabled: true,
      id: `rule-${selectedPiece}-${selectedAction}-${Date.now()}`,
      piece: selectedPiece,
      speed: selectedSpeed,
    };
    try {
      const saved = await services.animationStudio.saveAnimationSet({
        ...selectedAnimationSet,
        rules: [...selectedAnimationSet.rules.filter((rule) => !(rule.piece === selectedPiece && rule.action === selectedAction)), nextRule],
      });
      setSelectedAnimationSetId(saved.id);
      await activateForPlay(saved.pieceSetId, saved.id);
      setSaveFeedback({ tone: "saved", text: `${pieceNames[selectedPiece]} ${animationActionLabel(selectedAction).toLowerCase()} ceremony saved and active in Play.` });
      await reload();
    } catch (error) {
      setSaveFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not save this ceremony." });
    }
  }

  function moveStackItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stack.length) return;
    const next = [...stack];
    [next[index], next[target]] = [next[target], next[index]];
    setStack(next);
  }

  function animationRuleSummary(rule?: AnimationRule) {
    if (!rule) return "Not configured";
    const clipNames = [...rule.clipStack]
      .sort((a, b) => a.order - b.order)
      .map((item) => studioAnimationClips.find((clip) => clip.id === item.clipId)?.name ?? item.clipId);
    return clipNames.length > 0 ? clipNames.join(" -> ") : "No clips selected";
  }

  function firstClipForRule(rule?: AnimationRule) {
    const firstClipId = [...(rule?.clipStack ?? [])].sort((a, b) => a.order - b.order)[0]?.clipId;
    return studioAnimationClips.find((clip) => clip.id === firstClipId);
  }

  function selectCeremonyCoverage(piece: PieceKind, action: AnimationAction) {
    setSelectedPiece(piece);
    setSelectedAction(action);
    setSelectedAssetSlot(action === "game-start-handshake" ? "move" : "capture");
  }

  return (
    <Panel title="Piece Sets + Animation Studio">
      <Style>{adminStyles}</Style>
      <View style={[styles.animationStudioHero, { backgroundColor: 'transparent' }]} {...{ className: "gemini-glass-panel" } as any}>
        <View>
          <Text style={styles.animationStudioTitle}>Piece Sets and Ceremonies</Text>
          <Text style={styles.animationStudioCopy}>Upload GLB assets into a piece set, attach multiple animation sets to it, then choreograph exactly how the pieces move on the board.</Text>
        </View>
        <GeminiButton label="Activate Selected" onPress={() => selectedPieceSet && void activateForPlay(selectedPieceSet.id, selectedAnimationSet?.id)} accent />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, marginTop: 16 }}>
        <Pressable onPress={() => setAdminTab('pieceSets')} style={({ pressed }) => [styles.actionPill, adminTab === 'pieceSets' && styles.actionPillActive, { flex: 1 }, pressed && styles.pressed]}><Text style={[styles.actionPillText, adminTab === 'pieceSets' && styles.actionPillTextActive, { textAlign: 'center' }]}>Piece Sets</Text></Pressable>
        <Pressable onPress={() => setAdminTab('animationSets')} style={({ pressed }) => [styles.actionPill, adminTab === 'animationSets' && styles.actionPillActive, { flex: 1 }, pressed && styles.pressed]}><Text style={[styles.actionPillText, adminTab === 'animationSets' && styles.actionPillTextActive, { textAlign: 'center' }]}>Animation Sets</Text></Pressable>
        <Pressable onPress={() => setAdminTab('choreography')} style={({ pressed }) => [styles.actionPill, adminTab === 'choreography' && styles.actionPillActive, { flex: 1 }, pressed && styles.pressed]}><Text style={[styles.actionPillText, adminTab === 'choreography' && styles.actionPillTextActive, { textAlign: 'center' }]}>Board Choreography</Text></Pressable>
      </View>

      <Animated.View key={`admin-tab-${adminTab}`} style={adminTabMotion}>
        {adminTab === 'pieceSets' && (
          <View {...{ className: "gemini-glass-panel" } as any} style={{ padding: 16, borderRadius: 12 }}>
          <View style={styles.animationStudioInlineForm}>
            <TextInput value={newPieceSetName} onChangeText={setNewPieceSetName} placeholder="Piece set name" placeholderTextColor="#8aa0b6" style={styles.animationStudioInput} />
            <GeminiButton label="Create Piece Set" onPress={() => void createPieceSet()} accent />
            <GeminiButton label="Duplicate Selected" onPress={() => void duplicatePieceSet()} />
          </View>
          <View style={styles.pieceSetCardGrid}>
            {studioPieceSets.map((pieceSet) => {
              const uploadedCount = pieceOrder.filter((piece) => pieceSet.pieces[piece]).length;
              const attachedSetCount = data.animationSets.filter((set) => set.pieceSetId === pieceSet.id).length;
              const active = pieceSet.id === selectedPieceSet?.id;
              return (
                <Pressable key={pieceSet.id} onPress={() => setSelectedPieceSetId(pieceSet.id)} style={({ pressed }) => [styles.pieceSetCard, active && styles.pieceSetCardActive, pressed && styles.pressed]}>
                  <View style={styles.pieceSetCardHeader}>
                    <Text style={styles.pieceSetCardTitle}>{pieceSet.name}</Text>
                    {pieceSet.isSeededExample && <Text style={styles.seedBadge}>Starter</Text>}
                  </View>
                  <Text numberOfLines={2} style={styles.muted}>{pieceSet.description}</Text>
                  <View style={styles.pieceSetRosterStrip}>
                    {pieceOrder.map((piece) => (
                      <View key={piece} style={[styles.pieceRosterPip, !pieceSet.pieces[piece] && styles.pieceRosterPipMissing]}>
                        <Text style={styles.pieceRosterPipText}>{pieceGlyphs[piece]}</Text>
                      </View>
                    ))}
                  </View>
                  <StatLine label="Uploaded pieces" value={`${uploadedCount}/6`} />
                  <StatLine label="Clips" value={String(pieceSet.animationClipIds.length)} />
                  <StatLine label="Animation sets" value={String(attachedSetCount)} />
                </Pressable>
              );
            })}
          </View>
          </View>
        )}

        {adminTab === 'pieceSets' && selectedPieceSet && (
          <View {...{ className: "gemini-glass-panel" } as any} style={{ padding: 16, borderRadius: 12 }}>
          <View style={styles.animationStudioSectionHeader}>
            <View>
              <Text style={styles.animationStudioSubTitle}>Six-Piece Roster</Text>
              <Text style={styles.muted}>Select a piece. Upload static.glb, opening walk, checkmate kick, share clip, or a reference image. Existing uploads are shown on each slot.</Text>
            </View>
          </View>
          <View style={styles.pieceRosterGrid}>
            {pieceOrder.map((piece) => {
              const uploaded = Boolean(selectedPieceSet.pieces[piece]);
              return (
                <Pressable key={piece} onPress={() => setSelectedPiece(piece)} style={({ pressed }) => [styles.pieceRosterCard, selectedPiece === piece && styles.pieceRosterCardActive, pressed && styles.pressed]}>
                  <View style={[styles.pieceRosterPreview, !uploaded && styles.pieceRosterPreviewMissing]}>
                    <RosterPiecePreview asset={selectedPieceSet.pieces[piece]} piece={piece} />
                  </View>
                  <Text style={styles.pieceRosterName}>{pieceNames[piece]}</Text>
                  <Text style={styles.muted}>{uploaded ? "Uploaded" : "Not uploaded yet"}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.animationBuilderGrid}>
            <View style={styles.animationBuilderPanel}>
              <Text style={styles.animationStudioSubTitle}>Asset Upload ({pieceNames[selectedPiece]})</Text>
              <Text style={styles.muted}>Upload ceremony-ready files for this piece.</Text>
              <View style={styles.assetSlotGrid}>
                {pieceAssetSlots.map((slot) => {
                  const slotAsset = selectedPieceAsset?.assetSlots?.[slot.key];
                  const active = selectedAssetSlot === slot.key;
                  return (
                    <Pressable key={slot.key} onPress={() => setSelectedAssetSlot(slot.key)} style={({ pressed }) => [styles.assetSlotCard, active && styles.assetSlotCardActive, pressed && styles.pressed]}>
                      <Text style={[styles.assetSlotTitle, active && styles.assetSlotTitleActive]}>{slot.label}</Text>
                      <Text numberOfLines={2} style={styles.assetSlotDescription}>{slot.description}</Text>
                      <Text style={[styles.assetSlotStatus, slotAsset && styles.assetSlotStatusReady]}>{slotAsset ? "Attached" : "Missing"}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text numberOfLines={1} style={styles.assetPathText}>
                {selectedSlotAsset?.path ?? (selectedAssetSlot === "static" && selectedPieceAsset?.glbPath ? selectedPieceAsset.glbPath : `${pieceNames[selectedPiece]} ${selectedSlotMeta.label} is missing.`)}
              </Text>
              <View style={styles.assetUploadBox}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  numberOfLines={1}
                  onChangeText={(value) => {
                    setSelectedUploadFile(null);
                    setUploadPath(value);
                  }}
                  placeholder={selectedSlotMeta.accepts === "image" ? "Paste reference image URL/path" : "Paste GLB path"}
                  placeholderTextColor="#8aa0b6"
                  selectTextOnFocus
                  style={[styles.animationStudioInput, styles.animationStudioInputFixed]}
                  value={uploadPath}
                />
              </View>
              <View style={styles.assetUploadActions}>
                <GeminiButton label={selectedSlotMeta.accepts === "image" ? "Choose Image" : "Choose GLB"} onPress={chooseGlbFile} />
                <GeminiButton label={`Attach ${selectedSlotMeta.label}`} onPress={() => void attachGlbToPiece()} accent />
              </View>
              {assetFeedback && (
                <Text style={[styles.saveFeedback, assetFeedback.tone === "error" && styles.saveFeedbackError, assetFeedback.tone === "saving" && styles.saveFeedbackSaving]}>
                  {assetFeedback.text}
                </Text>
              )}
            </View>
            <View style={styles.animationBuilderPanel}>
              <View style={styles.referencePreviewHeader}>
                <Text style={styles.previewSequenceLabel}>Reference Image</Text>
                <Text numberOfLines={1} style={styles.referencePreviewPath}>{selectedPieceAsset?.assetSlots?.reference?.path ? selectedPieceAsset.assetSlots.reference.path.split("/").pop() : "Upload reference image slot"}</Text>
              </View>
              <UploadedReferenceImagePreview path={selectedPieceAsset?.assetSlots?.reference?.path} />
            </View>
          </View>
          </View>
        )}

        {adminTab === 'animationSets' && selectedPieceSet && (
          <View {...{ className: "gemini-glass-panel" } as any} style={{ padding: 16, borderRadius: 12 }}>
          <View style={styles.animationStudioSectionHeader}>
            <View>
              <Text style={styles.animationStudioSubTitle}>Animation Sets for {selectedPieceSet.name}</Text>
              <Text style={styles.muted}>One piece set can have many animation sets. Pick one, then configure the opening handshake and checkmate finisher clips.</Text>
            </View>
            <GeminiButton label="New Animation Set" onPress={() => void createAnimationSet()} accent />
          </View>
          <View style={styles.animationSetCardGrid}>
            {selectedPieceSetAnimationSets.length === 0 ? (
              <Text style={styles.muted}>No animation set exists for this piece set yet.</Text>
            ) : (
              selectedPieceSetAnimationSets.map((animationSet) => (
                <Pressable
                  key={animationSet.id}
                  onPress={() => setSelectedAnimationSetId(animationSet.id)}
                  style={({ pressed }) => [styles.animationSetCard, selectedAnimationSet?.id === animationSet.id && styles.animationSetCardActive, pressed && styles.pressed]}
                >
                  <Text style={styles.pieceSetCardTitle}>{animationSet.name}</Text>
                  <Text numberOfLines={2} style={styles.muted}>{animationSet.description}</Text>
                  <StatLine label="Rules" value={String(animationSet.rules.length)} />
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.ceremonyCoveragePanel}>
            <View style={styles.ceremonyCoverageHeader}>
              <Text style={styles.animationStudioSubTitle}>Select Piece</Text>
              <Text style={styles.ceremonyCoverageBadge}>GLB only</Text>
            </View>
            <View style={styles.ceremonyCoverageGrid}>
              {pieceOrder.map((piece) => {
                const openingRule = piece === "k" ? selectedAnimationSet?.rules.find((rule) => rule.piece === piece && rule.action === "game-start-handshake") : undefined;
                const finisherRule = selectedAnimationSet?.rules.find((rule) => rule.piece === piece && rule.action === "checkmate-finisher");
                const focusAction: AnimationAction = piece === "k" && openingRule ? "game-start-handshake" : "checkmate-finisher";
                const previewRule = piece === "k" ? openingRule ?? finisherRule : finisherRule;
                const previewClip = firstClipForRule(previewRule);
                const previewGlbPath = previewClip?.sourceGlbPath;
                const uploaded = Boolean(selectedPieceSet.pieces[piece]);
                const hasRuleGlb = Boolean(previewGlbPath && canLoadGlbPath(previewGlbPath));
                return (
                  <Pressable
                    key={`coverage-${piece}`}
                    onPress={() => selectCeremonyCoverage(piece, focusAction)}
                    style={({ pressed }) => [styles.ceremonyCoverageCard, selectedPiece === piece && styles.ceremonyCoverageCardActive, pressed && styles.pressed]}
                  >
                    <View style={styles.ceremonyCoveragePiece}>
                      {hasRuleGlb ? (
                        <GlbModelPreview key={`coverage-${piece}-${previewGlbPath}-${previewClip?.name ?? ""}`} clipName={previewClip?.name} glbPath={previewGlbPath} piece={piece} />
                      ) : (
                        <RosterPiecePreview asset={selectedPieceSet.pieces[piece]} piece={piece} />
                      )}
                    </View>
                    <View style={styles.ceremonyCoverageCopy}>
                      <Text style={styles.ceremonyCoveragePieceName}>{pieceNames[piece]}</Text>
                      {piece === "k" && <Text numberOfLines={2} style={styles.ceremonyCoverageRule}>Opening: {animationRuleSummary(openingRule)}</Text>}
                      <Text numberOfLines={2} style={styles.ceremonyCoverageRule}>Checkmate: {animationRuleSummary(finisherRule)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.animationBuilderGrid}>
            <View style={styles.animationBuilderPanel}>
              <Text style={styles.animationStudioSubTitle}>Ceremony trigger</Text>
              <View style={styles.actionPillWrap}>
                {actionOptions.map((option) => (
                  <Pressable key={option.id} onPress={() => setSelectedAction(option.id)} style={({ pressed }) => [styles.actionPill, selectedAction === option.id && styles.actionPillActive, pressed && styles.pressed]}>
                    <Text style={[styles.actionPillText, selectedAction === option.id && styles.actionPillTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.animationStudioSubTitle}>Speed</Text>
              <View style={styles.speedSegment}>
                {speedOptions.map((speed) => (
                  <Pressable key={speed} onPress={() => setSelectedSpeed(speed)} style={[styles.speedOption, selectedSpeed === speed && styles.speedOptionActive]}>
                    <Text style={[styles.speedOptionText, selectedSpeed === speed && styles.speedOptionTextActive]}>{speed}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.animationStudioSubTitle, { marginTop: 16 }]}>Clip Library</Text>
              <ScrollView style={styles.clipLibrary} nestedScrollEnabled>
                {clips.length === 0 ? (
                  <Text style={styles.muted}>Upload a GLB or use the system ceremony clips.</Text>
                ) : (
                  clips.map((clip) => (
                    <Pressable key={clip.id} onPress={() => setStack((current) => [...current, clip.id])} style={({ pressed }) => [styles.clipCard, pressed && styles.pressed]}>
                      <View style={styles.clipCopy}>
                        <Text numberOfLines={1} style={styles.clipTitle}>{clip.name}</Text>
                        <Text numberOfLines={1} style={styles.muted}>{Math.round(clip.durationMs / 100) / 10}s · {clip.tags.join(", ")}</Text>
                      </View>
                      <Text style={styles.clipAdd}>Add</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.animationBuilderPanel}>
              <Text style={styles.animationStudioSubTitle}>Stack + Preview</Text>
              <View style={styles.stackList}>
                {stack.map((clipId, index) => {
                  const clip = studioAnimationClips.find((item) => item.id === clipId);
                  return (
                    <View key={`${clipId}-${index}`} style={styles.stackItem}>
                      <Text style={styles.stackOrder}>{index + 1}</Text>
                      <View style={styles.stackCopy}>
                        <Text numberOfLines={1} style={styles.clipTitle}>{clip?.name ?? clipId}</Text>
                        <Text numberOfLines={1} style={styles.muted}>{animationActionLabel(selectedAction)} · {selectedSpeed}</Text>
                      </View>
                      <Pressable onPress={() => moveStackItem(index, -1)} style={styles.stackButton}><Text style={styles.stackButtonText}>↑</Text></Pressable>
                      <Pressable onPress={() => moveStackItem(index, 1)} style={styles.stackButton}><Text style={styles.stackButtonText}>↓</Text></Pressable>
                      <Pressable onPress={() => setStack((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.stackButton}><Text style={styles.stackButtonText}>×</Text></Pressable>
                    </View>
                  );
                })}
              </View>
              <View style={styles.animationPreviewStage}>
                <AnimationBoardPreview action={selectedAction} clips={studioAnimationClips} piece={selectedPiece} pieceAsset={selectedPieceAsset} signature={previewSignature} speed={selectedSpeed} stack={stack} />
              </View>
              <View style={styles.previewSequenceBar}>
                <Text style={styles.previewSequenceLabel}>Live sequence</Text>
                <Text numberOfLines={2} style={styles.previewSequenceText}>
                  {previewClipNames.length > 0 ? `${previewClipNames.join(" -> ")} · ${(previewDuration / 1000).toFixed(1)}s` : "No clips selected"}
                </Text>
              </View>
              <GeminiButton label="Save Ceremony" onPress={() => void saveRule()} accent={stack.length > 0 && Boolean(selectedAnimationSet)} />
              {saveFeedback && (
                <Text style={[styles.saveFeedback, saveFeedback.tone === "error" && styles.saveFeedbackError, saveFeedback.tone === "saving" && styles.saveFeedbackSaving]}>
                  {saveFeedback.text}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.savedRulesWrap}>
            <Text style={styles.animationStudioSubTitle}>Configured Ceremonies ({pieceNames[selectedPiece]})</Text>
            {selectedRules.length === 0 ? (
              <Text style={styles.muted}>No rules yet for {pieceNames[selectedPiece]}.</Text>
            ) : (
              selectedRules.map((rule) => (
                <View key={rule.id} style={styles.savedRuleRow}>
                  <Text style={styles.savedRuleTitle}>{animationActionLabel(rule.action)}</Text>
                  <Text style={styles.muted}>{rule.clipStack.map((item) => studioAnimationClips.find((clip) => clip.id === item.clipId)?.name ?? item.clipId).join(" → ")}</Text>
                </View>
              ))
            )}
          </View>
          </View>
        )}

        {adminTab === 'choreography' && selectedPieceSet && (
          <View {...{ className: "gemini-glass-panel" } as any} style={{ padding: 16, borderRadius: 12 }}>
            <View style={styles.animationStudioSectionHeader}>
              <View>
                <Text style={styles.animationStudioSubTitle}>Board Choreography</Text>
                <Text style={styles.muted}>Configure the exact board squares, direction, timing, and action beat for the selected rule.</Text>
              </View>
              <GeminiButton label="Reset Suggested Path" onPress={resetChoreographyForAction} />
            </View>
            <View style={styles.choreographyStudioGrid}>
              <View style={styles.animationBuilderPanel}>
                <Text style={styles.animationStudioSubTitle}>Rule</Text>
                <View style={styles.actionPillWrap}>
                  {pieceOrder.map((piece) => (
                    <Pressable key={`choreo-piece-${piece}`} onPress={() => setSelectedPiece(piece)} style={({ pressed }) => [styles.actionPill, selectedPiece === piece && styles.actionPillActive, pressed && styles.pressed]}>
                      <Text style={[styles.actionPillText, selectedPiece === piece && styles.actionPillTextActive]}>{pieceNames[piece]}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.actionPillWrap}>
                  {actionOptions.map((option) => (
                    <Pressable key={`choreo-action-${option.id}`} onPress={() => setSelectedAction(option.id)} style={({ pressed }) => [styles.actionPill, selectedAction === option.id && styles.actionPillActive, pressed && styles.pressed]}>
                      <Text style={[styles.actionPillText, selectedAction === option.id && styles.actionPillTextActive]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.animationStudioSubTitle}>Timeline Steps</Text>
                <View style={styles.choreographyStepList}>
                  {choreographySteps.map((step, index) => (
                    <Pressable key={step.id} onPress={() => setSelectedChoreographyStepId(step.id)} style={({ pressed }) => [styles.choreographyStepRow, selectedChoreographyStep?.id === step.id && styles.choreographyStepRowActive, pressed && styles.pressed]}>
                      <Text style={styles.stackOrder}>{index + 1}</Text>
                      <View style={styles.stackCopy}>
                        <Text numberOfLines={1} style={styles.clipTitle}>{step.label}</Text>
                        <Text numberOfLines={1} style={styles.muted}>{step.kind} · {step.from ?? "?"} → {step.to ?? "?"} · {step.startsAtMs}ms / {step.durationMs}ms</Text>
                      </View>
                      <Pressable onPress={() => removeChoreographyStep(step.id)} style={styles.stackButton}><Text style={styles.stackButtonText}>×</Text></Pressable>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.assetUploadActions}>
                  {choreographyStepKinds.map((kind) => (
                    <Pressable key={`add-step-${kind}`} onPress={() => addChoreographyStep(kind)} style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}>
                      <Text style={styles.actionPillText}>+ {kind}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.animationBuilderPanel}>
                <Text style={styles.animationStudioSubTitle}>Chessboard Path Editor</Text>
                <Text style={styles.muted}>Click a step, choose From or To, then click the square on the board.</Text>
                <View style={styles.speedSegment}>
                  {(["from", "to"] as const).map((field) => (
                    <Pressable key={field} onPress={() => setSquareEditField(field)} style={[styles.speedOption, squareEditField === field && styles.speedOptionActive]}>
                      <Text style={[styles.speedOptionText, squareEditField === field && styles.speedOptionTextActive]}>{field.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
                <ChoreographyBoardEditor activeStep={selectedChoreographyStep} steps={choreographySteps} onPressSquare={handleChoreographySquare} />
                {selectedChoreographyStep && (
                  <View style={styles.choreographyInspector}>
                    <TextInput
                      value={selectedChoreographyStep.label}
                      onChangeText={(value) => updateChoreographyStep(selectedChoreographyStep.id, { label: value })}
                      placeholder="Step label"
                      placeholderTextColor="#8aa0b6"
                      style={[styles.animationStudioInput, styles.animationStudioInputFixed]}
                    />
                    <View style={styles.actionPillWrap}>
                      {choreographyStepKinds.map((kind) => (
                        <Pressable key={`kind-${kind}`} onPress={() => updateChoreographyStep(selectedChoreographyStep.id, { kind })} style={({ pressed }) => [styles.actionPill, selectedChoreographyStep.kind === kind && styles.actionPillActive, pressed && styles.pressed]}>
                          <Text style={[styles.actionPillText, selectedChoreographyStep.kind === kind && styles.actionPillTextActive]}>{kind}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.actionPillWrap}>
                      {choreographyFacingOptions.map((facing) => (
                        <Pressable key={`facing-${facing}`} onPress={() => updateChoreographyStep(selectedChoreographyStep.id, { facing })} style={({ pressed }) => [styles.actionPill, selectedChoreographyStep.facing === facing && styles.actionPillActive, pressed && styles.pressed]}>
                          <Text style={[styles.actionPillText, selectedChoreographyStep.facing === facing && styles.actionPillTextActive]}>{facing}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.choreographyNumberGrid}>
                      <TextInput
                        keyboardType="numeric"
                        value={String(selectedChoreographyStep.startsAtMs)}
                        onChangeText={(value) => updateChoreographyStep(selectedChoreographyStep.id, { startsAtMs: Number(value) || 0 })}
                        placeholder="Start ms"
                        placeholderTextColor="#8aa0b6"
                        style={[styles.animationStudioInput, styles.animationStudioInputFixed, { flex: 1 }]}
                      />
                      <TextInput
                        keyboardType="numeric"
                        value={String(selectedChoreographyStep.durationMs)}
                        onChangeText={(value) => updateChoreographyStep(selectedChoreographyStep.id, { durationMs: Math.max(100, Number(value) || 100) })}
                        placeholder="Duration ms"
                        placeholderTextColor="#8aa0b6"
                        style={[styles.animationStudioInput, styles.animationStudioInputFixed, { flex: 1 }]}
                      />
                    </View>
                    <View style={styles.previewSequenceBar}>
                      <Text style={styles.previewSequenceLabel}>Total Ceremony</Text>
                      <Text style={styles.previewSequenceText}>{(choreographyTotalDuration(choreographySteps) / 1000).toFixed(1)}s · saved with the selected animation rule</Text>
                    </View>
                    <GeminiButton label="Save Rule + Choreography" onPress={() => void saveRule()} accent={stack.length > 0 && Boolean(selectedAnimationSet)} />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </Panel>
  );
}

function adjustedAnimationDuration(durationMs: number, speed: AnimationSpeed) {
  return Math.round(durationMs * speedMultiplier(speed));
}

function animationStackDurationMs(stack: string[], clips: AnimationClip[], speed: AnimationSpeed) {
  return Math.max(
    900,
    stack.reduce((total, clipId) => {
      const clip = clips.find((item) => item.id === clipId);
      return total + adjustedAnimationDuration(clip?.durationMs ?? 1400, speed);
    }, 0),
  );
}

function animationPreviewVariant(action: AnimationAction, stack: string[], clip?: AnimationClip): PawnAnimationVariant {
  const signature = `${action}:${clip?.name ?? ""}:${clip?.tags.join(":") ?? ""}:${stack.join(":")}`.toLowerCase();
  if (signature.includes("checkmate") || signature.includes("finisher")) return "capture";
  if (signature.includes("handshake")) return "move";
  if (signature.includes("promotion") || signature.includes("dance") || signature.includes("jump")) return "promotion";
  if (signature.includes("capture") || signature.includes("punch") || signature.includes("attack") || signature.includes("running")) return "capture";
  return "move";
}

function RosterPiecePreview({ asset, piece }: { asset?: PieceAsset; piece: PieceKind }) {
  if (!asset) return <Text style={styles.pieceRosterPreviewGlyph}>{pieceGlyphs[piece]}</Text>;
  const previewGlbPath = asset.assetSlots?.static?.path ?? asset.glbPath;
  if (piece === "p" && !canLoadGlbPath(previewGlbPath)) return <PawnSpritePreview color="w" speed="medium" variant="move" />;
  return (
    <View style={styles.uploadedPiecePreview}>
      <GlbModelPreview key={`${previewGlbPath}:${asset.uploadedAt ?? ""}:${asset.assetSlots?.static?.uploadedAt ?? ""}`} glbPath={previewGlbPath} piece={piece} />
      <Text style={styles.uploadedPieceBadge}>GLB</Text>
    </View>
  );
}

function UploadedReferenceImagePreview({ path }: { path?: string }) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setResolvedUri(null);
    if (!path) return undefined;
    if (path.startsWith("indexeddb-glb://")) {
      const assetId = path.replace("indexeddb-glb://", "");
      void loadGlbBlobFromBrowser(assetId).then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedUri(objectUrl);
      });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    setResolvedUri(noCacheAssetUrl(path));
    return () => undefined;
  }, [path]);

  if (!path) {
    return (
      <View style={styles.referencePreviewEmpty}>
        <Text style={styles.referencePreviewEmptyText}>No reference image</Text>
      </View>
    );
  }
  if (!resolvedUri) {
    return (
      <View style={styles.referencePreviewEmpty}>
        <Text style={styles.referencePreviewEmptyText}>Loading reference...</Text>
      </View>
    );
  }
  return <Image source={{ uri: resolvedUri }} resizeMode="contain" style={styles.referencePreviewImage} />;
}

type PreviewScenario = {
  captured?: PieceKind;
  color: "w" | "b";
  from: SquareName;
  label: string;
  to: SquareName;
};

function previewScenarioFor(piece: PieceKind, action: AnimationAction): PreviewScenario {
  if (action === "game-start-handshake") return { color: "w", from: "e1", label: "Opening handshake preview", to: "d4" };
  if (action === "checkmate-finisher") return { captured: "k", color: "w", from: piece === "n" ? "f7" : "h5", label: `${pieceNames[piece]} checkmate finisher`, to: "e8" };
  const isCapture = action.includes("capture") || action.includes("attack") || action === "check" || action === "checkmate";
  if (piece === "p") {
    if (action === "promotion") return { color: "w", from: "e7", label: "Promotion preview", to: "e8" };
    if (isCapture) return { captured: "n", color: "w", from: "e4", label: "Capture preview", to: "d5" };
    if (action === "first-two-square") return { color: "w", from: "e2", label: "Two-square pawn move", to: "e4" };
    return { color: "w", from: "e2", label: "Normal move preview", to: "e3" };
  }
  if (piece === "n") return { captured: isCapture ? "r" : undefined, color: "w", from: "g1", label: isCapture ? "Knight capture preview" : "Knight move preview", to: "f3" };
  if (piece === "b") return { captured: isCapture ? "r" : undefined, color: "w", from: "c1", label: isCapture ? "Diagonal capture preview" : "Diagonal move preview", to: "g5" };
  if (piece === "r") return { captured: isCapture ? "q" : undefined, color: "w", from: "a1", label: isCapture ? "Straight capture preview" : "Straight move preview", to: "a5" };
  if (piece === "q") return { captured: isCapture ? "q" : undefined, color: "w", from: "d1", label: isCapture ? "Queen attack preview" : "Queen move preview", to: "h5" };
  if (action === "castle") return { color: "w", from: "e1", label: "Castle preview", to: "g1" };
  return { captured: isCapture ? "p" : undefined, color: "w", from: "e1", label: isCapture ? "King capture preview" : "King move preview", to: "e2" };
}

function squarePreviewPoint(square: SquareName, squareSize: number) {
  const column = files.indexOf(square[0] as (typeof files)[number]);
  const row = 8 - Number(square[1]);
  return {
    centerX: column * squareSize + squareSize / 2,
    centerY: row * squareSize + squareSize / 2,
    column,
    row,
  };
}

function previewAssetSlotForAction(action: AnimationAction): PieceAssetSlotKey {
  if (action === "promotion" || action === "checkmate-win" || action === "checkmate-finisher" || action === "game-start-handshake") return "celebrate";
  if (action.includes("capture") || action.includes("attack") || action === "check" || action === "checkmate") return "capture";
  return "move";
}

function ChoreographyBoardEditor({
  activeStep,
  onPressSquare,
  steps,
}: {
  activeStep?: AnimationChoreographyStep;
  onPressSquare: (square: SquareName) => void;
  steps: AnimationChoreographyStep[];
}) {
  const boardSize = 300;
  const squareSize = boardSize / 8;
  const activeFrom = activeStep?.from ? squarePreviewPoint(activeStep.from, squareSize) : null;
  const activeTo = activeStep?.to ? squarePreviewPoint(activeStep.to, squareSize) : null;
  return (
    <View style={[styles.choreographyBoard, { height: boardSize, width: boardSize }]}>
      {ranks.flatMap((rank, row) =>
        files.map((file, column) => {
          const square = `${file}${rank}` as SquareName;
          const isLight = (row + column) % 2 === 0;
          const isFrom = square === activeStep?.from;
          const isTo = square === activeStep?.to;
          const hasStep = steps.some((step) => step.from === square || step.to === square);
          return (
            <Pressable
              key={square}
              onPress={() => onPressSquare(square)}
              style={[
                styles.choreographySquare,
                { height: squareSize, left: column * squareSize, top: row * squareSize, width: squareSize },
                isLight ? styles.previewSquareLight : styles.previewSquareDark,
                hasStep && styles.choreographySquareUsed,
                isFrom && styles.choreographySquareFrom,
                isTo && styles.choreographySquareTo,
              ]}
            >
              <Text style={styles.choreographySquareLabel}>{square}</Text>
            </Pressable>
          );
        }),
      )}
      {activeFrom && activeTo && (
        <View
          pointerEvents="none"
          style={[
            styles.choreographyVector,
            {
              left: Math.min(activeFrom.centerX, activeTo.centerX),
              top: Math.min(activeFrom.centerY, activeTo.centerY),
              width: Math.abs(activeTo.centerX - activeFrom.centerX) || 4,
              height: Math.abs(activeTo.centerY - activeFrom.centerY) || 4,
            },
          ]}
        />
      )}
    </View>
  );
}

function AnimationBoardPreview({
  action,
  clips,
  piece,
  pieceAsset,
  signature,
  speed,
  stack,
}: {
  action: AnimationAction;
  clips: AnimationClip[];
  piece: PieceKind;
  pieceAsset?: PieceAsset;
  signature: string;
  speed: AnimationSpeed;
  stack: string[];
}) {
  const [elapsed, setElapsed] = useState(0);
  const scenario = previewScenarioFor(piece, action);
  const referenceImagePath = pieceAsset?.assetSlots?.reference?.path;
  const totalDuration = animationStackDurationMs(stack, clips, speed);
  const activeClip = activePreviewClip(elapsed, stack, clips, speed);
  const previewSlotPath = pieceAsset?.assetSlots?.[previewAssetSlotForAction(action)]?.path;
  const activePreviewGlbPath = previewSlotPath ?? pieceAsset?.assetSlots?.static?.path ?? activeClip?.sourceGlbPath ?? pieceAsset?.glbPath;
  const boardSize = 236;
  const squareSize = boardSize / 8;
  const from = squarePreviewPoint(scenario.from, squareSize);
  const to = squarePreviewPoint(scenario.to, squareSize);
  const loopProgress = totalDuration > 0 ? elapsed / totalDuration : 0;
  const transitionFrame = morphFrameForMoveProgress(loopProgress);
  const morph = morphTransitionPose(transitionFrame, squareSize);
  const moveProgress = smoothNumber(Math.max(0, Math.min(1, (loopProgress - 0.18) / 0.42)));
  const variant = animationPreviewVariant(action, stack);
  const hasPieceSprite = Boolean(piece !== "p" && pieceAnimationSpriteAssets[scenario.color][piece]?.[variant]);
  const canPreviewUploadedGlb = Boolean(pieceAsset && canLoadGlbPath(activePreviewGlbPath));
  const spriteSize = piece === "p" ? squareSize * 3.15 : hasPieceSprite ? squareSize * pieceAnimationPreviewScale : squareSize * 1.9;
  const spriteCenterX = from.centerX + (to.centerX - from.centerX) * moveProgress;
  const spriteCenterY = from.centerY + (to.centerY - from.centerY) * moveProgress - Math.sin(moveProgress * Math.PI) * squareSize * 0.45;
  const spriteOpacity = stack.length > 0 ? 1 : 0;
  const startPieceOpacity = stack.length > 0 ? 0 : 1;
  const targetOpacity = scenario.captured && stack.length > 0 ? Math.max(0, 1 - smoothNumber((moveProgress - 0.68) / 0.22)) : 1;
  const finalPieceOpacity = stack.length > 0 ? smoothNumber((loopProgress - 0.9) / 0.08) : 0;

  useEffect(() => {
    let frame = 0;
    const started = Date.now();
    setElapsed(0);
    const tick = () => {
      setElapsed((Date.now() - started) % totalDuration);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [signature, totalDuration]);

  return (
    <View style={styles.previewBoardShell}>
      <View style={[styles.previewBoard, { height: boardSize, width: boardSize }]}>
        {Array.from({ length: 64 }).map((_, index) => {
          const row = Math.floor(index / 8);
          const column = index % 8;
          const isLight = (row + column) % 2 === 0;
          const highlighted = (row === from.row && column === from.column) || (row === to.row && column === to.column);
          return (
            <View
              key={`${row}-${column}`}
              style={[
                styles.previewSquare,
                { height: squareSize, left: column * squareSize, top: row * squareSize, width: squareSize },
                isLight ? styles.previewSquareLight : styles.previewSquareDark,
                highlighted && styles.previewSquareHighlight,
              ]}
            />
          );
        })}
        <View
          style={[
            styles.previewStaticPieceFrame,
            {
              height: squareSize,
              left: from.column * squareSize,
              opacity: startPieceOpacity,
              top: from.row * squareSize,
              transform: [
                { translateY: morph.pieceTranslateY },
                { rotate: `${morph.pieceRotate}deg` },
                { scaleX: morph.pieceScaleX },
                { scaleY: morph.pieceScaleY },
              ],
              width: squareSize,
            },
          ]}
        >
          <PreviewAlphaPiece color={scenario.color} piece={piece} />
        </View>
        {scenario.captured && (
          <Text style={[styles.previewTargetPiece, { fontSize: squareSize * 1.2, height: squareSize, left: to.column * squareSize, lineHeight: squareSize, opacity: targetOpacity, top: to.row * squareSize, width: squareSize }]}>
            {pieceGlyphs[scenario.captured]}
          </Text>
        )}
        {stack.length > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.previewSpriteLayer,
              {
                height: spriteSize,
                left: spriteCenterX - spriteSize / 2,
                opacity: spriteOpacity,
                top: spriteCenterY - spriteSize * 0.62,
                width: spriteSize,
              },
            ]}
          >
            <PieceLifeMorph color={scenario.color} containerSize={spriteSize} flipX={to.column < from.column} morph={morph} piece={piece} pieceSize={squareSize}>
              {canPreviewUploadedGlb ? (
                <GlbModelPreview key={`${activePreviewGlbPath}:${activeClip?.name ?? ""}:${signature}`} clipName={activeClip?.name} color={scenario.color} glbPath={activePreviewGlbPath} piece={piece} />
              ) : piece === "p" ? (
                <PawnSpriteFrame color={scenario.color} progress={loopProgress} size={spriteSize} variant={variant} />
              ) : hasPieceSprite ? (
                <PieceAnimationSpriteFrame color={scenario.color} kind={piece} progress={loopProgress} size={spriteSize} variant={variant} />
              ) : (
                <PreviewAlphaPiece color={scenario.color} piece={piece} />
              )}
            </PieceLifeMorph>
          </View>
        ) : null}
        <View style={[styles.previewStaticPieceFrame, { height: squareSize, left: to.column * squareSize, opacity: finalPieceOpacity, top: to.row * squareSize, width: squareSize }]}>
          <PreviewAlphaPiece color={scenario.color} piece={piece} />
        </View>
      </View>
      <View style={styles.previewBoardCaption}>
        <Text style={styles.previewSequenceLabel}>{scenario.label}</Text>
        <Text numberOfLines={1} style={styles.previewNowPlaying}>
          {stack.length > 0 ? activeClip?.name ?? "Previewing stack" : "Add clips to play this move"}
        </Text>
      </View>
      <View style={styles.referencePreviewPanel}>
        <View style={styles.referencePreviewHeader}>
          <Text style={styles.previewSequenceLabel}>Reference</Text>
          <Text numberOfLines={1} style={styles.referencePreviewPath}>{referenceImagePath ? referenceImagePath.split("/").pop() : "Upload reference image slot"}</Text>
        </View>
        <UploadedReferenceImagePreview path={referenceImagePath} />
      </View>
    </View>
  );
}

function activePreviewClip(elapsed: number, stack: string[], clips: AnimationClip[], speed: AnimationSpeed) {
  let cursor = 0;
  for (const clipId of stack) {
    const clip = clips.find((item) => item.id === clipId);
    const durationMs = adjustedAnimationDuration(clip?.durationMs ?? 1400, speed);
    if (elapsed >= cursor && elapsed < cursor + durationMs) return clip;
    cursor += durationMs;
  }
  return stack.length > 0 ? clips.find((item) => item.id === stack[0]) : undefined;
}

function PawnStackPreview({
  action,
  clips,
  color,
  signature,
  speed,
  stack,
}: {
  action: AnimationAction;
  clips: AnimationClip[];
  color: "w" | "b";
  signature: string;
  speed: AnimationSpeed;
  stack: string[];
}) {
  const [elapsed, setElapsed] = useState(0);
  const segments = useMemo(
    () =>
      stack.map((clipId) => {
        const clip = clips.find((item) => item.id === clipId);
        return {
          clip,
          clipId,
          durationMs: adjustedAnimationDuration(clip?.durationMs ?? 1400, speed),
        };
      }),
    [action, clips, speed, stack],
  );
  const totalDuration = Math.max(900, segments.reduce((total, segment) => total + segment.durationMs, 0));
  const previewVariant = animationPreviewVariant(action, stack);

  useEffect(() => {
    let frame = 0;
    const started = Date.now();
    setElapsed(0);
    const tick = () => {
      setElapsed((Date.now() - started) % totalDuration);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [signature, totalDuration]);

  let cursor = 0;
  const activeSegment = segments.find((segment) => {
    const start = cursor;
    cursor += segment.durationMs;
    return elapsed >= start && elapsed < cursor;
  }) ?? segments[0];

  if (!activeSegment) return null;

  return (
    <View style={styles.pawnStackPreviewWrap}>
      <PawnSpritePreview color={color} durationMs={totalDuration} signature={signature} speed={speed} variant={previewVariant} />
      <Text numberOfLines={1} style={styles.previewNowPlaying}>
        {activeSegment.clip?.name ?? activeSegment.clipId}
      </Text>
    </View>
  );
}

function PawnSpritePreview({
  color,
  durationMs,
  signature,
  size = 118,
  speed,
  variant,
}: {
  color: "w" | "b";
  durationMs?: number;
  signature?: string;
  size?: number;
  speed: AnimationSpeed;
  variant: PawnAnimationVariant;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    setProgress(0);
    const started = Date.now();
    const duration = durationMs ?? (speed === "slow" ? 4200 : speed === "fast" ? 2200 : 3200);
    const tick = () => {
      setProgress(((Date.now() - started) % duration) / duration);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [durationMs, signature, speed, variant]);
  return <PawnSpriteFrame color={color} progress={progress} size={size} variant={variant} />;
}

function PawnSpriteFrame({ color, progress, size, variant }: { color: "w" | "b"; progress: number; size: number; variant: PawnAnimationVariant }) {
  const frame = Math.min(pawnAnimationFrameCount - 1, Math.floor(progress * pawnAnimationFrameCount));
  const column = frame % pawnAnimationColumns;
  const row = Math.floor(frame / pawnAnimationColumns);
  return (
    <View style={[styles.pawnPreviewClip, { height: size, width: size }]}>
      <Image
        resizeMode="stretch"
        source={pawnAnimationSpriteAssets[color][variant]}
        style={{
          height: size * pawnAnimationRows,
          transform: [{ translateX: -size * column }, { translateY: -size * row }],
          width: size * pawnAnimationColumns,
        }}
      />
    </View>
  );
}

function PieceAnimationSpriteFrame({
  color,
  kind,
  progress,
  size,
  variant,
}: {
  color: "w" | "b";
  kind: PieceKind;
  progress: number;
  size: number;
  variant: PieceAnimationVariant;
}) {
  const source = pieceAnimationSpriteAssets[color][kind]?.[variant];
  if (!source) {
    return <PreviewAlphaPiece color={color} piece={kind} />;
  }
  const frame = Math.min(pieceAnimationFrameCount - 1, Math.floor(progress * pieceAnimationFrameCount));
  const column = frame % pieceAnimationColumns;
  const row = Math.floor(frame / pieceAnimationColumns);
  return (
    <View style={[styles.pawnPreviewClip, { height: size, width: size }]}>
      <Image
        resizeMode="stretch"
        source={source}
        style={{
          height: size * pieceAnimationRows,
          transform: [{ translateX: -size * column }, { translateY: -size * row + size * pieceAnimationSpriteVerticalBias }],
          width: size * pieceAnimationColumns,
        }}
      />
    </View>
  );
}

function AdminScreen({
  data,
  reload,
  services,
  settings,
  setSettings,
}: {
  data: DashboardData;
  reload: () => void | Promise<void>;
  services: ChessAliveServices;
  settings: PlayerSettings;
  setSettings: (settings: PlayerSettings) => void;
}) {
  const [adminSection, setAdminSection] = useState<"studio" | "ops">("studio");
  return (
    <FeatureGrid>
      <Panel title="Admin">
        <View style={styles.adminSectionTabs}>
          <Pressable onPress={() => setAdminSection("studio")} style={({ pressed }) => [styles.actionPill, adminSection === "studio" && styles.actionPillActive, pressed && styles.pressed]}>
            <Text style={[styles.actionPillText, adminSection === "studio" && styles.actionPillTextActive]}>Piece Sets + Animations</Text>
          </Pressable>
          <Pressable onPress={() => setAdminSection("ops")} style={({ pressed }) => [styles.actionPill, adminSection === "ops" && styles.actionPillActive, pressed && styles.pressed]}>
            <Text style={[styles.actionPillText, adminSection === "ops" && styles.actionPillTextActive]}>Ops, Ads, Rooms</Text>
          </Pressable>
        </View>
      </Panel>
      {adminSection === "studio" ? (
        <AnimationStudioAdmin data={data} reload={reload} services={services} settings={settings} setSettings={setSettings} />
      ) : (
        <>
          <AdminOpsPanel data={data} />
          <Panel title="Database Admin">
            <StatLine label="Driver" value={data.databaseHealth?.driver ?? "local"} />
            <StatLine label="Hot store" value={data.databaseHealth?.hotStore ?? "memory"} />
            <StatLine label="Durable store" value={data.databaseHealth?.durableStore ?? "event log"} />
            <StatLine label="Latency budget" value={`${data.databaseHealth?.latencyBudgetMs ?? 0}ms`} />
          </Panel>
          <Panel title="Ad Admin">
            {data.ads.map((placement) => (
              <View key={placement.id} style={styles.lessonStep}>
                <Text style={styles.lessonStepTitle}>{placement.slot} · {placement.network}</Text>
                <Text style={styles.muted}>{placement.headline}</Text>
                <StatLine label="Format" value={placement.format} />
                <StatLine label="Refresh" value={`${placement.refreshSeconds}s`} />
              </View>
            ))}
          </Panel>
          <Panel title="Room Admin">
            {data.rooms.length === 0 ? (
              <Text style={styles.muted}>No active rooms.</Text>
            ) : (
              data.rooms.map((room) => (
                <View key={room.id} style={styles.lessonStep}>
                  <Text style={styles.lessonStepTitle}>{room.code}</Text>
                  <Text style={styles.muted}>{room.status} · {room.timeControl} · {room.region}</Text>
                  <StatLine label="Spectators" value={String(room.spectators)} />
                  <StatLine label="Updated" value={new Date(room.lastActivityAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                </View>
              ))
            )}
          </Panel>
        </>
      )}
    </FeatureGrid>
  );
}

function FeatureGrid({ children }: { children: ReactNode }) {
  return <View style={styles.featureGrid}>{children}</View>;
}

function PremiumScreen({ user, onNavigate }: { user: UserProfile | null; onNavigate: (screen: Screen) => void }) {
  const [purchaseState, setPurchaseState] = useState<"idle" | "loading" | "verifying" | "active" | "error">("idle");
  const [purchaseMessage, setPurchaseMessage] = useState("Secure monthly checkout is handled by Razorpay.");
  const premiumBenefits: Array<{
    benefit: string;
    free: string;
    icon: typeof Home;
    premium: string;
    rune: string;
    tone: IconTone;
  }> = [
      { benefit: "Private rooms", free: "1 active room", icon: Users, premium: "Unlimited rooms", rune: "∞", tone: "emerald" },
      { benefit: "Alive animation sets", free: "Starter set", icon: Sparkles, premium: "All creator sets", rune: "3D", tone: "violet" },
      { benefit: "Game review", free: "Basic summary", icon: BarChart3, premium: "Deeper review tools", rune: "A+", tone: "sky" },
      { benefit: "Board customization", free: "Core themes", icon: Layers, premium: "Full theme studio", rune: "FX", tone: "rose" },
      { benefit: "Ads", free: "Ads may appear later", icon: Shield, premium: "Ad-light experience", rune: "✓", tone: "gold" },
  ];

  async function handlePremiumPurchase() {
    if (!user) {
      setPurchaseState("error");
      setPurchaseMessage("Sign in before starting Razorpay checkout.");
      return;
    }
    try {
      setPurchaseState("loading");
      setPurchaseMessage("Creating secure Razorpay subscription...");
      const subscription = await createRazorpayPremiumSubscription(user);
      await loadRazorpayCheckoutScript();
      const Razorpay = (globalThis as { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
      if (!Razorpay) throw new Error("Razorpay checkout did not load.");
      const checkout = new Razorpay({
        amount: subscription.amount,
        currency: subscription.currency,
        description: "ChessAlive Premium monthly subscription",
        handler: async (payment: RazorpayCheckoutResponse) => {
          try {
            setPurchaseState("verifying");
            setPurchaseMessage("Verifying Razorpay payment signature...");
            await verifyRazorpayPremiumPayment(user, payment);
            setPurchaseState("active");
            setPurchaseMessage("Premium is active on this account.");
          } catch (error) {
            setPurchaseState("error");
            setPurchaseMessage(error instanceof Error ? error.message : "Payment verification failed.");
          }
        },
        key: subscription.keyId,
        modal: {
          ondismiss: () => {
            setPurchaseState((current) => current === "loading" ? "idle" : current);
            setPurchaseMessage("Checkout was closed before payment completion.");
          },
        },
        name: "ChessAlive",
        prefill: {
          email: user.email,
          name: user.displayName,
        },
        subscription_id: subscription.subscriptionId,
        theme: {
          color: "#0f9fb6",
        },
      });
      checkout.on("payment.failed", (failure) => {
        setPurchaseState("error");
        const message = typeof failure === "object" && failure && "error" in failure
          ? String((failure as { error?: { description?: string } }).error?.description ?? "Razorpay payment failed.")
          : "Razorpay payment failed.";
        setPurchaseMessage(message);
      });
      checkout.open();
      setPurchaseMessage("Razorpay checkout opened.");
    } catch (error) {
      setPurchaseState("error");
      setPurchaseMessage(error instanceof Error ? error.message : "Could not start Razorpay checkout.");
    }
  }

  const premiumButtonLabel =
    purchaseState === "active" ? "Premium active" :
      purchaseState === "loading" ? "Opening Razorpay..." :
        purchaseState === "verifying" ? "Verifying..." :
          "Upgrade for ₹100/month";

  return (
    <FeatureGrid>
      <View style={styles.premiumPageHero}>
        <View style={styles.premiumHeroCopy}>
          <View style={styles.premiumHeroKicker}>
            <EliteIcon icon={Gem} tone="gold" size="xs" rune="₹" />
            <Text style={styles.premiumHeroKickerText}>Premium plan</Text>
          </View>
          <Text style={styles.premiumHeroTitle}>Build your ChessAlive identity.</Text>
          <Text style={styles.premiumHeroText}>
            Premium is for players who want unlimited private rooms, richer game review, cleaner personalization, and early access to Alive animation sets.
          </Text>
          <View style={styles.premiumHeroActions}>
            <Pressable
              disabled={purchaseState === "loading" || purchaseState === "verifying" || purchaseState === "active"}
              onPress={() => void handlePremiumPurchase()}
              style={({ pressed }) => [
                styles.premiumBuyButton,
                purchaseState === "active" && styles.premiumBuyButtonActive,
                (purchaseState === "loading" || purchaseState === "verifying") && styles.premiumBuyButtonDisabled,
                pressed && purchaseState !== "loading" && purchaseState !== "verifying" && styles.pressed,
              ]}
            >
              <Text style={styles.premiumBuyButtonText}>{premiumButtonLabel}</Text>
            </Pressable>
            <Pressable onPress={() => onNavigate("Play")} style={({ pressed }) => [styles.premiumSecondaryButton, pressed && styles.pressed]}>
              <Text style={styles.premiumSecondaryButtonText}>Try Play first</Text>
            </Pressable>
          </View>
          <Text style={[styles.premiumFinePrint, purchaseState === "error" && styles.premiumFinePrintError, purchaseState === "active" && styles.premiumFinePrintSuccess]}>
            {user ? `Signed in as ${user.displayName}. ` : "Sign in from Profile before purchase checkout. "}{purchaseMessage}
          </Text>
        </View>
        <View style={styles.premiumPriceCard}>
          <Text style={styles.premiumPriceLabel}>Launch pricing</Text>
          <View style={styles.premiumPriceRow}>
            <Text style={styles.premiumPrice}>₹100</Text>
            <Text style={styles.premiumCycle}>/month</Text>
          </View>
          <View style={styles.premiumIncludedList}>
            {["Unlimited private rooms", "Advanced review workspace", "Early animation packs", "Custom boards and profiles"].map((item) => (
              <View key={item} style={styles.premiumIncludedRow}>
                <CheckCircle2 size={17} color="#0f8a67" strokeWidth={2.8} />
                <Text style={styles.premiumIncludedText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.premiumCompareGrid}>
        <View style={styles.premiumCompareHeader}>
          <Text style={styles.premiumCompareTitle}>Free vs Premium</Text>
          <Text style={styles.premiumCompareText}>Simple limits now, room to grow later.</Text>
        </View>
        {premiumBenefits.map((row) => (
          <View key={row.benefit} style={styles.premiumCompareRow}>
            <View style={styles.premiumCompareBenefitCell}>
              <EliteIcon icon={row.icon} tone={row.tone} size="sm" rune={row.rune} />
              <View style={styles.premiumCompareBenefitCopy}>
                <Text style={styles.premiumCompareBenefit}>{row.benefit}</Text>
                <Text style={styles.premiumCompareBenefitHint}>Upgrade impact</Text>
              </View>
            </View>
            <View style={styles.premiumComparePlan}>
              <Text style={styles.premiumComparePlanLabel}>Free</Text>
              <Text style={styles.premiumComparePlanValue}>{row.free}</Text>
            </View>
            <View style={[styles.premiumComparePlan, styles.premiumComparePlanActive]}>
              <Text style={styles.premiumComparePlanLabel}>Premium</Text>
              <Text style={styles.premiumComparePlanValueActive}>{row.premium}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.premiumBottomCta}>
        <View>
          <Text style={styles.cardTitle}>Ready to play?</Text>
          <Text style={styles.muted}>Premium should improve the game, not block it. Core chess stays playable.</Text>
        </View>
        <ActionButton label="Open Play" onPress={() => onNavigate("Play")} accent />
      </View>
    </FeatureGrid>
  );
}

function iconForPanel(title: string): { icon: typeof Home; tone: IconTone; rune: string } {
  const lower = title.toLowerCase();
  if (lower.includes("premium") || lower.includes("plan")) return { icon: Gem, tone: "gold", rune: "₹" };
  if (lower.includes("admin")) return { icon: Database, tone: "slate", rune: "DB" };
  if (lower.includes("online") || lower.includes("multiplayer") || lower.includes("live")) return { icon: Gauge, tone: "emerald", rune: "RT" };
  if (lower.includes("storage") || lower.includes("database")) return { icon: Database, tone: "sky", rune: "DB" };
  if (lower.includes("puzzle") || lower.includes("tactic")) return { icon: Target, tone: "violet", rune: "♟" };
  if (lower.includes("lesson") || lower.includes("coach")) return { icon: BookOpen, tone: "emerald", rune: "♗" };
  if (lower.includes("review") || lower.includes("analysis")) return { icon: BarChart3, tone: "sky", rune: "♕" };
  if (lower.includes("captured") || lower.includes("game")) return { icon: Shield, tone: "cobalt", rune: "♜" };
  if (lower.includes("tournament")) return { icon: Trophy, tone: "gold", rune: "♚" };
  if (lower.includes("club") || lower.includes("community")) return { icon: Users, tone: "cobalt", rune: "♖" };
  if (lower.includes("chat") || lower.includes("social")) return { icon: MessageCircle, tone: "emerald", rune: "♘" };
  if (lower.includes("leaderboard")) return { icon: Award, tone: "gold", rune: "#" };
  if (lower.includes("profile") || lower.includes("settings")) return { icon: Crown, tone: "violet", rune: "♛" };
  if (lower.includes("player") || lower.includes("match")) return { icon: Star, tone: "gold", rune: "★" };
  return { icon: Gem, tone: "cobalt", rune: "◆" };
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const headerIcon = iconForPanel(title);
  return (
    <View style={styles.panel} {...{ className: "gemini-glass-panel" } as any}>
      <View style={styles.panelHeader}>
        <EliteIcon icon={headerIcon.icon} tone={headerIcon.tone} size="xs" rune={headerIcon.rune} />
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      {typeof children === "string" ? <Text style={styles.muted}>{children}</Text> : children}
    </View>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function iconForAction(label: string): { icon: typeof Home; tone: IconTone; rune: string } {
  const lower = label.toLowerCase();
  if (lower.includes("rematch")) return { icon: Swords, tone: "gold", rune: "↻" };
  if (lower.includes("match") || lower.includes("find")) return { icon: Target, tone: "gold", rune: "MM" };
  if (lower.includes("draw")) return { icon: Shield, tone: "slate", rune: "1/2" };
  if (lower.includes("resign")) return { icon: Flag, tone: "rose", rune: "!" };
  if (lower.includes("review")) return { icon: BarChart3, tone: "sky", rune: "★" };
  if (lower.includes("play") || lower.includes("open")) return { icon: Play, tone: "gold", rune: "♞" };
  if (lower.includes("live") || lower.includes("create")) return { icon: Rocket, tone: "emerald", rune: "RT" };
  if (lower.includes("join")) return { icon: Users, tone: "cobalt", rune: "+" };
  if (lower.includes("send")) return { icon: Send, tone: "emerald", rune: "→" };
  if (lower.includes("complete") || lower.includes("joined")) return { icon: CheckCircle2, tone: "emerald", rune: "✓" };
  if (lower.includes("new")) return { icon: Flag, tone: "sky", rune: "N" };
  if (lower.includes("refresh")) return { icon: Sparkles, tone: "sky", rune: "↻" };
  if (lower.includes("alive")) return { icon: Star, tone: "rose", rune: "AL" };
  return { icon: Zap, tone: "cobalt", rune: "⚡" };
}

function ActionButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  const actionIcon = iconForAction(label);
  return (
    <Pressable onPress={onPress} style={[styles.actionButton, accent && styles.actionButtonAccent]}>
      <EliteIcon icon={actionIcon.icon} tone={actionIcon.tone} size="xs" active={accent} rune={actionIcon.rune} />
      <Text style={[styles.actionButtonText, accent && styles.actionButtonTextAccent]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: aiCanvas,
  },
  appFrame: {
    flex: 1,
    backgroundColor: aiCanvas,
    minHeight: "100%",
    overflow: "hidden",
    position: "relative",
  },
  backdrop: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  backdropSlab: {
    borderRadius: 0,
    borderWidth: 0,
    opacity: 0.68,
    position: "absolute",
  },
  backdropSlabOne: {
    backgroundColor: "rgba(232,240,254,0.36)",
    height: 360,
    left: "15%",
    top: -180,
    transform: [{ rotate: "-3deg" }],
    width: 980,
  },
  backdropSlabTwo: {
    backgroundColor: "rgba(210,227,252,0.28)",
    height: 300,
    right: -140,
    top: 210,
    transform: [{ rotate: "-4deg" }],
    width: 820,
  },
  backdropSlabThree: {
    backgroundColor: "rgba(232,240,254,0.2)",
    bottom: 38,
    height: 220,
    left: "20%",
    transform: [{ rotate: "-4deg" }],
    width: 680,
  },
  shell: {
    alignSelf: "center",
    flex: 1,
    maxWidth: 1600,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    width: "100%",
  },
  shellWithRail: {
    maxWidth: "100%",
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  playShell: {
    maxWidth: "100%",
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%",
  },
  workspaceWide: {
    flexDirection: "row",
    gap: 0,
  },
  workspaceMain: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  workspaceMainWithRail: {
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
  },
  planeChrome: {
    ...aiPanelSurface,
    backgroundColor: "rgba(255,255,255,0.86)",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  playPlaneChrome: {
    marginBottom: spacing.sm,
    padding: 6,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  logo: {
    color: "#0b1533",
    fontFamily: displayFontFamily,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
  },
  subtitle: {
    color: "#687390",
    fontFamily: appFontFamily,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  headerBadge: {
    alignItems: "center",
    backgroundColor: "#f5f8ff",
    borderColor: "#d4dff3",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
  },
  headerBadgeText: {
    color: "#38518f",
    fontFamily: appFontFamily,
    fontWeight: "800",
  },
  headerPlayButton: {
    alignItems: "center",
    backgroundColor: "#f2bc4b",
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  headerPlayText: {
    color: "#141511",
    fontFamily: appFontFamily,
    fontWeight: "800",
  },
  playTopBar: {
    alignItems: "center",
    ...aiPanelSurface,
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  playTopIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 220,
  },
  playTopTitle: {
    color: "#111936",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  playTopMeta: {
    color: "#66718d",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  playTopNav: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
  playQuickButton: {
    alignItems: "center",
    ...aiPillSurface,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  playQuickText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
  },
  navDock: {
    ...aiPillSurface,
    backgroundColor: "rgba(255,255,255,0.74)",
    gap: spacing.sm,
    padding: 6,
  },
  playNavDock: {
    gap: 5,
    padding: 5,
  },
  tabs: {
    flexGrow: 0,
  },
  tabsContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  playTabsContent: {
    gap: 6,
    paddingRight: 6,
  },
  mobileTabsContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    width: "100%",
  },
  mobilePlayTabsContent: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 4,
    justifyContent: "space-between",
    width: "100%",
  },
  planeContextRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  playContextRow: {
    gap: 6,
  },
  planeContextPill: {
    alignItems: "center",
    ...aiPillSurface,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  planeContextText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
  },
  eliteIcon: {
    alignItems: "center",
    borderRadius: 13,
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
    shadowColor: "#0b3a66",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  eliteIconDepth: {
    borderRadius: 13,
    bottom: -4,
    height: "92%",
    left: 3,
    opacity: 0.28,
    position: "absolute",
    right: 3,
  },
  eliteIconFace: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: "100%",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  eliteIconGlow: {
    borderRadius: 999,
    height: "64%",
    left: "14%",
    opacity: 0.32,
    position: "absolute",
    top: "8%",
    width: "72%",
  },
  eliteIconCore: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.44)",
    borderRadius: 999,
    borderWidth: 1,
    height: "66%",
    justifyContent: "center",
    width: "66%",
  },
  eliteIconRune: {
    bottom: 2,
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 10,
    position: "absolute",
    right: 3,
  },
  navCard: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 124,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  navCardMobile: {
    flexBasis: "22%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  navCardCopy: {
    alignItems: "center",
    minWidth: 0,
  },
  playNavCard: {
    gap: 6,
    minWidth: 86,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  playNavCardIconOnly: {
    flexBasis: "auto",
    flexGrow: 0,
    gap: 0,
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 4,
    paddingVertical: 4,
    width: 36,
  },
  navCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.18)",
    ...aiSoftShadow,
  },
  navCardIcon: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  navCardIconActive: {
    backgroundColor: "#e8f0fe",
  },
  navCardText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  playNavCardText: {
    fontSize: 12,
  },
  navCardTextActive: {
    color: aiInk,
  },
  navCardCaption: {
    color: "#757575",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "400",
    marginTop: 1,
  },
  navCardCaptionActive: {
    color: aiBlue,
  },
  content: {
    ...verticalScrollOnly,
    flex: 1,
    minHeight: 0,
  },
  playContent: {
    ...verticalScrollOnly,
  },
  contentInner: {
    flexGrow: 1,
    maxWidth: "100%",
    paddingBottom: 48,
    paddingTop: spacing.xs,
    width: "100%",
  },
  playContentInner: {
    paddingBottom: spacing.md,
    paddingTop: 0,
  },
  screenTransition: {
    width: "100%",
    zIndex: 3,
  },
  screenPlane: {
    minHeight: "100%",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  screenTransitionGhost: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
    zIndex: 2,
  },
  screenTransitionGlow: {
    backgroundColor: "rgba(211, 227, 253, 0.72)",
    borderRadius: 999,
    height: 260,
    left: "18%",
    position: "absolute",
    right: "18%",
    top: 24,
    zIndex: 1,
  },
  homeScreenStack: {
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: 1400,
    width: "100%",
  },
  guestLanding: {
    alignSelf: "center",
    backgroundColor: "transparent",
    borderRadius: 16,
    gap: spacing.xl,
    minHeight: 720,
    overflow: "hidden",
    paddingHorizontal: 40,
    paddingVertical: 30,
    position: "relative",
    maxWidth: 1480,
    width: "100%",
  },
  guestAuraNorth: {
    backgroundColor: "rgba(232,240,254,0.72)",
    borderRadius: 90,
    height: 360,
    position: "absolute",
    right: -120,
    top: -160,
    transform: [{ rotate: "-10deg" }],
    width: 520,
  },
  guestAuraSouth: {
    backgroundColor: "rgba(210,227,252,0.38)",
    borderRadius: 90,
    bottom: -190,
    height: 340,
    left: -120,
    position: "absolute",
    transform: [{ rotate: "-8deg" }],
    width: 560,
  },
  guestTopBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: spacing.md,
    ...aiSoftShadow,
    zIndex: 1,
  },
  guestBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  guestBrandText: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 28,
    fontWeight: "600",
  },
  guestLoginButton: {
    alignItems: "center",
    backgroundColor: aiSurface,
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    ...aiSoftShadow,
  },
  guestLoginText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "500",
  },
  guestHero: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: aiLine,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 34,
    justifyContent: "space-between",
    overflow: "visible",
    padding: 30,
    ...aiShadow,
    zIndex: 1,
  },
  guestBoardColumn: {
    alignItems: "center",
    flex: 0.92,
    minWidth: 315,
    overflow: "visible",
    position: "relative",
    zIndex: 4,
  },
  guestBoardStage: {
    aspectRatio: 1,
    backgroundColor: aiSurface,
    borderColor: aiLine,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 520,
    minWidth: 300,
    overflow: "visible",
    padding: 12,
    position: "relative",
    ...aiShadow,
    width: "100%",
  },
  guestBoardHint: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#bde5ed",
    borderRadius: 999,
    borderWidth: 1,
    height: 70,
    justifyContent: "center",
    right: 22,
    position: "absolute",
    top: 22,
    width: 70,
    shadowColor: "#117b92",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  guestBoardHintText: {
    color: "#17596a",
    fontFamily: displayFontFamily,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
  },
  guestBoardGlass: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(15,143,167,0.18)",
    borderRadius: 10,
    borderWidth: 1,
    bottom: -52,
    left: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    shadowColor: "#0b5f73",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  },
  guestBoardGlassTitle: {
    color: "#082f3c",
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "900",
  },
  guestBoardGlassText: {
    color: "#517380",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  guestCopyColumn: {
    alignItems: "flex-start",
    flex: 1,
    gap: spacing.lg,
    minWidth: 315,
    position: "relative",
    zIndex: 1,
  },
  guestEyebrow: {
    backgroundColor: "rgba(232,240,254,0.88)",
    borderColor: "rgba(47,125,225,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#2f5f9f",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "500",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  guestHeroTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 38,
    fontWeight: "600",
    lineHeight: 44,
    maxWidth: 540,
  },
  guestHeroSub: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 25,
    maxWidth: 520,
  },
  guestActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  guestPrimaryButton: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderBottomColor: "rgba(0,0,0,0.08)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 190,
    paddingHorizontal: spacing.xl,
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  guestPrimaryButtonPressed: {
    borderBottomWidth: 2,
    opacity: 0.95,
    transform: [{ translateY: 3 }],
  },
  guestPrimaryButtonText: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "600",
  },
  guestSecondaryButton: {
    alignItems: "center",
    backgroundColor: aiSurface,
    borderBottomColor: "#d6e2ef",
    borderBottomWidth: 1,
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 180,
    paddingHorizontal: spacing.xl,
  },
  guestSecondaryButtonPressed: {
    borderBottomWidth: 2,
    opacity: 0.95,
    transform: [{ translateY: 2 }],
  },
  guestSecondaryButtonText: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "600",
  },
  guestQuickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
  },
  guestQuickLink: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  guestQuickLinkText: {
    color: "#40556d",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "500",
  },
  guestGlobeShell: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "#d8e9ef",
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.lg,
    padding: 24,
    shadowColor: "#19758b",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.11,
    shadowRadius: 34,
    zIndex: 1,
  },
  guestGlobeCopy: {
    gap: spacing.sm,
    maxWidth: 760,
  },
  guestGlobeTitle: {
    color: "#082f3c",
    fontFamily: displayFontFamily,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 46,
  },
  guestGlobeText: {
    color: "#4f6f7c",
    fontFamily: appFontFamily,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 27,
    maxWidth: 700,
  },
  registerPage: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(31,31,31,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xl,
    minHeight: 760,
    overflow: "hidden",
    paddingHorizontal: 32,
    paddingVertical: 28,
    position: "relative",
    width: "100%",
    ...aiShadow,
  },
  registerAura: {
    backgroundColor: "rgba(232, 240, 254, 0.72)",
    borderRadius: 999,
    height: 680,
    position: "absolute",
    right: -230,
    top: 82,
    width: 680,
  },
  registerAuraTwo: {
    backgroundColor: "rgba(209, 250, 244, 0.42)",
    borderRadius: 999,
    height: 520,
    left: -180,
    position: "absolute",
    top: 250,
    width: 520,
  },
  registerAuraCore: {
    backgroundColor: "rgba(245, 246, 255, 0.84)",
    borderRadius: 999,
    height: 360,
    left: "36%",
    position: "absolute",
    top: 170,
    width: 360,
  },
  registerTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 1040,
    width: "100%",
    zIndex: 1,
  },
  registerBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  registerBrandText: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 30,
    fontWeight: "700",
  },
  registerTextButton: {
    alignItems: "center",
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  registerTextButtonText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  registerCenter: {
    alignItems: "center",
    gap: spacing.lg,
    maxWidth: 620,
    width: "100%",
  },
  registerShell: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xl,
    justifyContent: "center",
    maxWidth: 1040,
    width: "100%",
    zIndex: 1,
  },
  registerStory: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(31,31,31,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    minWidth: 320,
    padding: 34,
    ...aiSoftShadow,
  },
  registerEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(232,240,254,0.74)",
    borderColor: "rgba(26,115,232,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  registerTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 50,
    fontWeight: "700",
    lineHeight: 56,
    maxWidth: 560,
  },
  registerStoryText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 27,
    maxWidth: 520,
  },
  registerHorseStage: {
    alignItems: "center",
    height: 220,
    justifyContent: "center",
    position: "relative",
    width: 300,
  },
  registerBoardShadow: {
    bottom: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    height: 92,
    opacity: 0.48,
    position: "absolute",
    transform: [{ rotate: "17deg" }],
    width: 220,
  },
  registerBoardTile: {
    backgroundColor: "#e7f2f5",
    height: 46,
    width: 110,
  },
  registerBoardTileDark: {
    backgroundColor: "#b9e6ed",
  },
  registerHorseShadow: {
    backgroundColor: "#128ca4",
    borderRadius: 999,
    bottom: 52,
    height: 20,
    position: "absolute",
    width: 112,
  },
  registerHorsePiece: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  loginMotionStage: {
    alignItems: "center",
    alignSelf: "center",
    height: 250,
    justifyContent: "center",
    marginVertical: spacing.sm,
    position: "relative",
    width: "100%",
  },
  loginMotionGlow: {
    backgroundColor: "rgba(232,240,254,0.82)",
    borderRadius: 999,
    height: 220,
    position: "absolute",
    width: 420,
  },
  loginMotionBoard: {
    borderColor: "rgba(31,31,31,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    height: 138,
    opacity: 0.86,
    overflow: "hidden",
    position: "absolute",
    transform: [{ rotate: "-10deg" }],
    width: 276,
  },
  loginMotionTile: {
    backgroundColor: "rgba(255,255,255,0.92)",
    height: 69,
    width: 138,
  },
  loginMotionTileDark: {
    backgroundColor: "rgba(232,240,254,0.92)",
  },
  loginMotionPiece: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(31,31,31,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    height: 118,
    justifyContent: "center",
    width: 118,
    ...aiSoftShadow,
  },
  loginMotionChip: {
    ...aiPillSurface,
    alignItems: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
    position: "absolute",
  },
  loginMotionChipGoogle: {
    right: 34,
    top: 28,
  },
  loginMotionChipOtp: {
    bottom: 34,
    left: 30,
  },
  loginMotionChipRating: {
    bottom: 14,
    right: 72,
  },
  loginMotionChipText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  registerValueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  registerValuePill: {
    ...aiPillSurface,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 210,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  registerValueIcon: {
    alignItems: "center",
    backgroundColor: "rgba(232,240,254,0.82)",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  registerValueCopy: {
    flex: 1,
    minWidth: 0,
  },
  registerValueLabel: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  registerValueText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  registerActions: {
    gap: spacing.sm,
    width: "100%",
  },
  registerCard: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(31,31,31,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 0.84,
    gap: spacing.md,
    minWidth: 320,
    padding: 28,
    ...aiShadow,
  },
  registerCardKicker: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  registerCardTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
  },
  registerCardCopy: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
  },
  registerProviderStack: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  registerEmailButton: {
    alignItems: "center",
    backgroundColor: "rgba(248,250,252,0.94)",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  registerButtonPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
  registerEmailButtonText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  registerEmailPanel: {
    backgroundColor: "rgba(248,250,252,0.86)",
    borderColor: aiLine,
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  registerInput: {
    backgroundColor: "#ffffff",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "500",
    minHeight: 46,
    minWidth: 130,
    paddingHorizontal: spacing.md,
  },
  registerOtpRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  registerCodeInput: {
    maxWidth: 120,
  },
  registerSmallButton: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  registerSmallButtonDisabled: {
    opacity: 0.52,
  },
  registerSmallButtonText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  registerSmallButtonTextDisabled: {
    color: "#90a8b0",
  },
  registerDivider: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  registerDividerLine: {
    backgroundColor: aiLine,
    flex: 1,
    height: 1,
  },
  registerDividerText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "700",
  },
  registerProviderButton: {
    alignItems: "center",
    backgroundColor: "rgba(248,250,252,0.86)",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "flex-start",
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  registerProviderButtonPrimary: {
    backgroundColor: aiInk,
    borderColor: "rgba(31,31,31,0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  registerProviderMarkShell: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  registerProviderMarkShellPrimary: {
    borderColor: "rgba(255,255,255,0.5)",
  },
  registerProviderMark: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  registerProviderGoogle: {
    color: "#4285f4",
  },
  registerProviderText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  registerProviderTextPrimary: {
    color: "#ffffff",
  },
  registerImportHint: {
    ...aiInsetSurface,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  registerImportHintText: {
    color: aiMuted,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  registerStatus: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    minHeight: 22,
    textAlign: "center",
  },
  homeLayout: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeMain: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  homeRail: {
    gap: spacing.sm,
    maxWidth: 390,
    minWidth: 0,
    width: "100%",
  },
  homeHeroLayout: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  homeHeroLayoutMobile: {
    gap: spacing.sm,
  },
  homeHeroPrimary: {
    flex: 1.35,
    minWidth: 0,
  },
  homeHeroPrimaryMobile: {
    flexBasis: "100%",
    width: "100%",
  },
  homeHeroAside: {
    flex: 0.65,
    gap: spacing.sm,
    minWidth: 0,
  },
  homeHeroAsideMobile: {
    flexBasis: "100%",
    width: "100%",
  },
  homeDashboardHero: {
    alignItems: "stretch",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    minHeight: 360,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
    ...aiShadow,
  },
  homeDashboardGlow: {
    backgroundColor: "rgba(211,227,253,0.58)",
    borderRadius: 999,
    height: 360,
    position: "absolute",
    right: -130,
    top: -150,
    width: 520,
  },
  homeDashboardCopy: {
    flex: 1.05,
    gap: spacing.md,
    justifyContent: "center",
    minWidth: 280,
  },
  homeDashboardTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 50,
    maxWidth: 660,
  },
  homeDashboardText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 25,
    maxWidth: 660,
  },
  homeDashboardMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeMetricPill: {
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  homeMetricValue: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 25,
  },
  homeMetricLabel: {
    color: "#6a7f94",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  homeDashboardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  homeDashboardPrimaryAction: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.38)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  homeDashboardPrimaryText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "900",
  },
  homeDashboardSecondaryAction: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  homeDashboardSecondaryText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "900",
  },
  homeDashboardBoardPanel: {
    backgroundColor: "rgba(248,251,255,0.92)",
    borderColor: "#d7e4f2",
    borderRadius: 12,
    borderWidth: 1,
    flex: 0.72,
    gap: spacing.sm,
    justifyContent: "center",
    minWidth: 260,
    padding: spacing.md,
    position: "relative",
  },
  homeDashboardBoardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeDashboardBoardKicker: {
    color: "#6a7f94",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeDashboardBoardMove: {
    color: aiBlue,
    fontFamily: displayFontFamily,
    fontSize: 15,
    fontWeight: "900",
  },
  homeDashboardBoardWrap: {
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderColor: aiLine,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 340,
    overflow: "hidden",
    padding: 7,
    width: "100%",
  },
  homeDashboardBoardHint: {
    color: "#5f7288",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
  },
  homeTopExperience: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  homeGlobeColumn: {
    flex: 1.28,
    gap: spacing.md,
    minWidth: 0,
  },
  homeSimpleActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeSimpleAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: aiLine,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 58,
    minWidth: 150,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...aiSoftShadow,
  },
  homeSimpleActionText: {
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  homeFocusGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeFocusCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 190,
    minWidth: 230,
    padding: spacing.md,
    ...aiSoftShadow,
  },
  homeFocusCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeFocusMetric: {
    backgroundColor: "#f4f7fb",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  homeFocusMetricText: {
    color: "#47566a",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
  },
  homeFocusKicker: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeFocusTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  homeFocusBody: {
    color: aiMuted,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  homeFocusFooter: {
    alignItems: "center",
    borderTopColor: aiLine,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  homeFocusAction: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  homeLowerGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  homeWorldSection: {
    flex: 1.25,
    gap: spacing.sm,
    minWidth: 0,
  },
  homeWorldHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  homeWorldTitle: {
    color: "#102033",
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "900",
  },
  homeWorldMeta: {
    color: "#61758b",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 2,
  },
  homeLeaderboardColumn: {
    flex: 0.75,
    gap: spacing.sm,
    minWidth: 0,
  },
  homeWorldPulseCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
    ...aiSoftShadow,
  },
  homeWorldPulseHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  homeWorldPulseMap: {
    backgroundColor: "#071427",
    borderColor: "rgba(26,115,232,0.24)",
    borderRadius: 12,
    borderWidth: 1,
    height: 260,
    overflow: "hidden",
    position: "relative",
  },
  homeWorldPulseMapCompact: {
    height: 236,
  },
  homeWorldPulseList: {
    gap: 8,
  },
  homeWorldPulseRow: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  homeWorldPulseStatus: {
    backgroundColor: "#1fbd7b",
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  homeWorldPulseCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeWorldPulseName: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  homeWorldPulseMeta: {
    color: "#6a7f94",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  homeWorldPulseTime: {
    color: aiBlue,
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  homeWorldPulseActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeWorldPulseButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    minWidth: 130,
    paddingHorizontal: spacing.md,
  },
  homeWorldPulseButtonPrimary: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.36)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    minWidth: 150,
    paddingHorizontal: spacing.md,
  },
  homeWorldPulseButtonText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  homeWorldPulseButtonPrimaryText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  premiumPageHero: {
    alignItems: "stretch",
    backgroundColor: "#ffffff",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.xl,
    ...aiShadow,
  },
  premiumHeroCopy: {
    flex: 1.35,
    gap: spacing.md,
    minWidth: 320,
  },
  premiumHeroKicker: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  premiumHeroKickerText: {
    color: "#5b6474",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  premiumHeroTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 52,
    maxWidth: 680,
  },
  premiumHeroText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 27,
    maxWidth: 700,
  },
  premiumHeroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  premiumBuyButton: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  premiumBuyButtonActive: {
    backgroundColor: "#0f8a67",
    shadowColor: "#0f8a67",
  },
  premiumBuyButtonDisabled: {
    opacity: 0.74,
  },
  premiumBuyButtonText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "900",
  },
  premiumSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  premiumSecondaryButtonText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  premiumFinePrint: {
    color: "#6b7280",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  premiumFinePrintError: {
    color: "#b42318",
    fontWeight: "800",
  },
  premiumFinePrintSuccess: {
    color: "#0f8a67",
    fontWeight: "800",
  },
  premiumPriceCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#d9e2ef",
    borderRadius: 10,
    borderWidth: 1,
    flex: 0.75,
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 280,
    minWidth: 300,
    padding: spacing.lg,
  },
  premiumPriceLabel: {
    color: "#607089",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  premiumPriceRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
  },
  premiumPrice: {
    color: "#0f172a",
    fontFamily: displayFontFamily,
    fontSize: 54,
    fontWeight: "900",
  },
  premiumCycle: {
    color: "#64748b",
    fontFamily: appFontFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  premiumIncludedList: {
    gap: spacing.sm,
  },
  premiumIncludedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  premiumIncludedText: {
    color: "#263548",
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  premiumCompareGrid: {
    backgroundColor: "#ffffff",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    ...aiSoftShadow,
  },
  premiumCompareHeader: {
    marginBottom: spacing.xs,
  },
  premiumCompareTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  premiumCompareText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },
  premiumCompareRow: {
    alignItems: "stretch",
    borderTopColor: aiLine,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  premiumCompareBenefitCell: {
    alignItems: "center",
    flex: 1.15,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 220,
    paddingVertical: 8,
  },
  premiumCompareBenefitCopy: {
    flex: 1,
    minWidth: 0,
  },
  premiumCompareBenefit: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  premiumCompareBenefitHint: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 2,
    textTransform: "uppercase",
  },
  premiumComparePlan: {
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 180,
    padding: spacing.sm,
  },
  premiumComparePlanActive: {
    backgroundColor: "#eef6ff",
    borderColor: "rgba(26,115,232,0.24)",
  },
  premiumComparePlanLabel: {
    color: "#667085",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  premiumComparePlanValue: {
    color: "#334155",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  premiumComparePlanValueActive: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  premiumBottomCta: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
    ...aiSoftShadow,
  },
  homePremiumStrip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: aiLine,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    minHeight: 94,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
    ...aiSoftShadow,
  },
  homePremiumGlow: {
    backgroundColor: "rgba(211,227,253,0.7)",
    borderRadius: 42,
    height: 130,
    position: "absolute",
    right: -44,
    top: -72,
    width: 130,
  },
  homePremiumIcon: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.42)",
    borderRadius: 10,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 52,
  },
  homePremiumIconDone: {
    backgroundColor: "#e8fbf2",
    borderColor: "#afe6c9",
  },
  homePremiumCopy: {
    flex: 1,
    minWidth: 230,
  },
  homePremiumKicker: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homePremiumTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: 3,
  },
  homePremiumPriceBlock: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  homePremiumPrice: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 25,
    fontWeight: "900",
  },
  homePremiumCycle: {
    color: "#657b8f",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  homePremiumButton: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.36)",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  homePremiumButtonDone: {
    backgroundColor: "#e8fbf2",
    borderColor: "#afe6c9",
    shadowOpacity: 0,
  },
  homePremiumButtonText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  homePremiumButtonTextDone: {
    color: "#0f8a67",
  },
  homePlayColumn: {
    flex: 0.82,
    gap: spacing.md,
    minWidth: 0,
  },
  homePlayBoardCard: {
    backgroundColor: "#fbfcff",
    borderColor: "#c8d2ef",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: "#5265d8",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  homePlayHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  homePlayTitle: {
    color: "#111936",
    fontFamily: displayFontFamily,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 8,
  },
  homePlayBoardWrap: {
    alignSelf: "center",
    backgroundColor: "#eef5ff",
    borderColor: "#c8dff2",
    borderRadius: radii.sm,
    borderWidth: 1,
    maxWidth: 360,
    overflow: "hidden",
    padding: 8,
    width: "100%",
  },
  homePlayFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  homeTopMatchesCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...aiSoftShadow,
  },
  homeTopMatchesHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  viewAllMatchesButton: {
    alignItems: "center",
    backgroundColor: "#f3f7fd",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  viewAllMatchesText: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  homeTopMatchPeek: {
    height: 226,
    overflow: "hidden",
  },
  homeMatchBoardRail: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  homeMatchBoardStack: {
    gap: spacing.sm,
  },
  homeMatchBoardCard: {
    width: 360,
  },
  homeMatchBoardCardMobile: {
    width: "100%",
  },
  homeTopMatchList: {
    gap: 8,
  },
  homeTopMatchRow: {
    alignItems: "center",
    backgroundColor: "rgba(248,251,255,0.9)",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: 8,
  },
  homeTopMatchBoard: {
    borderColor: "#bfd7ea",
    borderRadius: 10,
    borderWidth: 1,
    height: 76,
    overflow: "hidden",
    width: 76,
  },
  homeTopMatchCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeTopMatchMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  homeTopMatchClock: {
    color: "#61758b",
    fontSize: 11,
    fontWeight: "900",
  },
  homeTopMatchPlayers: {
    color: "#0f172a",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  homeTopMatchOpponent: {
    color: "#42566b",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  homeTopMatchSignal: {
    color: "#1f8f6b",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
  },
  worldLauncherCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
    padding: spacing.sm,
    ...aiShadow,
  },
  worldLauncherHeader: {
    gap: spacing.xs,
  },
  worldLauncherTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 30,
  },
  worldLauncherCopy: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
  },
  launcherBoardStage: {
    alignItems: "stretch",
    backgroundColor: "#fbfcff",
    borderColor: aiLine,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: spacing.sm,
    overflow: "visible",
    padding: spacing.sm,
  },
  launcherBoardStageMobile: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  launcherBoardWrap: {
    backgroundColor: aiSurface,
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1.12,
    minWidth: 210,
    overflow: "visible",
    position: "relative",
  },
  launcherBoardWrapMobile: {
    minWidth: 0,
    width: "100%",
  },
  launcherBoardBadge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    right: 10,
  },
  launcherBoardBadgeText: {
    color: aiBlue,
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  launcherTimeDeck: {
    backgroundColor: aiSurface,
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flex: 0.88,
    gap: 8,
    justifyContent: "center",
    minWidth: 150,
    padding: 8,
  },
  launcherTimeDeckMobile: {
    minWidth: 0,
    width: "100%",
  },
  launcherTimeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  launcherTimeChip: {
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  launcherTimeChipActive: {
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  launcherTimeChipText: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  launcherTimeChipMeta: {
    color: "#6a7f94",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
    textTransform: "uppercase",
  },
  launcherTimeChipTextActive: {
    color: "#ffffff",
  },
  launcherSegmentBlock: {
    gap: 7,
  },
  launcherDualSegments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  launcherSegmentGroup: {
    flex: 1,
    gap: 6,
    minWidth: 160,
  },
  launcherSegmentGroupWide: {
    flexBasis: "100%",
  },
  launcherSegmentLabel: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  launcherSegmentRow: {
    backgroundColor: "#f4f7fb",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 5,
  },
  launcherSegment: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  launcherSegmentActive: {
    backgroundColor: aiBlue,
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  launcherSegmentText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
  },
  launcherSegmentTextActive: {
    color: "#ffffff",
  },
  worldLauncherActions: {
    gap: spacing.sm,
  },
  homeProfileCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
    ...aiShadow,
  },
  homeProfileShine: {
    backgroundColor: "rgba(211,227,253,0.75)",
    borderRadius: 48,
    height: 170,
    position: "absolute",
    right: -70,
    top: -80,
    width: 170,
  },
  homeProfileTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  homeProfileAvatar: {
    alignItems: "center",
    backgroundColor: "#eef5ff",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    width: 58,
  },
  homeProfileAvatarText: {
    fontSize: 25,
  },
  homeProfileCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeProfileName: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "600",
  },
  homeProfileMeta: {
    color: "#5a7186",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  homeProfileRatingBadge: {
    alignItems: "center",
    backgroundColor: "#f4f7fb",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  homeProfileRatingValue: {
    color: aiBlue,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
  },
  homeProfileRatingLabel: {
    color: "#5a7186",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeProfileStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  homeProfileStat: {
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: spacing.sm,
  },
  homeProfileStatValue: {
    color: "#102033",
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "900",
  },
  homeProfileStatLabel: {
    color: "#6c8194",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  profileAccountHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  profileAccountAvatar: {
    backgroundColor: "#eef5ff",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 34,
    height: 64,
    lineHeight: 62,
    overflow: "hidden",
    textAlign: "center",
    width: 64,
  },
  profileAccountCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  profileAccountName: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "700",
  },
  botRatingPanel: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  botRatingHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  botRatingKicker: {
    color: "#6a7d92",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  botRatingTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "600",
  },
  botRatingOpen: {
    backgroundColor: "#f3f7fd",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  botRatingOpenText: {
    color: aiBlue,
    fontSize: 12,
    fontWeight: "900",
  },
  botRatingRow: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  botRatingRank: {
    color: "#40728a",
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
    width: 28,
  },
  botRatingAvatar: {
    fontSize: 20,
    width: 28,
  },
  botRatingCopy: {
    flex: 1,
    minWidth: 0,
  },
  botRatingName: {
    color: "#102033",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  botRatingMeta: {
    color: "#6a7f94",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  botRatingScore: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 16,
    fontWeight: "900",
  },
  adsenseUnit: {
    alignItems: "stretch",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  adsenseDomMount: {
    flex: 1,
    minHeight: "100%",
    width: "100%",
  },
  adsenseConfigNotice: {
    alignItems: "center",
    backgroundColor: "rgba(248,250,252,0.86)",
    bottom: 0,
    gap: 4,
    justifyContent: "center",
    left: 0,
    padding: spacing.sm,
    position: "absolute",
    right: 0,
    top: 0,
  },
  adsenseConfigLabel: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  adsenseConfigText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  homeAdCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(47,125,225,0.22)",
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 250,
    padding: spacing.md,
  },
  homeAdCardTop: {
    alignSelf: "stretch",
    borderColor: "#efc55c",
    flex: 0,
    justifyContent: "center",
    minHeight: 120,
    width: "100%",
  },
  homeAdLabel: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeAdTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
  },
  homeAdCopy: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  homeFooter: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: aiLine,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  homeFooterBrand: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "600",
  },
  homeFooterCopy: {
    color: aiMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3,
  },
  homeFooterLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeFooterLink: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homeFooterLinkActive: {
    backgroundColor: "#eaf6ff",
    borderColor: "#9ed7f3",
    shadowColor: "#75c9f1",
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  homeFooterLinkText: {
    color: "#40556d",
    fontSize: 12,
    fontWeight: "900",
  },
  homeFooterPolicyPanel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "#cfe0ec",
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: "#9fbad1",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    width: "100%",
  },
  homeFooterPolicyHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  homeFooterPolicyHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  homeFooterPolicyKicker: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeFooterPolicyTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "700",
  },
  homeFooterPolicyIntro: {
    color: "#52677e",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    maxWidth: 860,
  },
  homeFooterPolicyClose: {
    alignItems: "center",
    backgroundColor: "#eef6fb",
    borderColor: "#d1e3ee",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  homeFooterPolicyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  homeFooterPolicySection: {
    backgroundColor: "#f8fbfd",
    borderColor: "#e1edf4",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: 260,
    flexGrow: 1,
    gap: 5,
    padding: spacing.md,
  },
  homeFooterPolicySectionTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  homeFooterPolicySectionBody: {
    color: "#586c80",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  homeFooterPolicyNote: {
    color: "#74879a",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  conversionHero: {
    alignItems: "stretch",
    backgroundColor: "#fbfcff",
    borderColor: "#c8d2ef",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: "#5265d8",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
  },
  conversionHeroCopy: {
    backgroundColor: "#176f89",
    borderColor: "#7ddde8",
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1.25,
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 430,
    minWidth: 320,
    overflow: "hidden",
    padding: spacing.xl,
  },
  conversionKickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  conversionKicker: {
    color: "#f6c867",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  conversionTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 50,
    maxWidth: 640,
  },
  conversionCopy: {
    color: "#e3e8f4",
    fontFamily: appFontFamily,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 27,
    maxWidth: 650,
  },
  conversionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trialPrimaryCta: {
    alignItems: "center",
    backgroundColor: "#f6c867",
    borderColor: "#ffe5a0",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    shadowColor: "#f6c867",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  trialPrimaryCtaText: {
    color: "#111827",
    fontFamily: appFontFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  trialSecondaryCta: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e1ee",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  trialSecondaryCtaText: {
    color: "#111936",
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  conversionProofRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  conversionProofPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  conversionProofText: {
    color: "#f8fbff",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
  },
  conversionShowcase: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe2f5",
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 0.78,
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 430,
    minWidth: 316,
    padding: spacing.md,
    shadowColor: "#5265d8",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
  },
  showcaseTopbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  showcaseEyebrow: {
    color: "#6a7d92",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  showcaseTitle: {
    color: "#111936",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  signalBadge: {
    alignItems: "center",
    backgroundColor: "#ecf8f2",
    borderColor: "#bfe8d3",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  heroSignalBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 2,
    height: 14,
  },
  heroSignalBar: {
    backgroundColor: "#1f8f6b",
    borderRadius: 2,
    width: 4,
  },
  signalBarShort: {
    height: 6,
  },
  signalBarMid: {
    height: 10,
  },
  signalBarTall: {
    height: 14,
  },
  heroSignalText: {
    color: "#1f7a5e",
    fontSize: 12,
    fontWeight: "900",
  },
  showcaseFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  showcasePlayerRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  showcaseAvatar: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#c9dff4",
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  showcaseAvatarText: {
    color: "#111936",
    fontSize: 15,
    fontWeight: "900",
  },
  showcasePlayer: {
    color: "#111936",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "800",
    maxWidth: 130,
  },
  showcaseMeta: {
    color: "#6a7d92",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  showcaseClock: {
    backgroundColor: "#1687a1",
    borderColor: "#7ddde8",
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  showcaseClockText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  conversionStrip: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe2f5",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  conversionStripItem: {
    alignItems: "center",
    backgroundColor: "#f7f9ff",
    borderColor: "#e1e7f8",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 225,
    padding: spacing.sm,
  },
  conversionStripCopy: {
    flex: 1,
    minWidth: 0,
  },
  conversionStripTitle: {
    color: "#111936",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  conversionStripMeta: {
    color: "#61758b",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  liveMatchesPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe2f5",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: "#5265d8",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  liveMatchesHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  liveMatchesTitle: {
    color: "#0f172a",
    fontFamily: displayFontFamily,
    fontSize: 19,
    fontWeight: "900",
  },
  liveMatchesMeta: {
    color: "#61758b",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  livePulsePill: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#b7ebcf",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  livePulseDot: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  livePulseText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
  },
  liveMatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  liveMatchCard: {
    backgroundColor: "#f7fbff",
    borderColor: "#d7e5f2",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minWidth: 230,
    overflow: "hidden",
    padding: spacing.sm,
  },
  liveMatchCardLarge: {
    gap: 8,
    minWidth: 0,
    padding: spacing.md,
  },
  liveBoardTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  liveMatchRank: {
    color: "#2781a5",
    fontSize: 12,
    fontWeight: "900",
  },
  liveMovePill: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#b7ebcf",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveMoveDot: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  liveMoveText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
  },
  liveMatchMiniBoardWrap: {
    alignSelf: "center",
    maxWidth: 220,
    width: "100%",
  },
  liveMatchMiniBoardWrapLarge: {
    maxWidth: 275,
  },
  liveMatchPlayers: {
    color: "#0f172a",
    fontFamily: displayFontFamily,
    fontSize: 16,
    fontWeight: "900",
  },
  liveMatchOpponent: {
    color: "#42566b",
    fontSize: 13,
    fontWeight: "800",
  },
  liveMatchMeta: {
    color: "#6b7f94",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  liveMatchFooter: {
    alignItems: "center",
    borderTopColor: "#e1edf7",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  liveMatchStatus: {
    color: "#0f8a62",
    fontSize: 12,
    fontWeight: "900",
  },
  liveMatchSignal: {
    color: "#61758b",
    fontSize: 11,
    fontWeight: "800",
  },
  globePanel: {
    backgroundColor: "#071423",
    borderColor: "#17415e",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.sm,
    shadowColor: "#082f49",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
  },
  globeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  globeTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  globeEyebrow: {
    color: "#67e8f9",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  globeTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
    marginTop: 0,
  },
  globePrompt: {
    color: "#b9dff0",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 560,
  },
  globeSunBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  globeSunDot: {
    backgroundColor: "#facc15",
    borderRadius: 999,
    height: 9,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 9,
  },
  globeSunText: {
    color: "#dff7ff",
    fontSize: 12,
    fontWeight: "900",
  },
  globeStage: {
    backgroundColor: "#08111e",
    borderColor: "#183850",
    borderRadius: 20,
    borderWidth: 1,
    height: 360,
    overflow: "hidden",
    position: "relative",
  },
  globeCanvasMount: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  globePlayerStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  globePlayerChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    minWidth: 172,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  globePlayerPulse: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    height: 12,
    shadowColor: "#22ff8a",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    width: 12,
  },
  globePlayerCopy: {
    flex: 1,
    minWidth: 0,
  },
  globePlayerName: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  globePlayerMeta: {
    color: "#9bc7db",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  globePlayerClock: {
    color: "#facc15",
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  challengeOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.34)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
  },
  challengeCard: {
    backgroundColor: "rgba(248,252,255,0.96)",
    borderColor: "#b8d5e9",
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 460,
    padding: spacing.lg,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.26,
    shadowRadius: 32,
    width: "100%",
  },
  challengeClose: {
    alignItems: "center",
    backgroundColor: "#1687a1",
    borderColor: "#7ddde8",
    borderWidth: 1,
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 28,
    zIndex: 3,
  },
  challengeTitle: {
    color: "#102033",
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "900",
    paddingRight: 32,
  },
  challengeBody: {
    color: "#496174",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
  },
  challengeTimeBox: {
    backgroundColor: "#edf7ff",
    borderColor: "#c7e1f3",
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.sm,
  },
  challengeActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  trialPanel: {
    backgroundColor: "#f7fcff",
    borderColor: "#a9dff0",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: "#1687a1",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
  },
  trialPanelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  trialPanelTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  trialPanelKicker: {
    color: "#1687a1",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  trialPanelTitle: {
    color: "#102033",
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 4,
  },
  trialPricePill: {
    alignItems: "center",
    backgroundColor: "#dff8ff",
    borderColor: "#a9dff0",
    borderWidth: 1,
    borderRadius: radii.sm,
    height: 46,
    justifyContent: "center",
    width: 58,
  },
  trialPriceText: {
    color: "#1687a1",
    fontSize: 18,
    fontWeight: "900",
  },
  trialPerkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  trialPerk: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7eaf3",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 165,
    padding: spacing.sm,
    width: "48%",
  },
  trialPerkCopy: {
    flex: 1,
    minWidth: 0,
  },
  trialPerkTitle: {
    color: "#102033",
    fontSize: 13,
    fontWeight: "900",
  },
  trialPerkMeta: {
    color: "#657b8f",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  trialPanelButton: {
    alignItems: "center",
    backgroundColor: "#1687a1",
    borderColor: "#7ddde8",
    borderWidth: 1,
    borderRadius: radii.sm,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
  },
  trialPanelButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  trialPanelLink: {
    alignItems: "center",
    minHeight: 34,
    justifyContent: "center",
  },
  trialPanelLinkText: {
    color: "#1687a1",
    fontSize: 13,
    fontWeight: "900",
  },
  authPremiumCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(31,31,31,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
    ...aiSoftShadow,
  },
  authPremiumCardCompact: {
    borderRadius: 10,
    gap: 8,
    padding: 12,
  },
  authPremiumGlow: {
    backgroundColor: "rgba(232,240,254,0.7)",
    borderRadius: 999,
    height: 170,
    position: "absolute",
    right: -68,
    top: -90,
    width: 170,
  },
  authPremiumHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  authPremiumLogo: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: aiLine,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  authPremiumCopy: {
    flex: 1,
    minWidth: 0,
  },
  authPremiumTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "700",
  },
  authStatus: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 2,
  },
  authStatusCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  authProviderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  authProviderGridCompact: {
    gap: 7,
    marginTop: 7,
  },
  authProviderButton: {
    alignItems: "center",
    ...aiPillSurface,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    minWidth: 145,
    paddingHorizontal: spacing.sm,
  },
  authProviderButtonPrimary: {
    backgroundColor: aiInk,
    borderColor: "rgba(31,31,31,0.12)",
  },
  authProviderButtonCompact: {
    gap: 7,
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: 8,
  },
  providerMark: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    ...aiSoftShadow,
    width: 30,
  },
  providerMarkPrimary: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
  },
  providerMarkText: {
    fontSize: 16,
    fontWeight: "900",
  },
  authProviderText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "500",
  },
  authProviderTextPrimary: {
    color: "#ffffff",
    fontWeight: "700",
  },
  chessComImportPanel: {
    ...aiInsetSurface,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  chessComImportPanelCompact: {
    gap: 7,
    marginTop: 7,
    padding: 8,
  },
  chessComImportHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  chessComImportTitle: {
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  chessComImportBadge: {
    backgroundColor: "#fff8e8",
    borderColor: "#f0d17c",
    borderRadius: 999,
    borderWidth: 1,
    color: "#9a6700",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chessComImportCopy: {
    color: "#5d7188",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  chessComInput: {
    flex: 1,
    minWidth: 160,
  },
  otpPanel: {
    ...aiInsetSurface,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  otpPanelCompact: {
    gap: 7,
    marginTop: 7,
    padding: 8,
  },
  authInput: {
    ...aiPillSurface,
    color: aiInk,
    fontSize: 14,
    fontWeight: "400",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  authInputCompact: {
    fontSize: 12,
    minHeight: 38,
  },
  otpActionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  otpInput: {
    flex: 1,
    minWidth: 92,
  },
  otpButton: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.36)",
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  otpButtonCompact: {
    minHeight: 38,
    paddingHorizontal: 10,
  },
  otpButtonDisabled: {
    backgroundColor: "#d6e0eb",
  },
  otpButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  otpButtonTextDisabled: {
    color: "#7890a8",
  },
  heroGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  heroPanel: {
    backgroundColor: "#185a9d",
    borderColor: "#154f8a",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 282,
    minWidth: 320,
    overflow: "hidden",
    padding: spacing.xl,
    shadowColor: "#185a9d",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
  },
  heroContent: {
    gap: spacing.md,
    maxWidth: 610,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroKicker: {
    color: "#bfe3ff",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff8ec",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
  },
  heroCopy: {
    color: "#dceeff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    maxWidth: 560,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryCta: {
    alignItems: "center",
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryCtaText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryCta: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  secondaryCtaActive: {
    backgroundColor: "#fff8ec",
    borderColor: "#fff8ec",
  },
  secondaryCtaText: {
    color: "#fff8ec",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryCtaTextActive: {
    color: "#141511",
  },
  heroBoardCard: {
    backgroundColor: "#f8fbff",
    borderColor: "#acc7e3",
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: "space-between",
    maxWidth: 338,
    minHeight: 338,
    minWidth: 320,
    padding: spacing.md,
    width: "100%",
    shadowColor: "#185a9d",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  heroBoardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroBoardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  heroBoardSub: {
    color: "#516a86",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  liveDotRow: {
    alignItems: "center",
    backgroundColor: "#e4f1fc",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  liveDot: {
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  liveText: {
    color: "#2563a8",
    fontSize: 11,
    fontWeight: "900",
  },
  miniBoard: {
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  miniBoardJewel: {
    borderColor: "#0d4272",
    borderWidth: 4,
  },
  miniBoardClarity: {
    borderColor: "#29485d",
    borderWidth: 3,
  },
  miniBoardRow: {
    flex: 1,
    flexDirection: "row",
    overflow: "visible",
  },
  miniSquare: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  miniBoardPieceWrap: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    overflow: "visible",
    width: "100%",
  },
  homeAliveIntroLayer: {
    bottom: 0,
    left: 0,
    overflow: "visible",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  homeAliveHorse: {
    height: 126,
    left: "67%",
    position: "absolute",
    top: "74%",
    width: 126,
  },
  homeAlivePawn: {
    height: 112,
    left: "32%",
    position: "absolute",
    top: "69%",
    width: 112,
  },
  homeAliveModelOnly: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    overflow: "visible",
    width: "100%",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    backgroundColor: "#f8fbff",
    borderColor: "#b8cee5",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minWidth: 145,
    padding: spacing.sm,
    shadowColor: "#185a9d",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 38,
    justifyContent: "center",
    marginBottom: 4,
    width: 38,
  },
  metricIconAmber: {
    backgroundColor: "#c47b2f",
  },
  metricIconViolet: {
    backgroundColor: "#7257c4",
  },
  metricIconBlue: {
    backgroundColor: "#3279b8",
  },
  metricIconRose: {
    backgroundColor: "#c84a5d",
  },
  metricLabel: {
    color: "#61758b",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
  },
  metricDetail: {
    color: "#5d7188",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    gap: 3,
  },
  firstWinPanel: {
    ...aiPanelSurface,
    gap: spacing.md,
    padding: spacing.md,
  },
  firstWinHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  firstWinTitleBlock: {
    flex: 1,
    minWidth: 250,
  },
  sectionTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "600",
  },
  sectionMeta: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "400",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  quickActionCard: {
    ...aiPanelSurface,
    flex: 1,
    gap: spacing.sm,
    minHeight: 176,
    minWidth: 188,
    overflow: "hidden",
    padding: spacing.sm,
    paddingTop: spacing.lg,
  },
  quickActionTopLine: {
    backgroundColor: "rgba(26,115,232,0.14)",
    height: 5,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  quickActionTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionIcon: {
    alignItems: "center",
    backgroundColor: "#e8f0fe",
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  quickActionValue: {
    color: "#34506c",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  quickActionTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  quickActionBody: {
    color: "#536a84",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  quickActionFooter: {
    alignItems: "center",
    borderTopColor: "#d8e5f2",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: spacing.sm,
  },
  quickActionFooterText: {
    color: "#185a9d",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  quickActionArrow: {
    alignItems: "center",
    backgroundColor: "#e8f3ff",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  quickActionArrowText: {
    color: "#185a9d",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  playerPulseTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  pulseAvatar: {
    backgroundColor: "#e7f1fb",
    borderRadius: 8,
    color: "#071427",
    fontSize: 24,
    fontWeight: "900",
    height: 52,
    lineHeight: 52,
    overflow: "hidden",
    textAlign: "center",
    width: 52,
  },
  pulseNameBlock: {
    flex: 1,
  },
  pulseName: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  pulseMeta: {
    color: "#5d7188",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  matchupRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  matchupAvatar: {
    backgroundColor: "#e7f1fb",
    borderRadius: 8,
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    height: 44,
    lineHeight: 44,
    overflow: "hidden",
    textAlign: "center",
    width: 44,
  },
  matchupNames: {
    flex: 1,
  },
  matchupName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  matchupNameDim: {
    color: "#5d7188",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  playLeftRail: {
    alignSelf: "stretch",
    backgroundColor: "rgba(250,252,255,0.92)",
    borderColor: aiLine,
    borderRightWidth: 1,
    gap: 0,
    justifyContent: "flex-start",
    overflow: "visible",
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 34,
    width: 64,
    zIndex: 30,
  },
  playLeftNav: {
    alignItems: "flex-start",
    gap: 0,
    overflow: "visible",
    zIndex: 40,
  },
  playLeftNavItemWrap: {
    height: 56,
    marginTop: 0,
    overflow: "visible",
    zIndex: 41,
  },
  playLeftNavItem: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 10,
    borderColor: aiLine,
    borderWidth: 1,
    flexDirection: "row",
    gap: 0,
    height: 48,
    justifyContent: "flex-start",
    overflow: "hidden",
    marginLeft: 4,
    marginTop: 4,
    paddingHorizontal: 0,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    zIndex: 41,
  },
  playLeftNavItemActive: {
    backgroundColor: "rgba(232,240,254,0.96)",
    borderColor: "rgba(47,125,225,0.34)",
    shadowColor: aiBlue,
    shadowOpacity: 0.16,
  },
  playLeftNavItemPressed: {
    opacity: 0.86,
    transform: [{ translateY: 1 }],
  },
  playLeftIconSlot: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: 52,
  },
  playLeftNavText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 15,
    minWidth: 138,
    paddingRight: 0,
    paddingLeft: 2,
  },
  playLeftBottom: {
    alignItems: "center",
    backgroundColor: "#e9f8fb",
    borderColor: "#a9dff0",
    borderWidth: 1,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 8,
    gap: 6,
    marginTop: "auto",
    paddingVertical: 7,
    width: 36,
  },
  playLeftAvatar: {
    alignItems: "center",
    backgroundColor: "#f3f7fb",
    borderRadius: 5,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  playLeftAvatarText: {
    fontSize: 12,
  },
  playLeftBadge: {
    alignItems: "center",
    backgroundColor: "#ef4444",
    borderRadius: 999,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  playLeftBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  playLayout: {
    alignItems: "center",
    gap: 0,
    position: "relative",
    width: "100%",
  },
  playLayoutWide: {
    alignItems: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  playLayoutWideResult: {
    gap: spacing.md,
    justifyContent: "center",
    marginHorizontal: "auto",
    maxWidth: 1760,
  },
  boardColumn: {
    flex: 1,
    gap: 0,
    maxWidth: 1030,
    minWidth: 0,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  boardColumnResult: {
    flexGrow: 0,
    flexShrink: 0,
  },
  boardStageWrap: {
    alignSelf: "center",
    position: "relative",
  },
  clipShareBar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(240, 249, 255, 0.96)",
    borderColor: "#b8d8e8",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.sm,
    maxWidth: 720,
    padding: spacing.sm,
    width: "100%",
  },
  clipShareCopy: {
    flex: 1,
    minWidth: 0,
  },
  clipShareTitle: {
    color: "#102f4a",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  clipShareText: {
    color: "#4f6b7c",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  sideColumn: {
    alignSelf: "stretch",
    gap: spacing.sm,
    maxWidth: 310,
    marginLeft: "auto",
    overflow: "hidden",
    width: "100%",
  },
  sideColumnMobile: {
    alignSelf: "stretch",
    marginLeft: 0,
    marginTop: spacing.sm,
    maxWidth: "100%",
    width: "100%",
  },
  sideColumnOpen: {
    minWidth: 270,
  },
  sideColumnResult: {
    marginLeft: 0,
  },
  sideColumnMobileOpen: {
    minWidth: 0,
  },
  sideDockChip: {
    alignSelf: "center",
    marginTop: spacing.sm,
    zIndex: 12,
  },
  sideDockChipWide: {
    position: "absolute",
    right: 0,
    top: 88,
  },
  sideDockChipButton: {
    alignItems: "center",
    backgroundColor: "#eefbff",
    borderColor: "#a9dff0",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    shadowColor: "#6678b7",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  sideDockChipText: {
    color: "#203159",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  playAdRail: {
    gap: spacing.sm,
    maxWidth: 260,
    minWidth: 240,
    width: 260,
  },
  gameDock: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderBottomColor: "rgba(37,99,235,0.18)",
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.32)",
    borderRadius: 12,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    marginRight: -1,
    minHeight: 0,
    padding: 8,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.11,
    shadowRadius: 28,
  },
  gameDockMobile: {
    borderBottomRightRadius: 12,
    borderRightWidth: 1,
    borderTopRightRadius: 12,
    marginRight: 0,
    minHeight: 0,
    shadowOpacity: 0.16,
  },
  gameDockHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  gameDockHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  gameScoreCard: {
    backgroundColor: "rgba(248,251,255,0.96)",
    borderColor: "rgba(125,160,190,0.38)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 0,
    overflow: "hidden",
    padding: 0,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  scoreClockRow: {
    flexDirection: "row",
    gap: 6,
  },
  scoreClockStrip: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "rgba(148,163,184,0.32)",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 42,
    paddingHorizontal: 6,
  },
  scoreClockBox: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
  },
  scoreClockBoxActive: {
    backgroundColor: "rgba(14,165,233,0.08)",
    borderRadius: 11,
  },
  scoreClockText: {
    color: "#a2acb8",
    fontFamily: appFontFamily,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
  },
  scoreClockTextActive: {
    color: "#10233f",
  },
  scoreSignalBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 2,
    height: 20,
    justifyContent: "center",
    width: 24,
  },
  scoreSignalBar: {
    backgroundColor: "#c9d6de",
    borderRadius: 2,
    width: 4,
  },
  scoreSignalBarOn: {
    backgroundColor: "#2fb978",
  },
  mobileGameHud: {
    backgroundColor: "#07131f",
    borderColor: "#1c465f",
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
    marginBottom: 8,
    padding: 8,
    shadowColor: "#06101b",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  mobileHudMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  mobileHudStatus: {
    color: "#d8edf6",
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  mobileHudTimeControl: {
    backgroundColor: "#e8f5fb",
    borderRadius: 8,
    color: "#102334",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mobileClockGrid: {
    flexDirection: "row",
    gap: 7,
  },
  mobileClockCard: {
    backgroundColor: "#f4f8fb",
    borderColor: "#a8bfcd",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  mobileClockCardDark: {
    backgroundColor: "#162231",
    borderColor: "#3d5367",
  },
  mobileClockCardActive: {
    borderColor: "#2cc6d4",
    shadowColor: "#2cc6d4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
  },
  mobileClockIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 26,
  },
  mobileClockAvatar: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderRadius: 7,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  mobileClockAvatarDark: {
    backgroundColor: "#26384c",
  },
  mobileClockAvatarText: {
    fontSize: 14,
    lineHeight: 19,
  },
  mobileClockNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  mobileClockName: {
    color: "#102334",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
  },
  mobileClockNameDark: {
    color: "#f4fbff",
  },
  mobileClockMeta: {
    color: "#697986",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 1,
  },
  mobileClockMetaDark: {
    color: "#a9bdcb",
  },
  mobileClockText: {
    color: "#7e8890",
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
    textAlign: "center",
  },
  mobileClockTextDark: {
    color: "#b8c5cf",
  },
  mobileClockTextActive: {
    color: "#111820",
  },
  mobileClockTextActiveDark: {
    color: "#ffffff",
  },
  mobileTurnLine: {
    color: "#9fc7d7",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  scoreNameGrid: {
    alignItems: "center",
    backgroundColor: "#f7fbff",
    borderBottomColor: "rgba(148,163,184,0.28)",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 30,
  },
  scoreFlag: {
    backgroundColor: "#ffffff",
    borderRightColor: "rgba(148,163,184,0.28)",
    borderRightWidth: 1,
    fontSize: 18,
    height: "100%",
    lineHeight: 30,
    textAlign: "center",
    width: 34,
  },
  scoreNameGridCell: {
    flex: 1,
  },
  scorePlayerRow: {
    alignItems: "center",
    backgroundColor: "#f7f9fa",
    borderColor: "#cbd5dc",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 39,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  scoreAvatar: {
    alignItems: "center",
    backgroundColor: "#1c2631",
    borderRadius: 4,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  scoreAvatarWhite: {
    backgroundColor: "#fff8e7",
  },
  scoreAvatarText: {
    fontSize: 16,
  },
  scorePlayerCopy: {
    flex: 1,
    minWidth: 0,
  },
  scoreName: {
    color: "#14304d",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
    flex: 1,
    paddingHorizontal: 7,
  },
  scoreNameDark: {
    backgroundColor: "#dfe8f2",
    color: "#20314a",
    borderRadius: 0,
    height: "100%",
    lineHeight: 30,
  },
  scoreMeta: {
    color: "#6c7b87",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 1,
  },
  scoreMaterial: {
    color: "#435465",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    maxWidth: 82,
  },
  scorePlayerGrid: {
    alignItems: "center",
    backgroundColor: "#f8fbff",
    borderBottomColor: "rgba(148,163,184,0.28)",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 40,
  },
  scorePieceBadge: {
    alignItems: "center",
    backgroundColor: "#132033",
    borderColor: "rgba(148,163,184,0.28)",
    borderRightWidth: 1,
    height: "100%",
    justifyContent: "center",
    width: 38,
  },
  scorePieceBadgeWhite: {
    backgroundColor: "#fff8e7",
  },
  scorePieceBadgeText: {
    color: "#14304d",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  scorePieceBadgeTextDark: {
    color: "#ffffff",
  },
  scoreRating: {
    color: "#8a9856",
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  scorePoint: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(148,163,184,0.25)",
    borderLeftWidth: 1,
    color: "#344458",
    fontSize: 12,
    fontWeight: "900",
    height: "100%",
    lineHeight: 40,
    textAlign: "center",
    width: 30,
  },
  scoreCapturedGrid: {
    backgroundColor: "#f8fbff",
    flexDirection: "row",
  },
  scoreCapturedSide: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  scoreCapturedCell: {
    alignItems: "center",
    backgroundColor: "#f3f7fb",
    borderColor: "rgba(148,163,184,0.24)",
    borderRightWidth: 1,
    borderTopWidth: 1,
    height: 34,
    justifyContent: "center",
    position: "relative",
    width: "16.666%",
  },
  scoreCapturedCellActive: {
    backgroundColor: "#e7f5ff",
  },
  scoreCapturedCountPill: {
    alignItems: "center",
    backgroundColor: "#17b26a",
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    height: 15,
    justifyContent: "center",
    minWidth: 15,
    paddingHorizontal: 3,
    position: "absolute",
    right: 1,
    top: 1,
  },
  sidebarPieceIcon: {
    alignItems: "center",
    height: 29,
    justifyContent: "center",
    overflow: "visible",
    width: 29,
  },
  sidebarPieceIconMuted: {
    opacity: 0.66,
  },
  scoreCapturedCount: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
  },
  dockCollapseButton: {
    alignItems: "center",
    backgroundColor: "#e9eef2",
    borderColor: "#c9d3db",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  gameDockTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "600",
  },
  gameDockMeta: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  gameDockTabs: {
    alignItems: "flex-end",
    backgroundColor: "#eef5fb",
    borderColor: "rgba(148,163,184,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 0,
    padding: 4,
  },
  gameDockTab: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 4,
  },
  gameDockTabActive: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(37,99,235,0.18)",
    ...aiSoftShadow,
  },
  gameDockTabText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
  },
  gameDockTabTextActive: {
    color: aiInk,
  },
  gameDockBody: {
    gap: 0,
  },
  openingCard: {
    ...aiInsetSurface,
    gap: 4,
    padding: spacing.sm,
  },
  openingLabel: {
    color: "#6c7b87",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  openingName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  openingNameOnDark: {
    color: "#162635",
  },
  openingLine: {
    color: "#61758b",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  openingLineOnDark: {
    color: "#5f7180",
  },
  moveTable: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(148,163,184,0.28)",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  moveTableHeader: {
    backgroundColor: "#f5f9fd",
    flexDirection: "row",
    paddingVertical: 7,
  },
  moveTableRow: {
    borderTopColor: "rgba(148,163,184,0.24)",
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 28,
    paddingVertical: 0,
  },
  moveNumberCell: {
    backgroundColor: "#f4f7fb",
    borderRightColor: "rgba(148,163,184,0.24)",
    borderRightWidth: 1,
    color: "#6b757d",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center",
    width: 32,
  },
  moveCellHeader: {
    color: "#516273",
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  moveCell: {
    color: "#273540",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 28,
  },
  moveCellActive: {
    color: "#ffffff",
  },
  moveCellButton: {
    backgroundColor: "#ffffff",
    borderRightColor: "rgba(148,163,184,0.24)",
    borderRightWidth: 1,
    flex: 1,
    minHeight: 28,
    paddingHorizontal: 8,
  },
  moveCellButtonActive: {
    backgroundColor: "#228be6",
  },
  moveEmptyText: {
    color: "#61758b",
    fontSize: 13,
    fontWeight: "800",
    padding: spacing.md,
  },
  replayControls: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  replayButton: {
    alignItems: "center",
    backgroundColor: "#eef2f5",
    borderColor: "#c7d1d8",
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  replayButtonDisabled: {
    opacity: 0.46,
  },
  replayButtonText: {
    color: "#31495d",
    fontSize: 12,
    fontWeight: "900",
  },
  replayButtonTextDisabled: {
    color: "#8b98a3",
  },
  matchActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5dc",
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  capturedInline: {
    backgroundColor: "#eef2f5",
    borderColor: "#cbd5dc",
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 3,
    padding: spacing.md,
  },
  capturedInlineTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  capturedInlineText: {
    color: "#61758b",
    fontSize: 12,
    fontWeight: "800",
  },
  cubeToolStrip: {
    alignItems: "center",
    backgroundColor: "#f6faff",
    borderColor: "rgba(148,163,184,0.28)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 45,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  cubeToolButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(148,163,184,0.28)",
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    width: 34,
  },
  cubeToolButtonEnd: {
    marginLeft: "auto",
  },
  cubeToolButtonDisabled: {
    opacity: 0.4,
  },
  cubeToolButtonText: {
    color: "#7f8c95",
    fontSize: 11,
    fontWeight: "900",
  },
  cubeGameBody: {
    backgroundColor: "#f7fbff",
    borderColor: "rgba(148,163,184,0.28)",
    borderTopWidth: 0,
    borderWidth: 1,
    minHeight: 350,
    padding: 8,
  },
  cubeOpeningTitle: {
    color: "#34404a",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  cubeOpeningCode: {
    color: "#4c8fa6",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 7,
  },
  cubeGameMeta: {
    color: "#4b5a64",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 6,
  },
  cubeStatusLine: {
    color: "#34404a",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 10,
  },
  cubeMessageLine: {
    color: "#5e6a72",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3,
  },
  cubeChatArea: {
    backgroundColor: "#f7fbff",
    borderColor: "rgba(148,163,184,0.28)",
    borderTopWidth: 0,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 8,
  },
  cubeChatRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  cubeMoodButton: {
    alignItems: "center",
    backgroundColor: "#20b9d0",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  cubeMoodText: {
    fontSize: 16,
    lineHeight: 22,
  },
  cubeChatInput: {
    backgroundColor: "#ffffff",
    borderColor: "#c5cbd0",
    borderRadius: 2,
    borderWidth: 1,
    color: "#0f172a",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    height: 28,
    minWidth: 0,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  cubeSendAllButton: {
    alignItems: "center",
    backgroundColor: "#2aa7e4",
    borderColor: "#0c86bd",
    borderRadius: 12,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: 9,
  },
  cubeSendAllButtonDisabled: {
    opacity: 0.72,
  },
  cubeSendAllText: {
    color: "#073653",
    fontSize: 11,
    fontWeight: "900",
  },
  cubeReportLink: {
    color: "#60a5d8",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  resultBoardDockLayer: {
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 32,
  },
  resultOverlay: {
    alignItems: "center",
    backgroundColor: "transparent",
    maxWidth: 420,
    padding: 0,
    position: "absolute",
  },
  resultCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(13,46,22,0.52)",
    borderColor: "rgba(255,255,255,0.38)",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 30,
    zIndex: 5,
  },
  resultChip: {
    bottom: spacing.md,
    position: "absolute",
    right: spacing.md,
  },
  resultChipButton: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderColor: "#f4c46b",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    shadowColor: "#f4c46b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  resultChipText: {
    color: "#102033",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  resultOverlayTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  resultOverlayBody: {
    color: "#d6e7f7",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center",
  },
  winnerCard: {
    gap: 8,
    width: "100%",
  },
  winnerHero: {
    backgroundColor: "#91b936",
    borderColor: "rgba(218,245,126,0.75)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 114,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#365314",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  winnerCopy: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  winnerTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
    textShadowColor: "rgba(20,37,5,0.5)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 2,
  },
  winnerSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  winnerRatingRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  winnerRatingLabel: {
    color: "#fff37a",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  winnerRatingNumber: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 21,
    fontWeight: "900",
  },
  ratingGainPop: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    color: "#052e16",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  winnerCubits: {
    color: "#fff4a1",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  winnerKnight: {
    alignItems: "center",
    height: 74,
    justifyContent: "center",
    marginTop: -2,
    width: 66,
  },
  chessAliveLogoMark: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  winnerLogoMark: {
    borderRadius: 0,
    borderWidth: 0,
    shadowColor: "#082a36",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    width: 72,
  },
  globeLogoMark: {
    borderRadius: 0,
    borderWidth: 0,
    width: 46,
  },
  winnerButtonRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
  },
  winnerAction: {
    alignItems: "center",
    backgroundColor: "#c8ea62",
    borderBottomColor: "#52720d",
    borderBottomWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 8,
  },
  winnerActionBlue: {
    backgroundColor: "#55aaff",
    borderBottomColor: "#1769b0",
    borderColor: "#9bd2ff",
  },
  winnerActionText: {
    color: "#0b1d17",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  winnerFriendButton: {
    alignItems: "center",
    backgroundColor: "#9bc43e",
    borderBottomColor: "#587318",
    borderBottomWidth: 2,
    borderColor: "rgba(231,255,140,0.76)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginHorizontal: 4,
    minHeight: 36,
  },
  winnerFriendText: {
    color: "#10230c",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  winnerAdCard: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderColor: "#f1cf86",
    borderWidth: 2,
    flexDirection: "row",
    gap: 14,
    minHeight: 118,
    padding: 12,
  },
  winnerMerchCap: {
    alignItems: "center",
    backgroundColor: "#f3f5f6",
    borderBottomColor: "#d6e0e7",
    borderBottomWidth: 10,
    borderRadius: 999,
    height: 78,
    justifyContent: "center",
    width: 98,
  },
  winnerMerchCapText: {
    color: "#2d8eb4",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  winnerMerchText: {
    color: "#1687a1",
    flex: 1,
    fontFamily: displayFontFamily,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 30,
    textAlign: "center",
  },
  boardShell: {
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 8,
    position: "relative",
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.34,
    shadowRadius: 34,
  },
  boardShellJewel: {
    backgroundColor: "#0d4272",
    borderColor: "rgba(255,255,255,0.52)",
    borderWidth: 1,
    padding: 14,
    shadowColor: "#174f82",
    shadowOpacity: 0.38,
    shadowRadius: 38,
  },
  boardShellClarity: {
    backgroundColor: "#111820",
    borderColor: "#d1a93f",
    borderWidth: 1,
    padding: 12,
    shadowColor: "#102b3a",
    shadowOpacity: 0.28,
    shadowRadius: 30,
  },
  boardGlow: {
    borderRadius: 12,
    bottom: -5,
    left: -5,
    opacity: 0.08,
    position: "absolute",
    right: -5,
    top: -5,
  },
  boardGlowJewel: {
    bottom: -12,
    left: -12,
    opacity: 0.18,
    right: -12,
    top: -12,
  },
  board: {
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  boardJewel: {
    borderColor: "#082d52",
    borderRadius: 10,
    borderWidth: 3,
  },
  boardClarity: {
    borderColor: "#0b1118",
    borderRadius: 4,
    borderWidth: 2,
  },
  boardRow: {
    flex: 1,
    flexDirection: "row",
    overflow: "visible",
  },
  boardRowDragging: {
    zIndex: 80,
  },
  square: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  squareDragging: {
    zIndex: 90,
  },
  squarePremove: {
    shadowColor: "#fb7185",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.86,
    shadowRadius: 14,
  },
  premoveFlag: {
    alignItems: "center",
    backgroundColor: "#fb7185",
    borderColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    left: 5,
    minWidth: 28,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: "absolute",
    top: 5,
    zIndex: 5,
  },
  premoveFlagText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0,
  },
  premoveTargetRing: {
    borderColor: "#fb7185",
    borderRadius: 999,
    borderWidth: 4,
    height: "68%",
    opacity: 0.94,
    position: "absolute",
    width: "68%",
  },
  squareFacet: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  squareFacetLight: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(0,0,0,0.035)",
    borderWidth: 1,
  },
  squareFacetDark: {
    backgroundColor: "rgba(13,72,79,0.08)",
    borderColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
  },
  squareSpark: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderRadius: 999,
    height: "18%",
    position: "absolute",
    right: "12%",
    top: "12%",
    width: "18%",
  },
  legalDot: {
    borderRadius: 999,
    borderWidth: 0,
    height: "24%",
    position: "absolute",
    width: "24%",
  },
  legalRing: {
    borderRadius: 999,
    borderWidth: 4,
    height: "78%",
    position: "absolute",
    width: "78%",
  },
  pieceFrame: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: "100%",
    justifyContent: "center",
    overflow: "visible",
    width: "100%",
  },
  pieceLifeMorph: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  pieceLifeLayer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
  },
  pieceLifeModel: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    zIndex: 12,
  },
  pieceLifeShadow: {
    backgroundColor: "rgba(9, 17, 24, 0.38)",
    borderRadius: 999,
    bottom: "22%",
    position: "absolute",
    zIndex: 1,
  },
  dragPieceOverlay: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    zIndex: 120,
  },
  activeTravelPieceLayer: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    zIndex: 116,
  },
  ceremonyLayer: {
    bottom: 0,
    left: 0,
    overflow: "visible",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 118,
  },
  ceremonyGlbPieceLayer: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    zIndex: 119,
  },
  ceremonyMissingGlb: {
    alignItems: "center",
    backgroundColor: "rgba(239, 246, 255, 0.92)",
    borderColor: "#8bb8cc",
    borderRadius: 12,
    borderWidth: 1,
    height: "100%",
    justifyContent: "center",
    padding: 8,
    width: "100%",
  },
  ceremonyMissingText: {
    color: "#123047",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
  handshakeBurst: {
    alignItems: "center",
    backgroundColor: "rgba(255, 244, 190, 0.96)",
    borderColor: "#b7831d",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    zIndex: 121,
  },
  handshakeBurstText: {
    color: "#80570f",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  checkmateImpact: {
    alignItems: "center",
    backgroundColor: "#facc15",
    borderColor: "#111820",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    zIndex: 122,
  },
  checkmateImpactText: {
    color: "#111820",
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  draggablePiece: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    height: "100%",
    justifyContent: "center",
    overflow: "visible",
    width: "100%",
    zIndex: 4,
  },
  draggablePieceHidden: {
    opacity: 0,
  },
  draggablePieceActive: {
    zIndex: 100,
  },
  assembledPiece: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  rankLabel: {
    fontSize: 10,
    fontWeight: "900",
    left: 4,
    position: "absolute",
    top: 4,
  },
  fileLabel: {
    bottom: 3,
    fontSize: 10,
    fontWeight: "900",
    position: "absolute",
    right: 4,
  },
  squareLabelDark: {
    color: "#16406f",
  },
  squareLabelLight: {
    color: "#dbeafe",
  },
  status: {
    color: "#0f172a",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  messageText: {
    color: "#5d7188",
    fontFamily: appFontFamily,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  panel: {
    ...aiPanelSurface,
    gap: spacing.sm,
    padding: 18,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  panelTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: typography.section,
    fontWeight: "600",
  },
  muted: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: typography.body,
    lineHeight: 22,
  },
  cardTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: typography.section,
    fontWeight: "600",
  },
  statLine: {
    borderTopColor: aiLine,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  statLabel: {
    color: aiMuted,
    flex: 1,
    fontFamily: appFontFamily,
    fontWeight: "400",
  },
  statValue: {
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontWeight: "600",
    textAlign: "right",
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  leaderboardPodium: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  leaderboardPodiumCard: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderColor: "#f1cf7a",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minWidth: 0,
    padding: spacing.sm,
  },
  leaderboardPodiumRank: {
    color: "#a16207",
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  leaderboardPodiumAvatar: {
    fontSize: 20,
    lineHeight: 24,
  },
  leaderboardPodiumName: {
    color: "#102033",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    maxWidth: "100%",
  },
  leaderboardPodiumScore: {
    color: "#1f8f6b",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  leaderboardRailRow: {
    alignItems: "center",
    ...aiInsetSurface,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  leaderboardRank: {
    color: "#40728a",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
    width: 34,
  },
  leaderboardName: {
    color: "#102033",
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "900",
    minWidth: 0,
  },
  leaderboardScore: {
    color: "#1c8b6a",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  watchMatchRow: {
    alignItems: "center",
    ...aiInsetSurface,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  watchMatchCopy: {
    flex: 1,
    minWidth: 0,
  },
  privateRoomRow: {
    alignItems: "center",
    ...aiInsetSurface,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  groupRow: {
    alignItems: "flex-start",
    ...aiInsetSurface,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  groupCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  planCard: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  planTitle: {
    color: "#102033",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  planPrice: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
    marginVertical: 3,
  },
  planHint: {
    color: "#be123c",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
  },
  funRulesStudio: {
    gap: spacing.sm,
  },
  funRuleCard: {
    ...aiInsetSurface,
    gap: 8,
    padding: spacing.sm,
  },
  funRuleHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  funRuleNumber: {
    backgroundColor: "#dff3ff",
    borderRadius: 999,
    color: "#164e63",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  funRuleToggle: {
    backgroundColor: "#e5edf4",
    borderColor: "#c7d5e1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  funRuleToggleOn: {
    backgroundColor: "#20b486",
    borderColor: "#13936b",
  },
  funRuleToggleText: {
    color: "#486174",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  funRuleToggleTextOn: {
    color: "#ffffff",
  },
  funRuleInput: {
    ...aiPillSurface,
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "400",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  funRuleDescriptionInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  boardStudio: {
    gap: spacing.md,
  },
  boardStudioHeader: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  boardStudioTitle: {
    color: "#0f172a",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  boardStudioMeta: {
    color: "#61758b",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  boardStudioPreview: {
    aspectRatio: 1,
    borderColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
    width: 74,
  },
  boardStudioPreviewRow: {
    flex: 1,
    flexDirection: "row",
  },
  boardStudioPreviewSquare: {
    flex: 1,
  },
  boardStudioPreviewGlow: {
    borderRadius: 999,
    bottom: 8,
    height: 18,
    opacity: 0.9,
    position: "absolute",
    right: 8,
    width: 18,
  },
  themePresetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  themePresetCard: {
    alignItems: "center",
    ...aiInsetSurface,
    gap: 7,
    minWidth: 118,
    padding: 10,
  },
  themePresetCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
    ...aiSoftShadow,
  },
  themePresetBoard: {
    aspectRatio: 1,
    borderColor: "#102435",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
    width: 44,
  },
  themePresetSquare: {
    height: "50%",
    width: "50%",
  },
  themePresetText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 102,
  },
  themePresetTextActive: {
    color: aiInk,
  },
  colorSwatchGroup: {
    gap: 8,
  },
  colorSwatchLabel: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  colorSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorSwatchButton: {
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
  },
  colorSwatchButtonActive: {
    borderColor: aiBlue,
    borderWidth: 2,
  },
  colorSwatch: {
    borderColor: "rgba(15, 23, 42, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    width: 28,
  },
  controlRailActions: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
    minWidth: 260,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: aiSurface,
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    ...aiSoftShadow,
  },
  actionButtonAccent: {
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.36)",
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  actionButtonText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtonTextAccent: {
    color: "#ffffff",
  },
  listText: {
    color: "#0f172a",
    fontFamily: appFontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
  featureGrid: {
    gap: spacing.md,
  },
  learningExperience: {
    gap: spacing.md,
  },
  lessonHeroPanel: {
    alignItems: "stretch",
    ...aiPanelSurface,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    padding: spacing.md,
  },
  lessonHeroCopy: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    minWidth: 300,
  },
  lessonHeroTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38,
  },
  lessonHeroText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 23,
    maxWidth: 720,
  },
  lessonPreviewBoard: {
    alignSelf: "center",
    borderColor: "#c3d7ec",
    borderRadius: radii.sm,
    borderWidth: 1,
    maxWidth: 260,
    minWidth: 220,
    overflow: "hidden",
    width: "26%",
  },
  lessonBodyGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  lessonStepPanel: {
    ...aiPanelSurface,
    flex: 1.2,
    gap: spacing.sm,
    minWidth: 340,
    padding: spacing.md,
  },
  lessonProgressTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  lessonProgressText: {
    color: "#1f8f6b",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  lessonPathPanel: {
    flex: 0.78,
    gap: spacing.sm,
    minWidth: 320,
  },
  lessonPathCard: {
    alignItems: "center",
    ...aiInsetSurface,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  lessonPathCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
    ...aiSoftShadow,
  },
  lessonPathNumber: {
    alignItems: "center",
    backgroundColor: "#1687a1",
    borderColor: "#7ddde8",
    borderWidth: 1,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  lessonPathNumberText: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  lessonPathCopy: {
    flex: 1,
    minWidth: 0,
  },
  lessonPathTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  lessonPathSummary: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2,
  },
  lessonPathXp: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  botExperience: {
    gap: spacing.md,
  },
  botHeroPanel: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
  },
  botHeroAvatar: {
    alignItems: "center",
    backgroundColor: "#e8f0fe",
    borderRadius: 12,
    height: 104,
    justifyContent: "center",
    ...aiSoftShadow,
    width: 104,
  },
  botHeroAvatarText: {
    fontSize: 48,
  },
  botHeroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 300,
  },
  botHeroTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38,
  },
  botHeroText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 23,
    maxWidth: 640,
  },
  botHeroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  botPreviewBoard: {
    borderColor: "#475569",
    borderRadius: radii.sm,
    borderWidth: 1,
    maxWidth: 230,
    minWidth: 190,
    overflow: "hidden",
    width: "24%",
  },
  botGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  botCard: {
    ...aiPanelSurface,
    flex: 1,
    gap: spacing.xs,
    minWidth: 220,
    padding: spacing.md,
  },
  botCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
  },
  botCardAvatar: {
    fontSize: 32,
    lineHeight: 38,
  },
  botCardName: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "600",
  },
  botCardPersonality: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
  },
  botCardRating: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "900",
  },
  reviewExperience: {
    gap: spacing.md,
  },
  learnExperience: {
    gap: spacing.md,
  },
  learnSubtabBar: {
    ...aiPillSurface,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.82)",
    flexDirection: "row",
    gap: 6,
    padding: 6,
  },
  learnSubtabButton: {
    borderRadius: 999,
    minWidth: 132,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  learnSubtabButtonActive: {
    backgroundColor: aiInk,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  learnSubtabLabel: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  learnSubtabLabelActive: {
    color: "#ffffff",
  },
  learnSubtabCaption: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  learnSubtabCaptionActive: {
    color: "rgba(255,255,255,0.68)",
  },
  reviewExperienceCompact: {
    marginTop: spacing.sm,
  },
  reviewHeroPanel: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
  },
  reviewHeroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 280,
  },
  reviewKickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  reviewHeroActions: {
    alignItems: "center",
    gap: spacing.md,
    minWidth: 220,
  },
  reviewAccuracyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  reviewAccuracyCard: {
    alignItems: "center",
    ...aiInsetSurface,
    gap: spacing.xs,
    padding: spacing.sm,
    width: 120,
  },
  reviewAccuracyRing: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 6,
    height: 86,
    justifyContent: "center",
    width: 86,
  },
  reviewAccuracyValue: {
    fontFamily: displayFontFamily,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 33,
  },
  reviewAccuracyUnit: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "900",
  },
  reviewAccuracyLabel: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  reviewGauge: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#afe6c9",
    borderRadius: 999,
    borderWidth: 8,
    height: 150,
    justifyContent: "center",
    width: 150,
  },
  reviewGaugeMuted: {
    backgroundColor: "#f3f7fc",
    borderColor: "#d9e4f2",
  },
  reviewGaugeActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
  },
  reviewGaugeValue: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 46,
  },
  reviewGaugeLabel: {
    color: "#347a62",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  reviewScoreCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 320,
  },
  reviewTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38,
  },
  reviewText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
  reviewMetricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reviewRunButton: {
    alignItems: "center",
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.48)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minWidth: 180,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    shadowColor: aiBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  reviewRunButtonDisabled: {
    opacity: 0.72,
  },
  reviewRunButtonText: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  reviewProgressPanel: {
    ...aiPanelSurface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  reviewProgressTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  reviewProgressLabel: {
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  reviewProgressCount: {
    color: aiMuted,
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  reviewProgressTrack: {
    backgroundColor: "#e8eef5",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  reviewProgressFill: {
    backgroundColor: "#0f8a67",
    borderRadius: 999,
    height: "100%",
  },
  reviewErrorText: {
    color: "#b91c1c",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  reviewBoardGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  reviewBoardPanel: {
    ...aiPanelSurface,
    flex: 0.8,
    gap: spacing.sm,
    minWidth: 300,
    overflow: "hidden",
    padding: spacing.sm,
  },
  reviewBoardFooter: {
    ...aiInsetSurface,
    gap: 2,
    padding: spacing.sm,
  },
  reviewBoardFooterTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 15,
    fontWeight: "900",
  },
  reviewBoardFooterText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  reviewCoachPanel: {
    ...aiPanelSurface,
    flex: 1.15,
    gap: spacing.md,
    minWidth: 320,
    padding: spacing.md,
  },
  reviewCoachHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  reviewCoachHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewCoachTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "900",
  },
  reviewCoachText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 2,
  },
  reviewSelectedCard: {
    ...aiInsetSurface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  reviewSelectedTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  reviewSelectedMove: {
    color: aiInk,
    flex: 1,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
  },
  reviewSelectedExplanation: {
    color: "#344256",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },
  reviewReasonList: {
    gap: 7,
  },
  reviewReasonItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  reviewReasonText: {
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  reviewEvalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reviewLessonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reviewLessonCard: {
    ...aiInsetSurface,
    flex: 1,
    gap: 3,
    minWidth: 180,
    padding: spacing.sm,
  },
  reviewLessonTitle: {
    color: aiBlue,
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  reviewLessonText: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  reviewTimelinePanel: {
    ...aiPanelSurface,
    gap: spacing.md,
    padding: spacing.md,
  },
  reviewTimelineHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  reviewTimelineTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
  },
  reviewTimelineText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  reviewMoveTimeline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reviewMoveCard: {
    ...aiInsetSurface,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 230,
    padding: spacing.sm,
    width: "31%",
  },
  reviewMoveCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.42)",
    ...aiSoftShadow,
  },
  reviewMoveCardTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  reviewMoveNumber: {
    color: aiMuted,
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
    width: 34,
  },
  reviewMoveSan: {
    color: aiInk,
    flex: 1,
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  reviewClassBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewClassBadgeText: {
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  reviewMoveExplanation: {
    color: "#475569",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  reviewMoveMetaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  reviewMoveMetaText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
  },
  reviewPgnPanel: {
    ...aiPanelSurface,
    gap: spacing.xs,
    padding: spacing.md,
  },
  reviewPgnTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 16,
    fontWeight: "900",
  },
  reviewPgnText: {
    color: "#344256",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  tournamentExperience: {
    gap: spacing.md,
  },
  tournamentHero: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  tournamentHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  tournamentHeroTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 37,
  },
  tournamentHeroText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
    marginTop: 6,
  },
  tournamentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tournamentCard: {
    ...aiPanelSurface,
    flex: 1,
    gap: spacing.sm,
    minWidth: 280,
    padding: spacing.md,
  },
  tournamentCardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  tournamentName: {
    color: aiInk,
    flex: 1,
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
  },
  tournamentModePill: {
    backgroundColor: "#e8eef5",
    borderColor: "#cbd8e6",
    borderRadius: 999,
    borderWidth: 1,
    color: "#51677f",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tournamentModePillAlive: {
    backgroundColor: "#fff4d6",
    borderColor: "#efc55c",
    color: "#925e08",
  },
  tournamentStart: {
    color: "#0f8a67",
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "900",
  },
  tournamentMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  socialHero: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  socialHeroTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 37,
  },
  socialHeroText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
    marginTop: 4,
    maxWidth: 720,
  },
  socialHeroStat: {
    alignItems: "center",
    backgroundColor: "#102033",
    borderRadius: radii.sm,
    minWidth: 128,
    padding: spacing.md,
  },
  socialHeroStatValue: {
    color: "#f6c867",
    fontFamily: displayFontFamily,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
  },
  socialHeroStatLabel: {
    color: "#d9e6f2",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  serverStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  playOnlineHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  playOnlineCopy: {
    flex: 1,
    gap: 2,
  },
  playerFacingStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  serverDot: {
    backgroundColor: "#cbd5e1",
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  serverDotOnline: {
    backgroundColor: "#22c55e",
  },
  serverStatusText: {
    color: "#0f172a",
    flex: 1,
    fontWeight: "900",
  },
  roomCard: {
    ...aiInsetSurface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  roomCode: {
    color: "#185a9d",
    fontSize: 22,
    fontWeight: "900",
  },
  playSetup: {
    gap: spacing.md,
    marginHorizontal: "auto",
    maxWidth: 980,
    width: "100%",
  },
  playSetupHero: {
    alignItems: "center",
    ...aiPanelSurface,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  playSetupCopy: {
    flex: 1,
    gap: 4,
  },
  playSetupTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "600",
  },
  playSetupSubtitle: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  playSetupHeroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  playSetupRating: {
    alignItems: "center",
    backgroundColor: "#e8f2f4",
    borderRadius: 12,
    minWidth: 104,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playSetupRatingLabel: {
    color: "#50636d",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  playSetupRatingValue: {
    color: "#0d1b23",
    fontFamily: displayFontFamily,
    fontSize: 26,
    fontWeight: "900",
  },
  playSetupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  playSetupPanel: {
    ...aiPanelSurface,
    flex: 1,
    gap: spacing.md,
    minWidth: 300,
    padding: spacing.md,
  },
  p2pPanel: {
    flexBasis: "100%",
  },
  p2pHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  p2pTitleBlock: {
    flex: 1,
    gap: 4,
    minWidth: 240,
  },
  p2pSubtitle: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  p2pStatusPill: {
    backgroundColor: "#eef2f7",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  p2pStatusPillConnected: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  p2pStatusText: {
    color: "#475569",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
  },
  p2pStatusTextConnected: {
    color: "#166534",
  },
  p2pModeRow: {
    ...aiInsetSurface,
    flexDirection: "row",
    gap: spacing.sm,
    padding: 6,
  },
  p2pModeButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  p2pModeButtonActive: {
    backgroundColor: "#dff8fb",
  },
  p2pModeText: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  p2pModeTextActive: {
    color: "#0f7285",
  },
  p2pActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  p2pSignalBox: {
    ...aiInsetSurface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  p2pAnswerBox: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  p2pSignalLabel: {
    color: "#334155",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  p2pSignalInput: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    maxHeight: 118,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  p2pError: {
    color: "#b91c1c",
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  p2pFootnote: {
    color: "#64748b",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  playSetupSectionTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 19,
    fontWeight: "600",
  },
  matchSummaryCard: {
    alignItems: "center",
    ...aiInsetSurface,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  matchSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  matchSummaryTitle: {
    color: "#0d1b23",
    fontSize: 15,
    fontWeight: "900",
  },
  matchSummaryText: {
    color: "#526974",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2,
  },
  playSetupActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  botChoiceGrid: {
    gap: spacing.sm,
  },
  botChoiceCard: {
    alignItems: "center",
    backgroundColor: "#e8f3f5",
    borderColor: "#bcd5da",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  botChoiceAvatar: {
    fontSize: 28,
    lineHeight: 34,
  },
  botChoiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  botChoiceName: {
    color: "#0d1b23",
    fontSize: 15,
    fontWeight: "900",
  },
  botChoiceMeta: {
    color: "#526974",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  adCard: {
    backgroundColor: "#fff8e8",
    borderColor: "#f4c46b",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  adCardPremium: {
    minHeight: 520,
    justifyContent: "space-between",
  },
  adVisual: {
    alignItems: "center",
    backgroundColor: "#185a9d",
    borderRadius: radii.md,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 190,
    padding: spacing.md,
  },
  adVisualLogo: {
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    color: "#10233a",
    fontSize: 24,
    fontWeight: "900",
    height: 70,
    lineHeight: 70,
    overflow: "hidden",
    textAlign: "center",
    width: 70,
  },
  adVisualText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  adBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  adBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  adBadge: {
    backgroundColor: "#185a9d",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  adNetwork: {
    color: "#755314",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  adHeadline: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  adBody: {
    color: "#5c4b28",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  adCta: {
    color: "#185a9d",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  puzzleExperience: {
    alignItems: "stretch",
    backgroundColor: "transparent",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: spacing.md,
    overflow: "visible",
    padding: 0,
  },
  puzzleBoardPanel: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(31, 31, 31, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minWidth: 340,
    overflow: "visible",
    padding: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
  },
  // ── Compact header (new) ──────────────────────────────────────────────────
  puzzleCompactHeader: {
    alignItems: "center",
    backgroundColor: "#f8fbff",
    borderColor: "rgba(26, 115, 232, 0.10)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    flexWrap: "nowrap",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  puzzleSideLabel: {
    color: aiInk,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  puzzleCategoryBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  puzzleCategoryText: {
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
  },
  // ── Tutor Panel ───────────────────────────────────────────────────────────
  chessyPanel: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(31, 31, 31, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.045,
    shadowRadius: 22,
    width: 315,
  },
  redesignedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  redesignedHeaderTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  tutorAvatarSpeechRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  whiteSpeechBubbleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  whiteSpeechBubbleTail: {
    borderBottomColor: "transparent",
    borderBottomWidth: 7,
    borderRightColor: "#eef8fb",
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderTopWidth: 7,
    marginTop: 18,
  },
  whiteSpeechBubble: {
    backgroundColor: "#eef8fb",
    borderColor: "rgba(20, 184, 166, 0.16)",
    borderWidth: 1,
    borderRadius: 14,
    flex: 1,
    padding: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  solvedCheckmarkBg: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#81b64c",
    alignItems: "center",
    justifyContent: "center",
  },
  solvedBubbleTitle: {
    color: "#262522",
    fontFamily: displayFontFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  whiteSpeechBubbleBody: {
    color: "#374151",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
  },
  combinedRatingProgressBlock: {
    gap: spacing.xs,
  },
  bigRatingText: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 36,
    fontWeight: "800",
  },
  ratingDeltaText: {
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  inlineStreakText: {
    color: "#f59e0b",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  thickProgressBarBg: {
    backgroundColor: "#e5eef7",
    borderRadius: 7,
    flex: 1,
    height: 14,
    overflow: "hidden",
  },
  thickProgressBarFill: {
    borderRadius: 7,
    height: "100%",
  },
  squareActionButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#0f6f7f",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f6f7f",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  squareActionDisabled: {
    opacity: 0.38,
  },
  wideNextButtonGreen: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#22a06b",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  wideGiveUpButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  giveUpButtonText: {
    color: "#be123c",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  redesignedSubFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(31, 31, 31, 0.08)",
  },
  puzzleBoardWalnutFrame: {
    backgroundColor: "#ffffff",
    borderColor: "#d7edf4",
    borderWidth: 14,
    borderRadius: 16,
    padding: 2,
    position: "relative",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.09,
    shadowRadius: 26,
    elevation: 12,
    zIndex: 40,
  },
  puzzleBoardInnerBevel: {
    borderColor: "#a9dce6",
    borderWidth: 3,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  puzzleBoardDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    zIndex: 10,
  },
  puzzleWinningSquareGlow: {
    position: "absolute",
    backgroundColor: "rgba(16, 185, 129, 0.4)",
    borderColor: "#10b981",
    borderWidth: 3,
    borderRadius: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    zIndex: 11,
  },
  puzzleParticle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 12,
  },
  puzzleFloatingXpCard: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(20, 184, 166, 0.32)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 170,
    height: 85,
    zIndex: 1200,
    elevation: 60,
  },
  puzzleFloatingXpLabel: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  puzzleFloatingXpAmount: {
    color: "#0f766e",
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  puzzleGoldCorner: {
    position: "absolute",
    width: 8,
    height: 8,
    backgroundColor: "#22a6b7",
    borderRadius: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    zIndex: 15,
  },
  puzzlePanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: spacing.sm,
  },
  puzzlePanelTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "900",
  },
  puzzlePanelSub: {
    color: "rgba(255, 255, 255, 0.45)",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  puzzleStreakBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.35)",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  puzzleStreakText: {
    color: "#fca5a5",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  puzzleStreakSpark: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#f59e0b",
  },
  puzzleXpProgressSection: {
    gap: spacing.xs,
  },
  puzzleXpStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  puzzleXpStatsText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "700",
  },
  puzzleAdButton: {
    backgroundColor: "#0f6f7f",
    borderColor: "#67d5df",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  puzzleAdButtonText: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  chessyCharacterRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 0,
    marginTop: -6,
  },
  chessyAvatarCircle: {
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  chessyKnight: {
    color: "#93c5fd",
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
  },
  chessyBubbleTail: {
    borderBottomColor: "transparent",
    borderBottomWidth: 0,
    borderLeftColor: "transparent",
    borderLeftWidth: 0,
    borderRightColor: "transparent",
    borderRightWidth: 10,
    borderTopColor: "#1e3a5f",
    borderTopWidth: 10,
    marginBottom: 12,
    marginLeft: -4,
  },
  chessySpeechBubble: {
    borderRadius: 12,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  chessySpeechBubbleLight: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  chessySpeechTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  chessySpeechTitleDark: {
    color: "#111827",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  chessySpeechBody: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  chessySpeechBodyDark: {
    color: "#374151",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  chessySideMoveRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  chessySideMoveCheck: {
    borderColor: "#9ca3af",
    borderRadius: 3,
    borderWidth: 1.5,
    height: 15,
    width: 15,
  },
  chessyButtonGroup: {
    gap: spacing.sm,
  },
  chessyBtn: {
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  chessyBtnHint: {
    backgroundColor: "#4f46e5",
    borderColor: "#818cf8",
    borderWidth: 1,
  },
  chessyBtnGiveUp: {
    backgroundColor: "#e11d48",
    borderColor: "#fb7185",
    borderWidth: 1,
  },
  chessyBtnReplay: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.4)",
    borderWidth: 1,
  },
  chessyBtnSkip: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
  },
  chessyBtnDisabled: {
    opacity: 0.38,
  },
  chessyBtnText: {
    color: "#ffffff",
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  chessyStatsRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  chessyStat: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  chessyStatVal: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  chessyStatLabel: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  chessyStatDivider: {
    backgroundColor: "rgba(255,255,255,0.15)",
    height: 28,
    width: 1,
  },
  chessyRatingSection: {
    gap: 5,
  },
  chessyRatingLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chessyBiomeLabel: {
    color: "#c8e8b9",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "800",
  },
  chessyRatingNum: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  chessyRatingBar: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 4,
    height: 8,
    overflow: "hidden",
  },
  chessyRatingBarFill: {
    borderRadius: 4,
    height: 8,
  },
  chessyNextBiome: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "600",
  },
  chessyPuzzleMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chessyPuzzleNum: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  // ── Roadmap Overlay ───────────────────────────────────────────────────────
  // ── Roadmap (Living Kingdom theme) ──────────────────────────────────────────
  roadmapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(5,15,5,0.88)",
    justifyContent: "center",
    zIndex: 100,
  },
  roadmapCard: {
    backgroundColor: "#0d2912",
    borderColor: "#2a5c1a",
    borderRadius: 12,
    borderWidth: 1.5,
    gap: spacing.md,
    maxHeight: 700,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.55,
    shadowRadius: 50,
    width: 420,
  },
  roadmapHero: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  roadmapRuneGiant: {
    fontSize: 40,
    lineHeight: 46,
  },
  roadmapKicker: {
    color: "rgba(200,232,185,0.6)",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  roadmapTitle: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  roadmapSolvedBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roadmapSolvedNum: {
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
  },
  roadmapSolvedLabel: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  roadmapRatingWrap: {
    gap: 5,
    paddingHorizontal: spacing.lg,
  },
  roadmapRatingBarBg: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    height: 6,
    overflow: "hidden",
  },
  roadmapRatingBarFill: {
    borderRadius: 4,
    height: 6,
  },
  roadmapRatingLabel: {
    color: "rgba(200,232,185,0.55)",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "700",
  },
  roadmapScroll: {
    maxHeight: 420,
  },
  roadmapPathContent: {
    gap: 0,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  roadmapZoneHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  roadmapZoneLine: {
    flex: 1,
    height: 1,
  },
  roadmapZonePill: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roadmapZonePillText: {
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "800",
  },
  roadmapContinueBtn: {
    alignItems: "center",
    borderRadius: 14,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: 15,
  },
  roadmapContinueText: {
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "900",
  },
  // ── Sir Chessy badge styles (new) ────────────────────────────────────────
  chessySpeechWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  chessyBubbleTailLeft: {
    borderBottomColor: "transparent",
    borderBottomWidth: 7,
    borderRightColor: "#1e3a5f",
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderTopWidth: 7,
    marginTop: 14,
  },
  chessyPuzzleBadgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chessyMoveBadge: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chessyMoveBadgeText: {
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  chessyMotifBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chessyMotifText: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  puzzleBoardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  puzzleKicker: {
    color: aiBlue,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  puzzleTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
    marginTop: 3,
  },
  puzzleFeedback: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
    marginTop: 5,
    maxWidth: 620,
  },
  puzzleRatingBadge: {
    alignItems: "center",
    backgroundColor: "#eef7df",
    borderColor: "#c7df9c",
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  puzzleRatingValue: {
    color: "#47721f",
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
  },
  puzzleRatingLabel: {
    color: "#6f865d",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  puzzleBoardWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    overflow: "visible",
  },
  puzzleMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  puzzleJourneyPanel: {
    ...aiPanelSurface,
    flex: 0.82,
    gap: spacing.md,
    minWidth: 330,
    overflow: "hidden",
    padding: spacing.md,
  },
  puzzleJourneyHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  puzzleChest: {
    alignItems: "center",
    backgroundColor: "#b7823b",
    borderColor: "#e3bc67",
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    transform: [{ rotate: "-10deg" }],
    width: 58,
  },
  puzzleChestText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  puzzleJourneyTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 38,
    fontWeight: "600",
    lineHeight: 42,
  },
  puzzleJourneySubtitle: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    maxWidth: 270,
  },
  puzzleCoachBubble: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 360,
    padding: spacing.md,
  },
  puzzleCoachAvatar: {
    fontSize: 32,
  },
  puzzleCoachText: {
    color: aiInk,
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  puzzlePathScroll: {
    maxHeight: 580,
  },
  puzzlePathMap: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  puzzlePathNode: {
    alignItems: "center",
    backgroundColor: "#b88643",
    borderColor: "#dfbd79",
    borderRadius: 999,
    borderWidth: 2.5,
    height: 72,
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 72,
  },
  puzzlePathNodeLeft: {
    alignSelf: "flex-start",
    marginLeft: 40,
  },
  puzzlePathNodeCenter: {
    alignSelf: "center",
  },
  puzzlePathNodeRight: {
    alignSelf: "flex-end",
    marginRight: 40,
  },
  puzzlePathNodeSolved: {
    backgroundColor: "#a5cf47",
    borderColor: "#d7f285",
  },
  puzzlePathNodeActive: {
    backgroundColor: "#fff1a9",
    borderColor: "#ffffff",
    transform: [{ scale: 1.04 }],
  },
  puzzlePathNumber: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 22,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.24)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  puzzlePathNumberActive: {
    color: "#23310f",
  },
  puzzlePathPawn: {
    // Absolutely fills the 72×72 node so translateY:0 is always the exact centre.
    // lineHeight == height gives reliable vertical centering on both iOS and Android.
    fontSize: 34,
    height: 72,
    includeFontPadding: false,   // Android: removes extra top/bottom padding
    left: 0,
    lineHeight: 72,
    position: "absolute",
    textAlign: "center",
    textAlignVertical: "center", // Android fallback
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    top: 0,
    width: 72,
  },
  puzzleNodeSolvedBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 999,
    height: 16,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 16,
  },
  puzzleNodeSolvedBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
  puzzlePathMotif: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 10,
    fontWeight: "900",
    maxWidth: 98,
    textTransform: "uppercase",
  },
  puzzleProgressBar: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 999,
    height: 18,
    overflow: "hidden",
  },
  puzzleProgressFill: {
    backgroundColor: "#9bd24c",
    borderRadius: 999,
    height: "100%",
  },
  puzzleJourneyFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  puzzleProgressText: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 20,
    fontWeight: "900",
  },
  puzzleJourneyMeta: {
    color: "#c8e8b9",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  puzzleSolveButton: {
    alignItems: "center",
    backgroundColor: "#97cf3f",
    borderColor: "#c9ef79",
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  puzzleSolveButtonText: {
    color: "#172719",
    fontFamily: displayFontFamily,
    fontSize: 17,
    fontWeight: "900",
  },
  puzzleAdRail: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(31, 31, 31, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 0.38,
    gap: spacing.sm,
    minHeight: 240,
    minWidth: 230,
    padding: spacing.md,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
  },
  puzzleAdLabel: {
    color: "#8aa0b6",
    fontFamily: appFontFamily,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  puzzleAdTitle: {
    color: aiInk,
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  puzzleAdCopy: {
    color: aiMuted,
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  // ─── Living Chessboard new styles ──────────────────────────────────────────
  puzzleTimerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: 2,
  },
  puzzleTimer: {
    color: "#53675d",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  puzzleWrongBadge: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderRadius: 999,
    borderWidth: 1,
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  puzzleHintBadge: {
    backgroundColor: "#fef9c3",
    borderColor: "#fde047",
    borderRadius: 999,
    borderWidth: 1,
    color: "#854d0e",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  puzzleFloatBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#9bd24c",
    borderRadius: 14,
    borderWidth: 2,
    bottom: "48%",
    left: "50%",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    position: "absolute",
    transform: [{ translateX: -80 }],
    zIndex: 20,
  },
  puzzleFloatText: {
    color: "#172719",
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: "900",
  },
  puzzleFloatDelta: {
    fontFamily: displayFontFamily,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  puzzleBonusRow: {
    bottom: "36%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 19,
  },
  puzzleBonusBadge: {
    backgroundColor: "#1a3c0d",
    borderColor: "#9bd24c",
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  puzzleBonusText: {
    color: "#d7f285",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  puzzleBoardOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(10,30,10,0.82)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 18,
  },
  puzzleBoardOverlayText: {
    color: "#d7f285",
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 40,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  puzzleActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
  puzzleHintButton: {
    alignItems: "center",
    backgroundColor: "#fef9c3",
    borderColor: "#fde047",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  puzzleHintButtonText: {
    color: "#713f12",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  puzzleGiveUpButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  puzzleGiveUpText: {
    color: "#991b1b",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  puzzleNextButton: {
    alignItems: "center",
    backgroundColor: "#1a3c0d",
    borderColor: "#9bd24c",
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  puzzleNextButtonText: {
    color: "#d7f285",
    fontFamily: displayFontFamily,
    fontSize: 14,
    fontWeight: "900",
  },
  puzzleButtonDisabled: {
    opacity: 0.4,
  },
  puzzleBoardTopBar: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: 2,
  },
  puzzleSideRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  puzzleSideDot: {
    borderRadius: 999,
    borderWidth: 1.5,
    height: 16,
    width: 16,
  },
  puzzleSideText: {
    color: "#53675d",
    flex: 1,
    fontFamily: appFontFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  puzzleTimerChip: {
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    borderColor: "rgba(74, 222, 128, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  puzzleTimerText: {
    color: "#166534",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  puzzleWrongChip: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  puzzleWrongChipText: {
    color: "#b91c1c",
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  puzzleFeedbackBanner: {
    borderRadius: radii.sm,
    gap: 6,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  puzzleFeedbackText: {
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  puzzleSolutionMoves: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 2,
  },
  puzzleSolutionMovePill: {
    backgroundColor: "#eef8fb",
    borderColor: "rgba(20,184,166,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  puzzleSolutionMoveSan: {
    color: "#0f6f7f",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  puzzleJourneyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  puzzleDifficultyPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  puzzleDifficultyText: {
    color: "#c8e8b9",
    fontFamily: displayFontFamily,
    fontSize: 12,
    fontWeight: "900",
  },
  puzzleRatingBarWrap: {
    gap: 5,
  },
  puzzleRatingBarRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  puzzleRatingBarLabel: {
    color: "#ffffff",
    fontFamily: displayFontFamily,
    fontSize: 16,
    fontWeight: "900",
  },
  puzzleRatingBarBiome: {
    color: "#c8e8b9",
    fontSize: 11,
    fontWeight: "800",
  },
  puzzleRatingBar: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 999,
    height: 14,
    overflow: "hidden",
  },
  puzzleRatingBarFill: {
    borderRadius: 999,
    height: "100%",
  },
  puzzlePathNodeWrap: {
    alignItems: "center",
    gap: 7,
  },
  puzzlePathInfoCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 126,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  puzzlePathInfoCardSolved: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(255,255,255,0.75)",
  },
  puzzlePathInfoCardActive: {
    backgroundColor: "#fff8dc",
    borderColor: "#facc15",
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  puzzlePathInfoTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  puzzlePathInfoStatus: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: displayFontFamily,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  puzzlePathInfoRating: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: displayFontFamily,
    fontSize: 13,
    fontWeight: "900",
  },
  puzzlePathInfoMotif: {
    color: "rgba(255,255,255,0.52)",
    fontFamily: appFontFamily,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    maxWidth: 112,
    textTransform: "capitalize",
  },
  puzzlePathConnector: {
    backgroundColor: "rgba(200,160,42,0.45)",
    borderRadius: 2,
    height: 10,
    width: 3,
  },
  puzzleAvatarBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
    borderWidth: 1.5,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  puzzleAvatarEmoji: {
    fontSize: 20,
  },
  puzzleNodeDiffDot: {
    borderRadius: 999,
    height: 6,
    marginTop: 2,
    width: 6,
  },

  lessonMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  lessonChip: {
    backgroundColor: "#e7f1fb",
    borderColor: "#b8cee5",
    borderRadius: 999,
    borderWidth: 1,
    color: "#185a9d",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    textTransform: "capitalize",
  },
  lessonStep: {
    ...aiInsetSurface,
    gap: 5,
    padding: spacing.md,
  },
  lessonStepActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
  },
  lessonStepTitle: {
    color: aiInk,
    fontSize: 15,
    fontWeight: "600",
  },
  lessonCoachNote: {
    color: "#185a9d",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
  },
  chatComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  chatInput: {
    ...aiPillSurface,
    color: aiInk,
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  chatRoomHeader: {
    ...aiInsetSurface,
    padding: spacing.md,
  },
  chatList: {
    gap: spacing.sm,
  },
  chatBubble: {
    alignSelf: "flex-start",
    ...aiInsetSurface,
    maxWidth: "92%",
    padding: spacing.sm,
  },
  chatBubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: "#fff8e8",
    borderColor: "#f4c46b",
  },
  chatAuthor: {
    color: "#395977",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 3,
  },
  chatBody: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  sendIconButton: {
    alignItems: "center",
    backgroundColor: "#1687a1",
    borderColor: "#7ddde8",
    borderWidth: 1,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  playerSearchBox: {
    backgroundColor: "#ffffff",
    borderColor: "#b8cee5",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  playerSearchText: {
    color: "#8aa0b6",
    fontSize: 12,
    fontWeight: "800",
  },
  playersOnlineSummary: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  playerListRow: {
    alignItems: "center",
    backgroundColor: "#f7fbff",
    borderColor: "#d7e4f1",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  playerListAvatar: {
    alignItems: "center",
    backgroundColor: "#e7f1fb",
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  playerListAvatarText: {
    fontSize: 18,
  },
  playerListCopy: {
    flex: 1,
  },
  playerListName: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  playerListMeta: {
    color: "#61758b",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  challengeButton: {
    backgroundColor: "#1687a1",
    borderColor: "#7ddde8",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  challengeButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  playerStrip: {
    alignItems: "center",
    backgroundColor: "#f8fbff",
    borderColor: "#b8cee5",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  playerStripBottom: {
    backgroundColor: "#eef6ff",
  },
  playerIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  avatarWhite: {
    backgroundColor: "#fff8e8",
  },
  avatarBlack: {
    backgroundColor: "#232831",
  },
  avatarText: {
    fontSize: 21,
  },
  playerName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  playerMeta: {
    color: "#61758b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  capturedMini: {
    flexDirection: "row",
    gap: 3,
    minWidth: 44,
  },
  capturedMiniText: {
    color: "#5d7188",
    fontSize: 12,
    fontWeight: "900",
  },
  clock: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
  },
  clockDark: {
    color: "#102033",
  },
  clockBox: {
    backgroundColor: "#fff8e8",
    borderColor: "#d6c391",
    borderRadius: 9,
    borderWidth: 1,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clockBoxDark: {
    backgroundColor: "#dceef7",
    borderColor: "#a9dff0",
  },
  signalWrap: {
    alignItems: "center",
    gap: 2,
    minWidth: 54,
  },
  signalBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 2,
    height: 22,
  },
  signalBar: {
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    width: 4,
  },
  signalBarOn: {
    backgroundColor: "#22a06b",
  },
  signalText: {
    color: "#61758b",
    fontSize: 10,
    fontWeight: "900",
  },
  controlRail: {
    alignItems: "center",
    backgroundColor: "#f8fbff",
    borderColor: "#b8cee5",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  statusBlock: {
    flex: 1,
    minWidth: 220,
  },
  timePicker: {
    backgroundColor: "#f2f8ff",
    borderColor: "#cfe0ef",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  timePickerCompact: {
    maxWidth: 310,
  },
  timePickerTitle: {
    color: aiInk,
    fontSize: 13,
    fontWeight: "600",
  },
  timeGroup: {
    gap: 4,
  },
  timeGroupLabel: {
    color: aiMuted,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  timePresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  timePreset: {
    ...aiPillSurface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timePresetActive: {
    backgroundColor: aiBlue,
    borderColor: "rgba(26,115,232,0.22)",
  },
  timePresetText: {
    color: aiMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  timePresetTextActive: {
    color: "#ffffff",
  },
  matchSearchCard: {
    ...aiInsetSurface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  practiceToolCard: {
    ...aiInsetSurface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  matchSearchHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  matchPipeline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  matchPipelineStep: {
    backgroundColor: "#f1f3f4",
    borderColor: aiLine,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  matchPipelineStepOn: {
    backgroundColor: aiBlue,
    borderColor: "rgba(255,255,255,0.36)",
    borderWidth: 1,
  },
  matchPipelineText: {
    color: aiMuted,
    fontSize: 10,
    fontWeight: "500",
  },
  matchPipelineTextOn: {
    color: "#ffffff",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  scaleNote: {
    backgroundColor: "#10233a",
    borderRadius: radii.md,
    gap: 5,
    padding: spacing.md,
  },
  scaleNoteTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  scaleNoteBody: {
    color: "#d6e7f7",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  insightPill: {
    ...aiInsetSurface,
    padding: spacing.md,
  },
  insightHot: {
    backgroundColor: "rgba(244, 93, 72, 0.16)",
    borderColor: "rgba(244, 93, 72, 0.36)",
  },
  insightQuiet: {
    backgroundColor: "#f8fafc",
    borderColor: aiLine,
  },
  insightLabel: {
    color: aiMuted,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  insightValue: {
    color: aiInk,
    fontSize: 14,
    fontWeight: "600",
  },
  animationSettingsStudio: {
    borderTopColor: aiLine,
    borderTopWidth: 1,
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  animationSettingsHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  animationToggle: {
    ...aiPillSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  animationToggleOn: {
    backgroundColor: aiBlue,
    borderColor: "rgba(26,115,232,0.2)",
  },
  animationToggleText: {
    color: aiMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  animationToggleTextOn: {
    color: "#ffffff",
  },
  animationSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  animationSelectorColumn: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 240,
  },
  animationChoiceCard: {
    ...aiInsetSurface,
    gap: 7,
    padding: spacing.md,
  },
  animationChoiceCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
    borderWidth: 1,
  },
  animationChoiceTitle: {
    color: aiInk,
    fontSize: 14,
    fontWeight: "600",
  },
  pieceSetMiniStrip: {
    flexDirection: "row",
    gap: 5,
  },
  pieceSetMiniPiece: {
    alignItems: "center",
    backgroundColor: "#dff6f8",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  pieceSetMiniPieceMissing: {
    backgroundColor: "#edf2f6",
    opacity: 0.55,
  },
  pieceSetMiniPieceText: {
    color: "#0d2f43",
    fontSize: 16,
    fontWeight: "900",
  },
  animationStudioHero: {
    alignItems: "center",
    backgroundColor: "#edf8fb",
    borderColor: "#c5e4ec",
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  adminSectionTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  animationStudioTitle: {
    color: "#0f2d42",
    fontSize: 24,
    fontWeight: "900",
  },
  animationStudioCopy: {
    color: "#496579",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    maxWidth: 720,
  },
  animationStudioHeroBadge: {
    backgroundColor: "#ffffff",
    borderColor: "#b9ddeb",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  animationStudioHeroBadgeText: {
    color: "#0f8fa0",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  animationStudioHeroBadgeMeta: {
    color: "#173247",
    fontSize: 13,
    fontWeight: "900",
  },
  pieceSetCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  animationSetCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  animationSetCard: {
    ...aiPanelSurface,
    gap: spacing.sm,
    minWidth: 240,
    padding: spacing.md,
  },
  animationSetCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
    borderWidth: 1,
  },
  pieceSetCard: {
    ...aiPanelSurface,
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 260,
    padding: spacing.md,
  },
  pieceSetCardActive: {
    backgroundColor: "#f1f6fe",
    borderColor: "rgba(26,115,232,0.32)",
    borderWidth: 1,
  },
  pieceSetCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  pieceSetCardTitle: {
    color: aiInk,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  seedBadge: {
    backgroundColor: "#b7ec5d",
    borderRadius: 999,
    color: "#183400",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pieceSetRosterStrip: {
    flexDirection: "row",
    gap: 6,
  },
  pieceRosterPip: {
    alignItems: "center",
    backgroundColor: "#dff6f8",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  pieceRosterPipMissing: {
    backgroundColor: "#e8eef3",
    opacity: 0.58,
  },
  pieceRosterPipText: {
    color: "#0f2d42",
    fontSize: 18,
    fontWeight: "900",
  },
  animationStudioInlineForm: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  animationStudioInput: {
    ...aiPillSurface,
    color: aiInk,
    flexGrow: 1,
    fontSize: 13,
    fontWeight: "400",
    minWidth: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  animationStudioInputFixed: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
  },
  assetUploadBox: {
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    width: "100%",
  },
  assetUploadActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  assetSlotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  assetSlotCard: {
    backgroundColor: "#f8fbfd",
    borderColor: "#d5e7ef",
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    minWidth: 130,
    padding: spacing.sm,
  },
  assetSlotCardActive: {
    backgroundColor: "#e7f8fb",
    borderColor: "#0f9dae",
    borderWidth: 2,
  },
  assetSlotTitle: {
    color: "#17364d",
    fontSize: 12,
    fontWeight: "900",
  },
  assetSlotTitleActive: {
    color: "#086979",
  },
  assetSlotDescription: {
    color: "#607889",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
  assetSlotStatus: {
    color: "#b45309",
    fontSize: 10,
    fontWeight: "900",
  },
  assetSlotStatusReady: {
    color: "#0f8a54",
  },
  pieceTargetGrid: {
    gap: spacing.sm,
    width: "100%",
  },
  pieceTargetField: {
    gap: 5,
    minWidth: 0,
    width: "100%",
  },
  pieceTargetLabel: {
    color: "#35566c",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
  },
  assetPathText: {
    backgroundColor: "#eef7fa",
    borderColor: "#cde4ec",
    borderRadius: radii.md,
    borderWidth: 1,
    color: "#49677a",
    fontSize: 12,
    fontWeight: "800",
    maxWidth: "100%",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  animationStudioSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  animationStudioSubTitle: {
    color: "#123145",
    fontSize: 15,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  pieceRosterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pieceRosterCard: {
    alignItems: "center",
    backgroundColor: "#f8fbfd",
    borderColor: "#d5e7ef",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 5,
    minWidth: 150,
    padding: spacing.md,
  },
  pieceRosterCardActive: {
    backgroundColor: "#e6f8fb",
    borderColor: "#0f9dae",
    borderWidth: 2,
  },
  pieceRosterPreview: {
    alignItems: "center",
    backgroundColor: "#eaf7fa",
    borderRadius: radii.lg,
    height: 128,
    justifyContent: "center",
    overflow: "hidden",
    width: 128,
  },
  pieceRosterPreviewMissing: {
    backgroundColor: "#edf1f5",
  },
  pieceRosterPreviewGlyph: {
    color: "#718294",
    fontSize: 58,
    fontWeight: "900",
  },
  uploadedPiecePreview: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  uploadedPieceBadge: {
    backgroundColor: "#b7ec5d",
    borderRadius: 999,
    bottom: 8,
    color: "#183400",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: "absolute",
    right: 8,
  },
  pieceRosterName: {
    color: "#0f2d42",
    fontSize: 14,
    fontWeight: "900",
  },
  animationRuleCount: {
    color: "#0f91a2",
    fontSize: 11,
    fontWeight: "900",
  },
  ceremonyCoveragePanel: {
    backgroundColor: "#f2fbfd",
    borderColor: "#c9e7ef",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  ceremonyCoverageHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  ceremonyCoverageBadge: {
    backgroundColor: "#123145",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  ceremonyCoverageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  ceremonyCoverageCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d5e7ef",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 250,
    padding: spacing.sm,
  },
  ceremonyCoverageCardActive: {
    backgroundColor: "#e5f8fb",
    borderColor: "#0f9dae",
    borderWidth: 2,
  },
  ceremonyCoveragePiece: {
    alignItems: "center",
    backgroundColor: "#eaf7fa",
    borderRadius: radii.md,
    height: 74,
    justifyContent: "center",
    overflow: "hidden",
    width: 74,
  },
  ceremonyCoverageCopy: {
    flex: 1,
    minWidth: 0,
  },
  ceremonyCoveragePieceName: {
    color: "#0f2d42",
    fontSize: 14,
    fontWeight: "900",
  },
  ceremonyCoverageStatus: {
    color: "#0f8a54",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  ceremonyCoverageRule: {
    color: "#516b7d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 3,
  },
  animationBuilderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  animationBuilderPanel: {
    ...aiPanelSurface,
    flex: 1,
    gap: spacing.sm,
    minWidth: 280,
    padding: spacing.md,
  },
  choreographyStudioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  choreographyStepList: {
    gap: 7,
    maxHeight: 360,
  },
  choreographyStepRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e6ee",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: spacing.sm,
  },
  choreographyStepRowActive: {
    backgroundColor: "#e6f8fb",
    borderColor: "#0f9dae",
  },
  choreographyBoard: {
    borderColor: "#163246",
    borderRadius: 14,
    borderWidth: 3,
    overflow: "hidden",
    position: "relative",
  },
  choreographySquare: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
    padding: 3,
    position: "absolute",
  },
  choreographySquareUsed: {
    borderColor: "rgba(250, 204, 21, 0.65)",
    borderWidth: 1,
  },
  choreographySquareFrom: {
    backgroundColor: "#bae6fd",
    borderColor: "#0284c7",
    borderWidth: 2,
  },
  choreographySquareTo: {
    backgroundColor: "#bbf7d0",
    borderColor: "#16a34a",
    borderWidth: 2,
  },
  choreographySquareLabel: {
    color: "rgba(15, 45, 66, 0.72)",
    fontSize: 9,
    fontWeight: "900",
  },
  choreographyVector: {
    borderColor: "#f59e0b",
    borderRadius: 999,
    borderWidth: 2,
    position: "absolute",
  },
  choreographyInspector: {
    gap: spacing.sm,
  },
  choreographyNumberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  actionPill: {
    ...aiPillSurface,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionPillActive: {
    backgroundColor: aiBlue,
    borderColor: "rgba(26,115,232,0.24)",
  },
  actionPillText: {
    color: aiMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  actionPillTextActive: {
    color: "#ffffff",
  },
  speedSegment: {
    backgroundColor: "#f1f3f4",
    borderRadius: 999,
    flexDirection: "row",
    padding: 4,
  },
  speedOption: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 7,
  },
  speedOptionActive: {
    backgroundColor: aiSurface,
    ...aiSoftShadow,
  },
  speedOptionText: {
    color: aiMuted,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  speedOptionTextActive: {
    color: aiInk,
  },
  clipLibrary: {
    maxHeight: 330,
  },
  clipCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e6ee",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: 8,
    padding: spacing.sm,
  },
  clipTitle: {
    color: "#102a3d",
    fontSize: 13,
    fontWeight: "900",
  },
  clipCopy: {
    flex: 1,
    minWidth: 0,
  },
  clipAdd: {
    color: "#0f9dae",
    fontSize: 12,
    fontWeight: "900",
  },
  stackList: {
    gap: 7,
  },
  stackItem: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e6ee",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: spacing.sm,
  },
  stackOrder: {
    color: "#0f9dae",
    fontSize: 13,
    fontWeight: "900",
    width: 22,
  },
  stackCopy: {
    flex: 1,
    minWidth: 0,
  },
  stackButton: {
    alignItems: "center",
    backgroundColor: "#edf3f7",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stackButtonText: {
    color: "#123145",
    fontSize: 14,
    fontWeight: "900",
  },
  animationPreviewStage: {
    alignItems: "center",
    backgroundColor: "#dff3f7",
    borderColor: "#c3e1eb",
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 410,
    justifyContent: "center",
    overflow: "hidden",
    paddingVertical: spacing.sm,
  },
  previewBoardShell: {
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
  },
  previewBoard: {
    borderColor: "#163246",
    borderRadius: 12,
    borderWidth: 3,
    overflow: "visible",
    position: "relative",
    shadowColor: "#102a3d",
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  previewSquare: {
    position: "absolute",
  },
  previewSquareLight: {
    backgroundColor: "#f8fbfd",
  },
  previewSquareDark: {
    backgroundColor: "#24a1a8",
  },
  previewSquareHighlight: {
    borderColor: "#f4c84d",
    borderWidth: 2,
  },
  previewStaticPiece: {
    color: "#ffffff",
    fontWeight: "900",
    position: "absolute",
    textAlign: "center",
    textShadowColor: "#061923",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 2,
    zIndex: 3,
  },
  previewStaticPieceFrame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    zIndex: 3,
  },
  previewTargetPiece: {
    color: "#07131d",
    fontWeight: "900",
    position: "absolute",
    textAlign: "center",
    zIndex: 2,
  },
  previewSpriteLayer: {
    position: "absolute",
    zIndex: 5,
  },
  previewGenericPieceLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewAlphaPiece: {
    height: "100%",
    width: "100%",
  },
  glbPreviewFrame: {
    height: "100%",
    position: "relative",
    width: "100%",
  },
  glbPreviewMount: {
    height: "100%",
    width: "100%",
  },
  glbPreviewFallback: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  previewBoardCaption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    gap: 1,
    maxWidth: 236,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  referencePreviewPanel: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "#cde4ec",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 5,
    padding: spacing.xs,
    width: 236,
  },
  referencePreviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  referencePreviewPath: {
    color: "#607889",
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
  },
  referencePreviewImage: {
    backgroundColor: "#f8fbfd",
    borderRadius: radii.sm,
    height: 70,
    width: "100%",
  },
  referencePreviewEmpty: {
    alignItems: "center",
    backgroundColor: "#f8fbfd",
    borderColor: "#d5e7ef",
    borderRadius: radii.sm,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 70,
    justifyContent: "center",
    width: "100%",
  },
  referencePreviewEmptyText: {
    color: "#7b8da0",
    fontSize: 11,
    fontWeight: "800",
  },
  animationPreviewEmpty: {
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
  },
  animationPreviewPlaceholder: {
    color: "#6d7d8b",
    fontSize: 72,
    fontWeight: "900",
  },
  previewSequenceBar: {
    backgroundColor: "#eef7fa",
    borderColor: "#cde4ec",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 3,
    padding: spacing.sm,
  },
  previewSequenceLabel: {
    color: "#0f91a2",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  previewSequenceText: {
    color: "#123145",
    fontSize: 12,
    fontWeight: "800",
  },
  pawnStackPreviewWrap: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
  },
  previewNowPlaying: {
    color: "#0f91a2",
    fontSize: 11,
    fontWeight: "900",
    maxWidth: 160,
  },
  pawnPreviewClip: {
    overflow: "hidden",
  },
  saveFeedback: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
    borderRadius: radii.md,
    borderWidth: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  saveFeedbackError: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    color: "#991b1b",
  },
  saveFeedbackSaving: {
    backgroundColor: "#e0f2fe",
    borderColor: "#7dd3fc",
    color: "#075985",
  },
  savedRulesWrap: {
    backgroundColor: "#f8fbfd",
    borderColor: "#d5e7ef",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  savedRuleRow: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e6ee",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  savedRuleTitle: {
    color: "#102a3d",
    fontSize: 13,
    fontWeight: "900",
  },
});
