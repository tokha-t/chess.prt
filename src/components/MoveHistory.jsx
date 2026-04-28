import { useMemo, useState } from "react";
import { formatMoveHistory } from "../lib/chessEngine.js";
import MoveEvaluationBadge from "./MoveEvaluationBadge.jsx";

export default function MoveHistory({ moves, evaluations = [], playerColor = null }) {
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [filter, setFilter] = useState("all");
  const pairs = formatMoveHistory(moves);
  const evaluationByPly = useMemo(() => {
    return new Map(evaluations.map((evaluation, index) => [evaluation.ply ?? index + 1, evaluation]));
  }, [evaluations]);
  const filteredPairs = useMemo(() => {
    const pairsWithEvaluations = pairs.map((pair) => ({
      ...pair,
      whiteEvaluation: evaluationByPly.get((pair.number - 1) * 2 + 1),
      blackEvaluation: evaluationByPly.get((pair.number - 1) * 2 + 2),
    }));

    if (filter === "all") return pairsWithEvaluations;
    return pairs
      .map((pair) => ({
        ...pair,
        whiteEvaluation: evaluationByPly.get((pair.number - 1) * 2 + 1),
        blackEvaluation: evaluationByPly.get((pair.number - 1) * 2 + 2),
      }))
      .filter((pair) => {
        const rowEvaluations = [pair.whiteEvaluation, pair.blackEvaluation].filter(Boolean);
        if (filter === "mine") return rowEvaluations.some((evaluation) => evaluation.color === playerColor);
        return rowEvaluations.some(
          (evaluation) => evaluation.classification === "mistake" || evaluation.classification === "blunder"
        );
      });
  }, [evaluationByPly, filter, pairs, playerColor]);

  return (
    <section className="panel move-history">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notation</p>
          <h2>Move history</h2>
        </div>
        <span>{moves.length} plies</span>
      </div>

      {evaluations.length ? (
        <div className="move-filter-row">
          <button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>
            All
          </button>
          {playerColor ? (
            <button className={filter === "mine" ? "active" : ""} type="button" onClick={() => setFilter("mine")}>
              My moves
            </button>
          ) : null}
          <button
            className={filter === "mistakes" ? "active" : ""}
            type="button"
            onClick={() => setFilter("mistakes")}
          >
            Mistakes
          </button>
        </div>
      ) : null}

      {filteredPairs.length ? (
        <ol className="move-list">
          {filteredPairs.map((pair) => (
            <li key={pair.number}>
              <span className="move-number">{pair.number}.</span>
              <MoveCell
                move={pair.white}
                evaluation={pair.whiteEvaluation}
                onSelect={setSelectedEvaluation}
              />
              <MoveCell
                move={pair.black}
                evaluation={pair.blackEvaluation}
                onSelect={setSelectedEvaluation}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">No moves yet. Make the first move.</p>
      )}

      {selectedEvaluation ? (
        <div className={`move-explanation-card ${selectedEvaluation.colorCode}`}>
          <div>
            <strong>{selectedEvaluation.san}</strong>
            <MoveEvaluationBadge evaluation={selectedEvaluation} />
          </div>
          <p>{selectedEvaluation.explanation}</p>
          <small>{selectedEvaluation.principle}</small>
        </div>
      ) : null}
    </section>
  );
}

function MoveCell({ move, evaluation, onSelect }) {
  if (!move) return <span />;

  return (
    <button className="move-cell" type="button" onClick={() => evaluation && onSelect(evaluation)}>
      <span>{move.san}</span>
      <MoveEvaluationBadge evaluation={evaluation} />
    </button>
  );
}
