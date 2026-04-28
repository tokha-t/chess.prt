import { Link } from "react-router-dom";

export default function PricingCards() {
  return (
    <section className="pricing-grid">
      <article className="pricing-card">
        <p className="eyebrow">Free</p>
        <h3>Learn the basics</h3>
        <strong>$0</strong>
        <ul>
          <li>Play games</li>
          <li>Save limited history</li>
          <li>Basic coach cards</li>
        </ul>
        <Link className="button primary full" to="/play">
          Start Playing
        </Link>
      </article>

      <article className="pricing-card featured">
        <p className="eyebrow">Pro mockup</p>
        <h3>Train like a club player</h3>
        <strong>$8/mo</strong>
        <ul>
          <li>Unlimited analysis</li>
          <li>Advanced coach</li>
          <li>Custom board themes</li>
          <li>City tournaments</li>
        </ul>
        <button className="button full" type="button" disabled>
          Upgrade to Pro soon
        </button>
      </article>
    </section>
  );
}
