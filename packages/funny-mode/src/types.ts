import { ChessMove, PieceKind, SquareName } from "@chessalive/chess-core";

export type AnimationPiece = PieceKind;
export type AnimationSpeed = "slow" | "medium" | "fast";
export type AnimationAction =
  | "game-start-handshake"
  | "checkmate-finisher"
  | "any-move"
  | "any-capture"
  | "normal-move"
  | "first-two-square"
  | "capture"
  | "capture-pawn"
  | "capture-knight"
  | "capture-bishop"
  | "capture-rook"
  | "capture-queen"
  | "promotion"
  | "en-passant"
  | "short-diagonal"
  | "long-diagonal"
  | "short-straight"
  | "long-straight"
  | "diagonal-attack"
  | "straight-attack"
  | "fork"
  | "check"
  | "checkmate"
  | "castle"
  | "castle-participation"
  | "escape-check"
  | "checkmate-win"
  | "game-lost-reaction";

export interface AnimationClip {
  compatiblePieces: AnimationPiece[];
  durationMs: number;
  id: string;
  name: string;
  previewAsset?: string;
  sourceAssetId: string;
  sourceGlbPath: string;
  tags: string[];
}

export interface PieceAsset {
  assetSlots?: Partial<Record<PieceAssetSlotKey, PieceAssetSlot>>;
  detectedAnimationClipIds: string[];
  displayName: string;
  glbPath: string;
  id: string;
  piece: AnimationPiece;
  previewAsset?: string;
  uploadedAt: string;
}

export type PieceAssetSlotKey = "static" | "move" | "capture" | "celebrate" | "reference";

export interface PieceAssetSlot {
  fileName: string;
  kind: "glb" | "image";
  path: string;
  uploadedAt: string;
}

export type PieceAssetMap = Partial<Record<AnimationPiece, PieceAsset>>;

export interface PieceTargetSpec {
  alive3dModel: string;
  board2dStyle: string;
  captureAnimation: string;
  idleStaticPose: string;
  moveAnimation: string;
  victoryAnimation: string;
}

export type PieceTargetSpecMap = Partial<Record<AnimationPiece, PieceTargetSpec>>;

export interface PieceSet {
  animationClipIds: string[];
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  isSeededExample?: boolean;
  name: string;
  pieces: PieceAssetMap;
  pieceTargets?: PieceTargetSpecMap;
  updatedAt: string;
}

export interface AnimationStackItem {
  clipId: string;
  order: number;
  speed?: AnimationSpeed;
}

export type AnimationChoreographyStepKind = "emerge" | "walk" | "turn" | "gesture" | "handshake" | "kick" | "return" | "sink";

export interface AnimationChoreographyStep {
  clipId?: string;
  durationMs: number;
  facing?: "up" | "down" | "left" | "right" | "toward-opponent";
  from?: SquareName;
  id: string;
  kind: AnimationChoreographyStepKind;
  label: string;
  note?: string;
  startsAtMs: number;
  to?: SquareName;
}

export interface AnimationRule {
  action: AnimationAction;
  capturedPiece?: PieceKind;
  choreographySteps?: AnimationChoreographyStep[];
  clipStack: AnimationStackItem[];
  enabled: boolean;
  id: string;
  movePattern?: string;
  piece: AnimationPiece;
  speed: AnimationSpeed;
}

export interface AnimationSet {
  createdAt: string;
  description: string;
  id: string;
  isDefault?: boolean;
  name: string;
  pieceSetId: string;
  rules: AnimationRule[];
  updatedAt: string;
}

export interface AnimationMoveContext {
  action: AnimationAction;
  capturedPiece?: PieceKind;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isPromotion: boolean;
  piece: PieceKind;
}

export type EffectIntensity = "tiny" | "normal" | "cinema";

export interface FunnyModeSettings {
  animationSetId?: string;
  animationsEnabled?: boolean;
  enabled: boolean;
  musicEnabled: boolean;
  pieceSetId?: string;
  intensity: EffectIntensity;
}

export interface FunnyMoveEvent {
  gameId: string;
  move: ChessMove;
  funnyMode: FunnyModeSettings;
}

export interface FunnyEffect {
  action?: AnimationAction;
  animationSetId?: string;
  animationVariant?: "move" | "capture" | "promotion";
  choreographySteps?: AnimationChoreographyStep[];
  clipGlbPaths?: string[];
  clipNames?: string[];
  clipStack?: AnimationStackItem[];
  id: string;
  title: string;
  description: string;
  durationMs: number;
  character: string;
  musicCue: string;
  pieceAssetGlbPath?: string;
  pieceAssetId?: string;
  pieceSetId?: string;
  speed?: AnimationSpeed;
  trigger(event: FunnyMoveEvent): boolean;
}

export interface ActiveFunnyEffect {
  effect: FunnyEffect;
  event: FunnyMoveEvent;
  startedAt: number;
}

export interface FunnyEffectRegistry {
  list(): FunnyEffect[];
  register(effect: FunnyEffect): void;
  pick(event: FunnyMoveEvent): FunnyEffect | null;
}
