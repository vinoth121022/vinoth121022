import { PieceKind } from "@chessalive/chess-core";
import {
  AnimationAction,
  AnimationClip,
  AnimationMoveContext,
  AnimationRule,
  AnimationSet,
  AnimationSpeed,
  FunnyEffect,
  FunnyEffectRegistry,
  FunnyMoveEvent,
  PieceAssetSlotKey,
  PieceSet,
} from "./types";

export const seededPieceSetId = "piece-set-pawn-animation-starter";
export const seededAnimationSetId = "animation-set-pawn-starter";
export const seededPawnGlbPath = "/uploads/seeded-pawn.glb";
export const seededHorseGlbPath = "chessalive-asset://knight-horse-game";
export const seededBishopGlbPath = "/uploads/seeded-bishop-walk.glb";
export const seededBishopRunGlbPath = "/uploads/seeded-bishop-run.glb";
export const seededRookGlbPath = "/uploads/seeded-rook-static.glb";
export const seededRookWalkGlbPath = "/uploads/seeded-rook-walk.glb";
export const seededRookRunGlbPath = "/uploads/seeded-rook-run.glb";
export const seededQueenGlbPath = "/uploads/seeded-queen-static.glb";
export const seededQueenWalkGlbPath = "/uploads/seeded-queen-walk.glb";
export const seededQueenDanceGlbPath = "/uploads/seeded-queen-dance.glb";
export const seededQueenRunGlbPath = "/uploads/seeded-queen-run.glb";
export const seededKingGlbPath = "/uploads/seeded-king-static.glb";
export const seededKingWalkGlbPath = "/uploads/seeded-king-walk.glb";

const createdAt = "2026-05-16T00:00:00.000Z";

const pawnClipSpecs = [
  ["pawn-walking", "Walking", 2742, ["walk", "loop"]],
  ["pawn-funky-walk", "Funky_Walk", 7808, ["walk", "funny"]],
  ["pawn-running", "Running", 1242, ["run", "attack"]],
  ["pawn-jumping-punch", "Jumping_Punch", 2308, ["attack", "jump"]],
  ["pawn-triple-combo-attack", "Triple_Combo_Attack", 8208, ["attack", "combo"]],
  ["pawn-all-night-dance", "All_Night_Dance", 1942, ["dance", "celebration"]],
  ["pawn-funny-dancing-01", "FunnyDancing_01", 7542, ["dance", "funny"]],
  ["pawn-funny-dancing-02", "FunnyDancing_02", 9875, ["dance", "funny"]],
  ["pawn-funny-dancing-03", "FunnyDancing_03", 675, ["dance", "quick"]],
  ["pawn-happy-jump-f", "Happy_jump_f", 1075, ["jump", "celebration"]],
  ["pawn-falling-down", "falling_down", 4375, ["reaction", "fall"]],
  ["pawn-walking-2", "walking_2", 1242, ["walk"]],
  ["pawn-walking-2-inplace", "walking_2_inplace", 1008, ["walk", "in-place"]],
  ["pawn-walking-woman", "Walking_Woman", 8075, ["walk", "stylized"]],
] as const;

export const seededAnimationClips: AnimationClip[] = pawnClipSpecs.map(([id, name, durationMs, tags]) => ({
  compatiblePieces: ["p"],
  durationMs,
  id,
  name,
  sourceAssetId: "piece-asset-pawn-animation-glb",
  sourceGlbPath: seededPawnGlbPath,
  tags: [...tags],
}));

