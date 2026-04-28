export default function MissionItem({ mission }) {
  const target = mission.target_value || 1;
  const current = Math.min(mission.current_value || 0, target);
  const percent = Math.round((current / target) * 100);

  return (
    <article className={`mission-item ${mission.completed ? "completed" : ""}`}>
      <div className="mission-topline">
        <div>
          <h3>{mission.title}</h3>
          <p>{mission.description}</p>
        </div>
        <span className="mission-reward">+{mission.xp_reward} XP</span>
      </div>
      <div className="mission-progress-meta">
        <span>
          Progress: {current}/{target}
        </span>
        <strong>{mission.completed ? "Completed" : `${percent}%`}</strong>
      </div>
      <div className="mission-progress-bar" aria-label={`${mission.title} progress`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}
