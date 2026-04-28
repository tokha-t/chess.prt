import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import History from "./pages/History.jsx";
import Home from "./pages/Home.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Login from "./pages/Login.jsx";
import Play from "./pages/Play.jsx";
import Review from "./pages/Review.jsx";
import ShareReport from "./pages/ShareReport.jsx";
import Signup from "./pages/Signup.jsx";

function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="page narrow-page">Loading your chess studio...</main>;
  }

  if (!user) {
    return (
      <main className="page narrow-page">
        <section className="panel empty-panel">
          <p className="eyebrow">Guest mode</p>
          <h1>Log in to save and review your games.</h1>
          <p className="muted">You can play as a guest, but dashboard, history, and saved reviews need an account.</p>
          <div className="button-row">
            <Link className="button primary" to="/login">
              Login
            </Link>
            <Link className="button" to="/play">
              Continue playing
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return children;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("chessmentor-theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("chessmentor-theme", theme);
  }, [theme]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar theme={theme} onThemeChange={setTheme} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <AuthGate>
                <Dashboard />
              </AuthGate>
            }
          />
          <Route
            path="/history"
            element={
              <AuthGate>
                <History />
              </AuthGate>
            }
          />
          <Route
            path="/review/:id"
            element={
              <AuthGate>
                <Review />
              </AuthGate>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/share/:shareId" element={<ShareReport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