const horseClipSpecs = [
  ["horse-attack-headbutt", "Attack_Headbutt", 1000, ["attack", "headbutt"]],
  ["horse-attack-kick", "Attack_Kick", 1000, ["attack", "kick"]],
  ["horse-death", "Death", 1200, ["reaction"]],
  ["horse-eating", "Eating", 1600, ["funny", "idle"]],
  ["horse-gallop", "Gallop", 583, ["run"]],
  ["horse-gallop-jump", "Gallop_Jump", 900, ["run", "jump"]],
  ["horse-idle", "Idle", 3375, ["idle"]],
  ["horse-idle-2", "Idle_2", 2200, ["idle"]],
  ["horse-idle-headlow", "Idle_Headlow", 1800, ["idle", "funny"]],
  ["horse-hit-react-left", "Idle_HitReact_Left", 1100, ["reaction"]],
  ["horse-hit-react-right", "Idle_HitReact_Right", 1100, ["reaction"]],
  ["horse-jump-to-idle", "Jump_toIdle", 900, ["jump", "settle"]],
  ["horse-walk", "Walk", 1167, ["walk"]],
] as const;

export const seededHorseAnimationClips: AnimationClip[] = horseClipSpecs.map(([id, name, durationMs, tags]) => ({
  compatiblePieces: ["n"],
  durationMs,
  id,
  name,
  sourceAssetId: "piece-asset-knight-horse-game-glb",
  sourceGlbPath: seededHorseGlbPath,
  tags: [...tags],
}));

const bishopClipSpecs = [
  ["bishop-board-walk", "Walking", 1400, ["walk", "diagonal"], seededBishopGlbPath],
  ["bishop-running-strike", "Running", 1180, ["run", "attack"], seededBishopRunGlbPath],
] as const;

export const seededBishopAnimationClips: AnimationClip[] = bishopClipSpecs.map(([id, name, durationMs, tags, sourceGlbPath]) => ({
  compatiblePieces: ["b"],
  durationMs,
  id,
  name,
  sourceAssetId: "piece-asset-bishop-meshy-biped",
  sourceGlbPath,
  tags: [...tags],
}));

const rookClipSpecs = [
  ["rook-board-march", "Walking", 1800, ["walk", "straight"], seededRookWalkGlbPath],
  ["rook-tower-bump", "Running", 1200, ["funny", "impact"], seededRookRunGlbPath],
  ["rook-castle-charge", "Running", 1700, ["run", "attack"], seededRookRunGlbPath],
  ["rook-victory-wobble", "Walking", 1500, ["celebration", "funny"], seededRookWalkGlbPath],
] as const;

export const seededRookAnimationClips: AnimationClip[] = rookClipSpecs.map(([id, name, durationMs, tags, sourceGlbPath]) => ({
  compatiblePieces: ["r"],
  durationMs,
  id,
  name,
  sourceAssetId: "piece-asset-rook-meshy-static",
  sourceGlbPath,
  tags: [...tags],
}));

const queenClipSpecs = [
  ["queen-regal-glide", "Walking", 1900, ["walk", "queen"], seededQueenWalkGlbPath],
  ["queen-hand-wave", "All_Night_Dance", 1250, ["funny", "gesture"], seededQueenDanceGlbPath],
  ["queen-spin-attack", "Running", 1600, ["attack", "spin"], seededQueenRunGlbPath],
  ["queen-victory-dance", "All_Night_Dance", 1800, ["celebration", "dance"], seededQueenDanceGlbPath],
] as const;

export const seededQueenAnimationClips: AnimationClip[] = queenClipSpecs.map(([id, name, durationMs, tags, sourceGlbPath]) => ({
  compatiblePieces: ["q"],
  durationMs,
  id,
  name,
  sourceAssetId: "piece-asset-queen-meshy-static",
  sourceGlbPath,
  tags: [...tags],
}));

const kingClipSpecs = [
  ["king-opening-walk", "Walking", 5200, ["ceremony", "opening", "walk"], seededKingWalkGlbPath],
  ["king-checkmate-finisher", "Walking", 2200, ["ceremony", "checkmate", "king"], seededKingWalkGlbPath],
] as const;

export const seededKingAnimationClips: AnimationClip[] = kingClipSpecs.map(([id, name, durationMs, tags, sourceGlbPath]) => ({
  compatiblePieces: ["k"],
  durationMs,
  id,
  name,
  sourceAssetId: "piece-asset-king-meshy",
  sourceGlbPath,
  tags: [...tags],
}));

