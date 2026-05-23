export type PieceAssetKey =
  | "wK"
  | "wQ"
  | "wR"
  | "wB"
  | "wN"
  | "wP"
  | "bK"
  | "bQ"
  | "bR"
  | "bB"
  | "bN"
  | "bP";

export const unicodePieces: Record<PieceAssetKey, string> = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
  highlight: string;
  legal: string;
  danger: string;
}

export const boardThemes: BoardTheme[] = [
  {
    id: "clarity-ivory",
    name: "Clarity Ivory",
    light: "#fbf7ec",
    dark: "#78a9c4",
    highlight: "#f7c948",
    legal: "rgba(23, 65, 96, 0.26)",
    danger: "rgba(210, 48, 48, 0.44)",
  },
  {
    id: "graphite-glass",
    name: "Graphite Glass",
    light: "#f4f1e8",
    dark: "#697f91",
    highlight: "#89d2ff",
    legal: "rgba(8, 27, 42, 0.24)",
    danger: "rgba(226, 64, 64, 0.46)",
  },
  {
    id: "mint-studio",
    name: "Mint Studio",
    light: "#f5f4ea",
    dark: "#76a99a",
    highlight: "#f2c94c",
    legal: "rgba(27, 79, 69, 0.25)",
    danger: "rgba(205, 55, 67, 0.44)",
  },
  {
    id: "jewel-cobalt",
    name: "Jewel Cobalt",
    light: "#f8e7bf",
    dark: "#286ca8",
    highlight: "#f7c948",
    legal: "rgba(8, 31, 62, 0.26)",
    danger: "rgba(220, 38, 38, 0.44)",
  },
  {
    id: "rose-pop",
    name: "Rose Pop",
    light: "#fff1f8",
    dark: "#e879b7",
    highlight: "#facc15",
    legal: "rgba(190, 24, 93, 0.24)",
    danger: "rgba(220, 38, 38, 0.44)",
  },
  {
    id: "cobalt-cube",
    name: "Cobalt Cube",
    light: "#f3ddb4",
    dark: "#3f7fbb",
    highlight: "#f59e0b",
    legal: "rgba(15, 23, 42, 0.24)",
    danger: "rgba(220, 38, 38, 0.42)",
  },
  {
    id: "cube-classic",
    name: "Cube Classic",
    light: "#f7e6c3",
    dark: "#6f9fc7",
    highlight: "#f59e0b",
    legal: "rgba(15, 23, 42, 0.22)",
    danger: "rgba(220, 38, 38, 0.42)",
  },
  {
    id: "aurora-blue",
    name: "Aurora Blue",
    light: "#dbeafe",
    dark: "#4077b8",
    highlight: "#7dd3fc",
    legal: "rgba(6, 22, 45, 0.22)",
    danger: "rgba(248, 113, 113, 0.48)",
  },
  {
    id: "chesscom-green",
    name: "Classic Green",
    light: "#eeeed2",
    dark: "#769656",
    highlight: "#f6f669",
    legal: "rgba(32, 32, 32, 0.18)",
    danger: "rgba(215, 73, 52, 0.42)",
  },
  {
    id: "midnight-comedy",
    name: "Midnight Comedy",
    light: "#e6edf0",
    dark: "#4c6a73",
    highlight: "#f7b733",
    legal: "rgba(247, 183, 51, 0.3)",
    danger: "rgba(255, 86, 86, 0.45)",
  },
  {
    id: "studio-floor",
    name: "Studio Floor",
    light: "#f2dfc6",
    dark: "#9f6b46",
    highlight: "#ffd166",
    legal: "rgba(17, 17, 17, 0.18)",
    danger: "rgba(239, 71, 111, 0.45)",
  },
];

export interface EffectAssetManifest {
  id: string;
  version: string;
  delivery: "bundled" | "cdn";
  frameCount?: number;
  durationMs: number;
  approximateSizeKb: number;
}

export const effectAssetManifests: EffectAssetManifest[] = [
  {
    id: "pawn-promotion-dance",
    version: "0.1.0",
    delivery: "bundled",
    frameCount: 192,
    durationMs: 12892,
    approximateSizeKb: 2600,
  },
  {
    id: "pawn-strike-capture",
    version: "0.1.0",
    delivery: "bundled",
    frameCount: 192,
    durationMs: 19300,
    approximateSizeKb: 2600,
  },
  {
    id: "pawn-funky-walk",
    version: "0.1.0",
    delivery: "bundled",
    frameCount: 192,
    durationMs: 8883,
    approximateSizeKb: 2600,
  },
];
