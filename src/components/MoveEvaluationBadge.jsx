export default function MoveEvaluationBadge({ evaluation }) {
  if (!evaluation) return null;

  return (
    <span className={`move-eval-badge ${evaluation.colorCode}`} title={evaluation.explanation}>
      {evaluation.label}
    </span>
  );
}