export const seededCeremonyAnimationClips: AnimationClip[] = [
  {
    compatiblePieces: ["k"],
    durationMs: 5200,
    id: "ceremony-king-handshake",
    name: "Walking",
    sourceAssetId: "piece-asset-king-meshy",
    sourceGlbPath: seededKingWalkGlbPath,
    tags: ["ceremony", "opening", "handshake"],
  },
];

export const seededAllAnimationClips: AnimationClip[] = [
  ...seededCeremonyAnimationClips,
  ...seededAnimationClips,
  ...seededHorseAnimationClips,
  ...seededBishopAnimationClips,
  ...seededRookAnimationClips,
  ...seededQueenAnimationClips,
  ...seededKingAnimationClips,
];

export const seededPieceSets: PieceSet[] = [
  {
    animationClipIds: seededAllAnimationClips.map((clip) => clip.id),
    createdAt,
    createdBy: "system",
    description: "Starter piece set seeded from the provided pawn, knight_horse_game, bishop, rook, queen, and king GLB animation assets.",
    id: seededPieceSetId,
    isSeededExample: true,
    name: "Pawn Animation Starter",
    pieceTargets: {
      p: {
        alive3dModel: "Pawn_animation.glb low-poly ivory pawn character",
        board2dStyle: "Clean ivory/black outlined pawn matching board glyph silhouette",
        captureAnimation: "Running -> Jumping_Punch -> Triple_Combo_Attack -> FunnyDancing_01",
        idleStaticPose: "Neutral chess-pawn body, centered on square, no extra limbs visible until Alive action",
        moveAnimation: "Funky_Walk -> Happy_jump_f",
        victoryAnimation: "Happy_jump_f -> All_Night_Dance -> FunnyDancing_02",
      },
      n: {
        alive3dModel: "knight_horse_game.glb, side-facing game knight horse",
        board2dStyle: "Horse-head knight silhouette with clear gold/black outline",
        captureAnimation: "Gallop -> Attack_Kick -> Gallop_Jump",
        idleStaticPose: "Side-pose horse head centered on square",
        moveAnimation: "Walk",
        victoryAnimation: "Attack_Headbutt -> Jump_toIdle",
      },
      b: {
        alive3dModel: "Sharp-headed ivory bishop biped GLB",
        board2dStyle: "Sharp bishop head with clean central notch",
        captureAnimation: "Running",
        idleStaticPose: "Tall bishop silhouette centered on square",
        moveAnimation: "Walking",
        victoryAnimation: "Walking",
      },
      r: {
        alive3dModel: "Castle-top rook GLB",
        board2dStyle: "Rook tower with clear battlements",
        captureAnimation: "Castle_Charge -> Tower_Bump",
        idleStaticPose: "Straight rook tower centered on square",
        moveAnimation: "Board_March",
        victoryAnimation: "Victory_Wobble",
      },
      q: {
        alive3dModel: "Crowned queen GLB",
        board2dStyle: "Queen crown with rounded tips and visible outline",
        captureAnimation: "Spin_Attack -> Hand_Wave",
        idleStaticPose: "Regal queen centered on square",
        moveAnimation: "Regal_Glide",
        victoryAnimation: "Victory_Dance",
      },
      k: {
        alive3dModel: "Pending lightweight king GLB; ignore complex oversized king assets",
        board2dStyle: "King cross/crown silhouette, high contrast",
        captureAnimation: "Pending king capture clip",
        idleStaticPose: "Centered king crown/cross with no floating body",
        moveAnimation: "Pending king walk clip",
        victoryAnimation: "Pending king win gesture",
      },
    },
    pieces: {
      p: {
        assetSlots: {
          static: { fileName: "Pawn_animation.glb", kind: "glb", path: seededPawnGlbPath, uploadedAt: createdAt },
          move: { fileName: "Pawn_animation.glb", kind: "glb", path: seededPawnGlbPath, uploadedAt: createdAt },
          capture: { fileName: "Pawn_animation.glb", kind: "glb", path: seededPawnGlbPath, uploadedAt: createdAt },
          celebrate: { fileName: "Pawn_animation.glb", kind: "glb", path: seededPawnGlbPath, uploadedAt: createdAt },
        },
        detectedAnimationClipIds: seededAnimationClips.map((clip) => clip.id),
        displayName: "Pawn Animation GLB",
        glbPath: seededPawnGlbPath,
        id: "piece-asset-pawn-animation-glb",
        piece: "p",
        previewAsset: "pawn_animation_w_move_sprite.png",
        uploadedAt: createdAt,
      },
      n: {
        assetSlots: {
          static: { fileName: "knight_horse_game.glb", kind: "glb", path: seededHorseGlbPath, uploadedAt: createdAt },
          move: { fileName: "knight_horse_game.glb", kind: "glb", path: seededHorseGlbPath, uploadedAt: createdAt },
          capture: { fileName: "knight_horse_game.glb", kind: "glb", path: seededHorseGlbPath, uploadedAt: createdAt },
          celebrate: { fileName: "knight_horse_game.glb", kind: "glb", path: seededHorseGlbPath, uploadedAt: createdAt },
        },
        detectedAnimationClipIds: seededHorseAnimationClips.map((clip) => clip.id),
        displayName: "Knight Horse Game GLB",
        glbPath: seededHorseGlbPath,
        id: "piece-asset-knight-horse-game-glb",
        piece: "n",
        uploadedAt: createdAt,
      },
      b: {
        assetSlots: {
          static: { fileName: "Meshy_AI_Ivory_Bishop_biped_Animation_Walking_withSkin.glb", kind: "glb", path: seededBishopGlbPath, uploadedAt: createdAt },
          move: { fileName: "Meshy_AI_Ivory_Bishop_biped_Animation_Walking_withSkin.glb", kind: "glb", path: seededBishopGlbPath, uploadedAt: createdAt },
          capture: { fileName: "Meshy_AI_Ivory_Bishop_biped_Animation_Running_withSkin.glb", kind: "glb", path: seededBishopRunGlbPath, uploadedAt: createdAt },
          celebrate: { fileName: "Meshy_AI_Ivory_Bishop_biped_Animation_Running_withSkin.glb", kind: "glb", path: seededBishopRunGlbPath, uploadedAt: createdAt },
        },
        detectedAnimationClipIds: seededBishopAnimationClips.map((clip) => clip.id),
        displayName: "Ivory Bishop Meshy GLB",
        glbPath: seededBishopGlbPath,
        id: "piece-asset-bishop-meshy-biped",
        previewAsset: "piece_animation_w_b_move_sprite.png",
        piece: "b",
        uploadedAt: createdAt,
      },
      r: {
        assetSlots: {
          static: { fileName: "rook_static.glb", kind: "glb", path: seededRookGlbPath, uploadedAt: createdAt },
          move: { fileName: "Meshy_AI_Ivory_Rook_biped_Animation_Walking_withSkin.glb", kind: "glb", path: seededRookWalkGlbPath, uploadedAt: createdAt },
          capture: { fileName: "Meshy_AI_Ivory_Rook_biped_Animation_Running_withSkin.glb", kind: "glb", path: seededRookRunGlbPath, uploadedAt: createdAt },
          celebrate: { fileName: "Meshy_AI_Ivory_Rook_biped_Animation_Running_withSkin.glb", kind: "glb", path: seededRookRunGlbPath, uploadedAt: createdAt },
        },
        detectedAnimationClipIds: seededRookAnimationClips.map((clip) => clip.id),
        displayName: "Ivory Rook Meshy GLB",
        glbPath: seededRookGlbPath,
        id: "piece-asset-rook-meshy-static",
        piece: "r",
        previewAsset: "piece_static_w_r.png",
        uploadedAt: createdAt,
      },
      q: {
        assetSlots: {
          static: { fileName: "queen_static.glb", kind: "glb", path: seededQueenGlbPath, uploadedAt: createdAt },
          move: { fileName: "Meshy_AI_Golden_Queen_biped_Animation_Walking_withSkin.glb", kind: "glb", path: seededQueenWalkGlbPath, uploadedAt: createdAt },
          capture: { fileName: "Meshy_AI_Golden_Queen_biped_Animation_Running_withSkin.glb", kind: "glb", path: seededQueenRunGlbPath, uploadedAt: createdAt },
          celebrate: { fileName: "Meshy_AI_Golden_Queen_biped_Animation_All_Night_Dance_withSkin.glb", kind: "glb", path: seededQueenDanceGlbPath, uploadedAt: createdAt },
        },
        detectedAnimationClipIds: seededQueenAnimationClips.map((clip) => clip.id),
        displayName: "Golden Queen Meshy GLB",
        glbPath: seededQueenGlbPath,
        id: "piece-asset-queen-meshy-static",
        piece: "q",
        previewAsset: "piece_static_w_q.png",
        uploadedAt: createdAt,
      },
      k: {
        assetSlots: {
          static: { fileName: "king_static.glb", kind: "glb", path: seededKingGlbPath, uploadedAt: createdAt },
          move: { fileName: "king_walking_animation.glb", kind: "glb", path: seededKingWalkGlbPath, uploadedAt: createdAt },
          capture: { fileName: "king_walking_animation.glb", kind: "glb", path: seededKingWalkGlbPath, uploadedAt: createdAt },
          celebrate: { fileName: "king_walking_animation.glb", kind: "glb", path: seededKingWalkGlbPath, uploadedAt: createdAt },
        },
        detectedAnimationClipIds: seededKingAnimationClips.map((clip) => clip.id),
        displayName: "Ivory King Meshy GLB",
        glbPath: seededKingGlbPath,
        id: "piece-asset-king-meshy",
        previewAsset: "piece_static_w_k.png",
        piece: "k",
        uploadedAt: createdAt,
      },
    },
    updatedAt: createdAt,
  },
];

