import { Chess, Move, Square } from "chess.js";

import {
  BoardCell,
  ChessMove,
  ChessRulesEngine,
  GameSnapshot,
  MoveIntent,
  PieceKind,
  SquareName,
} from "./types";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const squares: SquareName[] = files.flatMap((file) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((rank) => `${file}${rank}` as SquareName),
);

function toChessMove(move: Move, before: string): ChessMove {
  return {
    from: move.from as SquareName,
    to: move.to as SquareName,
    san: move.san,
    lan: `${move.from}${move.to}${move.promotion ?? ""}`,
    color: move.color,
    piece: move.piece as PieceKind,
    captured: move.captured as PieceKind | undefined,
    promotion: move.promotion as PieceKind | undefined,
    before,
    after: move.after,
  };
}

function emptyCaptured() {
  return { white: [] as PieceKind[], black: [] as PieceKind[] };
}

export class ChessJsRulesEngine implements ChessRulesEngine {
  private chess = new Chess();
  private id = `local-${Date.now()}`;
  private moves: ChessMove[] = [];
  private captured = emptyCaptured();

  newGame(fen?: string): GameSnapshot {
    this.chess = fen ? new Chess(fen) : new Chess();
    this.id = `local-${Date.now()}`;
    this.moves = [];
    this.captured = emptyCaptured();
    return this.snapshot();
  }

  snapshot(): GameSnapshot {
    return {
      id: this.id,
      fen: this.chess.fen(),
      board: this.boardCells(),
      legalMoves: this.legalMoveMap(),
      history: [...this.moves],
      status: {
        turn: this.chess.turn(),
        isCheck: this.chess.isCheck(),
        isCheckmate: this.chess.isCheckmate(),
        isDraw: this.chess.isDraw(),
        isStalemate: this.chess.isStalemate(),
        isGameOver: this.chess.isGameOver(),
        resultText: this.resultText(),
      },
      captured: {
        white: [...this.captured.white],
        black: [...this.captured.black],
      },
    };
  }

  legalTargets(square: SquareName): SquareName[] {
    return this.chess
      .moves({ square: square as Square, verbose: true })
      .map((move) => move.to as SquareName);
  }

  move(intent: MoveIntent): ChessMove | null {
    const before = this.chess.fen();
    try {
      const move = this.chess.move({
        from: intent.from,
        to: intent.to,
        promotion: intent.promotion ?? "q",
      });
      if (!move) return null;
      const normalized = toChessMove(move, before);
      this.moves.push(normalized);
      if (normalized.captured) {
        const bucket = normalized.color === "w" ? this.captured.white : this.captured.black;
        bucket.push(normalized.captured);
      }
      return normalized;
    } catch {
      return null;
    }
  }

  undo(): ChessMove | null {
    const undone = this.chess.undo();
    const move = this.moves.pop() ?? null;
    if (move?.captured) {
      const bucket = move.color === "w" ? this.captured.white : this.captured.black;
      bucket.pop();
    }
    return undone && move ? move : null;
  }

  loadFen(fen: string): GameSnapshot {
    this.chess = new Chess(fen);
    this.moves = [];
    this.captured = emptyCaptured();
    return this.snapshot();
  }

  private boardCells(): BoardCell[] {
    return squares.map((square) => {
      const piece = this.chess.get(square as Square);
      return {
        square,
        piece: piece ? { color: piece.color, kind: piece.type as PieceKind } : null,
      };
    });
  }

  private legalMoveMap(): Record<SquareName, SquareName[]> {
    return squares.reduce(
      (map, square) => {
        map[square] = this.legalTargets(square);
        return map;
      },
      {} as Record<SquareName, SquareName[]>,
    );
  }

  private resultText(): string {
    if (this.chess.isCheckmate()) return `${this.chess.turn() === "w" ? "Black" : "White"} wins by checkmate`;
    if (this.chess.isStalemate()) return "Draw by stalemate";
    if (this.chess.isDraw()) return "Draw";
    if (this.chess.isCheck()) return `${this.chess.turn() === "w" ? "White" : "Black"} to move, in check`;
    return `${this.chess.turn() === "w" ? "White" : "Black"} to move`;
  }
}

export function createChessEngine(fen?: string): ChessRulesEngine {
  const engine = new ChessJsRulesEngine();
  return engine.newGame(fen), engine;
}
