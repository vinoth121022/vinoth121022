/**
 * generate-questions.mjs
 *
 * Reads packages/data/puzzles.json, analyses the FEN and solution of each puzzle,
 * and adds a conversational "question" field.
 *
 * Usage: node scripts/generate-questions.mjs
 */

import { Chess } from "../node_modules/chess.js/dist/cjs/chess.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUZZLES_PATH = join(ROOT, "packages", "data", "puzzles.json");

const PIECE_NAMES = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king"
};

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper to select a template deterministically based on puzzle ID
function getTemplateIndex(puzzleId, numTemplates) {
  const match = puzzleId.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 0;
  return num % numTemplates;
}

function generateQuestion(puzzle) {
  const chess = new Chess(puzzle.fen);
  const moves = puzzle.solutionLan;
  if (!moves || moves.length === 0) {
    return puzzle.goal; // fallback to goal
  }

  const firstMove = moves[0];
  const fromSquare = firstMove.slice(0, 2);
  const toSquare = firstMove.slice(2, 4);
  const promo = firstMove[4] ?? undefined;

  const movingPieceObj = chess.get(fromSquare);
  if (!movingPieceObj) {
    return puzzle.goal;
  }

  const pieceName = PIECE_NAMES[movingPieceObj.type] || "piece";

  // Check defenders/helpers of the destination square before the move
  let helperType = null;
  try {
    const attackers = chess.attackers(toSquare, puzzle.sideToMove);
    const helpers = attackers.filter(sq => sq !== fromSquare);
    if (helpers.length > 0) {
      const helperPiece = chess.get(helpers[0]);
      if (helperPiece) {
        helperType = helperPiece.type;
      }
    }
  } catch (err) {
    // Ignore attackers detection errors
  }

  // Simulate move to check for capture details
  let capturedPieceName = null;
  let isCheckmate = false;
  try {
    const moveResult = chess.move({ from: fromSquare, to: toSquare, promotion: promo });
    if (moveResult && moveResult.captured) {
      capturedPieceName = PIECE_NAMES[moveResult.captured];
    }
    isCheckmate = chess.isCheckmate() || (puzzle.solution[0] && puzzle.solution[0].endsWith("#"));
  } catch (err) {
    // Ignore move errors
  }

  const templateIdx = getTemplateIndex(puzzle.id, 5); // 5 templates per category for variety

  // Helper phrase construction
  let supportPhrase = "";
  if (helperType) {
    const hName = PIECE_NAMES[helperType];
    const phrases = [
      `, with help from your ${hName}`,
      `, with support from your ${hName}`,
      `, supported by your ${hName}`,
      `, backed by your ${hName}`,
      `, coordinated with your ${hName}`
    ];
    supportPhrase = phrases[templateIdx % phrases.length];
  }

  const category = puzzle.category;
  const motif = (puzzle.motif || "").toLowerCase();

  // --- 1. CHECKMATE ---
  if (category === "checkmate" || isCheckmate) {
    if (motif.includes("back-rank") || motif.includes("back rank")) {
      const backRankTemplates = [
        `My king is trapped behind a wall of pawns! Can you slide your ${pieceName} to the back rank to deliver checkmate?`,
        `Watch out for the weak back rank! Can you move your ${pieceName} to checkmate my king?`,
        `Can you exploit my weak back rank and deliver a quick checkmate with your ${pieceName}?`,
        `My back rank is completely undefended. Can you land your ${pieceName} back there for checkmate?`,
        `Deliver a classic back-rank mate! Can you move your ${pieceName} to trap my king on the edge?`
      ];
      return backRankTemplates[templateIdx % backRankTemplates.length];
    }

    if (motif.includes("smothered")) {
      const smotheredTemplates = [
        `My king is completely surrounded by its own pieces! Can you jump your knight in for a smothered checkmate?`,
        `Look at how crowded my king is! Can you play the winning knight move to smother my king?`,
        `Can you find the smothered mate? Move your knight to deliver the game-ending check.`,
        `My own pieces are trapping my king. Can you jump your knight in for a beautiful smothered mate?`,
        `Use my cramped position against me! Can you checkmate my king with a clever knight jump?`
      ];
      return smotheredTemplates[templateIdx % smotheredTemplates.length];
    }

    if (motif.includes("diagonal")) {
      const diagonalTemplates = [
        `The diagonal is wide open! Can you move your ${pieceName} to deliver a swift checkmate${supportPhrase}?`,
        `Can you attack my king along the open diagonal with your ${pieceName} for a checkmate${supportPhrase}?`,
        `My king's diagonal defense is weak. Can you find the checkmating ${pieceName} move${supportPhrase}?`,
        `Look down the open diagonal! Can you deliver a clean checkmate with your ${pieceName}${supportPhrase}?`,
        `Can you target my king along the diagonal and play the mating move using your ${pieceName}${supportPhrase}?`
      ];
      return diagonalTemplates[templateIdx % diagonalTemplates.length];
    }

    // Default checkmate in 1 (or short checkmate sequence)
    const mateTemplates = [
      `You can play checkmate in one move! Can you make the game-ending ${pieceName} move${supportPhrase}?`,
      `In this "mate in 1," can you move your ${pieceName} to attack my king${supportPhrase}?`,
      `My king has nowhere safe to go. Can you make a ${pieceName} move that attacks my king with checkmate${supportPhrase}?`,
      `Can you deliver the final blow? Find the checkmate move using your ${pieceName}${supportPhrase}.`,
      `Look for a way to trap my king! Can you deliver checkmate with your ${pieceName}${supportPhrase}?`
    ];
    return mateTemplates[templateIdx % mateTemplates.length];
  }

  // --- 2. HANGING PIECE / WINNING MATERIAL ---
  if (motif.includes("hanging") || motif.includes("undefended") || motif.includes("unprotected")) {
    if (capturedPieceName) {
      const captureTemplates = [
        `I've left my ${capturedPieceName} undefended! Can you capture it with your ${pieceName}${supportPhrase} to win material?`,
        `Look at that hanging ${capturedPieceName}! Can you use your ${pieceName}${supportPhrase} to capture it?`,
        `Can you spot the unprotected ${capturedPieceName}? Take it with your ${pieceName}${supportPhrase}!`,
        `I made a mistake and left a ${capturedPieceName} hanging. Can you capture it with your ${pieceName}${supportPhrase}?`,
        `Free material is on the board! Can you win my ${capturedPieceName} with your ${pieceName}${supportPhrase}?`
      ];
      return captureTemplates[templateIdx % captureTemplates.length];
    }
  }

  // --- 3. FORKS ---
  if (motif.includes("fork") || motif.includes("double attack")) {
    const forkTemplates = [
      `There's a double attack on the board! Can you move your ${pieceName} to fork my pieces${supportPhrase}?`,
      `Can you find a tactical fork? Use your ${pieceName} to attack multiple targets at once${supportPhrase}.`,
      `Look for a fork! Can you strike at two of my pieces simultaneously with your ${pieceName}${supportPhrase}?`,
      `My pieces are poorly placed. Can you fork them with a sharp ${pieceName} move${supportPhrase}?`,
      `Double trouble! Can you place your ${pieceName} on a square where it forks my position${supportPhrase}?`
    ];
    return forkTemplates[templateIdx % forkTemplates.length];
  }

  // --- 4. PINS ---
  if (motif.includes("pin")) {
    const pinTemplates = [
      `Can you find the pin? Move your ${pieceName} to restrict my piece against a more valuable target${supportPhrase}.`,
      `My piece is vulnerable to a pin. Can you use your ${pieceName} to lock it in place${supportPhrase}?`,
      `Pin down my defense! Can you play a ${pieceName} move that pins my piece to my king or queen${supportPhrase}?`,
      `Look for a pin! Can you immobilize my piece using your ${pieceName}${supportPhrase}?`,
      `I have a line of pieces you can exploit. Can you play a pinning move with your ${pieceName}${supportPhrase}?`
    ];
    return pinTemplates[templateIdx % pinTemplates.length];
  }

  // --- 5. SKEWERS ---
  if (motif.includes("skewer")) {
    const skewerTemplates = [
      `My valuable piece is lined up in front of another! Can you use your ${pieceName} to deliver a skewer${supportPhrase}?`,
      `Can you play a skewering move with your ${pieceName} to win material when my more valuable piece moves away${supportPhrase}?`,
      `Look for a skewer! Can you line up an attack on my pieces with your ${pieceName}${supportPhrase}?`,
      `My king or queen is in front of another target. Can you skewer them using your ${pieceName}${supportPhrase}?`,
      `Strike through my position! Can you deliver a skewer with a strong ${pieceName} move${supportPhrase}?`
    ];
    return skewerTemplates[templateIdx % skewerTemplates.length];
  }

  // --- 6. DISCOVERED ATTACK / CHECK ---
  if (motif.includes("discovered") || motif.includes("reveal")) {
    const discoveredTemplates = [
      `A hidden threat is waiting to be unleashed! Can you move your ${pieceName} to discover an attack on my position${supportPhrase}?`,
      `Can you move your ${pieceName} out of the way to open up a discovered check against my king${supportPhrase}?`,
      `Unleash the hidden attack! Where can you move your ${pieceName} to open up a threat from another piece${supportPhrase}?`,
      `Can you find the discovered attack? Move your ${pieceName} to reveal a line of fire for your other piece${supportPhrase}.`,
      `My king is in a line of sight. Can you move your ${pieceName} to deliver a discovered check${supportPhrase}?`
    ];
    return discoveredTemplates[templateIdx % discoveredTemplates.length];
  }

  // --- 7. EN PASSANT ---
  if (motif.includes("en passant") || motif.includes("passant")) {
    const epTemplates = [
      `My pawn just pushed two squares forward. Can you perform an en passant capture to win it?`,
      `Take advantage of the passing pawn! Can you capture my pawn en passant with your pawn?`,
      `A rare en passant opportunity! Can you make the capturing pawn move?`,
      `My pawn tried to sneak past yours. Can you capture it en passant?`,
      `Can you capture my pawn as it passes by your pawn?`
    ];
    return epTemplates[templateIdx % epTemplates.length];
  }

  // --- 8. DEFLECTION / DECOY ---
  if (motif.includes("deflection") || motif.includes("decoy")) {
    const deflectionTemplates = [
      `My pieces are defending key squares. Can you move your ${pieceName} to deflect my defender${supportPhrase}?`,
      `Look for a decoy! Can you play a ${pieceName} move to draw one of my pieces away from its defense${supportPhrase}?`,
      `Can you use your ${pieceName} to lure or deflect my piece away from its protective post${supportPhrase}?`,
      `Force my defender off duty! What ${pieceName} move can you play to deflect my defense${supportPhrase}?`,
      `Draw my piece out of position! Can you play a tactical decoy with your ${pieceName}${supportPhrase}?`
    ];
    return deflectionTemplates[templateIdx % deflectionTemplates.length];
  }

  // --- 9. OVERLOADED PIECE ---
  if (motif.includes("overloaded") || motif.includes("overload")) {
    const overloadedTemplates = [
      `One of my pieces has too many defensive duties! Can you exploit this overloaded defender with your ${pieceName}${supportPhrase}?`,
      `My defender is stretched too thin. Can you target it or the piece it's guarding using your ${pieceName}${supportPhrase}?`,
      `Exploit my overloaded piece! Can you play the winning ${pieceName} move${supportPhrase}?`,
      `My piece is trying to guard too many things at once. Can you break my defense with your ${pieceName}${supportPhrase}?`,
      `Can you attack to distract my overloaded defender using your ${pieceName}${supportPhrase}?`
    ];
    return overloadedTemplates[templateIdx % overloadedTemplates.length];
  }

  // --- 10. ZUGZWANG ---
  if (motif.includes("zugzwang")) {
    const zugzwangTemplates = [
      `I'm running out of good options. Can you make a ${pieceName} move to put me in zugzwang, where any move I make is bad?`,
      `Can you claim the opposition and force my king into a disadvantageous position with your ${pieceName}?`,
      `Put me in zugzwang! What subtle ${pieceName} move forces me to weaken my own position?`,
      `Force me to make a losing move! Can you play the zugzwang move with your ${pieceName}?`,
      `I have no safe moves left if you play correctly. Can you put me in zugzwang using your ${pieceName}?`
    ];
    return zugzwangTemplates[templateIdx % zugzwangTemplates.length];
  }

  // --- 11. PROMOTION ---
  if (category === "promotion" || motif.includes("promotion")) {
    const promotionTemplates = [
      `You're so close to a new queen! Can you push your pawn to the last rank to promote it?`,
      `Promote your pawn to victory! Can you make the winning promotion move?`,
      `That pawn is ready to transform. Can you advance it to the last rank for a promotion?`,
      `Pawn promotion is key! Can you push your pawn to the end to claim a winning piece?`,
      `Can you make the final march and promote your pawn to win the game?`
    ];
    return promotionTemplates[templateIdx % promotionTemplates.length];
  }

  // --- 12. DRAW ---
  if (category === "draw" || motif.includes("draw") || motif.includes("stalemate")) {
    const drawTemplates = [
      `I have a winning advantage, but you can save the game! Can you force a draw here with your ${pieceName}?`,
      `Look for a way to force a stalemate or perpetual check to claim a draw using your ${pieceName}!`,
      `Can you save the game by forcing a draw with a precise ${pieceName} move?`,
      `Find the defensive miracle! Can you force a stalemate using your ${pieceName}?`,
      `My attack is too strong, but you can escape with a draw. Can you play the saving ${pieceName} move?`
    ];
    return drawTemplates[templateIdx % drawTemplates.length];
  }

  // --- 13. FALLBACK / GENERAL TACTICS ---
  // If we captured something, mention it even if it's general
  if (capturedPieceName) {
    const generalCaptureTemplates = [
      `There's a target on the board! Can you capture my ${capturedPieceName} with your ${pieceName}${supportPhrase}?`,
      `Look for a winning capture! Can you take my ${capturedPieceName} using your ${pieceName}${supportPhrase}?`,
      `Can you play a tactical capture? Win my ${capturedPieceName} with your ${pieceName}${supportPhrase}.`,
      `I've left my ${capturedPieceName} vulnerable. Can you capture it with your ${pieceName}${supportPhrase}?`,
      `Win material! Can you take my ${capturedPieceName} with your ${pieceName}${supportPhrase}?`
    ];
    return generalCaptureTemplates[templateIdx % generalCaptureTemplates.length];
  }

  // Generic tactics templates
  const genericTemplates = [
    `Can you find the best tactical move for your ${pieceName} in this position${supportPhrase}?`,
    `What is the most powerful move you can make with your ${pieceName} here${supportPhrase}?`,
    `Look for a strong tactical shot! Can you find the winning move with your ${pieceName}${supportPhrase}?`,
    `How can you improve your position or win material? Play the best move with your ${pieceName}${supportPhrase}.`,
    `Can you find the key move that solves this puzzle using your ${pieceName}${supportPhrase}?`
  ];
  return genericTemplates[templateIdx % genericTemplates.length];
}

// Main Execution
try {
  console.log("Reading puzzles from:", PUZZLES_PATH);
  const data = JSON.parse(readFileSync(PUZZLES_PATH, "utf-8"));
  console.log(`Loaded ${data.puzzles.length} puzzles.`);

  let updatedCount = 0;
  for (const puzzle of data.puzzles) {
    const q = generateQuestion(puzzle);
    puzzle.question = q;
    updatedCount++;
  }

  writeFileSync(PUZZLES_PATH, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\nSuccessfully updated all ${updatedCount} puzzles in puzzles.json with conversational questions containing support pieces.`);
} catch (err) {
  console.error("Error executing scripts/generate-questions.mjs:", err);
  process.exit(1);
}