export const pieceActionOptions: Record<PieceKind, Array<{ id: AnimationAction; label: string }>> = {
  p: [
    { id: "checkmate-finisher", label: "Checkmate finisher" },
  ],
  n: [
    { id: "checkmate-finisher", label: "Checkmate finisher" },
  ],
  b: [
    { id: "checkmate-finisher", label: "Checkmate finisher" },
  ],
  r: [
    { id: "checkmate-finisher", label: "Checkmate finisher" },
  ],
  q: [
    { id: "checkmate-finisher", label: "Checkmate finisher" },
  ],
  k: [
    { id: "game-start-handshake", label: "Opening king handshake" },
    { id: "checkmate-finisher", label: "Checkmate finisher" },
  ],
};

export const genericActionOptions: Array<{ id: AnimationAction; label: string }> = [];

export const seededAnimationSets: AnimationSet[] = [
  {
    createdAt,
    description: "Default ceremony mapping for the opening handshake and checkmate finisher.",
    id: seededAnimationSetId,
    isDefault: true,
    name: "Ceremony Starter Stack",
    pieceSetId: seededPieceSetId,
    rules: [
      {
        action: "game-start-handshake",
        clipStack: [
          { clipId: "king-opening-walk", order: 0 },
        ],
        enabled: true,
        id: "rule-opening-king-handshake",
        piece: "k",
        speed: "medium",
      },
      {
        action: "checkmate-finisher",
        clipStack: [
          { clipId: "pawn-running", order: 0 },
          { clipId: "pawn-jumping-punch", order: 1 },
          { clipId: "pawn-funny-dancing-01", order: 2 },
        ],
        enabled: true,
        id: "rule-pawn-checkmate-finisher",
        piece: "p",
        speed: "medium",
      },
      {
        action: "checkmate-finisher",
        clipStack: [
          { clipId: "horse-gallop", order: 0 },
          { clipId: "horse-attack-kick", order: 1 },
        ],
        enabled: true,
        id: "rule-knight-checkmate-finisher",
        piece: "n",
        speed: "medium",
      },
      {
        action: "checkmate-finisher",
        clipStack: [
          { clipId: "bishop-running-strike", order: 0 },
        ],
        enabled: true,
        id: "rule-bishop-checkmate-finisher",
        piece: "b",
        speed: "medium",
      },
      {
        action: "checkmate-finisher",
        clipStack: [
          { clipId: "rook-castle-charge", order: 0 },
          { clipId: "rook-tower-bump", order: 1 },
        ],
        enabled: true,
        id: "rule-rook-checkmate-finisher",
        piece: "r",
        speed: "medium",
      },
      {
        action: "checkmate-finisher",
        clipStack: [
          { clipId: "queen-spin-attack", order: 0 },
          { clipId: "queen-victory-dance", order: 1 },
        ],
        enabled: true,
        id: "rule-queen-checkmate-finisher",
        piece: "q",
        speed: "medium",
      },
      {
        action: "checkmate-finisher",
        clipStack: [
          { clipId: "king-checkmate-finisher", order: 0 },
        ],
        enabled: true,
        id: "rule-king-checkmate-finisher",
        piece: "k",
        speed: "medium",
      },
    ],
    updatedAt: createdAt,
  },
];

