/**
 * fetch-puzzles.mjs
 *
 * Streams the Lichess open puzzle database CSV, filters puzzles into 5
 * difficulty tiers (400 each = 2000 total), validates every position and
 * move sequence with chess.js, and writes the result to:
 *
 *   packages/data/puzzles.json
 *
 * Usage:
 *   node scripts/fetch-puzzles.mjs
 *
 * The Lichess CSV columns are:
 *   PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity,
 *   NbPlays, Themes, GameUrl, OpeningTags
 *
 * Lichess puzzle DB: https://database.lichess.org/#puzzles
 * License: CC0 (public domain)
 */

import { createWriteStream, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createBrotliDecompress, createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { Chess } from "../node_modules/chess.js/dist/cjs/chess.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Writable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── Tier configuration ──────────────────────────────────────────────────────

const TIERS = [
  {
    name: "beginner",
    label: "Beginner",
    min: 400,
    max: 700,
    target: 400,
    xp: 50,
    color: "#4ade80",
  },
  {
    name: "easy",
    label: "Easy",
    min: 700,
    max: 950,
    target: 400,
    xp: 75,
    color: "#60a5fa",
  },
  {
    name: "intermediate",
    label: "Intermediate",
    min: 950,
    max: 1200,
    target: 400,
    xp: 100,
    color: "#fbbf24",
  },
  {
    name: "hard",
    label: "Hard",
    min: 1200,
    max: 1500,
    target: 400,
    xp: 150,
    color: "#c084fc",
  },
  {
    name: "expert",
    label: "Expert",
    min: 1500,
    max: 1800,
    target: 400,
    xp: 200,
    color: "#f87171",
  },
];

// ─── Theme → human readable motif map ────────────────────────────────────────

const THEME_LABEL = {
  mate: "Checkmate",
  mateIn1: "Mate in 1",
  mateIn2: "Mate in 2",
  mateIn3: "Mate in 3",
  mateIn4: "Mate in 4",
  mateIn5: "Mate in 5",
  fork: "Fork",
  pin: "Pin",
  skewer: "Skewer",
  discoveredAttack: "Discovered attack",
  doubleCheck: "Double check",
  deflection: "Deflection",
  decoy: "Decoy",
  interference: "Interference",
  clearance: "Clearance",
  sacrifice: "Sacrifice",
  quietMove: "Quiet move",
  zugzwang: "Zugzwang",
  trappedPiece: "Trapped piece",
  promotion: "Promotion",
  underPromotion: "Underpromotion",
  enPassant: "En passant",
  castling: "Castling",
  hangingPiece: "Hanging piece",
  capturingDefender: "Capturing defender",
  attackingF2F7: "Attack on f2/f7",
  backRankMate: "Back-rank mate",
  smotheredMate: "Smothered mate",
  bodenMate: "Boden's mate",
  arabianMate: "Arabian mate",
  doubleBishopMate: "Double bishop mate",
  hookMate: "Hook mate",
  anastasiasMate: "Anastasia's mate",
  killBoxMate: "Kill box mate",
  exposedKing: "Exposed king",
  xRayAttack: "X-ray attack",
  zwischenzug: "Zwischenzug",
  overloadedPiece: "Overloaded piece",
  advancedPawn: "Advanced pawn",
  pawnEndgame: "Pawn endgame",
  rookEndgame: "Rook endgame",
  queenEndgame: "Queen endgame",
  bishopEndgame: "Bishop endgame",
  knightEndgame: "Knight endgame",
  queenRookEndgame: "Queen & rook endgame",
  equality: "Equality",
  advantage: "Gaining advantage",
};

function themeToMotif(themes) {
  if (!themes) return "Tactics";
  const list = themes.split(" ");
  // Priority order — pick the most instructive theme
  const priority = [
    "mateIn1","mateIn2","mateIn3","mateIn4","mateIn5","mate",
    "backRankMate","smotheredMate","bodenMate","arabianMate",
    "fork","pin","skewer","discoveredAttack","doubleCheck",
    "deflection","decoy","sacrifice","quietMove","zugzwang",
    "promotion","enPassant","hangingPiece","trappedPiece",
    "xRayAttack","overloadedPiece","clearance","interference",
  ];
  for (const p of priority) {
    if (list.includes(p)) return THEME_LABEL[p] ?? p;
  }
  // Fallback to first recognisable theme
  for (const t of list) {
    if (THEME_LABEL[t]) return THEME_LABEL[t];
  }
  return "Tactics";
}

// ─── chess.js validation ─────────────────────────────────────────────────────

function validatePuzzle(fen, movesLan) {
  try {
    const chess = new Chess(fen);
    const moves = movesLan.trim().split(" ").filter(Boolean);
    if (moves.length === 0) return null;

    const solution = [];
    for (const lan of moves) {
      const from = lan.slice(0, 2);
      const to = lan.slice(2, 4);
      const promotion = lan[4] ?? undefined;
      const result = chess.move({ from, to, promotion });
      if (!result) return null; // illegal move — discard puzzle
      solution.push({ san: result.san, lan });
    }
    return solution; // array of { san, lan }
  } catch {
    return null;
  }
}

// ─── Puzzle builder ───────────────────────────────────────────────────────────

let globalSeq = 1;

function buildPuzzle(row, tier) {
  const [puzzleId, fen, moves, rating, , popularity, nbPlays, themes] = row;
  const solution = validatePuzzle(fen, moves);
  if (!solution || solution.length === 0) return null;

  // The FEN in Lichess puzzles is the position BEFORE the opponent's move,
  // so the first move in Moves is the opponent's move. We apply it to get
  // the "puzzle start" position.
  const chess = new Chess(fen);
  const opponentMoveLan = moves.trim().split(" ")[0];
  const opponentMove = chess.move({
    from: opponentMoveLan.slice(0, 2),
    to: opponentMoveLan.slice(2, 4),
    promotion: opponentMoveLan[4] ?? undefined,
  });
  if (!opponentMove) return null;
  const puzzleFen = chess.fen(); // position the user sees

  // Solution is moves[1..] — what the solver must find
  const playerMoves = moves.trim().split(" ").slice(1);
  if (playerMoves.length === 0) return null;
  const playerSolution = validatePuzzle(puzzleFen, playerMoves.join(" "));
  if (!playerSolution || playerSolution.length === 0) return null;

  // Hint: describe the first move in plain language
  const firstSan = playerSolution[0].san;
  const motif = themeToMotif(themes);
  const hint = `Look for a ${motif.toLowerCase()} — the key move is ${firstSan[0] === firstSan[0].toUpperCase() && firstSan[0] !== "O" ? "a piece move" : "a pawn move"}.`;

  const sideToMove = puzzleFen.split(" ")[1]; // 'w' or 'b'

  // Expected solve time in seconds (rough heuristic by rating)
  const r = Number(rating);
  const expectedTime = Math.round(15 + (r / 1800) * 90); // 15s (easy) → 105s (expert)

  return {
    id: `lichess-${puzzleId}`,
    lichessId: puzzleId,
    title: `${motif} #${globalSeq++}`,
    fen: puzzleFen,
    goal: `Find the best ${motif.toLowerCase()}.`,
    hint,
    motif,
    difficulty: tier.name,
    rating: r,
    xp: tier.xp,
    sideToMove,
    solution: playerSolution.map((m) => m.san),
    solutionLan: playerMoves,
    expectedTime,
    attempts: Number(nbPlays) || 0,
    successRate: Math.min(99, Math.max(10, Math.round(Number(popularity) * 0.45 + 50))),
    themes: themes ? themes.split(" ").filter((t) => !["opening","middlegame","endgame","short","long","oneMove","veryLong"].includes(t)) : [],
  };
}

// ─── CSV line parser ──────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const outDir = join(ROOT, "packages", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "puzzles.json");

  console.log("ChessAlive Puzzle Fetcher");
  console.log("=========================");
  console.log(`Target: 400 puzzles × 5 tiers = 2000 total`);
  console.log(`Output: ${outPath}`);
  console.log("");

  // Bucket for each tier
  const buckets = new Map(TIERS.map((t) => [t.name, []]));
  const tierByName = new Map(TIERS.map((t) => [t.name, t]));
  const seenIds = new Set();

  // Track motif diversity per tier (avoid too many of the same motif)
  const motifCounts = new Map(TIERS.map((t) => [t.name, new Map()]));

  let linesRead = 0;
  let linesAccepted = 0;
  let allFull = false;

  const LICHESS_CSV_URL = "https://database.lichess.org/lichess_db_puzzle.csv.bz2";

  console.log(`Fetching: ${LICHESS_CSV_URL}`);
  console.log("(Streaming — will stop once 2000 puzzles collected)\n");

  const response = await fetch(LICHESS_CSV_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // The file is bzip2 compressed — decompress on the fly
  // Node doesn't have native bzip2 but we can use the system bunzip2 via subprocess,
  // or use a JS bzip2 library. We'll pipe through bunzip2.
  const { createReadStream } = await import("node:fs");
  const { spawn } = await import("node:child_process");
  const { Readable } = await import("node:stream");

  // Pipe fetch response body through bunzip2
  const nodeStream = Readable.fromWeb(response.body);
  const bunzip2 = spawn("bunzip2", ["--stdout"], { stdio: ["pipe", "pipe", "inherit"] });
  nodeStream.pipe(bunzip2.stdin);

  const rl = createInterface({ input: bunzip2.stdout, crlfDelay: Infinity });

  let headerSkipped = false;

  for await (const line of rl) {
    if (!headerSkipped) {
      headerSkipped = true; // skip CSV header row
      continue;
    }

    linesRead++;
    if (linesRead % 100000 === 0) {
      const counts = TIERS.map((t) => `${t.label}: ${buckets.get(t.name).length}/${t.target}`).join(" | ");
      console.log(`  Scanned ${linesRead.toLocaleString()} rows — ${counts}`);
    }

    // Check if all tiers are full
    if (TIERS.every((t) => buckets.get(t.name).length >= t.target)) {
      allFull = true;
      break;
    }

    const row = parseCsvLine(line);
    if (row.length < 8) continue;

    const [puzzleId, , , ratingStr, ratingDevStr, popularityStr, nbPlaysStr, themes] = row;
    const rating = Number(ratingStr);
    const ratingDev = Number(ratingDevStr);
    const nbPlays = Number(nbPlaysStr);

    // Quality filters
    if (isNaN(rating) || rating < 400 || rating > 1800) continue;
    if (ratingDev > 120) continue; // poorly calibrated puzzle
    if (nbPlays < 500) continue;   // not enough play data
    if (seenIds.has(puzzleId)) continue;

    // Find matching tier
    const tier = TIERS.find((t) => rating >= t.min && rating < t.max);
    if (!tier) continue;

    const bucket = buckets.get(tier.name);
    if (bucket.length >= tier.target) continue;

    // Motif diversity cap: max 40 of the same motif per tier
    const motif = themeToMotif(themes);
    const mc = motifCounts.get(tier.name);
    const currentCount = mc.get(motif) ?? 0;
    if (currentCount >= 40) continue;

    const puzzle = buildPuzzle(row, tier);
    if (!puzzle) continue;

    seenIds.add(puzzleId);
    bucket.push(puzzle);
    mc.set(motif, currentCount + 1);
    linesAccepted++;
  }

  rl.close();
  bunzip2.kill();

  // Compile final output
  const all = TIERS.flatMap((t) => buckets.get(t.name));

  // Summary
  console.log("\n✓ Collection complete");
  console.log("─────────────────────────────────");
  for (const tier of TIERS) {
    const bucket = buckets.get(tier.name);
    const motifMap = motifCounts.get(tier.name);
    const topMotifs = [...motifMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m, c]) => `${m}(${c})`)
      .join(", ");
    console.log(`  ${tier.label.padEnd(14)} ${bucket.length} puzzles | top motifs: ${topMotifs}`);
  }
  console.log(`  ${"TOTAL".padEnd(14)} ${all.length} puzzles`);
  console.log("─────────────────────────────────");
  console.log(`  Lines scanned : ${linesRead.toLocaleString()}`);
  console.log(`  Lines accepted: ${linesAccepted.toLocaleString()}`);
  console.log(`  Output file   : ${outPath}`);

  // Write JSON
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "Lichess Open Puzzle Database (CC0)",
      sourceUrl: "https://database.lichess.org/#puzzles",
      total: all.length,
      tiers: TIERS.map((t) => ({
        name: t.name,
        label: t.label,
        ratingMin: t.min,
        ratingMax: t.max,
        count: buckets.get(t.name).length,
        xp: t.xp,
        color: t.color,
      })),
    },
    puzzles: all,
  };

  await import("node:fs").then(({ writeFileSync }) =>
    writeFileSync(outPath, JSON.stringify(output, null, 2))
  );

  console.log("\nDone! puzzles.json written successfully.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
