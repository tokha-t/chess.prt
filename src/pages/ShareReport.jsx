import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import GameReportCard from "../components/GameReportCard.jsx";
import { getGameReportByShareId } from "../lib/database.js";

export default function ShareReport() {
  const { shareId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getGameReportByShareId(shareId)
      .then((row) => {
        if (!mounted) return;
        setReport(row?.report ?? normalizeReportRow(row));
      })
      .catch((nextError) => {
        if (mounted) setError(nextError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [shareId]);

  if (loading) return <main className="page narrow-page">Loading shared report...</main>;

  if (error || !report) {
    return (
      <main className="page narrow-page">
        <section className="panel empty-panel">
          <p className="eyebrow">Shared report</p>
          <h1>Report not found</h1>
          <p className="muted">{error || "This report link is missing or unavailable."}</p>
          <Link className="button primary" to="/">
            Back home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page narrow-page">
      <GameReportCard report={report} publicView />
      <Link className="button primary full" to="/play">
        Try ChessMentor AI
      </Link>
    </main>
  );
}

function normalizeReportRow(row) {
  if (!row) return null;
  return {
    username: row.username,
    date: row.created_at,
    result: row.result,
    opponentType: row.opponent_type,
    userColor: row.user_color,
    accuracy: row.accuracy,
    totalMoves: row.total_moves,
    goodMovesCount: row.good_moves_count,
    badMovesCount: row.bad_moves_count,
    bestMove: row.best_move,
    worstMove: row.worst_move,
    mainWeakness: row.main_weakness,
    coachTip: row.coach_tip,
    xpEarned: row.xp_earned,
    shareId: row.share_id,
  };
}
