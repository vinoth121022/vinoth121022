import { ChessMove, GameSnapshot, MoveIntent, PieceKind, SquareName, createChessEngine } from "@chessalive/chess-core";

export type ReviewMoveClassification =
  | "book"
  | "forced"
  | "brilliant"
  | "great"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface ReviewProgress {
  completed: number;
  message: string;
  phase: "loading-engine" | "analyzing" | "summarizing" | "complete" | "fallback";
  total: number;
}

export interface ReviewMoveInsight {
  afterFen: string;
  beforeFen: string;
  bestMove?: string;
  bestSan?: string;
  classification: ReviewMoveClassification;
  color: "w" | "b";
  engineDepth: number;
  evalAfter?: number;
  evalBefore?: number;
  evalLoss: number;
  explanation: string;
  move: ChessMove;
  moveNumber: number;
  played: string;
  ply: number;
  reasons: string[];
  title: string;
}

export interface BrowserGameReview {
  accuracyBlack: number;
  accuracyWhite: number;
  bestMove?: string;
  counts: Record<ReviewMoveClassification, number>;
  engineName: string;
  generatedAt: string;
  moveInsights: ReviewMoveInsight[];
  openingName: string;
  pgn: string;
  status: "complete" | "partial" | "fallback";
  usedStockfish: boolean;
  verdict: string;
}

interface EngineEvaluation {
  bestMove?: string;
  depth: number;
  pv: string[];
  scoreCp: number;
}

interface AnalyzeOptions {
  depth?: number;
  maxPlies?: number;
  movetimeMs?: number;
  onProgress?: (progress: ReviewProgress) => void;
}

interface WorkerLike {
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage(message: string): void;
  terminate(): void;
}

type WorkerConstructorLike = new (url: string) => WorkerLike;

const pieceNames: Record<PieceKind, string> = {
  b: "bishop",
  k: "king",
  n: "knight",
  p: "pawn",
  q: "queen",
  r: "rook",
};

const pieceValues: Record<PieceKind, number> = {
  b: 330,
  k: 0,
  n: 320,
  p: 100,
  q: 900,
  r: 500,
};

