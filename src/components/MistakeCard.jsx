export default function MistakeCard({ mistake }) {
  return (
    <article className="mistake-card">
      <div>
        <strong>{mistake.type}</strong>
        <span>-{mistake.severity}</span>
      </div>
      <p>{mistake.explanation}</p>
      <small>{mistake.tip}</small>
    </article>
  );
}
