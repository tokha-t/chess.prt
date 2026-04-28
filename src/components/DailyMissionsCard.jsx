import MissionItem from "./MissionItem.jsx";

export default function DailyMissionsCard({ missions = [], loading = false, error = "", onRefresh, guest = false }) {
  const completed = missions.filter((mission) => mission.completed).length;

  return (
    <section className="panel daily-missions-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Daily Missions</p>
          <h2>Today's Missions</h2>
        </div>
        {missions.length ? <span>{completed}/{missions.length} done</span> : null}
      </div>
      <p className="muted">Complete these tasks to earn XP and build better chess habits.</p>

      {guest ? (
        <div className="notice">Log in to receive daily missions and XP rewards.</div>
      ) : loading ? (
        <p>Loading missions...</p>
      ) : error ? (
        <div className="notice error">{error}</div>
      ) : missions.length ? (
        <div className="mission-list">
          {missions.map((mission) => (
            <MissionItem mission={mission} key={mission.id || mission.mission_type} />
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <p className="empty-state">No missions found. Generate missions for today.</p>
          {onRefresh ? (
            <button className="button primary" type="button" onClick={onRefresh}>
              Generate Missions
            </button>
          ) : null}
        </div>
      )}

      {missions.length > 0 && completed === missions.length ? (
        <p className="success-line">All missions completed. Great job today!</p>
      ) : null}
    </section>
  );
}
