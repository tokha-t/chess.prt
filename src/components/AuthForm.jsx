import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate(location.state?.from || "/dashboard");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <p className="eyebrow">{isSignup ? "Create account" : "Welcome back"}</p>
      <h1>{isSignup ? "Start saving your progress" : "Log in to ChessMentor AI"}</h1>
      <p className="muted">
        {configured
          ? "Use email and password authentication powered by Supabase."
          : "Supabase keys are not configured yet. Guest play works, but cloud auth needs .env values."}
      </p>

      <label className="field">
        <span>Email</span>
        <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} required />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          value={password}
          type="password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <div className="notice error">{error}</div> : null}

      <button className="button primary full" type="submit" disabled={loading || !configured}>
        {loading ? "Working..." : isSignup ? "Create account" : "Login"}
      </button>

      <p className="muted compact">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Login" : "Create one"}</Link>
      </p>
      <Link className="button ghost full" to="/play">
        Continue as guest
      </Link>
    </form>
  );
}
