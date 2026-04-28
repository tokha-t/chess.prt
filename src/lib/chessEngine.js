import { Chess } from "chess.js";

export function createGame() {
  return new Chess();
}

export function getGameStatus(game) {
  const turnColor = game.turn() === "w" ? "white" : "black";
  const status = {
    label: "Active",
    message: `${capitalize(turnColor)} to move`,
    turnColor,
    isCheck: false,
    isGameOver: false,
    winner: null,
    result: "unfinished",
  };

  if (game.isCheckmate()) {
    const winner = turnColor === "white" ? "black" : "white";
    return {
      ...status,
      label: "Checkmate",
      message: `${capitalize(winner)} wins by checkmate`,
      isCheck: true,
      isGameOver: true,
      winner,
      result: "checkmate",
    };
  }

  if (game.isStalemate()) {
    return {
      ...status,
      label: "Draw",
      message: "Draw by stalemate",
      isGameOver: true,
      result: "draw",
    };
  }

  if (typeof game.isInsufficientMaterial === "function" && game.isInsufficientMaterial()) {
    return {
      ...status,
      label: "Draw",
      message: "Draw by insufficient material",
      isGameOver: true,
      result: "draw",
    };
  }

  if (typeof game.isThreefoldRepetition === "function" && game.isThreefoldRepetition()) {
    return {
      ...status,
      label: "Draw",
      message: "Draw by threefold repetition",
      isGameOver: true,
      result: "draw",
    };
  }

  if (game.isDraw()) {
    return {
      ...status,
      label: "Draw",
      message: "Draw by chess rules",
      isGameOver: true,
      result: "draw",
    };
  }

  if (game.isCheck()) {
    return {
      ...status,
      label: "Check",
      message: `${capitalize(turnColor)} is in check`,
      isCheck: true,
    };
  }

  return status;
}

export function getUserResult(status, userColor, resignedColor = null) {
  if (resignedColor) {
    if (resignedColor === userColor) return "resigned";
    return "win";
  }

  if (status.result === "draw") return "draw";
  if (!status.winner) return "unfinished";
  return status.winner === userColor ? "win" : "loss";
}

export function formatMoveHistory(history) {
  const pairs = [];
  for (let index = 0; index < history.length; index += 2) {
    pairs.push({
      number: Math.floor(index / 2) + 1,
      white: history[index],
      black: history[index + 1],
    });
  }
  return pairs;
}

export function findKingSquare(game, color) {
  const board = game.board();
  for (let rank = 0; rank < board.length; rank += 1) {
    for (let file = 0; file < board[rank].length; file += 1) {
      const piece = board[rank][file];
      if (piece?.type === "k" && piece.color === color[0]) {
        return `${"abcdefgh"[file]}${8 - rank}`;
      }
    }
  }
  return null;
}

export function serializeMove(move) {
  return {
    color: move.color,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured ?? null,
    promotion: move.promotion ?? null,
    san: move.san,
    flags: move.flags,
  };
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
