import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getUserGames } from "../lib/database.js";

export default function History() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getUserGames(user.id)
      .then((nextGames) => {
        if (mounted) setGames(nextGames);
      })
      .catch((nextError) => setError(nextError.message))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <main className="page">
      <section className="page-heading">
        <p className="eyebrow">Game history</p>
        <h1>Saved games</h1>
        <p className="muted">Every finished authenticated game becomes a reviewable learning record.</p>
      </section>

      {loading ? <p>Loading games...</p> : null}
      {error ? <div className="notice error">{error}</div> : null}

      {!loading && !games.length ? (
        <section className="panel empty-panel">
          <h2>No games yet.</h2>
          <p className="muted">Play your first logged-in game to save and review it here.</p>
          <Link className="button primary" to="/play">
            Play now
          </Link>
        </section>
      ) : null}

      <div className="history-list">
        {games.map((game) => (
          <Link className="history-item large" key={game.id} to={`/review/${game.id}`}>
            <span>{new Date(game.created_at).toLocaleDateString()}</span>
            <strong>{game.result}</strong>
            <span>{game.opponent_type}</span>
            <span>{game.move_history?.length ?? 0} plies</span>
            <span>{game.accuracy ?? "-"}% accuracy</span>
            <span>+{game.xp_earned ?? game.report?.xpEarned ?? 0} XP</span>
            <em>View Review</em>
          </Link>
        ))}
      </div>
    </main>
  );
}
