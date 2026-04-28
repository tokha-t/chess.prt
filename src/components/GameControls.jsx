export default function GameControls({
  mode,
  setMode,
  difficulty,
  setDifficulty,
  playerColor,
  setPlayerColor,
  timeControl,
  setTimeControl,
  timeControls,
  clocks,
  activeClockColor,
  roomId,
  setRoomId,
  onlineStatus,
  onlineEnabled,
  onNewGame,
  onUndo,
  onResign,
  disabled,
}) {
  return (
    <section className="panel control-panel">
      <div className="control-grid">
        <label className="field">
          <span>Mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="local">Local 2 Player</option>
            <option value="ai">Play vs AI</option>
            <option value="online">Online Room</option>
          </select>
        </label>

        <label className="field">
          <span>Difficulty</span>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} disabled={mode !== "ai"}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className="field">
          <span>Your side</span>
          <select
            value={playerColor}
            onChange={(event) => setPlayerColor(event.target.value)}
            disabled={mode === "local"}
          >
            <option value="white">Play as White</option>
            <option value="black">Play as Black</option>
          </select>
        </label>

        <label className="field">
          <span>Time control</span>
          <select value={timeControl} onChange={(event) => setTimeControl(event.target.value)}>
            {Object.entries(timeControls).map(([value, control]) => (
              <option key={value} value={value}>
                {control.label} · {control.description}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="clock-grid" aria-label="Chess clocks">
        <ClockCard color="white" ms={clocks.white} active={activeClockColor === "white"} />
        <ClockCard color="black" ms={clocks.black} active={activeClockColor === "black"} />
      </div>

      {mode === "online" ? (
        <div className="online-room">
          <label className="field">
            <span>WebSocket room code</span>
            <input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="mentor-room" />
          </label>
          <div className={`status-pill ${onlineStatus === "connected" ? "" : "danger"}`}>
            {onlineEnabled ? `WebSocket: ${onlineStatus}` : "Supabase env required"}
          </div>
          <p className="muted compact">
            Share this room code with another browser. White and Black should choose opposite sides.
          </p>
        </div>
      ) : null}

      <div className="button-row">
        <button className="button primary" type="button" onClick={onNewGame}>
          New Game
        </button>
        <button className="button" type="button" onClick={onUndo} disabled={disabled || mode === "online"}>
          Undo
        </button>
        <button className="button danger" type="button" onClick={onResign} disabled={disabled}>
          Resign
        </button>
      </div>
    </section>
  );
}

function ClockCard({ color, ms, active }) {
  return (
    <div className={`clock-card ${active ? "active" : ""}`}>
      <span>{color}</span>
      <strong>{formatClock(ms)}</strong>
    </div>
  );
}

function formatClock(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