const allClassifications: ReviewMoveClassification[] = [
  "book",
  "forced",
  "brilliant",
  "great",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

function browserRuntime() {
  return globalThis as typeof globalThis & {
    Worker?: WorkerConstructorLike;
    document?: unknown;
    location?: { origin?: string };
    window?: {
      Worker?: WorkerConstructorLike;
      document?: unknown;
      location?: { origin?: string };
    };
  };
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emptyCounts(): Record<ReviewMoveClassification, number> {
  return allClassifications.reduce(
    (counts, classification) => {
      counts[classification] = 0;
      return counts;
    },
    {} as Record<ReviewMoveClassification, number>,
  );
}

function parseEngineLine(lines: string[]): EngineEvaluation {
  const infoLines = lines.filter((line) => line.startsWith("info "));
  const bestLine = lines.find((line) => line.startsWith("bestmove ")) ?? "";
  const bestMove = bestLine.split(/\s+/)[1] && bestLine.split(/\s+/)[1] !== "(none)" ? bestLine.split(/\s+/)[1] : undefined;
  let scoreCp = 0;
  let depth = 0;
  let pv: string[] = [];

  for (const line of infoLines) {
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    const pvMatch = line.match(/\bpv\s+(.+)$/);
    const lineDepth = depthMatch ? Number(depthMatch[1]) : 0;
    if (lineDepth < depth) continue;
    depth = lineDepth || depth;
    if (mateMatch) {
      const mateIn = Number(mateMatch[1]);
      scoreCp = Math.sign(mateIn || 1) * (100000 - Math.min(50, Math.abs(mateIn)) * 1000);
    } else if (cpMatch) {
      scoreCp = Number(cpMatch[1]);
    }
    if (pvMatch) pv = pvMatch[1].trim().split(/\s+/).filter(Boolean);
  }

  return { bestMove, depth, pv, scoreCp };
}

class BrowserStockfishClient {
  private listeners = new Set<(line: string) => void>();
  private worker: WorkerLike;

  private constructor(worker: WorkerLike) {
    this.worker = worker;
    this.worker.onmessage = (event) => {
      const line = String(event.data ?? "");
      for (const listener of this.listeners) listener(line);
    };
  }

  static async create() {
    const runtime = browserRuntime();
    const WorkerCtor = (runtime.Worker ?? runtime.window?.Worker) as WorkerConstructorLike | undefined;
    const origin = runtime.location?.origin ?? runtime.window?.location?.origin;
    if (!WorkerCtor || !origin) {
      throw new Error("Browser Worker runtime is not available.");
    }

    const scriptUrl = `${origin}/stockfish/stockfish-18-lite-single.js#${origin}/stockfish/stockfish-18-lite-single.wasm,worker`;
    const worker = new WorkerCtor(scriptUrl);
    const client = new BrowserStockfishClient(worker);
    worker.onerror = (event) => {
      (globalThis as { console?: Console }).console?.warn?.("[ChessAlive Review] Stockfish worker error.", event);
    };
    await client.initialize();
    return client;
  }

  terminate() {
    try {
      this.post("quit");
    } catch {
      // The worker may already be closed.
    }
    this.worker.terminate();
  }

  async evaluateFen(fen: string, movetimeMs: number) {
    const gameOver = terminalEvaluation(fen);
    if (gameOver) return gameOver;
    const waitForBestMove = this.waitFor((line) => line.startsWith("bestmove "), Math.max(3500, movetimeMs + 2500), "bestmove");
    this.post(`position fen ${fen}`);
    this.post(`go movetime ${movetimeMs}`);
    const lines = await waitForBestMove;
    return parseEngineLine(lines);
  }

  private async initialize() {
    const uciReady = this.waitFor((line) => line === "uciok", 15000, "uciok");
    this.post("uci");
    await uciReady;
    const ready = this.waitFor((line) => line === "readyok", 15000, "readyok");
    this.post("isready");
    await ready;
    this.post("ucinewgame");
  }

  private post(command: string) {
    this.worker.postMessage(command);
  }

  private waitFor(predicate: (line: string) => boolean, timeoutMs: number, label: string) {
    const lines: string[] = [];
    return new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`Stockfish timed out waiting for ${label}.`));
      }, timeoutMs);
      const listener = (line: string) => {
        lines.push(line);
        if (!predicate(line)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(lines);
      };
      this.listeners.add(listener);
    });
  }
}

class MainThreadStockfishClient {
  private listeners = new Set<(line: string) => void>();
  private module: { processCommand?: (command: string) => void; terminate?: () => void } = {};
  private script: { remove?: () => void } | null = null;

  static async create() {
    const client = new MainThreadStockfishClient();
    await client.initialize();
    return client;
  }

  terminate() {
    try {
      this.post("quit");
    } catch {
      // The engine may already be closed.
    }
    try {
      this.module.terminate?.();
    } catch {
      // Some builds do not expose terminate in main-thread mode.
    }
    this.script?.remove?.();
  }

  async evaluateFen(fen: string, movetimeMs: number) {
    const gameOver = terminalEvaluation(fen);
    if (gameOver) return gameOver;
    const waitForBestMove = this.waitFor((line) => line.startsWith("bestmove "), Math.max(3500, movetimeMs + 2500), "bestmove");
    this.post(`position fen ${fen}`);
    this.post(`go movetime ${movetimeMs}`);
    const lines = await waitForBestMove;
    return parseEngineLine(lines);
  }

