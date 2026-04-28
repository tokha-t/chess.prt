import { useMemo, useRef, useState, useEffect } from "react";
import AIThinkingIndicator from "../components/AIThinkingIndicator.jsx";
import ChessBoard from "../components/ChessBoard.jsx";
import GameControls from "../components/GameControls.jsx";
import GameReview from "../components/GameReview.jsx";
import GameStatus from "../components/GameStatus.jsx";
import MoveHistory from "../components/MoveHistory.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { selectAiMove } from "../lib/aiPlayer.js";
import { analyzeGame } from "../lib/gameAnalysis.js";
import {
  createGame,
  findKingSquare,
  getGameStatus,
  getUserResult,
  serializeMove,
} from "../lib/chessEngine.js";
import { saveGame, updateUserStats } from "../lib/database.js";

export default function Play() {
  const { user } = useAuth();
  const gameRef = useRef(createGame());
  const aiRequestRef = useRef(0);
  const aiPendingRef = useRef(false);
  const savedRef = useRef(false);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [moves, setMoves] = useState([]);
  const [status, setStatus] = useState(getGameStatus(gameRef.current));
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [playerColor, setPlayerColor] = useState("white");
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [review, setReview] = useState(null);
  const [savedGame, setSavedGame] = useState(null);

  const orientation = mode === "ai" ? playerColor : "white";

  function syncGame(nextMessage = "") {
    const nextHistory = gameRef.current.history({ verbose: true }).map(serializeMove);
    const nextStatus = getGameStatus(gameRef.current);
    setFen(gameRef.current.fen());
    setMoves(nextHistory);
    setStatus(nextStatus);
    setMessage(nextMessage);
    return { nextHistory, nextStatus };
  }

  function isHumanTurn() {
    if (mode === "local") return true;
    return (gameRef.current.turn() === "w" ? "white" : "black") === playerColor;
  }

  function resetGame() {
    gameRef.current = createGame();
    savedRef.current = false;
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMove(null);
    setReview(null);
    setSavedGame(null);
    aiPendingRef.current = false;
    setThinking(false);
    syncGame(mode === "ai" && playerColor === "black" ? "AI will make the first move." : "New game started.");
  }

  function finishGame(nextStatus, nextHistory, resignedColor = null) {
    if (savedRef.current) return;
    savedRef.current = true;

    const userColor = mode === "ai" ? playerColor : "white";
    const result = getUserResult(nextStatus, userColor, resignedColor);
    const nextReview = analyzeGame({ history: nextHistory, status: nextStatus, playerColor: userColor });
    setReview({ ...nextReview, result });

    if (!user) {
      setMessage("Game finished. Log in to save and review it later.");
      return;
    }

    saveGame({
      user_id: user.id,
      opponent_type: mode === "ai" ? `ai_${difficulty}` : "local",
      user_color: userColor,
      result,
      final_fen: gameRef.current.fen(),
      pgn: gameRef.current.pgn(),
      move_history: nextHistory,
      mistakes: nextReview.mistakes,
      accuracy: nextReview.accuracy,
    })
      .then((game) => {
        setSavedGame(game);
        setMessage("Game saved successfully.");
        return updateUserStats(user.id, result);
      })
      .catch((error) => {
        setMessage(error.message);
      });
  }

  function makeMove(from, to) {
    if (status.isGameOver || thinking || !isHumanTurn()) return false;

    try {
      const move = gameRef.current.move({ from, to, promotion: "q" });
      if (!move) {
        setMessage("Illegal move. Try another square.");
        return false;
      }
      setSelectedSquare(null);
      setLegalTargets([]);
      setLastMove({ from: move.from, to: move.to });
      const { nextHistory, nextStatus } = syncGame("");
      if (nextStatus.isGameOver) finishGame(nextStatus, nextHistory);
      return true;
    } catch {
      setMessage("Illegal move. ChessMentor only allows legal chess moves.");
      return false;
    }
  }

  function handleSquareClick(square) {
    if (status.isGameOver || thinking || !isHumanTurn()) return;

    if (selectedSquare && legalTargets.includes(square)) {
      makeMove(selectedSquare, square);
      return;
    }

    const piece = gameRef.current.get(square);
    const legalMoves = gameRef.current.moves({ square, verbose: true });

    if (piece && piece.color === gameRef.current.turn() && legalMoves.length) {
      setSelectedSquare(square);
      setLegalTargets(legalMoves.map((move) => move.to));
      setMessage(`${legalMoves.length} legal moves highlighted.`);
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
      if (selectedSquare) setMessage("That target is not legal.");
    }
  }

  function handleDrop(sourceSquare, targetSquare) {
    return makeMove(sourceSquare, targetSquare);
  }

  function handleUndo() {
    if (thinking || status.isGameOver) return;
    gameRef.current.undo();
    if (mode === "ai" && gameRef.current.history().length) {
      gameRef.current.undo();
    }
    savedRef.current = false;
    setReview(null);
    setSavedGame(null);
    setLastMove(null);
    setSelectedSquare(null);
    setLegalTargets([]);
    syncGame("Last move undone.");
  }

  function handleResign() {
    if (status.isGameOver || thinking) return;
    const confirmed = window.confirm("Resign this game?");
    if (!confirmed) return;
    const resignedColor = gameRef.current.turn() === "w" ? "white" : "black";
    const nextStatus = {
      ...status,
      label: "Resigned",
      message: `${resignedColor === "white" ? "White" : "Black"} resigned`,
      isGameOver: true,
      winner: resignedColor === "white" ? "black" : "white",
      result: "resigned",
    };
    setStatus(nextStatus);
    finishGame(nextStatus, moves, resignedColor);
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setTimeout(resetGame, 0);
  }

  function handlePlayerColorChange(nextColor) {
    setPlayerColor(nextColor);
    setTimeout(resetGame, 0);
  }

  useEffect(() => {
    if (mode !== "ai" || status.isGameOver || aiPendingRef.current) return undefined;
    const turnColor = gameRef.current.turn() === "w" ? "white" : "black";
    if (turnColor === playerColor) return undefined;

    const requestId = aiRequestRef.current + 1;
    aiRequestRef.current = requestId;
    aiPendingRef.current = true;
    setThinking(true);

    const timer = window.setTimeout(() => {
      if (aiRequestRef.current !== requestId || gameRef.current.isGameOver()) {
        aiPendingRef.current = false;
        setThinking(false);
        return;
      }

      const aiMove = selectAiMove(gameRef.current, difficulty);
      if (aiMove) {
        const move = gameRef.current.move({ from: aiMove.from, to: aiMove.to, promotion: aiMove.promotion || "q" });
        setLastMove({ from: move.from, to: move.to });
        const { nextHistory, nextStatus } = syncGame("");
        if (nextStatus.isGameOver) finishGame(nextStatus, nextHistory);
      }
      aiPendingRef.current = false;
      setThinking(false);
    }, 520);

    return () => {
      window.clearTimeout(timer);
      if (aiRequestRef.current === requestId) {
        aiPendingRef.current = false;
        setThinking(false);
      }
    };
  }, [difficulty, fen, mode, playerColor, status.isGameOver]);

  const squareStyles = useMemo(() => {
    const styles = {};
    if (lastMove) {
      styles[lastMove.from] = { background: "var(--last-move)" };
      styles[lastMove.to] = { background: "var(--last-move)" };
    }
    if (selectedSquare) {
      styles[selectedSquare] = { boxShadow: "inset 0 0 0 4px var(--accent)" };
    }
    for (const target of legalTargets) {
      styles[target] = {
        ...styles[target],
        background: "radial-gradient(circle, var(--legal-dot) 0 18%, transparent 20%)",
      };
    }
    if (status.isCheck) {
      const kingSquare = findKingSquare(gameRef.current, status.turnColor);
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          boxShadow: "inset 0 0 0 5px rgba(220, 38, 38, 0.72)",
        };
      }
    }
    return styles;
  }, [lastMove, legalTargets, selectedSquare, status.isCheck, status.turnColor]);

  return (
    <main className="page play-page">
      <section className="play-header">
        <div>
          <p className="eyebrow">ChessMentor AI board</p>
          <h1>Play, review, improve.</h1>
          <p className="muted">
            Full legal chess powered by chess.js. Promotion auto-queens for speed; castling and en passant are handled
            by the engine.
          </p>
        </div>
        {!user ? <div className="notice">Guest mode: games work, but cloud history needs login.</div> : null}
      </section>

      <section className="play-layout">
        <div className="board-column">
          <AIThinkingIndicator active={thinking} />
          <ChessBoard
            fen={fen}
            orientation={orientation}
            onPieceDrop={handleDrop}
            onSquareClick={handleSquareClick}
            squareStyles={squareStyles}
            disabled={status.isGameOver || thinking || !isHumanTurn()}
          />
        </div>

        <aside className="side-column">
          <GameStatus status={status} message={message} saved={Boolean(savedGame)} />
          <GameControls
            mode={mode}
            setMode={handleModeChange}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            playerColor={playerColor}
            setPlayerColor={handlePlayerColorChange}
            onNewGame={resetGame}
            onUndo={handleUndo}
            onResign={handleResign}
            disabled={thinking || moves.length === 0}
          />
          <MoveHistory moves={moves} />
          <GameReview review={review} onPlayAgain={resetGame} />
        </aside>
      </section>
    </main>
  );
}