const pieceCharacters: Record<PieceKind, string> = {
  b: "♗",
  k: "♔",
  n: "♘",
  p: "♙",
  q: "♕",
  r: "♖",
};

const capturedPieceActions: Partial<Record<PieceKind, AnimationAction>> = {
  b: "capture-bishop",
  n: "capture-knight",
  p: "capture-pawn",
  q: "capture-queen",
  r: "capture-rook",
};

export function animationActionLabel(action: AnimationAction) {
  return [...genericActionOptions, ...Object.values(pieceActionOptions).flat()].find((item) => item.id === action)?.label ?? action;
}

export function moveContextFromEvent(event: FunnyMoveEvent): AnimationMoveContext {
  const { move } = event;
  const isCheckmate = move.san.includes("#");
  if (move.promotion) {
    return {
      action: isCheckmate ? "checkmate-finisher" : "promotion",
      capturedPiece: move.captured,
      isCapture: Boolean(move.captured),
      isCheck: move.san.includes("+") || move.san.includes("#"),
      isCheckmate,
      isPromotion: true,
      piece: move.piece,
    };
  }
  const isCapture = Boolean(move.captured);
  return {
    action: isCheckmate ? "checkmate-finisher" : isCapture ? "capture" : "normal-move",
    capturedPiece: move.captured,
    isCapture,
    isCheck: move.san.includes("+") || move.san.includes("#"),
    isCheckmate,
    isPromotion: false,
    piece: move.piece,
  };
}