  private async initialize() {
    const runtime = browserRuntime();
    const origin = runtime.location?.origin ?? runtime.window?.location?.origin;
    const documentLike = (runtime.document ?? runtime.window?.document) as
      | {
          body?: { appendChild: (node: unknown) => void };
          createElement: (tag: string) => {
            _exports?: (module: Record<string, unknown>) => Promise<unknown>;
            async?: boolean;
            onerror?: (event: unknown) => void;
            onload?: () => void;
            remove?: () => void;
            src?: string;
          };
          head?: { appendChild: (node: unknown) => void };
        }
      | undefined;
    if (!origin || !documentLike?.createElement) throw new Error("Document script runtime is not available.");

    const script = documentLike.createElement("script");
    this.script = script;
    script.async = true;
    script.src = `${origin}/stockfish/stockfish-18-lite-single.js`;
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = (event) => reject(event);
      (documentLike.head ?? documentLike.body)?.appendChild(script);
    });

    const factory = script._exports;
    if (typeof factory !== "function") throw new Error("Stockfish browser factory did not load.");
    const engineModule: Record<string, unknown> = {
      listener: (line: string) => {
        for (const listener of this.listeners) listener(String(line));
      },
      locateFile: (path: string) => (path.includes(".wasm") ? `${origin}/stockfish/stockfish-18-lite-single.wasm` : `${origin}/stockfish/stockfish-18-lite-single.js`),
    };
    await factory(engineModule);
    this.module = engineModule as { processCommand?: (command: string) => void; terminate?: () => void };
    await this.waitUntilProcessCommand();
    const uciReady = this.waitFor((line) => line === "uciok", 12000, "uciok");
    this.post("uci");
    await uciReady;
    const ready = this.waitFor((line) => line === "readyok", 12000, "readyok");
    this.post("isready");
    await ready;
    this.post("ucinewgame");
  }

  private post(command: string) {
    if (!this.module.processCommand) throw new Error("Stockfish command channel is not ready.");
    this.module.processCommand(command);
  }

  private waitFor(predicate: (line: string) => boolean, timeoutMs: number, label: string) {
    const lines: string[] = [];
    return new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`Stockfish timed out waiting for ${label}.`));
      }, timeoutMs);
      const listener = (line: string) => {
        lines.push(line);
        if (!predicate(line)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(lines);
      };
      this.listeners.add(listener);
    });
  }

  private waitUntilProcessCommand() {
    return new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (this.module.processCommand) {
          resolve();
          return;
        }
        if (Date.now() - startedAt > 6000) {
          reject(new Error("Stockfish command channel did not initialize."));
          return;
        }
        setTimeout(tick, 20);
      };
      tick();
    });
  }
}

function terminalEvaluation(fen: string): EngineEvaluation | null {
  const snapshot = createChessEngine(fen).snapshot();
  if (snapshot.status.isCheckmate) return { depth: 0, pv: [], scoreCp: -100000 };
  if (snapshot.status.isDraw || snapshot.status.isStalemate) return { depth: 0, pv: [], scoreCp: 0 };
  return null;
}

function materialScoreWhite(snapshot: GameSnapshot) {
  return snapshot.board.reduce((score, cell) => {
    if (!cell.piece) return score;
    const value = pieceValues[cell.piece.kind];
    return score + (cell.piece.color === "w" ? value : -value);
  }, 0);
}

function heuristicEvaluation(fen: string): EngineEvaluation {
  const terminal = terminalEvaluation(fen);
  if (terminal) return terminal;
  const best = bestHeuristicResult(fen);
  return {
    bestMove: best.bestMove,
    depth: 1,
    pv: [],
    scoreCp: best.scoreCp,
  };
}

function bestHeuristicResult(fen: string) {
  const snapshot = createChessEngine(fen).snapshot();
  const mover = snapshot.status.turn;
  let bestMove: string | undefined;
  let bestScore = -Infinity;

  for (const [from, targets] of Object.entries(snapshot.legalMoves) as Array<[SquareName, SquareName[]]>) {
    for (const to of targets) {
      const engine = createChessEngine(fen);
      const move = engine.move({ from, to, promotion: "q" });
      if (!move) continue;
      const after = engine.snapshot();
      const material = materialScoreWhite(after);
      let score = mover === "w" ? material : -material;
      if (move.captured) score += pieceValues[move.captured] * 0.15;
      if (after.status.isCheck) score += 35;
      if (after.status.isCheckmate) score += 100000;
      if (score > bestScore) {
        bestScore = score;
        bestMove = `${from}${to}${move.promotion ?? ""}`;
      }
    }
  }

  if (!bestMove) {
    const material = materialScoreWhite(snapshot);
    bestScore = mover === "w" ? material : -material;
  }

  return { bestMove, scoreCp: Math.round(bestScore) };
}

