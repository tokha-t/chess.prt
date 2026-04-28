import { summarizeMoveQuality } from "../lib/moveEvaluation.js";

const SUMMARY_ITEMS = [
  ["excellent", "Excellent"],
  ["good", "Good"],
  ["neutral", "Neutral"],
  ["inaccuracy", "Inaccuracies"],
  ["mistake", "Mistakes"],
  ["blunder", "Blunders"],
];

export default function MoveQualitySummary({ evaluations = [], playerColor = null }) {
  if (!evaluations.length) return null;
  const summary = summarizeMoveQuality(evaluations, playerColor);

  return (
    <div className="move-quality-grid">
      {SUMMARY_ITEMS.map(([key, label]) => (
        <div className={`quality-chip ${key}`} key={key}>
          <span>{label}</span>
          <strong>{summary[key]}</strong>
        </div>
      ))}
    </div>
  );
}
