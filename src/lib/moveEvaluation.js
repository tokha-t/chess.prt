import { Chess } from "chess.js";

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const CLASSIFICATION_META = {
  excellent: {
    label: "Excellent",
    colorCode: "green",
    explanation: "This move creates a clear advantage or finds a forcing idea.",
  },
  good: {
    label: "Good",
    colorCode: "green",
    explanation: "This move improves your position or keeps your advantage stable.",
  },
  neutral: {
    label: "Neutral",
    colorCode: "gray",
    explanation: "This move is playable, but it does not change the position much.",
  },
  inaccuracy: {
    label: "Inaccuracy",
    colorCode: "yellow",
    explanation: "This move gives up a little comfort or misses a cleaner plan.",
  },
  mistake: {
    label: "Mistake",
    colorCode: "red",
    explanation: "This move gives the opponent a real practical chance.",
  },
  blunder: {
    label: "Blunder",
    colorCode: "red",
    explanation: "This move loses major value or allows a decisive tactic.",
  },
};

export function evaluateMaterial(game) {
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] ?? 0;
      score += piece.color === "w" ? value : -value;
    }
  }
  return score;
}

export function evaluatePosition(game, color) {
  if (game.isCheckmate()) {
    return game.turn() === color ? -100000 : 100000;
  }
  if (game.isDraw()) return 0;

  const material = evaluateMaterial(game);
  let score = color === "w" ? material : -material;

  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const square = piece.square;
      if (!square) continue;
      const file = square.charCodeAt(0);
      const rank = Number(square[1]);
      const centralFile = file >= 99 && file <= 102;
      const centralRank = rank >= 3 && rank <= 6;
      if (piece.color === color && centralFile && centralRank) score += 8;
      if (piece.color !== color && centralFile && centralRank) score -= 8;
    }
  }

  if (game.isCheck()) {
    score += game.turn() === color ? -45 : 45;
  }

  return score;
}

export function classifyMove({ beforeFen, afterFen, move, moveNumber, playerColor }) {
  const color = playerColor === "white" || playerColor === "w" ? "w" : "b";
  const before = new Chess(beforeFen);
  const after = new Chess(afterFen);
  const scoreBefore = evaluatePosition(before, color);
  const scoreAfter = evaluatePosition(after, color);
  const heuristic = scoreMoveHeuristics({ before, after, move, moveNumber, color });
  const delta = scoreAfter - scoreBefore + heuristic.score;
  const classification = classifyDelta(delta);
  const meta = CLASSIFICATION_META[classification];

  return {
    moveNumber,
    color: color === "w" ? "white" : "black",
    san: move.san,
    from: move.from,
    to: move.to,
    beforeFen,
    afterFen,
    scoreBefore,
    scoreAfter,
    delta,
    classification,
    label: meta.label,
    colorCode: meta.colorCode,
    explanation: heuristic.explanation || meta.explanation,
    principle: heuristic.principle || getPrinciple(classification),
  };
}

export function evaluateMoveSequence(history = []) {
  const game = new Chess();
  const evaluations = [];

  for (const move of history) {
    const beforeFen = game.fen();
    const madeMove = game.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
    if (!madeMove) continue;
    const ply = game.history().length;
    evaluations.push({
      ...classifyMove({
        beforeFen,
        afterFen: game.fen(),
        move: madeMove,
        moveNumber: Math.ceil(game.history().length / 2),
        playerColor: madeMove.color === "w" ? "white" : "black",
      }),
      ply,
    });
  }

  return evaluations;
}

export function calculateAccuracy(moveEvaluations = [], playerColor = null) {
  const filtered = playerColor
    ? moveEvaluations.filter((evaluation) => evaluation.color === playerColor)
    : moveEvaluations;
  if (!filtered.length) return 100;

  const penalties = {
    excellent: 0,
    good: 0,
    neutral: 1,
    inaccuracy: 3,
    mistake: 8,
    blunder: 15,
  };

  const score = filtered.reduce((total, evaluation) => total - (penalties[evaluation.classification] ?? 1), 100);
  return clamp(Math.round(score), 0, 100);
}

export function summarizeMoveQuality(moveEvaluations = [], playerColor = null) {
  const filtered = playerColor
    ? moveEvaluations.filter((evaluation) => evaluation.color === playerColor)
    : moveEvaluations;
  return filtered.reduce(
    (summary, evaluation) => {
      summary[evaluation.classification] += 1;
      if (evaluation.classification === "excellent" || evaluation.classification === "good") {
        summary.goodMoves += 1;
      }
      if (evaluation.classification === "mistake" || evaluation.classification === "blunder") {
        summary.badMoves += 1;
      }
      return summary;
    },
    { excellent: 0, good: 0, neutral: 0, inaccuracy: 0, mistake: 0, blunder: 0, goodMoves: 0, badMoves: 0 }
  );
}

