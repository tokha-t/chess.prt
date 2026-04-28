export default function DashboardStats({ profile, games }) {
  const played = profile?.games_played ?? games.length;
  const wins = profile?.wins ?? games.filter((game) => game.result === "win").length;
  const losses = profile?.losses ?? games.filter((game) => game.result === "loss" || game.result === "resigned").length;
  const draws = profile?.draws ?? games.filter((game) => game.result === "draw").length;
  const winRate = played ? Math.round((wins / played) * 100) : 0;

  const cards = [
    { label: "Games played", value: played },
    { label: "Wins", value: wins },
    { label: "Losses", value: losses },
    { label: "Draws", value: draws },
    { label: "Win rate", value: `${winRate}%` },
    { label: "XP", value: profile?.xp ?? 0 },
    { label: "Rating", value: profile?.rating ?? 800 },
    { label: "City", value: profile?.city ?? "Other" },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article className="stat-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
