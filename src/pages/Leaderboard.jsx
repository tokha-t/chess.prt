import { useDeferredValue, useEffect, useState } from "react";
import LeaderboardTable from "../components/LeaderboardTable.jsx";
import { getLeaderboard } from "../lib/database.js";

const cities = ["All", "Astana", "Almaty", "Kostanay", "Shymkent", "Other"];

export default function Leaderboard() {
  const [city, setCity] = useState("All");
  const [sort, setSort] = useState("rating");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const deferredCity = useDeferredValue(city);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getLeaderboard({ city: deferredCity, sort })
      .then((nextRows) => {
        if (mounted) setRows(nextRows);
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [deferredCity, sort]);

  return (
    <main className="page">
      <section className="page-heading">
        <p className="eyebrow">Leaderboard</p>
        <h1>City and global ranking</h1>
        <p className="muted">Real Supabase profiles appear here. Demo rows are shown when the database is empty.</p>
      </section>

      <section className="panel leaderboard-controls">
        <label className="field">
          <span>City filter</span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            {cities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="rating">Rating</option>
            <option value="xp">XP</option>
          </select>
        </label>
      </section>

      {loading ? <p>Loading leaderboard...</p> : <LeaderboardTable rows={rows} />}
    </main>
  );
}
