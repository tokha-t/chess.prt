import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ChessBoard from "../components/ChessBoard.jsx";
import GameReview from "../components/GameReview.jsx";
import MoveHistory from "../components/MoveHistory.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getGameById } from "../lib/database.js";

export default function Review() {
  const { id } = useParams();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getGameById(id, user.id)
      .then((nextGame) => {
        if (mounted) setGame(nextGame);
      })
      .catch((nextError) => setError(nextError.message))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, user]);

  if (loading) return <main className="page">Loading review...</main>;

  if (error || !game) {
    return (
      <main className="page">
        <section className="panel empty-panel">
          <h1>Review not found</h1>
          <p className="muted">{error || "This game does not exist or belongs to another user."}</p>
          <Link className="button primary" to="/history">
            Back to history
          </Link>
        </section>
      </main>
    );
  }

  const review = {
    accuracy: game.accuracy ?? 0,
    mistakes: game.mistakes ?? [],
    practiceArea: game.mistakes?.[0]?.type ?? "Tactical awareness",
    summary: `${game.result} against ${game.opponent_type}. Accuracy estimate: ${game.accuracy ?? "-"}%.`,
  };

  return (
    <main className="page review-page">
      <section className="page-heading">
        <p className="eyebrow">Game review</p>
        <h1>{game.result} vs {game.opponent_type}</h1>
        <p className="muted">{new Date(game.created_at).toLocaleString()}</p>
      </section>

      <section className="review-layout">
        <div className="board-column">
          <ChessBoard fen={game.final_fen} orientation={game.user_color || "white"} squareStyles={{}} disabled />
        </div>
        <aside className="side-column">
          <GameReview review={review} />
          <MoveHistory moves={game.move_history ?? []} />
          <Link className="button primary full" to="/play">
            Play Again
          </Link>
        </aside>
      </section>
    </main>
  );
}
