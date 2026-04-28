import { useMemo, useRef, useState, useEffect } from "react";
import AIThinkingIndicator from "../components/AIThinkingIndicator.jsx";
import ChessBoard from "../components/ChessBoard.jsx";
import DailyMissionsCard from "../components/DailyMissionsCard.jsx";
import GameControls from "../components/GameControls.jsx";
import GameReportCard from "../components/GameReportCard.jsx";
import GameReview from "../components/GameReview.jsx";
import GameStatus from "../components/GameStatus.jsx";
import MoveHistory from "../components/MoveHistory.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { selectAiMove } from "../lib/aiPlayer.js";
import { ensureTodayMissions, updatePostGameMissions } from "../lib/dailyMissions.js";
import { analyzeGame } from "../lib/gameAnalysis.js";
import { generateGameReport } from "../lib/gameReport.js";
import { classifyMove, summarizeMoveQuality } from "../lib/moveEvaluation.js";
import {
  capitalize,
  createGame,
  findKingSquare,
  getGameStatus,
  getUserResult,
  serializeMove,
} from "../lib/chessEngine.js";
import { createGameReport, saveGame, updateUserStats } from "../lib/database.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

const TIME_CONTROLS = {
  classic: { label: "Classic", minutes: 30, description: "30 min" },
  rapid: { label: "Rapid", minutes: 10, description: "10 min" },
  blitz: { label: "Blitz", minutes: 5, description: "5 min" },
};

function createRoomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function getInitialClocks(timeControl) {
  const minutes = TIME_CONTROLS[timeControl]?.minutes ?? TIME_CONTROLS.rapid.minutes;
  const time = minutes * 60 * 1000;
  return { white: time, black: time };
}

