export default function LeaderboardTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>City</th>
            <th>Rating</th>
            <th>XP</th>
            <th>Games</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td>
                {row.username || "Chess learner"} {row.demo ? <span className="demo-tag">Demo</span> : null}
              </td>
              <td>{row.city || "Other"}</td>
              <td>{row.rating ?? 800}</td>
              <td>{row.xp ?? 0}</td>
              <td>{row.games_played ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
