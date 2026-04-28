import { useRef, useState } from "react";
import { buildShareUrl, formatReportSummary } from "../lib/gameReport.js";

export default function GameReportCard({ report, publicView = false }) {
  const [notice, setNotice] = useState("");
  const cardRef = useRef(null);

  if (!report) return null;

  const shareUrl = buildShareUrl(report.shareId);

  async function copySummary() {
    await navigator.clipboard.writeText(formatReportSummary(report));
    setNotice("Report summary copied.");
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setNotice("Share link copied.");
  }

  function downloadSvg() {
    const lines = formatReportSummary(report).split("\n");
    const svgLines = lines
      .map((line, index) => `<text x="42" y="${70 + index * 34}" font-size="22">${escapeSvg(line)}</text>`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
      <rect width="900" height="520" rx="36" fill="#f6f0e7"/>
      <rect x="24" y="24" width="852" height="472" rx="28" fill="#fffaf1" stroke="#1f6f64" stroke-width="3"/>
      <text x="42" y="46" font-size="26" font-weight="700" fill="#1f6f64">ChessMentor AI</text>
      <g fill="#17211c" font-family="Avenir Next, Arial, sans-serif">${svgLines}</g>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chessmentor-report-${report.shareId || Date.now()}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Report image downloaded.");
  }

  return (
    <section className="panel game-report-card" ref={cardRef}>
      <div className="report-hero">
        <div>
          <p className="eyebrow">{publicView ? "Shared Game Report" : "Shareable Game Report"}</p>
          <h2>ChessMentor AI Game Report</h2>
          <p className="muted">
            {report.username} played {report.userColor} vs {formatOpponent(report.opponentType)}.
          </p>
        </div>
        <div className={`result-badge ${report.result}`}>{report.result}</div>
      </div>

      <div className="report-score-row">
        <div className="report-score">
          <span>Accuracy</span>
          <strong>{report.accuracy}%</strong>
        </div>
        <div>
          <span>Moves</span>
          <strong>{report.totalMoves}</strong>
        </div>
        <div>
          <span>Good</span>
          <strong>{report.goodMovesCount}</strong>
        </div>
        <div>
          <span>Mistakes</span>
          <strong>{report.badMovesCount}</strong>
        </div>
        <div>
          <span>XP</span>
          <strong>+{report.xpEarned}</strong>
        </div>
      </div>

      <div className="report-insights">
        <div>
          <span>Best moment</span>
          <strong>{report.bestMove}</strong>
        </div>
        <div>
          <span>Biggest lesson</span>
          <strong>{report.worstMove}</strong>
        </div>
      </div>

      <div className="coach-tip-card">
        <span>Main weakness: {report.mainWeakness}</span>
        <p>{report.coachTip}</p>
      </div>

      {!publicView ? (
        <div className="button-row">
          <button className="button" type="button" onClick={copySummary}>
            Copy Summary
          </button>
          <button className="button" type="button" onClick={downloadSvg}>
            Download SVG
          </button>
          <button className="button primary" type="button" onClick={copyShareLink} disabled={!shareUrl}>
            Share Link
          </button>
        </div>
      ) : null}

      {notice ? <p className="success-line">{notice}</p> : null}
    </section>
  );
}

function formatOpponent(opponentType = "") {
  return opponentType.replaceAll("_", " ");
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
