import { formatMoveHistory } from "../lib/chessEngine.js";

export default function MoveHistory({ moves }) {
  const pairs = formatMoveHistory(moves);

  return (
    <section className="panel move-history">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notation</p>
          <h2>Move history</h2>
        </div>
        <span>{moves.length} plies</span>
      </div>

      {pairs.length ? (
        <ol className="move-list">
          {pairs.map((pair) => (
            <li key={pair.number}>
              <span className="move-number">{pair.number}.</span>
              <span>{pair.white?.san || ""}</span>
              <span>{pair.black?.san || ""}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">No moves yet. Make the first move.</p>
      )}
    </section>
  );
}
