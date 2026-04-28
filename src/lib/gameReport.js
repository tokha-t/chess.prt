import { calculateAccuracy, summarizeMoveQuality } from "./moveEvaluation.js";
import { calculateGameXp } from "./xpSystem.js";

export function generateShareId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export function generateGameReport({
  username = "Chess learner",
  result = "unfinished",
  opponentType = "ai_medium",
  userColor = "white",
  history = [],
  moveEvaluations = [],
  review = null,
  createdAt = new Date().toISOString(),
} = {}) {
  const userEvaluations = moveEvaluations.filter((evaluation) => evaluation.color === userColor);
  const quality = summarizeMoveQuality(moveEvaluations, userColor);
  const accuracy = calculateAccuracy(moveEvaluations, userColor);
  const bestMove = pickBestMove(userEvaluations);
  const worstMove = pickWorstMove(userEvaluations);
  const mainWeakness = chooseMainWeakness({ review, userEvaluations });
  const coachTip = chooseCoachTip(mainWeakness);
  const xpEarned = calculateGameXp({ result, accuracy });

  return {
    username,
    date: createdAt,
    result,
    opponentType,
    userColor,
    accuracy,
    totalMoves: Math.ceil(history.length / 2),
    totalPlies: history.length,
    goodMovesCount: quality.goodMoves,
    badMovesCount: quality.badMoves,
    bestMove: bestMove?.san ?? "No standout move yet",
    worstMove: worstMove?.san ?? "No major mistake found",
    mainWeakness,
    coachTip,
    xpEarned,
    shareId: generateShareId(),
    qualityBreakdown: quality,
  };
}

export function normalizeStoredReport(game) {
  if (game?.report) return game.report;
  return {
    username: "Chess learner",
    date: game?.created_at ?? new Date().toISOString(),
    result: game?.result ?? "unfinished",
    opponentType: game?.opponent_type ?? "unknown",
    userColor: game?.user_color ?? "white",
    accuracy: game?.accuracy ?? 0,
    totalMoves: Math.ceil((game?.move_history?.length ?? 0) / 2),
    totalPlies: game?.move_history?.length ?? 0,
    goodMovesCount: game?.good_moves_count ?? 0,
    badMovesCount: game?.bad_moves_count ?? 0,
    bestMove: "Open the move list to review highlights",
    worstMove: game?.mistakes?.[0]?.type ?? "No major mistake found",
    mainWeakness: game?.mistakes?.[0]?.type ?? "Consistency",
    coachTip: game?.mistakes?.[0]?.tip ?? "Review one move at a time and ask what changed.",
    xpEarned: game?.xp_earned ?? 0,
    shareId: game?.share_id ?? game?.report?.shareId ?? null,
    qualityBreakdown: summarizeMoveQuality(game?.move_evaluations ?? [], game?.user_color),
  };
}

export function formatReportSummary(report) {
  return [
    "ChessMentor AI Game Report",
    `Player: ${report.username}`,
    `Result: ${capitalize(report.result)}`,
    `Accuracy: ${report.accuracy}%`,
    `Moves: ${report.totalMoves}`,
    `Good Moves: ${report.goodMovesCount}`,
    `Mistakes: ${report.badMovesCount}`,
    `Main Weakness: ${report.mainWeakness}`,
    `Coach Tip: ${report.coachTip}`,
    `XP Earned: +${report.xpEarned}`,
  ].join("\n");
}

export function buildShareUrl(shareId) {
  if (!shareId || typeof window === "undefined") return "";
  return `${window.location.origin}/share/${shareId}`;
}

function pickBestMove(evaluations) {
  return (
    evaluations.find((evaluation) => evaluation.classification === "excellent") ||
    evaluations.find((evaluation) => evaluation.classification === "good") ||
    null
  );
}

function pickWorstMove(evaluations) {
  return (
    evaluations.find((evaluation) => evaluation.classification === "blunder") ||
    evaluations.find((evaluation) => evaluation.classification === "mistake") ||
    evaluations.find((evaluation) => evaluation.classification === "inaccuracy") ||
    null
  );
}

function chooseMainWeakness({ review, userEvaluations }) {
  const reviewType = review?.mistakes?.[0]?.type;
  if (reviewType?.includes("King") || reviewType?.includes("Mate")) return "King Safety";
  if (reviewType?.includes("Queen") || reviewType?.includes("Material")) return "Blunder Control";
  if (reviewType?.includes("Development")) return "Opening Discipline";

  const earlyQueenIssues = userEvaluations.filter(
    (evaluation) =>
      evaluation.san?.startsWith("Q") &&
      (evaluation.classification === "inaccuracy" ||
        evaluation.classification === "mistake" ||
        evaluation.classification === "blunder")
  ).length;
  if (earlyQueenIssues >= 1) return "Opening Discipline";

  const tacticalIssues = userEvaluations.filter(
    (evaluation) => evaluation.classification === "mistake" || evaluation.classification === "blunder"
  ).length;
  if (tacticalIssues >= 2) return "Tactics";

  return "Consistency";
}

function chooseCoachTip(mainWeakness) {
  const tips = {
    "King Safety": "Try to castle earlier and avoid leaving your king in the center.",
    "Blunder Control": "Before every move, check what your opponent can capture.",
    "Opening Discipline": "Develop knights and bishops before launching an early queen attack.",
    Tactics: "Look for checks, captures, and threats before choosing a move.",
    Consistency: "Your play was stable. Focus on reducing small inaccuracies.",
  };
  return tips[mainWeakness] ?? tips.Consistency;
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}
