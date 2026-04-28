import { Link } from "react-router-dom";
import PricingCards from "../components/PricingCards.jsx";

const features = [
  "Play against AI",
  "Save game history",
  "Get post-game mistake analysis",
  "Track your progress",
  "Compete on city leaderboard",
];

export default function Home() {
  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ChessMentor AI</p>
          <h1>Play chess, understand your mistakes, and improve faster.</h1>
          <p>
            A beginner-friendly chess platform where every game becomes a small lesson, not just a win or loss.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/play">
              Start Playing
            </Link>
            <Link className="button glass" to="/dashboard">
              View Dashboard
            </Link>
          </div>
        </div>
        <div className="hero-board" aria-hidden="true">
          {Array.from({ length: 64 }).map((_, index) => (
            <span key={index}>{["♜", "♞", "♝", "♛", "♚", "♟", "♙", "♕"][index % 8]}</span>
          ))}
        </div>
      </section>

      <section className="section split-section">
        <div>
          <p className="eyebrow">Modern chess platform</p>
          <h2>More than a static board.</h2>
          <p className="muted">
            ChessMentor AI combines legal play, AI opposition, progress tracking, cloud-ready persistence, and a
            simple coach that explains mistakes in human language.
          </p>
        </div>
        <ul className="feature-list">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="section difference-section">
        <p className="eyebrow">Why it is different</p>
        <h2>Engines show the best move. Beginners need the reason.</h2>
        <p>
          Most chess platforms surface cold engine lines. ChessMentor AI focuses on beginner explanations: queen
          safety, king safety, development, material loss, and missed mate threats.
        </p>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pricing mockup</p>
            <h2>A product path, not just a project.</h2>
          </div>
        </div>
        <PricingCards />
      </section>
    </main>
  );
}