export function getMoveColor(classification) {
  return CLASSIFICATION_META[classification]?.colorCode ?? "gray";
}

export function getMoveLabel(classification) {
  return CLASSIFICATION_META[classification]?.label ?? "Move";
}

function scoreMoveHeuristics({ after, move, moveNumber, color }) {
  let score = 0;
  let explanation = "";
  let principle = "";
  const pieceValue = PIECE_VALUES[move.piece] ?? 0;

  if (after.isCheckmate()) {
    return {
      score: 100000,
      explanation: "This move delivers checkmate.",
      principle: "When you can end the game, forcing moves matter most.",
    };
  }

  if (move.captured) {
    const capturedValue = PIECE_VALUES[move.captured] ?? 0;
    score += capturedValue * 0.35;
    if (capturedValue >= pieceValue + 180) {
      explanation = "You won material by capturing a more valuable piece.";
      principle = "Look for captures that win more than they risk.";
    }
  }

  if (move.san.includes("+")) {
    score += 35;
    explanation ||= "This move gives check and forces your opponent to respond.";
    principle ||= "Checks are forcing moves; always consider them.";
  }

  if (move.san === "O-O" || move.san === "O-O-O") {
    score += moveNumber <= 10 ? 110 : 45;
    explanation = moveNumber <= 10 ? "You castled early and improved king safety." : "Castling makes your king safer.";
    principle = "A safe king lets the rest of your pieces play with confidence.";
  }

  if ((move.piece === "n" || move.piece === "b") && moveNumber <= 8 && isDevelopingMove(move)) {
    score += 35;
    explanation ||= "You developed a minor piece toward the center.";
    principle ||= "Develop knights and bishops before launching an attack.";
  }

  if (move.piece === "p" && moveNumber <= 6 && ["d4", "e4", "d5", "e5", "c4", "c5"].includes(move.to)) {
    score += 35;
    explanation ||= "This move fights for central space.";
    principle ||= "Strong opening moves usually claim the center and free your pieces.";
  }

  if (move.piece === "q" && moveNumber <= 6 && !move.captured && !move.san.includes("+")) {
    score -= 70;
    explanation = "The queen came out early without a forcing reason.";
    principle = "Develop minor pieces and castle before repeated queen moves.";
  }

  const hangingPenalty = estimateHangingPiecePenalty(after, move, color);
  if (hangingPenalty > 0) {
    score -= hangingPenalty;
    explanation = hangingPenalty >= 220 ? "The moved piece can be captured too easily." : explanation;
    principle = "Before releasing a piece, check what your opponent can capture next.";
  }

  return { score, explanation, principle };
}

function estimateHangingPiecePenalty(game, move, color) {
  const movedPiece = game.get(move.to);
  if (!movedPiece || movedPiece.color !== color) return 0;
  const movedPieceValue = PIECE_VALUES[movedPiece.type] ?? 0;
  if (movedPieceValue <= 100) return 0;

  const opponentCaptures = game
    .moves({ verbose: true })
    .filter((candidate) => candidate.to === move.to && candidate.captured === movedPiece.type);
  if (!opponentCaptures.length) return 0;

  const cheapestAttacker = Math.min(...opponentCaptures.map((candidate) => PIECE_VALUES[candidate.piece] ?? 0));
  const tradeLoss = movedPieceValue - cheapestAttacker;
  return tradeLoss > 120 ? Math.min(360, tradeLoss * 0.85) : 0;
}

function isDevelopingMove(move) {
  const backRank = move.color === "w" ? "1" : "8";
  return move.from.endsWith(backRank) && !move.to.endsWith(backRank);
}

function classifyDelta(delta) {
  if (delta >= 150) return "excellent";
  if (delta >= 30) return "good";
  if (delta > -50) return "neutral";
  if (delta > -150) return "inaccuracy";
  if (delta > -300) return "mistake";
  return "blunder";
}

function getPrinciple(classification) {
  if (classification === "excellent" || classification === "good") {
    return "Keep asking what your move improves: king safety, activity, material, or threats.";
  }
  if (classification === "inaccuracy") {
    return "When a move feels quiet, compare it with checks, captures, and developing moves.";
  }
  if (classification === "mistake" || classification === "blunder") {
    return "Before every move, scan what your opponent can capture immediately.";
  }
  return "A neutral move is fine, but look for a plan that improves your worst piece.";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