function rulePriority(rule: AnimationRule, context: AnimationMoveContext) {
  if (!rule.enabled || rule.piece !== context.piece) return -1;
  if (context.isCheckmate && rule.action === "checkmate-finisher") return 120;
  if (context.isCheckmate && rule.action === "checkmate") return 92;
  if (context.isCheck && rule.action === "check") return 82;
  if (context.capturedPiece && rule.action === capturedPieceActions[context.capturedPiece]) return 100;
  if (rule.action === context.action) return 80;
  if (context.isCapture && rule.action === "any-capture") return 60;
  if (rule.action === "any-move") return 40;
  return -1;
}

export function selectAnimationRule(animationSet: AnimationSet, event: FunnyMoveEvent): AnimationRule | null {
  const context = moveContextFromEvent(event);
  if (!context.isCheckmate) return null;
  return animationSet.rules
    .map((rule) => ({ priority: rulePriority(rule, context), rule }))
    .filter((entry) => entry.priority >= 0)
    .sort((a, b) => b.priority - a.priority)[0]?.rule ?? null;
}

export function animationVariantForRule(rule: AnimationRule): "move" | "capture" | "promotion" {
  if (rule.action === "promotion") return "promotion";
  if (rule.action.includes("capture") || rule.action === "check" || rule.action === "checkmate" || rule.action === "checkmate-finisher") return "capture";
  return "move";
}

