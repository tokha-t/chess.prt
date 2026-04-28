import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardStats from "../components/DashboardStats.jsx";
import DailyMissionsCard from "../components/DailyMissionsCard.jsx";
import SkillProfile from "../components/SkillProfile.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ensureTodayMissions } from "../lib/dailyMissions.js";
import { getProfile, getUserGames, updateProfile } from "../lib/database.js";
import { estimateSkillProfile } from "../lib/gameAnalysis.js";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [games, setGames] = useState([]);
  const [missions, setMissions] = useState([]);
  const [missionsError, setMissionsError] = useState("");
  const [form, setForm] = useState({ username: "", city: "Other" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getProfile(user.id, user.email),
      getUserGames(user.id),
      ensureTodayMissions(user.id).catch((missionError) => {
        setMissionsError(missionError.message);
        return [];
      }),
    ])
      .then(([nextProfile, nextGames, nextMissions]) => {
        if (!mounted) return;
        setProfile(nextProfile);
        setGames(nextGames);
        setMissions(nextMissions);
        setForm({ username: nextProfile?.username || "", city: nextProfile?.city || "Other" });
      })
      .catch((nextError) => {
        setError(nextError.message);
        setMissionsError(nextError.message);
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleProfileSave(event) {
    event.preventDefault();
    try {
      const nextProfile = await updateProfile(user.id, form);
      setProfile(nextProfile);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  if (loading) return <main className="page">Loading dashboard...</main>;

  const skills = estimateSkillProfile(games);
  const recentGames = games.slice(0, 5);

  async function handleMissionRefresh() {
    try {
      const nextMissions = await ensureTodayMissions(user.id);
      setMissions(nextMissions);
      setMissionsError("");
    } catch (nextError) {
      setMissionsError(nextError.message);
    }
  }

  return (
    <main className="page dashboard-page">
      <section className="page-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>Your chess progress</h1>
        <p className="muted">Track rating, XP, recent games, and practical skill areas.</p>
      </section>

      {error ? <div className="notice error">{error}</div> : null}

      <DashboardStats profile={profile} games={games} />

      <DailyMissionsCard
        missions={missions}
        loading={loading}
        error={missionsError}
        onRefresh={handleMissionRefresh}
        guest={false}
      />

      <section className="dashboard-layout">
        <SkillProfile skills={skills} />

        <section className="panel">
          <p className="eyebrow">Profile</p>
          <h2>Player identity</h2>
          <form className="profile-form" onSubmit={handleProfileSave}>
            <label className="field">
              <span>Username</span>
              <input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="Chess learner"
              />
            </label>
            <label className="field">
              <span>City</span>
              <select
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              >
                <option>Astana</option>
                <option>Almaty</option>
                <option>Kostanay</option>
                <option>Shymkent</option>
                <option>Other</option>
              </select>
            </label>
            <button className="button primary" type="submit">
              Save profile
            </button>
          </form>
        </section>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent game reports</p>
            <h2>Latest reports</h2>
          </div>
          <Link className="button small" to="/history">
            View all
          </Link>
        </div>
        {recentGames.length ? (
          <div className="history-list">
            {recentGames.map((game) => (
              <Link className="history-item" key={game.id} to={`/review/${game.id}`}>
                <strong>{game.result}</strong>
                <span>{game.opponent_type}</span>
                <span>{game.accuracy ?? "-"}% accuracy</span>
                <span>+{game.xp_earned ?? game.report?.xpEarned ?? 0} XP</span>
                <em>{game.report?.mainWeakness ?? "View report"}</em>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">No games yet. Play your first game.</p>
        )}
      </section>
    </main>
  );
}
