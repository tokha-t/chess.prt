import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const navItems = [
  { to: "/play", label: "Play" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "History" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar({ theme, onThemeChange }) {
  const { user, signOut, configured } = useAuth();

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <span className="brand-mark">♞</span>
        <span>
          <strong>ChessMentor AI</strong>
          <small>{configured ? "Cloud sync ready" : "Guest mode ready"}</small>
        </span>
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="nav-actions">
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        {user ? (
          <div className="user-chip">
            <span className="avatar">{user.email?.charAt(0).toUpperCase() || "U"}</span>
            <span className="user-email">{user.email}</span>
            <button className="link-button" type="button" onClick={signOut}>
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-links">
            <Link to="/login">Login</Link>
            <Link className="button small" to="/signup">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
