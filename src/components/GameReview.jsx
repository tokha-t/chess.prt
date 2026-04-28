import MistakeCard from "./MistakeCard.jsx";
import MoveQualitySummary from "./MoveQualitySummary.jsx";

export default function GameReview({ review, moveEvaluations = [], playerColor = null, onPlayAgain }) {
  if (!review) {
    return (
      <section className="panel review-panel">
        <p className="eyebrow">Smart Coach</p>
        <h2>Post-game review appears here</h2>
        <p className="muted">Finish a game to receive simple, rule-based feedback written for beginners.</p>
      </section>
    );
  }

  return (
    <section className="panel review-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Rule-based AI Coach</p>
          <h2>Game Review</h2>
        </div>
        <strong className="accuracy">{review.accuracy}%</strong>
      </div>
      <p className="muted">{review.summary}</p>
      <MoveQualitySummary evaluations={moveEvaluations} playerColor={playerColor} />
      <div className="mistake-grid">
        {review.mistakes.map((mistake) => (
          <MistakeCard key={mistake.type} mistake={mistake} />
        ))}
      </div>
      <div className="practice-chip">Suggested practice: {review.practiceArea}</div>
      {onPlayAgain ? (
        <button className="button primary full" type="button" onClick={onPlayAgain}>
          Play Again
        </button>
      ) : null}
    </section>
  );
}
