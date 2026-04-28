import { Chess } from "chess.js";

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

export function selectAiMove(game, difficulty = "medium") {
  const legalMoves = game.moves({ verbose: true });
  if (!legalMoves.length) return null;

  if (difficulty === "easy") {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  if (difficulty === "medium") {
    return selectGreedyMove(game, legalMoves);
  }

  return selectMinimaxMove(game, legalMoves, 3);
}

function selectGreedyMove(game, legalMoves) {
  const aiColor = game.turn();
  const scored = legalMoves.map((move) => {
    const clone = cloneGame(game);
    clone.move(move);
    let score = evaluateBoard(clone, aiColor);
    if (move.captured) score += PIECE_VALUES[move.captured] ?? 0;
    if (move.san.includes("#")) score += 100000;
    if (move.san.includes("+")) score += 35;
    if (move.promotion) score += PIECE_VALUES[move.promotion] ?? 800;
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topBand = scored.filter((item) => item.score >= scored[0].score - 80);
  return topBand[Math.floor(Math.random() * topBand.length)].move;
}

function selectMinimaxMove(game, legalMoves, depth) {
  const aiColor = game.turn();
  let bestMove = legalMoves[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  let alpha = Number.NEGATIVE_INFINITY;
  const orderedMoves = orderMoves(legalMoves);

  for (const move of orderedMoves) {
    const clone = cloneGame(game);
    clone.move(move);
    const score = minimax(clone, depth - 1, alpha, Number.POSITIVE_INFINITY, false, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestScore);
  }

  return bestMove;
}

function minimax(game, depth, alpha, beta, maximizing, aiColor) {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game, aiColor);
  }

  const legalMoves = orderMoves(game.moves({ verbose: true }));

  if (maximizing) {
    let value = Number.NEGATIVE_INFINITY;
    for (const move of legalMoves) {
      const clone = cloneGame(game);
      clone.move(move);
      value = Math.max(value, minimax(clone, depth - 1, alpha, beta, false, aiColor));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Number.POSITIVE_INFINITY;
  for (const move of legalMoves) {
    const clone = cloneGame(game);
    clone.move(move);
    value = Math.min(value, minimax(clone, depth - 1, alpha, beta, true, aiColor));
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
}

function evaluateBoard(game, aiColor) {
  if (game.isCheckmate()) {
    return game.turn() === aiColor ? -100000 : 100000;
  }
  if (game.isDraw()) return 0;

  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] ?? 0;
      score += piece.color === aiColor ? value : -value;
    }
  }

  score += mobilityScore(game, aiColor);
  if (game.isCheck()) score += game.turn() === aiColor ? -25 : 25;
  return score;
}

function mobilityScore(game, aiColor) {
  const currentTurn = game.turn();
  const ownMobility = currentTurn === aiColor ? game.moves().length : 0;
  const clone = cloneGame(game);
  return ownMobility + (clone.turn() !== aiColor ? -clone.moves().length : 0);
}

function orderMoves(moves) {
  return [...moves].sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));
}

function scoreMoveOrder(move) {
  let score = 0;
  if (move.captured) score += 1000 + (PIECE_VALUES[move.captured] ?? 0);
  if (move.promotion) score += PIECE_VALUES[move.promotion] ?? 800;
  if (move.san.includes("#")) score += 100000;
  if (move.san.includes("+")) score += 100;
  return score;
}

function cloneGame(game) {
  return new Chess(game.fen());
}