function assetSlotForRule(rule: AnimationRule): PieceAssetSlotKey {
  if (rule.action === "promotion" || rule.action === "checkmate-win" || rule.action === "checkmate-finisher") return "celebrate";
  if (rule.action.includes("capture") || rule.action.includes("attack") || rule.action === "check" || rule.action === "checkmate") return "capture";
  return "move";
}

export function speedMultiplier(speed: AnimationSpeed) {
  if (speed === "slow") return 1.35;
  if (speed === "fast") return 0.72;
  return 1;
}

export function effectFromAnimationRule(rule: AnimationRule, animationSet: AnimationSet, pieceSet: PieceSet, clips: AnimationClip[], event: FunnyMoveEvent): FunnyEffect {
  const stack = [...rule.clipStack].sort((a, b) => a.order - b.order);
  const pieceAsset = pieceSet.pieces[rule.piece];
  const preferredAssetPath = pieceAsset?.assetSlots?.[assetSlotForRule(rule)]?.path ?? pieceAsset?.assetSlots?.static?.path ?? pieceAsset?.glbPath;
  const clipNames = stack.map((item) => clips.find((clip) => clip.id === item.clipId)?.name ?? item.clipId);
  const clipGlbPaths = stack.map((item) => clips.find((clip) => clip.id === item.clipId)?.sourceGlbPath ?? preferredAssetPath ?? "");
  const duration = stack.reduce((total, item) => {
    const clip = clips.find((candidate) => candidate.id === item.clipId);
    return total + Math.round((clip?.durationMs ?? 900) * speedMultiplier(item.speed ?? rule.speed));
  }, 0);
  const title = `${pieceCharacters[rule.piece]} ${animationActionLabel(rule.action)}`;
  return {
    action: rule.action,
    animationSetId: animationSet.id,
    animationVariant: animationVariantForRule(rule),
    character: pieceCharacters[event.move.piece],
    clipGlbPaths,
    clipNames,
    clipStack: stack,
    description: `${animationSet.name}: ${clipNames.join(" → ")}`,
    durationMs: Math.max(900, duration),
    id: rule.id,
    musicCue: "animation-stack",
    pieceAssetGlbPath: preferredAssetPath,
    pieceAssetId: pieceAsset?.id,
    pieceSetId: pieceSet.id,
    choreographySteps: rule.choreographySteps,
    speed: rule.speed,
    title,
    trigger: () => true,
  };
}

export class InMemoryFunnyEffectRegistry implements FunnyEffectRegistry {
  private effects = new Map<string, FunnyEffect>();

  constructor(initialEffects: FunnyEffect[] = defaultFunnyEffects) {
    initialEffects.forEach((effect) => this.register(effect));
  }

  list(): FunnyEffect[] {
    return [...this.effects.values()];
  }

  register(effect: FunnyEffect): void {
    this.effects.set(effect.id, effect);
  }

  pick(event: FunnyMoveEvent): FunnyEffect | null {
    if (!event.funnyMode.enabled || event.funnyMode.animationsEnabled === false) return null;
    return this.list().find((effect) => effect.trigger(event)) ?? null;
  }
}

export const defaultFunnyEffects: FunnyEffect[] = [
  {
    action: "checkmate-finisher",
    animationSetId: seededAnimationSetId,
    animationVariant: "capture",
    character: "♔",
    clipGlbPaths: [seededPawnGlbPath],
    clipNames: ["Running"],
    clipStack: [{ clipId: "pawn-running", order: 0 }],
    description: "Only the final checkmate move triggers an Alive finisher.",
    durationMs: 4800,
    id: "rule-checkmate-finisher-fallback",
    musicCue: "checkmate-finale",
    pieceSetId: seededPieceSetId,
    speed: "medium",
    title: "Checkmate Finisher",
    trigger: ({ move }) => move.san.includes("#"),
  },
];

export function createFunnyEffectRegistry(): FunnyEffectRegistry {
  return new InMemoryFunnyEffectRegistry();
}