function uciToIntent(uci?: string): MoveIntent | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2) as SquareName,
    promotion: uci[4] as PieceKind | undefined,
    to: uci.slice(2, 4) as SquareName,
  };
}

function sanForUci(fen: string, uci?: string) {
  const intent = uciToIntent(uci);
  if (!intent) return undefined;
  return createChessEngine(fen).move(intent)?.san;
}

function legalMoveCount(fen: string) {
  const snapshot = createChessEngine(fen).snapshot();
  return Object.values(snapshot.legalMoves).reduce((count, targets) => count + targets.length, 0);
}

function uciFromMove(move: ChessMove) {
  return `${move.from}${move.to}${move.promotion ?? ""}`.toLowerCase();
}

function classifyMove({
  bestMatches,
  evalLoss,
  forced,
  isBook,
  isCheckmate,
  isTactical,
}: {
  bestMatches: boolean;
  evalLoss: number;
  forced: boolean;
  isBook: boolean;
  isCheckmate: boolean;
  isTactical: boolean;
}): ReviewMoveClassification {
  if (isCheckmate) return "brilliant";
  if (forced && evalLoss <= 35) return "forced";
  if (isBook && evalLoss <= 35) return "book";
  if (bestMatches && isTactical) return "brilliant";
  if (evalLoss <= 18) return bestMatches || isTactical ? "great" : "good";
  if (evalLoss <= 55) return "good";
  if (evalLoss <= 130) return "inaccuracy";
  if (evalLoss <= 280) return "mistake";
  return "blunder";
}

function moveAccuracy(evalLoss: number) {
  return bounded(Math.round(100 - Math.sqrt(Math.max(0, evalLoss)) * 4.2), 0, 100);
}

function classificationTitle(classification: ReviewMoveClassification) {
  switch (classification) {
    case "book":
      return "Book move";
    case "forced":
      return "Only move";
    case "brilliant":
      return "Brilliant";
    case "great":
      return "Great move";
    case "good":
      return "Good move";
    case "inaccuracy":
      return "Inaccuracy";
    case "mistake":
      return "Mistake";
    case "blunder":
      return "Blunder";
  }
}

function explainMove({
  afterSnapshot,
  bestSan,
  classification,
  evalLoss,
  move,
}: {
  afterSnapshot: GameSnapshot;
  bestSan?: string;
  classification: ReviewMoveClassification;
  evalLoss: number;
  move: ChessMove;
}) {
  const reasons: string[] = [];
  if (move.captured) reasons.push(`It captures a ${pieceNames[move.captured]}.`);
  if (afterSnapshot.status.isCheckmate) reasons.push("It ends the game by checkmate.");
  else if (afterSnapshot.status.isCheck) reasons.push("It gives check and forces the opponent to respond.");
  if (move.promotion) reasons.push(`It promotes to a ${pieceNames[move.promotion]}.`);

  const hugeLoss = evalLoss > 9000;
  const pawns = (evalLoss / 100).toFixed(evalLoss >= 95 ? 1 : 2);
  let explanation = "";
  switch (classification) {
    case "book":
      explanation = "This follows a stable opening pattern and keeps the position easy to play.";
      break;
    case "forced":
      explanation = "This was the practical move because the position had almost no safe alternatives.";
      break;
    case "brilliant":
      explanation = move.captured
        ? "This is a tactical strike: it wins material while keeping the initiative."
        : "This creates a forcing idea without giving the opponent a clean escape.";
      break;
    case "great":
      explanation = "This keeps the engine evaluation almost intact and improves the position with purpose.";
      break;
    case "good":
      explanation = "This is solid. It does not hand the opponent a clear tactical target.";
      break;
    case "inaccuracy":
      explanation = hugeLoss ? "Playable-looking, but it walks into a forcing tactical sequence." : `Playable, but it gives away about ${pawns} pawns of engine value.`;
      break;
    case "mistake":
      explanation = hugeLoss
        ? "This move lets the opponent force a decisive attack."
        : `This move changes the position too much in the opponent's favor, losing about ${pawns} pawns of value.`;
      break;
    case "blunder":
      explanation = hugeLoss
        ? "This is the critical miss. It allows a forced mate or a decisive tactical sequence."
        : `This is the critical miss. It drops roughly ${pawns} pawns of value or allows a forcing tactic.`;
      break;
  }

  if (bestSan && !["book", "forced", "brilliant", "great"].includes(classification)) {
    explanation += ` The engine preferred ${bestSan}, which keeps more control and reduces the opponent's counterplay.`;
  } else if (bestSan && ["brilliant", "great"].includes(classification)) {
    explanation += ` It is aligned with the engine's top idea: ${bestSan}.`;
  }

  if (!reasons.length) {
    reasons.push(evalLoss <= 55 ? "It keeps the position stable." : "The engine found a cleaner continuation.");
  }

  return { explanation, reasons };
}

