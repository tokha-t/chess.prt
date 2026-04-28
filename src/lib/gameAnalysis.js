import { calculateAccuracy } from "./moveEvaluation.js";

const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function analyzeGame({ history = [], status, playerColor = "white", moveEvaluations = [] }) {
  const player = playerColor === "white" ? "w" : "b";
  const mistakes = [];
  const playerMoves = history.filter((move) => move.color === player);
  const opponentMoves = history.filter((move) => move.color !== player);
  const capturedByPlayer = playerMoves.reduce((sum, move) => sum + (PIECE_VALUES[move.captured] ?? 0), 0);
  const capturedByOpponent = opponentMoves.reduce((sum, move) => sum + (PIECE_VALUES[move.captured] ?? 0), 0);

  if (opponentMoves.some((move) => move.captured === "q")) {
    mistakes.push({
      type: "Queen safety",
      severity: 18,
      explanation: "Your queen was captured or left exposed to a simple tactic.",
      tip: "Before every queen move, ask what piece can attack it next.",
    });
  }

  const castled = playerMoves.some((move) => move.san === "O-O" || move.san === "O-O-O");
  if (!castled && history.length >= 20) {
    mistakes.push({
      type: "King safety",
      severity: 14,
      explanation: "Your king stayed in the center deep into the game.",
      tip: "Try to castle in the first 8-10 moves unless there is a concrete tactic.",
    });
  }

  const openingMoves = playerMoves.slice(0, 6);
  const pieceCounts = openingMoves.reduce((counts, move) => {
    counts[move.piece] = (counts[move.piece] || 0) + 1;
    return counts;
  }, {});
  if (Object.values(pieceCounts).some((count) => count >= 4)) {
    mistakes.push({
      type: "Development",
      severity: 12,
      explanation: "One piece moved repeatedly while other pieces stayed undeveloped.",
      tip: "In the opening, develop knights and bishops before launching attacks.",
    });
  }

  if (capturedByOpponent - capturedByPlayer >= 3) {
    mistakes.push({
      type: "Material loss",
      severity: 16,
      explanation: "Your material balance dropped by at least a minor piece.",
      tip: "After choosing a move, quickly check every capture your opponent gets.",
    });
  }

  if (status?.result === "checkmate" && status.winner !== playerColor) {
    mistakes.push({
      type: "Mate threat",
      severity: 20,
      explanation: "A direct mating threat was missed near your king.",
      tip: "When your king is exposed, look for opponent checks before your own ideas.",
    });
  }

  if (!mistakes.length) {
    mistakes.push({
      type: "Good foundation",
      severity: 6,
      explanation: "No major beginner-pattern mistake stood out in this game.",
      tip: "Next, review one moment where you had a capture and compare alternatives.",
    });
  }

  const topMistakes = mistakes.slice(0, 3);
  const accuracy = moveEvaluations.length
    ? calculateAccuracy(moveEvaluations, playerColor)
    : clamp(100 - topMistakes.reduce((sum, mistake) => sum + mistake.severity, 0), 0, 100);
  const practiceArea = pickPracticeArea(topMistakes);

  return {
    accuracy,
    mistakes: topMistakes,
    practiceArea,
    summary: buildSummary(status, accuracy, practiceArea),
  };
}

export function estimateSkillProfile(games = []) {
  const base = {
    Opening: 68,
    Tactics: 64,
    Endgame: 58,
    "King Safety": 66,
    "Blunder Control": 62,
  };

  for (const game of games) {
    const mistakes = game.mistakes || [];
    for (const mistake of mistakes) {
      if (mistake.type === "King safety" || mistake.type === "Mate threat") base["King Safety"] -= 5;
      if (mistake.type === "Material loss" || mistake.type === "Queen safety") base["Blunder Control"] -= 5;
      if (mistake.type === "Development") base.Opening -= 5;
    }
    if (typeof game.accuracy === "number") {
      base.Tactics += Math.round((game.accuracy - 65) / 10);
      base.Endgame += game.result === "win" ? 2 : 0;
    }
  }

  return Object.entries(base).map(([name, value]) => ({
    name,
    value: clamp(value, 20, 95),
  }));
}

function pickPracticeArea(mistakes) {
  if (mistakes.some((mistake) => mistake.type.includes("King") || mistake.type.includes("Mate"))) return "King safety";
  if (mistakes.some((mistake) => mistake.type.includes("Material") || mistake.type.includes("Queen"))) return "Blunder control";
  if (mistakes.some((mistake) => mistake.type.includes("Development"))) return "Opening development";
  return "Tactical awareness";
}

function buildSummary(status, accuracy, practiceArea) {
  if (status?.result === "draw") return `Solid draw. Estimated accuracy: ${accuracy}%. Next focus: ${practiceArea}.`;
  if (status?.winner) return `${status.winner === "white" ? "White" : "Black"} won. Estimated accuracy: ${accuracy}%. Next focus: ${practiceArea}.`;
  return `Game review ready. Estimated accuracy: ${accuracy}%. Next focus: ${practiceArea}.`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
