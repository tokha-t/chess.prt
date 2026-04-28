export default function ThemeToggle({ theme, onThemeChange }) {
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => onThemeChange(isDark ? "light" : "dark")}
      aria-label="Toggle dark and light theme"
    >
      <span>{isDark ? "Dark" : "Light"}</span>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-dot" />
      </span>
    </button>
  );
}