function openingName(history: ChessMove[]) {
  const line = history.slice(0, 6).map((move) => move.san.replace(/[+#?!]+/g, "")).join(" ");
  if (line.startsWith("e4 c5")) return "Sicilian Defense";
  if (line.startsWith("e4 e5 Nf3 Nc6 Bc4")) return "Italian Game";
  if (line.startsWith("e4 e5 Nf3 Nc6 Bb5")) return "Ruy Lopez";
  if (line.startsWith("d4 d5 c4")) return "Queen's Gambit";
  if (line.startsWith("d4 Nf6 c4 g6")) return "King's Indian Defense";
  if (line.startsWith("c4")) return "English Opening";
  if (line.startsWith("e4 e5")) return "Open Game";
  if (line.startsWith("d4 d5")) return "Queen's Pawn Game";
  return history.length ? "Unclassified opening" : "Starting position";
}

function pgnFromHistory(history: ChessMove[]) {
  const chunks: string[] = [];
  for (let index = 0; index < history.length; index += 2) {
    const moveNumber = index / 2 + 1;
    const white = history[index]?.san ?? "";
    const black = history[index + 1]?.san ?? "";
    chunks.push(`${moveNumber}. ${white}${black ? ` ${black}` : ""}`);
  }
  return chunks.join(" ");
}

function buildVerdict(whiteAccuracy: number, blackAccuracy: number, counts: Record<ReviewMoveClassification, number>) {
  const blunders = counts.blunder;
  const mistakes = counts.mistake;
  if (blunders === 0 && mistakes <= 1) return "Clean game. Most moves kept the position under control.";
  if (blunders <= 1) return "One swing decided the story. Review the highlighted mistake first.";
  return "Tactical volatility was high. Focus on the red moves and the engine alternatives.";
}

async function createEvaluationClient(onProgress?: AnalyzeOptions["onProgress"]) {
  onProgress?.({ completed: 0, message: "Loading Stockfish WASM in this browser.", phase: "loading-engine", total: 1 });
  try {
    const client = await BrowserStockfishClient.create();
    return { client, usedStockfish: true };
  } catch (workerError) {
    (globalThis as { console?: Console }).console?.warn?.("[ChessAlive Review] Worker Stockfish unavailable; trying main-thread WASM.", workerError);
  }
  try {
    onProgress?.({ completed: 0, message: "Worker mode is unavailable. Loading Stockfish WASM directly.", phase: "loading-engine", total: 1 });
    const client = await MainThreadStockfishClient.create();
    return { client, usedStockfish: true };
  } catch (error) {
    (globalThis as { console?: Console }).console?.warn?.("[ChessAlive Review] Stockfish WASM unavailable; using fallback evaluator.", error);
    onProgress?.({ completed: 0, message: "Stockfish worker unavailable. Using local fallback evaluator.", phase: "fallback", total: 1 });
    return { client: null, usedStockfish: false };
  }
}

export async function analyzeGameInBrowser(snapshot: GameSnapshot, options: AnalyzeOptions = {}): Promise<BrowserGameReview> {
  const maxPlies = options.maxPlies ?? 80;
  const movetimeMs = options.movetimeMs ?? 120;
  const cappedHistory = snapshot.history.slice(0, maxPlies);
  const { client, usedStockfish } = await createEvaluationClient(options.onProgress);
  const evalCache = new Map<string, EngineEvaluation>();

  async function evaluate(fen: string) {
    const cached = evalCache.get(fen);
    if (cached) return cached;
    let evaluation: EngineEvaluation;
    if (client) {
      try {
        evaluation = await client.evaluateFen(fen, movetimeMs);
      } catch {
        evaluation = heuristicEvaluation(fen);
      }
    } else {
      evaluation = heuristicEvaluation(fen);
    }
    evalCache.set(fen, evaluation);
    return evaluation;
  }

  const insights: ReviewMoveInsight[] = [];
  const accuracies: Record<"w" | "b", number[]> = { b: [], w: [] };
  const counts = emptyCounts();

  for (let index = 0; index < cappedHistory.length; index += 1) {
    const move = cappedHistory[index];
    const ply = index + 1;
    options.onProgress?.({
      completed: index,
      message: `Analyzing ${ply}/${cappedHistory.length}: ${move.san}`,
      phase: "analyzing",
      total: cappedHistory.length,
    });

    const beforeEval = await evaluate(move.before);
    const afterEval = await evaluate(move.after);
    const beforeForMover = beforeEval.scoreCp;
    const afterForMover = -afterEval.scoreCp;
    const evalLoss = Math.max(0, beforeForMover - afterForMover);
    const bestMove = beforeEval.bestMove;
    const bestSan = sanForUci(move.before, bestMove);
    const afterSnapshot = createChessEngine(move.after).snapshot();
    const bestMatches = bestMove ? uciFromMove(move) === bestMove.toLowerCase() : evalLoss <= 12;
    const isTactical = Boolean(move.captured || afterSnapshot.status.isCheck || afterSnapshot.status.isCheckmate || move.promotion);
    const classification = classifyMove({
      bestMatches,
      evalLoss,
      forced: legalMoveCount(move.before) <= 1,
      isBook: index < 8,
      isCheckmate: afterSnapshot.status.isCheckmate,
      isTactical,
    });
    const displayedBestMove = !usedStockfish && classification === "book" ? undefined : bestMove;
    const displayedBestSan = !usedStockfish && classification === "book" ? undefined : bestSan;
    const explanation = explainMove({ afterSnapshot, bestSan: displayedBestSan, classification, evalLoss, move });
    counts[classification] += 1;
    accuracies[move.color].push(moveAccuracy(evalLoss));

    insights.push({
      afterFen: move.after,
      beforeFen: move.before,
      bestMove: displayedBestMove,
      bestSan: displayedBestSan,
      classification,
      color: move.color,
      engineDepth: beforeEval.depth,
      evalAfter: Math.round(afterForMover),
      evalBefore: Math.round(beforeForMover),
      evalLoss: Math.round(evalLoss),
      explanation: explanation.explanation,
      move,
      moveNumber: Math.floor(index / 2) + 1,
      played: move.san,
      ply,
      reasons: explanation.reasons,
      title: classificationTitle(classification),
    });
  }

  client?.terminate();
  options.onProgress?.({ completed: cappedHistory.length, message: "Building coach summary.", phase: "summarizing", total: cappedHistory.length });

  const accuracyWhite = averageAccuracy(accuracies.w);
  const accuracyBlack = averageAccuracy(accuracies.b);
  const review: BrowserGameReview = {
    accuracyBlack,
    accuracyWhite,
    bestMove: insights.find((insight) => insight.bestSan)?.bestSan,
    counts,
    engineName: usedStockfish ? "Stockfish 18 Lite WASM" : "Local heuristic fallback",
    generatedAt: new Date().toISOString(),
    moveInsights: insights,
    openingName: openingName(snapshot.history),
    pgn: pgnFromHistory(snapshot.history),
    status: cappedHistory.length < snapshot.history.length ? "partial" : usedStockfish ? "complete" : "fallback",
    usedStockfish,
    verdict: buildVerdict(accuracyWhite, accuracyBlack, counts),
  };
  options.onProgress?.({ completed: cappedHistory.length, message: "Review ready.", phase: "complete", total: cappedHistory.length });
  return review;
}

function averageAccuracy(values: number[]) {
  if (!values.length) return 100;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
