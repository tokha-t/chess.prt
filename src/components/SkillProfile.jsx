export default function SkillProfile({ skills }) {
  return (
    <section className="panel">
      <p className="eyebrow">Skill profile</p>
      <h2>Training shape</h2>
      <div className="skill-list">
        {skills.map((skill) => (
          <div className="skill-row" key={skill.name}>
            <div>
              <span>{skill.name}</span>
              <strong>{skill.value}%</strong>
            </div>
            <progress value={skill.value} max="100" />
          </div>
        ))}
      </div>
    </section>
  );
}
