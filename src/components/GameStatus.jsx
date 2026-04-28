export default function GameStatus({ status, message, saved }) {
  return (
    <section className="panel status-panel">
      <div>
        <p className="eyebrow">Game status</p>
        <h2>{status.label}</h2>
        <p className="muted">{status.message}</p>
      </div>
      <div className={`status-pill ${status.isCheck ? "danger" : ""}`}>{message || status.turnColor}</div>
      {saved ? <p className="success-line">Game saved successfully.</p> : null}
    </section>
  );
}