export default function Play() {
  const { user } = useAuth();
  const gameRef = useRef(createGame());
  const aiRequestRef = useRef(0);
  const aiPendingRef = useRef(false);
  const channelRef = useRef(null);
  const clientIdRef = useRef(createRoomId());
  const lastClockTickRef = useRef(Date.now());
  const moveEvaluationsRef = useRef([]);
  const savedRef = useRef(false);
  const timeoutHandledRef = useRef(false);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [moves, setMoves] = useState([]);
  const [status, setStatus] = useState(getGameStatus(gameRef.current));
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [playerColor, setPlayerColor] = useState("white");
  const [timeControl, setTimeControl] = useState("rapid");
  const [clocks, setClocks] = useState(() => getInitialClocks("rapid"));
  const [clockStarted, setClockStarted] = useState(false);
  const [roomId, setRoomId] = useState(() => localStorage.getItem("chessmentor-room-id") || createRoomId());
  const [onlineStatus, setOnlineStatus] = useState("offline");
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [moveEvaluations, setMoveEvaluations] = useState([]);
  const [review, setReview] = useState(null);
  const [gameReport, setGameReport] = useState(null);
  const [savedGame, setSavedGame] = useState(null);
  const [dailyMissions, setDailyMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState("");

  const orientation = mode === "ai" || mode === "online" ? playerColor : "white";
  const activeClockColor = gameRef.current.turn() === "w" ? "white" : "black";

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
    if (mode === "online") return (gameRef.current.turn() === "w" ? "white" : "black") === playerColor;
    return (gameRef.current.turn() === "w" ? "white" : "black") === playerColor;
  }

  function sendOnlineEvent(event, payload = {}) {
    if (mode !== "online" || !channelRef.current || onlineStatus !== "connected") return;
    channelRef.current.send({
      type: "broadcast",
      event,
      payload: {
        ...payload,
        senderId: clientIdRef.current,
      },
    });
  }

  async function refreshMissions() {
    if (!user) return;
    setMissionsLoading(true);
    try {
      const missions = await ensureTodayMissions(user.id);
      setDailyMissions(missions);
      setMissionsError("");
    } catch (error) {
      setMissionsError(error.message);
    } finally {
      setMissionsLoading(false);
    }
  }

  function appendMoveEvaluation(evaluation) {
    if (!evaluation) return;
    const nextEvaluations = [...moveEvaluationsRef.current, evaluation];
    moveEvaluationsRef.current = nextEvaluations;
    setMoveEvaluations(nextEvaluations);
    setMessage(`${evaluation.label}: ${evaluation.explanation}`);
  }

  function shouldEvaluateMove(move) {
    if (mode !== "ai") return false;
    const moveColor = move.color === "w" ? "white" : "black";
    return moveColor === playerColor;
  }

  function evaluateMadeMove(beforeFen, move) {
    const ply = gameRef.current.history().length;
    const evaluation = classifyMove({
      beforeFen,
      afterFen: gameRef.current.fen(),
      move,
      moveNumber: Math.ceil(gameRef.current.history().length / 2),
      playerColor: move.color === "w" ? "white" : "black",
    });
    return { ...evaluation, ply };
  }

  function trimEvaluationsToCurrentHistory() {
    const remainingPlyCount = gameRef.current.history().length;
    const nextEvaluations = moveEvaluationsRef.current.filter((evaluation) => {
      if (!evaluation?.ply) return true;
      return evaluation.ply <= remainingPlyCount;
    });
    moveEvaluationsRef.current = nextEvaluations;
    setMoveEvaluations(nextEvaluations);
  }

  function getEvaluationForPly(ply) {
    return moveEvaluations.find((evaluation) => evaluation.ply === ply) ?? null;
  }

  function describeMove(move, prefix = "Move") {
    return `${prefix}: ${move.san}`;
  }

  function resetGame({ broadcast = true, nextTimeControl = timeControl } = {}) {
    gameRef.current = createGame();
    savedRef.current = false;
    timeoutHandledRef.current = false;
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMove(null);
    moveEvaluationsRef.current = [];
    setMoveEvaluations([]);
    setReview(null);
    setGameReport(null);
    setSavedGame(null);
    setClocks(getInitialClocks(nextTimeControl));
    setClockStarted(false);
    lastClockTickRef.current = Date.now();
    aiPendingRef.current = false;
    setThinking(false);
    syncGame(mode === "ai" && playerColor === "black" ? "AI will make the first move." : "New game started.");

    if (broadcast) {
      sendOnlineEvent("new-game", {
        fen: gameRef.current.fen(),
        timeControl: nextTimeControl,
        clocks: getInitialClocks(nextTimeControl),
      });
    }
  }

  function finishGame(nextStatus, nextHistory, resignedColor = null) {
    if (savedRef.current) return;
    savedRef.current = true;

    const userColor = mode === "ai" || mode === "online" ? playerColor : "white";
    const result = getUserResult(nextStatus, userColor, resignedColor);
    const nextEvaluations = moveEvaluationsRef.current;
    const nextReview = analyzeGame({
      history: nextHistory,
      status: nextStatus,
      playerColor: userColor,
      moveEvaluations: nextEvaluations,
    });
    const report = generateGameReport({
      username: user?.email?.split("@")[0] || "Guest player",
      result,
      opponentType: mode === "ai" ? `ai_${difficulty}_${timeControl}` : `${mode}_${timeControl}`,
      userColor,
      history: nextHistory,
      moveEvaluations: nextEvaluations,
      review: nextReview,
    });
    setReview({ ...nextReview, result });
    setGameReport(report);

    if (!user) {
      setMessage("Game finished. Log in to save and review it later.");
      return;
    }

    saveGame({
      user_id: user.id,
      opponent_type: mode === "ai" ? `ai_${difficulty}_${timeControl}` : `${mode}_${timeControl}`,
      user_color: userColor,
      result,
      final_fen: gameRef.current.fen(),
      pgn: gameRef.current.pgn(),
      move_history: nextHistory,
      mistakes: nextReview.mistakes,
      accuracy: report.accuracy,
      report,
      move_evaluations: nextEvaluations,
      good_moves_count: report.goodMovesCount,
      bad_moves_count: report.badMovesCount,
      xp_earned: report.xpEarned,
      share_id: report.shareId,
    })
      .then(async (game) => {
        setSavedGame(game);
        await createGameReport({ ...report, game_id: game.id, user_id: user.id });
        await updateUserStats(user.id, result, report.xpEarned);
        await updatePostGameMissions(user.id, getPostGameMissionSignals({ result, report, history: nextHistory }));
        await refreshMissions();
        setMessage(`Game saved successfully. Game XP: +${report.xpEarned}.`);
      })
      .catch((error) => {
        setMessage(error.message);
      });
  }

  function getPostGameMissionSignals({ result, report, history }) {
    const userColor = mode === "ai" || mode === "online" ? playerColor : "white";
    const player = userColor === "white" ? "w" : "b";
    const quality = summarizeMoveQuality(moveEvaluationsRef.current, userColor);
    const castledEarly = history.some((move, index) => {
      const moveNumber = Math.floor(index / 2) + 1;
      return move.color === player && (move.san === "O-O" || move.san === "O-O-O") && moveNumber <= 10;
    });
    const queenSafe = !history.some((move) => move.color !== player && move.captured === "q");
    return {
      result,
      accuracy: report.accuracy,
      goodMovesCount: quality.goodMoves,
      castledEarly,
      queenSafe,
      playedHardAi: mode === "ai" && difficulty === "hard",
    };
  }

  function finishByTimeout(loserColor, remote = false) {
    if (timeoutHandledRef.current || status.isGameOver) return;
    timeoutHandledRef.current = true;
    const winner = loserColor === "white" ? "black" : "white";
    const timeoutStatus = {
      ...getGameStatus(gameRef.current),
      label: "Time out",
      message: `${capitalize(loserColor)} lost on time`,
      turnColor: loserColor,
      isCheck: false,
      isGameOver: true,
      winner,
      result: "timeout",
    };
    const nextHistory = gameRef.current.history({ verbose: true }).map(serializeMove);
    setStatus(timeoutStatus);
    setClockStarted(false);
    finishGame(timeoutStatus, nextHistory);
    if (!remote) sendOnlineEvent("timeout", { loserColor, clocks });
  }

  function makeMove(from, to) {
    if (status.isGameOver || thinking || !isHumanTurn()) return false;

    try {
      const beforeFen = gameRef.current.fen();
      const move = gameRef.current.move({ from, to, promotion: "q" });
      if (!move) {
        setMessage("Illegal move. Try another square.");
        return false;
      }
      const evaluation = shouldEvaluateMove(move) ? evaluateMadeMove(beforeFen, move) : null;
      if (evaluation) appendMoveEvaluation(evaluation);
      setSelectedSquare(null);
      setLegalTargets([]);
      setLastMove({ from: move.from, to: move.to, ply: gameRef.current.history().length });
      setClockStarted(true);
      const { nextHistory, nextStatus } = syncGame(
        evaluation ? `${evaluation.label}: ${evaluation.explanation}` : describeMove(move, "Move played")
      );
      if (nextStatus.isGameOver) finishGame(nextStatus, nextHistory);
      sendOnlineEvent("move", {
        moveInput: { from: move.from, to: move.to, promotion: move.promotion || "q" },
        fen: gameRef.current.fen(),
        lastMove: { from: move.from, to: move.to, ply: gameRef.current.history().length },
        clocks,
        timeControl,
      });
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
    if (thinking || status.isGameOver || mode === "online") return;
    gameRef.current.undo();
    if (mode === "ai" && gameRef.current.history().length) {
      gameRef.current.undo();
    }
    trimEvaluationsToCurrentHistory();
    savedRef.current = false;
    setReview(null);
    setGameReport(null);
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
    const resignedColor =
      mode === "ai" || mode === "online" ? playerColor : gameRef.current.turn() === "w" ? "white" : "black";
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
    sendOnlineEvent("resign", { resignedColor, clocks });
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setTimeout(() => resetGame({ broadcast: false }), 0);
  }

  function handlePlayerColorChange(nextColor) {
    setPlayerColor(nextColor);
    setTimeout(() => resetGame({ broadcast: false }), 0);
  }

  function handleTimeControlChange(nextTimeControl) {
    setTimeControl(nextTimeControl);
    setTimeout(() => resetGame({ nextTimeControl }), 0);
  }

  function handleRoomIdChange(nextRoomId) {
    const sanitized = nextRoomId.trim().slice(0, 32);
    setRoomId(sanitized);
    localStorage.setItem("chessmentor-room-id", sanitized);
  }

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setDailyMissions([]);
      return undefined;
    }

    setMissionsLoading(true);
    ensureTodayMissions(user.id)
      .then((missions) => {
        if (mounted) {
          setDailyMissions(missions);
          setMissionsError("");
        }
      })
      .catch((error) => {
        if (mounted) setMissionsError(error.message);
      })
      .finally(() => {
        if (mounted) setMissionsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

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
        const beforeFen = gameRef.current.fen();
        const move = gameRef.current.move({ from: aiMove.from, to: aiMove.to, promotion: aiMove.promotion || "q" });
        const evaluation = shouldEvaluateMove(move) ? evaluateMadeMove(beforeFen, move) : null;
        if (evaluation) appendMoveEvaluation(evaluation);
        setLastMove({ from: move.from, to: move.to, ply: gameRef.current.history().length });
        setClockStarted(true);
        const { nextHistory, nextStatus } = syncGame(
          evaluation ? `AI move: ${evaluation.label}. ${evaluation.explanation}` : describeMove(move, "AI played")
        );
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

  useEffect(() => {
    if (mode !== "online") {
      setOnlineStatus("offline");
      return undefined;
    }

    if (!isSupabaseConfigured || !supabase) {
      setOnlineStatus("Supabase env missing");
      setMessage("Online rooms need Supabase env variables because they use Supabase Realtime WebSockets.");
      return undefined;
    }

    if (!roomId) {
      setOnlineStatus("Add room code");
      return undefined;
    }

    setOnlineStatus("connecting");
    const channel = supabase.channel(`chessmentor:${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "move" }, ({ payload }) => {
        if (payload?.senderId === clientIdRef.current) return;
        try {
          if (payload.moveInput) {
            const move = gameRef.current.move(payload.moveInput);
            setLastMove({ from: move.from, to: move.to, ply: gameRef.current.history().length });
          } else {
            gameRef.current.load(payload.fen);
            setLastMove(payload.lastMove ?? null);
          }
          if (payload.clocks) setClocks(payload.clocks);
          if (payload.timeControl) setTimeControl(payload.timeControl);
          setClockStarted(true);
          const { nextHistory, nextStatus } = syncGame("Opponent moved through WebSocket room.");
          if (nextStatus.isGameOver) finishGame(nextStatus, nextHistory);
        } catch {
          setMessage("Could not apply remote move. Ask your opponent to start a new room game.");
        }
      })
      .on("broadcast", { event: "new-game" }, ({ payload }) => {
        if (payload?.senderId === clientIdRef.current) return;
        if (payload?.timeControl) setTimeControl(payload.timeControl);
        if (payload?.clocks) setClocks(payload.clocks);
        gameRef.current = createGame();
        if (payload?.fen) gameRef.current.load(payload.fen);
        savedRef.current = false;
        timeoutHandledRef.current = false;
        setClockStarted(false);
        setSelectedSquare(null);
        setLegalTargets([]);
        setLastMove(null);
        moveEvaluationsRef.current = [];
        setMoveEvaluations([]);
        setReview(null);
        setGameReport(null);
        setSavedGame(null);
        syncGame("Opponent started a new WebSocket room game.");
      })
      .on("broadcast", { event: "resign" }, ({ payload }) => {
        if (payload?.senderId === clientIdRef.current) return;
        const resignedColor = payload?.resignedColor;
        if (!resignedColor) return;
        const nextStatus = {
          ...getGameStatus(gameRef.current),
          label: "Resigned",
          message: `${capitalize(resignedColor)} resigned`,
          isGameOver: true,
          winner: resignedColor === "white" ? "black" : "white",
          result: "resigned",
        };
        setStatus(nextStatus);
        finishGame(nextStatus, gameRef.current.history({ verbose: true }).map(serializeMove), resignedColor);
      })
      .on("broadcast", { event: "timeout" }, ({ payload }) => {
        if (payload?.senderId === clientIdRef.current) return;
        if (payload?.clocks) setClocks(payload.clocks);
        if (payload?.loserColor) finishByTimeout(payload.loserColor, true);
      })
      .subscribe((nextStatus) => {
        setOnlineStatus(nextStatus === "SUBSCRIBED" ? "connected" : nextStatus.toLowerCase());
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [mode, roomId]);

  useEffect(() => {
    if (!clockStarted || status.isGameOver) {
      lastClockTickRef.current = Date.now();
      return undefined;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastClockTickRef.current;
      lastClockTickRef.current = now;
      const activeColor = gameRef.current.turn() === "w" ? "white" : "black";

      setClocks((currentClocks) => {
        const nextTime = Math.max(0, currentClocks[activeColor] - elapsed);
        if (nextTime === 0) {
          window.setTimeout(() => finishByTimeout(activeColor), 0);
        }
        return { ...currentClocks, [activeColor]: nextTime };
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [clockStarted, status.isGameOver]);

  const squareStyles = useMemo(() => {
    const styles = {};
    if (lastMove) {
      const latestEvaluation = lastMove.ply ? getEvaluationForPly(lastMove.ply) : null;
      const moveColor =
        latestEvaluation?.colorCode === "red"
          ? "var(--move-red-soft)"
          : latestEvaluation?.colorCode === "green"
            ? "var(--move-green-soft)"
            : "var(--last-move)";
      styles[lastMove.from] = { background: moveColor };
      styles[lastMove.to] = { background: moveColor };
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
  }, [lastMove, legalTargets, moveEvaluations, selectedSquare, status.isCheck, status.turnColor]);

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
            timeControl={timeControl}
            setTimeControl={handleTimeControlChange}
            timeControls={TIME_CONTROLS}
            clocks={clocks}
            activeClockColor={activeClockColor}
            roomId={roomId}
            setRoomId={handleRoomIdChange}
            onlineStatus={onlineStatus}
            onlineEnabled={isSupabaseConfigured}
            onNewGame={() => resetGame()}
            onUndo={handleUndo}
            onResign={handleResign}
            disabled={thinking || moves.length === 0}
          />
          <MoveHistory moves={moves} evaluations={moveEvaluations} playerColor={orientation} />
          <DailyMissionsCard
            missions={dailyMissions}
            loading={missionsLoading}
            error={missionsError}
            onRefresh={refreshMissions}
            guest={!user}
          />
          <GameReportCard report={gameReport} />
          <GameReview
            review={review}
            moveEvaluations={moveEvaluations}
            playerColor={orientation}
            onPlayAgain={() => resetGame()}
          />
        </aside>
      </section>
    </main>
  );
}
