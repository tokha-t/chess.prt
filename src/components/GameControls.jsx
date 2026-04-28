export default function GameControls({
  mode,
  setMode,
  difficulty,
  setDifficulty,
  playerColor,
  setPlayerColor,
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
          <select value={playerColor} onChange={(event) => setPlayerColor(event.target.value)} disabled={mode !== "ai"}>
            <option value="white">Play as White</option>
            <option value="black">Play as Black</option>
          </select>
        </label>
      </div>

      <div className="button-row">
        <button className="button primary" type="button" onClick={onNewGame}>
          New Game
        </button>
        <button className="button" type="button" onClick={onUndo} disabled={disabled}>
          Undo
        </button>
        <button className="button danger" type="button" onClick={onResign} disabled={disabled}>
          Resign
        </button>
      </div>
    </section>
  );
}
