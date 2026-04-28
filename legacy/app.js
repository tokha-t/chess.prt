import { Chess } from "./vendor/chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const STORAGE_KEYS = {
  profile: "chesspulse_profile",
  preferences: "chesspulse_preferences",
  history: "chesspulse_history",
  snapshot: "chesspulse_snapshot",
};

const AI_PRESETS = {
  spark: {
    name: "Spark",
    description: "быстрый и дерзкий",
    depth: 1,
    randomness: 18,
    style: "aggressive",
  },
  studio: {
    name: "Studio",
    description: "сбалансированный тренер",
    depth: 2,
    randomness: 8,
    style: "balanced",
  },
  apex: {
    name: "Apex",
    description: "холодный расчет",
    depth: 3,
    randomness: 0,
    style: "positional",
  },
};

const TIME_CONTROLS = {
  blitz: { label: "5+0", base: 5 * 60, increment: 0 },
  rapid: { label: "10+5", base: 10 * 60, increment: 5 },
  classic: { label: "15+10", base: 15 * 60, increment: 10 },
  untimed: { label: "∞", base: Infinity, increment: 0 },
};

const BOARD_THEMES = {
  sand: {
    light: "#f5eddc",
    dark: "#b97d53",
  },
  cobalt: {
    light: "#dce7ff",
    dark: "#4f6fb8",
  },
  sage: {
    light: "#eef3df",
    dark: "#7b946e",
  },
};

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const CENTER_SQUARES = new Set(["d4", "e4", "d5", "e5"]);
const EXTENDED_CENTER = new Set([
  "c3",
  "d3",
  "e3",
  "f3",
  "c4",
  "f4",
  "c5",
  "f5",
  "c6",
  "d6",
  "e6",
  "f6",
]);

const OPENING_BOOK = [
  { line: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ruy Lopez" },
  { line: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italian Game" },
  { line: ["e4", "c5"], name: "Sicilian Defense" },
  { line: ["e4", "e6"], name: "French Defense" },
  { line: ["e4", "c6"], name: "Caro-Kann Defense" },
  { line: ["e4", "d6", "d4", "Nf6"], name: "Pirc Defense" },
  { line: ["d4", "d5", "c4"], name: "Queen's Gambit" },
  { line: ["d4", "Nf6", "c4", "g6"], name: "King's Indian Defense" },
  { line: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], name: "Nimzo-Indian Defense" },
  { line: ["c4"], name: "English Opening" },
  { line: ["Nf3"], name: "Reti Opening" },
];

const INITIAL_PROFILE = {
  name: "Player One",
  city: "Almaty",
};

const INITIAL_PREFERENCES = {
  mode: "ai",
  aiLevel: "studio",
  playerColor: "w",
  theme: "aurora",
  boardTheme: "sand",
  timeControl: "rapid",
  coachEnabled: true,
  orientation: "white",
};

const state = {
  game: new Chess(),
  profile: loadJson(STORAGE_KEYS.profile, INITIAL_PROFILE),
  history: loadJson(STORAGE_KEYS.history, []),
  ...loadJson(STORAGE_KEYS.preferences, INITIAL_PREFERENCES),
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  analysisTrail: [],
  lastCoachReport: null,
  activeTab: "coach",
  clock: null,
  clockTimer: null,
  aiThinking: false,
  aiTimer: null,
  toastTimer: null,
  dragSquare: null,
  hintMove: null,
  lastFinishedSignature: null,
};

state.timeControl = state.timeControl || INITIAL_PREFERENCES.timeControl;
state.clock = createClock(state.timeControl);

const elements = {};

init();

function init() {
  captureElements();
  prioritizeBoardPanel();
  hydrateFromShareOrSnapshot();
  bindEvents();
  applyTheme();
  registerServiceWorker();
  startClockTicker();
  renderAll();
  maybeTriggerAiTurn();
}

function captureElements() {
  elements.body = document.body;
  elements.board = document.getElementById("board");
  elements.statusTitle = document.getElementById("status-title");
  elements.statusSubtitle = document.getElementById("status-subtitle");
  elements.statusDot = document.getElementById("status-dot");
  elements.matchBadge = document.getElementById("match-badge");
  elements.clockWhite = document.getElementById("clock-white");
  elements.clockBlack = document.getElementById("clock-black");
  elements.clockWhiteCard = document.getElementById("clock-white-card");
  elements.clockBlackCard = document.getElementById("clock-black-card");
  elements.momentumBadge = document.getElementById("momentum-badge");
  elements.momentumCopy = document.getElementById("momentum-copy");
  elements.moveList = document.getElementById("move-list");
  elements.moveCountBadge = document.getElementById("move-count-badge");
  elements.evalBadge = document.getElementById("eval-badge");
  elements.openingName = document.getElementById("opening-name");
  elements.materialBalance = document.getElementById("material-balance");
  elements.threatMeter = document.getElementById("threat-meter");
  elements.clockPressure = document.getElementById("clock-pressure");
  elements.heroMetrics = document.getElementById("hero-metrics");
  elements.profileStats = document.getElementById("profile-stats");
  elements.leaderboardList = document.getElementById("leaderboard-list");
  elements.cityRankBadge = document.getElementById("city-rank-badge");
  elements.coachGrade = document.getElementById("coach-grade");
  elements.coachDelta = document.getElementById("coach-delta");
  elements.coachSummary = document.getElementById("coach-summary");
  elements.coachBestLine = document.getElementById("coach-best-line");
  elements.coachFeed = document.getElementById("coach-feed");
  elements.historySummary = document.getElementById("history-summary");
  elements.historyList = document.getElementById("history-list");
  elements.profileName = document.getElementById("profile-name");
  elements.profileCity = document.getElementById("profile-city");
  elements.modeSelect = document.getElementById("mode-select");
  elements.aiSelect = document.getElementById("ai-select");
  elements.sideSelect = document.getElementById("side-select");
  elements.timeControlSelect = document.getElementById("time-control-select");
  elements.themeSelect = document.getElementById("theme-select");
  elements.boardThemeSelect = document.getElementById("board-theme-select");
  elements.coachToggle = document.getElementById("coach-toggle");
  elements.toast = document.getElementById("toast");
  elements.newGameBtn = document.getElementById("new-game-btn");
  elements.shareBtn = document.getElementById("share-btn");
  elements.flipBtn = document.getElementById("flip-btn");
  elements.hintBtn = document.getElementById("hint-btn");
  elements.undoBtn = document.getElementById("undo-btn");
  elements.resetBtn = document.getElementById("reset-btn");
  elements.copyFenBtn = document.getElementById("copy-fen-btn");
  elements.copyPgnBtn = document.getElementById("copy-pgn-btn");
}

function prioritizeBoardPanel() {
  const dashboard = document.querySelector(".dashboard-grid");
  const boardPanel = document.querySelector(".board-panel");

  if (dashboard && boardPanel && dashboard.firstElementChild !== boardPanel) {
    dashboard.insertBefore(boardPanel, dashboard.firstElementChild);
  }
}

function bindEvents() {
  elements.profileName.addEventListener("input", (event) => {
    state.profile.name = cleanInput(event.target.value, 24) || INITIAL_PROFILE.name;
    persistProfile();
    renderHeroMetrics();
    renderLeaderboard();
  });

  elements.profileCity.addEventListener("input", (event) => {
    state.profile.city = cleanInput(event.target.value, 24) || INITIAL_PROFILE.city;
    persistProfile();
    renderHeroMetrics();
    renderLeaderboard();
  });

  elements.modeSelect.addEventListener("change", (event) => {
    state.mode = event.target.value;
    persistPreferences();
    cancelAiTimer();
    renderAll();
    maybeTriggerAiTurn();
  });

  elements.aiSelect.addEventListener("change", (event) => {
    state.aiLevel = event.target.value;
    persistPreferences();
    renderAll();
  });

  elements.sideSelect.addEventListener("change", (event) => {
    state.playerColor = event.target.value;
    state.orientation = state.playerColor === "w" ? "white" : "black";
    persistPreferences();
    startNewGame("Сторона изменена — начинаем новую партию.");
  });

  elements.timeControlSelect.addEventListener("change", (event) => {
    state.timeControl = event.target.value;
    state.clock = createClock(state.timeControl);
    state.lastFinishedSignature = null;
    persistPreferences();
    persistSnapshot();
    renderAll();
    maybeTriggerAiTurn();
    showToast(`Часы переключены на ${TIME_CONTROLS[state.timeControl].label}.`);
  });

  elements.themeSelect.addEventListener("change", (event) => {
    state.theme = event.target.value;
    persistPreferences();
    applyTheme();
    renderAll();
  });

  elements.boardThemeSelect.addEventListener("change", (event) => {
    state.boardTheme = event.target.value;
    persistPreferences();
    applyTheme();
    renderBoard();
  });

  elements.coachToggle.addEventListener("change", (event) => {
    state.coachEnabled = event.target.checked;
    persistPreferences();
    renderCoach();
  });

  elements.newGameBtn.addEventListener("click", () => startNewGame("Новая партия готова."));
  elements.resetBtn.addEventListener("click", () => startNewGame("Позиция сброшена."));
  elements.flipBtn.addEventListener("click", () => {
    state.orientation = state.orientation === "white" ? "black" : "white";
    persistPreferences();
    renderBoard();
  });
  elements.undoBtn.addEventListener("click", undoMove);
  elements.shareBtn.addEventListener("click", shareCurrentPosition);
  elements.hintBtn.addEventListener("click", showBestHint);
  elements.copyFenBtn.addEventListener("click", () => copyText(state.game.fen(), "FEN скопирован."));
  elements.copyPgnBtn.addEventListener("click", () => copyText(state.game.pgn({ maxWidth: 0 }) || "No moves yet.", "PGN скопирован."));

  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tabTarget;
      renderTabs();
    });
  });

  elements.board.addEventListener("click", (event) => {
    const squareButton = event.target.closest(".square");
    if (!squareButton) {
      return;
    }

    handleSquareClick(squareButton.dataset.square);
  });
  elements.board.addEventListener("dragstart", handleBoardDragStart);
  elements.board.addEventListener("dragover", handleBoardDragOver);
  elements.board.addEventListener("drop", handleBoardDrop);
  elements.board.addEventListener("dragend", handleBoardDragEnd);
  document.addEventListener("keydown", handleGlobalShortcut);
}

function hydrateFromShareOrSnapshot() {
  const params = new URLSearchParams(window.location.search);
  const sharedFen = params.get("fen");
  const sharedMode = params.get("mode");
  const sharedSide = params.get("side");

  if (sharedFen) {
    try {
      state.game.load(sharedFen);
      state.mode = sharedMode === "local" ? "local" : state.mode;
      if (sharedSide === "w" || sharedSide === "b") {
        state.playerColor = sharedSide;
      }
      state.orientation = state.playerColor === "w" ? "white" : "black";
      state.clock = createClock(state.timeControl);
      persistPreferences();
      showToast("Challenge loaded from link.");
      return;
    } catch (error) {
      console.error("Failed to load shared FEN:", error);
    }
  }

  const snapshot = loadJson(STORAGE_KEYS.snapshot, null);
  if (!snapshot || !snapshot.pgn) {
    return;
  }

  try {
    const restoredGame = new Chess();
    restoredGame.loadPgn(snapshot.pgn);
    state.game = restoredGame;
    state.mode = snapshot.mode || state.mode;
    state.aiLevel = snapshot.aiLevel || state.aiLevel;
    state.timeControl = snapshot.timeControl || state.timeControl;
    state.playerColor = snapshot.playerColor || state.playerColor;
    state.orientation = snapshot.orientation || state.orientation;
    state.lastMove = snapshot.lastMove || null;
    state.analysisTrail = Array.isArray(snapshot.analysisTrail) ? snapshot.analysisTrail : [];
    state.lastCoachReport = snapshot.lastCoachReport || state.analysisTrail[0] || null;
    state.clock = hydrateClock(snapshot.clock, state.timeControl);
  } catch (error) {
    console.error("Failed to restore snapshot:", error);
  }
}

function applyTheme() {
  const boardTheme = BOARD_THEMES[state.boardTheme] || BOARD_THEMES.sand;
  elements.body.dataset.theme = state.theme;
  document.documentElement.style.setProperty("--board-light", boardTheme.light);
  document.documentElement.style.setProperty("--board-dark", boardTheme.dark);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.info("Service worker registration skipped:", error);
  });
}

function renderAll() {
  applyClockTick();
  syncControls();
  renderStatus();
  renderClocks();
  renderBoard();
  renderMoveList();
  renderReviewLab();
  renderHeroMetrics();
  renderProfileStats();
  renderLeaderboard();
  renderCoach();
  renderHistory();
  renderTabs();
}

function syncControls() {
  elements.profileName.value = state.profile.name;
  elements.profileCity.value = state.profile.city;
  elements.modeSelect.value = state.mode;
  elements.aiSelect.value = state.aiLevel;
  elements.sideSelect.value = state.playerColor;
  elements.timeControlSelect.value = state.timeControl;
  elements.themeSelect.value = state.theme;
  elements.boardThemeSelect.value = state.boardTheme;
  elements.coachToggle.checked = Boolean(state.coachEnabled);
}

function renderStatus() {
  applyClockTick();
  const preset = AI_PRESETS[state.aiLevel];
  const moveCount = state.game.history().length;
  const aiColor = getAiColor();
  const playerTurn = state.game.turn() === state.playerColor;

  let title = "Матч готов к старту";
  let subtitle = "Выбери фигуру, чтобы увидеть доступные ходы.";
  let badge = moveCount < 12 ? "Opening" : moveCount < 40 ? "Middlegame" : "Endgame";
  let dotColor = "var(--accent)";

  if (state.clock.expired) {
    const winnerColor = state.clock.expired === "w" ? "Черные" : "Белые";
    title = `Флаг упал. Победа: ${winnerColor}`;
    subtitle = "Партия сохранена: контроль времени теперь влияет на результат и историю.";
    badge = "Flag fall";
    dotColor = "var(--danger)";
  } else if (state.game.isCheckmate()) {
    const winnerColor = state.game.turn() === "w" ? "Черные" : "Белые";
    title = `Мат. Победа: ${winnerColor}`;
    subtitle = "Партия сохранена в историю, а AI Coach уже выделил ключевые моменты.";
    badge = "Checkmate";
    dotColor = "var(--danger)";
  } else if (state.game.isDraw()) {
    title = "Ничья";
    subtitle = drawReason(state.game);
    badge = "Draw";
    dotColor = "var(--warm)";
  } else if (state.aiThinking) {
    title = `${preset.name} просчитывает ответ`;
    subtitle = `ИИ в стиле “${preset.description}” анализирует позицию на ${preset.depth + 1} plies.`;
    badge = "AI Thinking";
    dotColor = "var(--warm)";
  } else if (state.mode === "ai") {
    if (playerTurn) {
      title = `Твой ход за ${state.playerColor === "w" ? "белых" : "черных"}`;
      subtitle = state.selectedSquare
        ? `Выбрана фигура на ${state.selectedSquare}. Доступно ${state.legalMoves.length} хода(ов).`
        : "Сильные ходы улучшают coach accuracy и поднимают тебя в городском рейтинге.";
      badge = `vs ${preset.name}`;
    } else if (state.game.turn() === aiColor) {
      title = `Ход ${preset.name}`;
      subtitle = "Сделай паузу: после ответа ИИ ты увидишь обновленный momentum.";
      badge = `AI ${preset.name}`;
    }
  } else {
    title = `Ход ${state.game.turn() === "w" ? "белых" : "черных"}`;
    subtitle = state.selectedSquare
      ? `Выбрана фигура на ${state.selectedSquare}.`
      : "Локальный режим удобен для демонстрации полного rule engine без backend.";
    badge = "Local Duel";
  }

  if (state.game.isCheck() && !state.game.isGameOver()) {
    subtitle = `Шах королю ${state.game.turn() === "w" ? "белых" : "черных"}.`;
    dotColor = "var(--danger)";
  }

  elements.statusTitle.textContent = title;
  elements.statusSubtitle.textContent = subtitle;
  elements.matchBadge.textContent = badge;
  elements.statusDot.style.background = dotColor;
  elements.statusDot.style.boxShadow = `0 0 0 0 ${dotColor}`;

  const lastEval = state.lastCoachReport ? state.lastCoachReport.score : 0;
  elements.momentumBadge.textContent = `${formatPawnScore(lastEval)}`;
  elements.momentumCopy.textContent = state.lastCoachReport
    ? `${state.lastCoachReport.grade}: ${state.lastCoachReport.short}`
    : "Сильные ходы повышают точность и рейтинг в городском ладдере.";
}

function renderClocks() {
  const timed = isClockEnabled();
  elements.clockWhite.textContent = timed ? formatClock(state.clock.w) : "∞";
  elements.clockBlack.textContent = timed ? formatClock(state.clock.b) : "∞";
  elements.clockWhiteCard.classList.toggle("clock-card--active", timed && !state.clock.expired && state.game.turn() === "w");
  elements.clockBlackCard.classList.toggle("clock-card--active", timed && !state.clock.expired && state.game.turn() === "b");
  elements.clockWhiteCard.classList.toggle("clock-card--danger", timed && state.clock.w <= 30);
  elements.clockBlackCard.classList.toggle("clock-card--danger", timed && state.clock.b <= 30);
}

function renderBoard() {
  const board = state.game.board();
  const rowOrder = state.orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const columnOrder = state.orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const checkSquare = state.game.isCheck() ? findKingSquare(state.game.turn()) : null;
  const lastFrom = state.lastMove ? state.lastMove.from : null;
  const lastTo = state.lastMove ? state.lastMove.to : null;

  const squaresHtml = rowOrder
    .flatMap((rowIndex, visualRowIndex) =>
      columnOrder.map((columnIndex, visualColumnIndex) => {
        const piece = board[rowIndex][columnIndex];
        const rank = 8 - rowIndex;
        const file = FILES[columnIndex];
        const square = `${file}${rank}`;
        const legalMove = state.legalMoves.find((move) => move.to === square);
        const captureTarget = Boolean(legalMove && piece && piece.color !== state.game.turn());
        const classes = [
          "square",
          isDarkSquare(file, rank) ? "square--dark" : "square--light",
        ];

        if (state.selectedSquare === square) {
          classes.push("square--selected");
        }
        if (square === lastFrom || square === lastTo) {
          classes.push("square--last");
        }
        if (square === checkSquare) {
          classes.push("square--check");
        }
        if (captureTarget) {
          classes.push("square--capture");
        }
        if (state.hintMove && state.hintMove.from === square) {
          classes.push("square--hint-from");
        }
        if (state.hintMove && state.hintMove.to === square) {
          classes.push("square--hint-to");
        }
        if (state.dragSquare === square) {
          classes.push("square--dragging");
        }

        const pieceMarkup = piece
          ? `<img class="piece" src="${pieceAsset(piece)}" alt="${pieceName(piece)}" draggable="false" />`
          : "";
        const dotMarkup = legalMove && !piece ? `<span class="move-dot"></span>` : "";
        const rankLabel = visualColumnIndex === 0 ? `<span class="square__coord square__coord--rank">${rank}</span>` : "";
        const fileLabel = visualRowIndex === 7 ? `<span class="square__coord square__coord--file">${file}</span>` : "";

        return `
          <button class="${classes.join(" ")}" type="button" data-square="${square}" draggable="${canDragPiece(piece)}" aria-label="${square}">
            ${pieceMarkup}
            ${dotMarkup}
            ${rankLabel}
            ${fileLabel}
          </button>
        `;
      }),
    )
    .join("");

  elements.board.innerHTML = squaresHtml;
}

function renderMoveList() {
  const moves = state.game.history({ verbose: true });
  elements.moveCountBadge.textContent = `${moves.length} half-moves`;

  if (!moves.length) {
    elements.moveList.innerHTML = `<li class="move-item"><strong>1.</strong><span>Пока пусто</span><span>Сделай первый ход</span></li>`;
    return;
  }

  const chunks = [];
  for (let index = 0; index < moves.length; index += 2) {
    const whiteMove = moves[index];
    const blackMove = moves[index + 1];
    chunks.push(`
      <li class="move-item">
        <strong>${Math.floor(index / 2) + 1}.</strong>
        <span>${escapeHtml(whiteMove ? whiteMove.san : "")}</span>
        <span>${escapeHtml(blackMove ? blackMove.san : "…")}</span>
      </li>
    `);
  }

  elements.moveList.innerHTML = chunks.join("");
}

function renderReviewLab() {
  const review = buildPositionReview();
  elements.evalBadge.textContent = formatPawnScore(review.evalScore);
  elements.openingName.textContent = review.opening;
  elements.materialBalance.textContent = review.material;
  elements.threatMeter.textContent = review.threats;
  elements.clockPressure.textContent = review.clockPressure;
}

function buildPositionReview() {
  const reviewGame = new Chess(state.game.fen());
  const evalScore = evaluatePosition(reviewGame, state.playerColor) / 100;
  const material = calculateMaterialBalance();
  const legalMoves = state.game.moves({ verbose: true });
  const forcingMoves = legalMoves.filter((move) => move.captured || move.san.includes("+") || move.promotion).length;
  const threats = legalMoves.length ? `${forcingMoves}/${legalMoves.length} forcing` : "0 ideas";

  return {
    evalScore,
    opening: identifyOpening(),
    material: `${material >= 0 ? "+" : ""}${(material / 100).toFixed(1)}`,
    threats,
    clockPressure: describeClockPressure(),
  };
}

function identifyOpening() {
  const played = state.game.history({ verbose: true }).map((move) => normalizeSan(move.san));
  let best = played.length ? "Custom line" : "Start position";
  let bestLength = 0;

  for (const opening of OPENING_BOOK) {
    const normalizedLine = opening.line.map(normalizeSan);
    const matches = normalizedLine.every((move, index) => played[index] === move);
    if (matches && normalizedLine.length > bestLength) {
      best = opening.name;
      bestLength = normalizedLine.length;
    }
  }

  return best;
}

function calculateMaterialBalance() {
  let balance = 0;

  for (const row of state.game.board()) {
    for (const piece of row) {
      if (!piece) {
        continue;
      }
      const value = PIECE_VALUES[piece.type] || 0;
      balance += piece.color === state.playerColor ? value : -value;
    }
  }

  return balance;
}

function describeClockPressure() {
  if (!isClockEnabled()) {
    return "Off";
  }

  const ownTime = state.clock[state.playerColor];
  const enemyTime = state.clock[getAiColor()];
  const lowTime = Math.min(state.clock.w, state.clock.b);

  if (state.clock.expired) {
    return "Flagged";
  }
  if (lowTime <= 20) {
    return "Critical";
  }
  if (ownTime + 30 < enemyTime) {
    return "Under fire";
  }
  if (enemyTime + 30 < ownTime) {
    return "You lead";
  }
  return "Stable";
}

function renderHeroMetrics() {
  const stats = deriveStats();
  const metrics = [
    {
      label: "Live Rating",
      value: stats.rating,
      caption: `${stats.games} ${pluralizeGames(stats.games)} сохранено`,
    },
    {
      label: "Win Rate",
      value: `${stats.winRate}%`,
      caption: "с учетом локальной истории матчей",
    },
    {
      label: "Coach Accuracy",
      value: `${stats.coachAccuracy}%`,
      caption: "средняя точность решений",
    },
    {
      label: "Streak",
      value: `${stats.streak}d`,
      caption: `${escapeHtml(state.profile.city)} ladder ready`,
    },
  ];

  elements.heroMetrics.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <p class="panel-label">${metric.label}</p>
          <strong>${metric.value}</strong>
          <span>${metric.caption}</span>
        </article>
      `,
    )
    .join("");
}

function renderProfileStats() {
  const stats = deriveStats();
  const items = [
    { label: "ELO", value: stats.rating, caption: "динамически из истории" },
    { label: "Wins", value: stats.wins, caption: "личные победы" },
    { label: "Draws", value: stats.draws, caption: "спасенные позиции" },
    { label: "Losses", value: stats.losses, caption: "точки роста coach" },
  ];

  elements.profileStats.innerHTML = items
    .map(
      (item) => `
        <article class="stat-pill">
          <p class="panel-label">${item.label}</p>
          <strong>${item.value}</strong>
          <span>${item.caption}</span>
        </article>
      `,
    )
    .join("");
}

function renderLeaderboard() {
  const stats = deriveStats();
  const leaderboard = buildLeaderboard(stats).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
  const playerRank = leaderboard.findIndex((entry) => entry.isYou) + 1;
  elements.cityRankBadge.textContent = `#${playerRank || 1}`;

  let visibleEntries = leaderboard.slice(0, 5);
  if (!visibleEntries.some((entry) => entry.isYou)) {
    visibleEntries = [...leaderboard.slice(0, 4), leaderboard.find((entry) => entry.isYou)];
  }

  elements.leaderboardList.innerHTML = visibleEntries
    .map(
      (entry, index) => `
        <li class="leaderboard-item ${entry.isYou ? "leaderboard-item--you" : ""}">
          <span>#${entry.rank}</span>
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            <span>${escapeHtml(entry.city)}</span>
          </div>
          <strong>${entry.rating}</strong>
        </li>
      `,
    )
    .join("");
}

function renderCoach() {
  const report = state.lastCoachReport;
  const recent = state.analysisTrail.slice(0, 6);

  if (!report) {
    elements.coachGrade.textContent = state.coachEnabled ? "Жду твой первый ход" : "Coach временно отключен";
    elements.coachDelta.textContent = "0.0 eval loss";
    elements.coachSummary.textContent = state.coachEnabled
      ? "После каждого твоего хода я сравниваю его с лучшей доступной идеей и объясняю, где ты выиграл темп, а где отпустил инициативу."
      : "Coach выключен. Включи тумблер слева, чтобы получать разбор решений.";
    elements.coachBestLine.textContent = "Пока что рекомендаций нет — сначала сделай ход.";
  } else {
    elements.coachGrade.textContent = `${report.grade} — ${report.moveSan}`;
    elements.coachDelta.textContent = `${report.delta.toFixed(1)} eval loss`;
    elements.coachSummary.textContent = report.summary;
    elements.coachBestLine.textContent = report.bestLine;
  }

  if (!recent.length) {
    elements.coachFeed.innerHTML = `
      <li class="feed-item">
        <strong>Feed пуст</strong>
        <span class="feed-meta">Здесь появятся оценка, краткий смысл хода и лучшая альтернатива.</span>
      </li>
    `;
    return;
  }

  elements.coachFeed.innerHTML = recent
    .map(
      (entry) => `
        <li class="feed-item">
          <strong>${escapeHtml(entry.moveSan)} · ${escapeHtml(entry.grade)}</strong>
          <span>${escapeHtml(entry.short)}</span>
          <span class="feed-meta">Потеря: ${entry.delta.toFixed(1)} · Лучшая идея: ${escapeHtml(entry.bestSan || "—")}</span>
        </li>
      `,
    )
    .join("");
}

function renderHistory() {
  const stats = deriveStats();

  if (!state.history.length) {
    elements.historySummary.textContent =
      "Сыграй первую партию — и здесь появится журнал матчей, точность и ключевые ошибки.";
    elements.historyList.innerHTML = "";
    return;
  }

  elements.historySummary.textContent =
    `Сыграно ${stats.games} ${pluralizeGames(stats.games)}. Побед: ${stats.wins}, средняя coach accuracy: ${stats.coachAccuracy}%.`;

  elements.historyList.innerHTML = state.history
    .map((entry) => {
      const topMistake = entry.topMistakes && entry.topMistakes.length ? entry.topMistakes[0] : null;
      return `
        <article class="history-item">
          <div class="history-item__top">
            <div>
              <strong>${escapeHtml(entry.title)}</strong>
              <p class="history-meta">${formatDate(entry.createdAt)} · ${escapeHtml(entry.modeLabel)}</p>
            </div>
            <span class="badge ${entry.userOutcome === "win" ? "badge--accent" : ""}">${escapeHtml(entry.resultLabel)}</span>
          </div>
          <p>Accuracy: ${entry.accuracy}% · ${entry.moveCount} half-moves · ${escapeHtml(entry.city)}</p>
          <p>${topMistake ? `Главный размен темпа: ${topMistake.moveSan} (${topMistake.grade})` : "Чистая партия без зафиксированных серьезных ошибок."}</p>
        </article>
      `;
    })
    .join("");
}

function renderTabs() {
  document.querySelectorAll("[data-tab-target]").forEach((tab) => {
    tab.classList.toggle("tab--active", tab.dataset.tabTarget === state.activeTab);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("tab-panel--active", panel.id === `${state.activeTab}-tab`);
  });
}

function handleSquareClick(square) {
  applyClockTick();

  if (isMatchOver()) {
    showToast("Партия уже завершена. Начни новую, чтобы продолжить.");
    renderAll();
    return;
  }

  if (state.aiThinking) {
    showToast("Подожди пару секунд: ИИ заканчивает расчет.");
    return;
  }

  const piece = state.game.get(square);
  const isPlayerTurn = state.mode === "local" || state.game.turn() === state.playerColor;

  if (!isPlayerTurn) {
    showToast("Сейчас ходит соперник.");
    return;
  }

  if (state.selectedSquare === square) {
    clearSelection();
    renderStatus();
    renderBoard();
    return;
  }

  const attemptedMove = state.legalMoves.find((move) => move.to === square);
  if (attemptedMove) {
    state.hintMove = null;
    playHumanMove(attemptedMove);
    return;
  }

  if (!piece || piece.color !== state.game.turn()) {
    clearSelection();
    renderStatus();
    renderBoard();
    return;
  }

  const legalMoves = dedupePromotionMoves(state.game.moves({ square, verbose: true }));
  if (!legalMoves.length) {
    showToast("Для этой фигуры сейчас нет легальных ходов.");
    return;
  }

  state.selectedSquare = square;
  state.hintMove = null;
  state.legalMoves = legalMoves;
  renderStatus();
  renderBoard();
}

function handleBoardDragStart(event) {
  const squareButton = event.target.closest(".square");
  if (!squareButton) {
    return;
  }

  const square = squareButton.dataset.square;
  const piece = state.game.get(square);
  if (!canDragPiece(piece)) {
    event.preventDefault();
    return;
  }

  state.dragSquare = square;
  state.selectedSquare = square;
  state.hintMove = null;
  state.legalMoves = dedupePromotionMoves(state.game.moves({ square, verbose: true }));
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", square);
  squareButton.classList.add("square--dragging");
}

function handleBoardDragOver(event) {
  if (!state.dragSquare) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleBoardDrop(event) {
  event.preventDefault();
  const target = event.target.closest(".square");
  const from = state.dragSquare || event.dataTransfer.getData("text/plain");
  state.dragSquare = null;

  if (!target || !from) {
    renderBoard();
    return;
  }

  const to = target.dataset.square;
  const move = dedupePromotionMoves(state.game.moves({ square: from, verbose: true })).find((candidate) => candidate.to === to);

  if (!move) {
    showToast("Так фигура не ходит.");
    clearSelection();
    renderAll();
    return;
  }

  state.hintMove = null;
  playHumanMove(move);
}

function handleBoardDragEnd() {
  state.dragSquare = null;
  renderBoard();
}

function handleGlobalShortcut(event) {
  const tagName = event.target.tagName;
  const isFormField = ["INPUT", "SELECT", "TEXTAREA"].includes(tagName);

  if (isFormField) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "escape") {
    clearSelection();
    renderAll();
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const shortcuts = {
    n: () => startNewGame("Новая партия готова."),
    u: undoMove,
    f: () => {
      state.orientation = state.orientation === "white" ? "black" : "white";
      persistPreferences();
      renderBoard();
    },
    h: showBestHint,
    c: () => copyText(state.game.fen(), "FEN скопирован."),
    p: () => copyText(state.game.pgn({ maxWidth: 0 }) || "No moves yet.", "PGN скопирован."),
    "?": () => showToast("Hotkeys: N new, U undo, F flip, H hint, C FEN, P PGN."),
  };

  if (shortcuts[key]) {
    event.preventDefault();
    shortcuts[key]();
  }
}

function playHumanMove(move) {
  applyClockTick();
  if (isMatchOver()) {
    renderAll();
    return;
  }

  const moveInput = simplifyMove(move);
  const report = state.coachEnabled ? analyzeMove(state.game, move, state.game.turn()) : null;
  const executed = state.game.move(moveInput);

  if (!executed) {
    showToast("Этот ход недоступен.");
    return;
  }

  finalizeMove(executed, "human", report);
}

function finalizeMove(move, actor, report) {
  addClockIncrement(move.color);
  state.lastMove = move;
  state.hintMove = null;
  clearSelection();

  if (actor === "human" && report) {
    const analysisEntry = {
      ...report,
      moveSan: move.san,
      ply: state.game.history().length,
      createdAt: new Date().toISOString(),
    };
    state.lastCoachReport = analysisEntry;
    state.analysisTrail.unshift(analysisEntry);
    state.analysisTrail = state.analysisTrail.slice(0, 20);
  }

  if (isMatchOver()) {
    persistCompletedGame();
  }

  persistSnapshot();
  renderAll();

  if (actor === "human" && report) {
    showToast(`${report.grade}: ${report.short}`);
  }

  maybeTriggerAiTurn();
}

function maybeTriggerAiTurn() {
  cancelAiTimer();

  const aiTurn = state.mode === "ai" && !isMatchOver() && state.game.turn() === getAiColor();
  state.aiThinking = aiTurn;
  renderStatus();

  if (!aiTurn) {
    return;
  }

  state.aiTimer = window.setTimeout(() => {
    applyClockTick();
    if (isMatchOver()) {
      state.aiThinking = false;
      persistCompletedGame();
      persistSnapshot();
      renderAll();
      return;
    }

    const preset = AI_PRESETS[state.aiLevel];
    const move = chooseAiMove(state.game, preset, getAiColor());
    state.aiThinking = false;

    if (!move) {
      renderAll();
      return;
    }

    const executed = state.game.move(move);
    finalizeMove(executed, "ai", null);
  }, 420);
}

function chooseAiMove(game, preset, aiColor) {
  const searchGame = new Chess(game.fen());
  const legalMoves = dedupePromotionMoves(searchGame.moves({ verbose: true }));
  const cache = new Map();

  if (!legalMoves.length) {
    return null;
  }

  const scoredMoves = legalMoves.map((move) => {
    searchGame.move(simplifyMove(move));
    const score = minimax(searchGame, preset.depth, -Infinity, Infinity, aiColor, preset.style, cache);
    searchGame.undo();
    return { move, score };
  });

  scoredMoves.sort((left, right) => right.score - left.score);
  const bestScore = scoredMoves[0].score;
  const shortlist = scoredMoves.filter((entry) => entry.score >= bestScore - preset.randomness);
  const picked = shortlist[Math.floor(Math.random() * shortlist.length)] || scoredMoves[0];
  return simplifyMove(picked.move);
}

function minimax(game, depth, alpha, beta, perspective, style, cache = new Map()) {
  const cacheKey = `${game.fen()}|${depth}|${perspective}|${style}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (depth === 0 || game.isGameOver()) {
    const leafScore = evaluatePosition(game, perspective);
    cache.set(cacheKey, leafScore);
    return leafScore;
  }

  const maximizing = game.turn() === perspective;
  const moves = orderMoves(game.moves({ verbose: true }), style);

  if (maximizing) {
    let best = -Infinity;
    let cutoff = false;
    for (const move of moves) {
      game.move(simplifyMove(move));
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, perspective, style, cache));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) {
        cutoff = true;
        break;
      }
    }
    if (!cutoff) {
      cache.set(cacheKey, best);
    }
    return best;
  }

  let best = Infinity;
  let cutoff = false;
  for (const move of moves) {
    game.move(simplifyMove(move));
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, perspective, style, cache));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) {
      cutoff = true;
      break;
    }
  }
  if (!cutoff) {
    cache.set(cacheKey, best);
  }
  return best;
}

function analyzeMove(game, moveInput, perspective) {
  const preset = AI_PRESETS[state.aiLevel];
  const bestCandidate = findBestCandidate(game, perspective, Math.max(1, preset.depth));
  let chosenScore = null;
  const analysisGame = new Chess(game.fen());
  const legalMoves = dedupePromotionMoves(analysisGame.moves({ verbose: true }));
  const cache = new Map();

  for (const move of legalMoves) {
    analysisGame.move(simplifyMove(move));
    const score = minimax(analysisGame, Math.max(1, preset.depth), -Infinity, Infinity, perspective, "balanced", cache);
    analysisGame.undo();

    if (sameMove(move, moveInput)) {
      chosenScore = score;
    }
  }

  if (!bestCandidate) {
    return null;
  }

  const score = chosenScore !== null ? chosenScore : bestCandidate.score;
  const delta = Math.max(0, (bestCandidate.score - score) / 100);
  const grade = classifyMove(delta);
  const short = buildShortInsight(moveInput, grade);
  const summary =
    sameMove(bestCandidate.move, moveInput)
      ? `Это был лучший ход в позиции. ${short}`
      : `${short} По оценке движка ты отпустил около ${delta.toFixed(1)} пешки ценности относительно сильнейшего продолжения.`;
  const bestLine =
    sameMove(bestCandidate.move, moveInput)
      ? "Лучшее продолжение уже найдено — просто дожимай позицию дальше."
      : `Лучше смотрелось ${bestCandidate.move.san}: ${describeBestMove(bestCandidate.move)}.`;

  return {
    grade,
    short,
    summary,
    bestLine,
    bestSan: bestCandidate.move.san,
    delta,
    score: score / 100,
  };
}

function findBestCandidate(game, perspective, depth = 1) {
  const analysisGame = new Chess(game.fen());
  const legalMoves = dedupePromotionMoves(analysisGame.moves({ verbose: true }));
  const cache = new Map();
  let bestCandidate = null;

  for (const move of legalMoves) {
    analysisGame.move(simplifyMove(move));
    const score = minimax(analysisGame, depth, -Infinity, Infinity, perspective, "balanced", cache);
    analysisGame.undo();

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = { move, score };
    }
  }

  return bestCandidate;
}

function evaluatePosition(game, perspective) {
  if (game.isCheckmate()) {
    return game.turn() === perspective ? -100000 : 100000;
  }

  if (game.isDraw()) {
    return 0;
  }

  const board = game.board();
  const moveCount = game.history().length;
  const phase = moveCount < 16 ? "opening" : moveCount < 40 ? "middlegame" : "endgame";
  const pawnFiles = {
    w: Array(8).fill(0),
    b: Array(8).fill(0),
  };

  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.type === "p") {
        pawnFiles[piece.color][FILES.indexOf(piece.square[0])] += 1;
      }
    }
  }

  let rawScore = 0;

  board.forEach((row, rowIndex) => {
    row.forEach((piece, columnIndex) => {
      if (!piece) {
        return;
      }

      const direction = piece.color === "w" ? 1 : -1;
      rawScore += direction * (PIECE_VALUES[piece.type] + positionalBonus(piece, rowIndex, columnIndex, phase, pawnFiles));
    });
  });

  rawScore += game.moves().length * 2 * (game.turn() === "w" ? 1 : -1);
  return perspective === "w" ? rawScore : -rawScore;
}

function positionalBonus(piece, rowIndex, columnIndex, phase, pawnFiles) {
  const square = piece.square;
  const fileIndex = columnIndex;
  const rank = Number(square[1]);
  const centerDistance = Math.abs(3.5 - fileIndex) + Math.abs(3.5 - rowIndex);
  const centerPressure = Math.max(0, 4 - centerDistance);
  const edgePenalty = fileIndex === 0 || fileIndex === 7 || rowIndex === 0 || rowIndex === 7 ? 10 : 0;

  switch (piece.type) {
    case "p": {
      const ownFiles = pawnFiles[piece.color];
      const enemyFiles = pawnFiles[piece.color === "w" ? "b" : "w"];
      const advancement = piece.color === "w" ? rank - 2 : 7 - rank;
      const passed =
        (enemyFiles[fileIndex] || 0) === 0 &&
        (enemyFiles[fileIndex - 1] || 0) === 0 &&
        (enemyFiles[fileIndex + 1] || 0) === 0;
      let bonus = advancement * 12;
      if (CENTER_SQUARES.has(square)) {
        bonus += 18;
      } else if (EXTENDED_CENTER.has(square)) {
        bonus += 8;
      }
      if (ownFiles[fileIndex] > 1) {
        bonus -= 12;
      }
      if (passed) {
        bonus += 16 + advancement * 5;
      }
      return bonus;
    }
    case "n":
      return centerPressure * 18 - edgePenalty;
    case "b":
      return centerPressure * 12 + (rowIndex === columnIndex || rowIndex + columnIndex === 7 ? 10 : 0);
    case "r": {
      const ownFiles = pawnFiles[piece.color];
      const enemyFiles = pawnFiles[piece.color === "w" ? "b" : "w"];
      let bonus = 0;
      if (ownFiles[fileIndex] === 0) {
        bonus += 18;
      }
      if (ownFiles[fileIndex] === 0 && enemyFiles[fileIndex] === 0) {
        bonus += 8;
      }
      if ((piece.color === "w" && rank === 7) || (piece.color === "b" && rank === 2)) {
        bonus += 16;
      }
      return bonus;
    }
    case "q":
      return centerPressure * 8 - (phase === "opening" ? edgePenalty / 2 : 0);
    case "k":
      if (phase === "endgame") {
        return centerPressure * 18;
      }
      return ["g1", "c1", "g8", "c8"].includes(square) ? 28 : -centerPressure * 12;
    default:
      return 0;
  }
}

function orderMoves(moves, style) {
  return [...moves].sort((left, right) => scoreMove(right, style) - scoreMove(left, style));
}

function scoreMove(move, style) {
  let score = 0;

  if (move.captured) {
    score += PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece] / 12;
  }
  if (move.promotion) {
    score += 70;
  }
  if (move.san.includes("+")) {
    score += 40;
  }
  if (move.flags.includes("k") || move.flags.includes("q")) {
    score += 32;
  }
  if (CENTER_SQUARES.has(move.to)) {
    score += 24;
  } else if (EXTENDED_CENTER.has(move.to)) {
    score += 10;
  }

  if (style === "aggressive" && (move.captured || move.san.includes("+"))) {
    score += 18;
  }

  if (style === "positional" && (move.flags.includes("k") || move.flags.includes("q") || EXTENDED_CENTER.has(move.to))) {
    score += 12;
  }

  return score;
}

function buildLeaderboard(stats) {
  const city = state.profile.city || INITIAL_PROFILE.city;
  const seed = hashString(city);
  const names = ["Aruzhan", "Madi", "Yelnur", "Amina", "Dias", "Kamila", "Asyl", "Sanzhar"];
  const generated = names.slice(0, 6).map((name, index) => ({
    name,
    city,
    rating: 1180 + ((seed + index * 97) % 280) + (5 - index) * 18,
    isYou: false,
  }));

  generated.push({
    name: state.profile.name || INITIAL_PROFILE.name,
    city,
    rating: stats.rating,
    isYou: true,
  });

  return generated.sort((left, right) => right.rating - left.rating);
}

function deriveStats() {
  const games = state.history.length;
  const wins = state.history.filter((entry) => entry.userOutcome === "win").length;
  const draws = state.history.filter((entry) => entry.userOutcome === "draw").length;
  const losses = state.history.filter((entry) => entry.userOutcome === "loss").length;
  const accuracyValues = state.history.map((entry) => entry.accuracy).filter((value) => Number.isFinite(value));
  const coachAccuracy = accuracyValues.length
    ? Math.round(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length)
    : 100;
  const winRate = games ? Math.round((wins / games) * 100) : 0;
  const streak = calculateStreak(state.history);
  const rating = Math.max(950, Math.round(960 + wins * 26 + draws * 8 - losses * 6 + coachAccuracy * 1.9 + streak * 10));

  return {
    games,
    wins,
    draws,
    losses,
    winRate,
    coachAccuracy,
    streak,
    rating,
  };
}

function calculateStreak(history) {
  if (!history.length) {
    return 0;
  }

  const uniqueDays = [...new Set(history.map((entry) => entry.createdAt.slice(0, 10)))].sort().reverse();
  const latest = new Date(uniqueDays[0]);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  if (!sameUtcDay(latest, today) && !sameUtcDay(latest, yesterday)) {
    return 0;
  }

  let streak = 0;
  let cursor = latest;

  for (const day of uniqueDays) {
    const current = new Date(day);
    if (sameUtcDay(current, cursor)) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 86400000);
      continue;
    }
    break;
  }

  return streak;
}

function persistCompletedGame() {
  const signature = `${state.game.fen()}|${state.game.history().length}|${state.clock.expired || "board"}`;
  if (state.lastFinishedSignature === signature) {
    return;
  }

  state.lastFinishedSignature = signature;
  const result = summarizeResult();
  const accuracy = state.analysisTrail.length
    ? Math.max(
        42,
        Math.round(
          100 -
            (state.analysisTrail.reduce((sum, entry) => sum + Math.min(entry.delta, 5), 0) / state.analysisTrail.length) * 12,
        ),
      )
    : 100;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    title: `${state.profile.name} vs ${state.mode === "ai" ? AI_PRESETS[state.aiLevel].name : "Local Duel"}`,
    modeLabel: state.mode === "ai" ? `AI · ${AI_PRESETS[state.aiLevel].name}` : "Local Duel",
    resultLabel: result.label,
    userOutcome: result.userOutcome,
    city: state.profile.city,
    moveCount: state.game.history().length,
    accuracy,
    topMistakes: [...state.analysisTrail].sort((left, right) => right.delta - left.delta).slice(0, 3),
    pgn: state.game.pgn({ maxWidth: 0 }),
    finalFen: state.game.fen(),
    playerColor: state.playerColor,
    timeControl: TIME_CONTROLS[state.timeControl].label,
  };

  state.history.unshift(entry);
  state.history = state.history.slice(0, 12);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function summarizeResult() {
  if (state.clock.expired) {
    const winner = state.clock.expired === "w" ? "b" : "w";
    return {
      label: winner === "w" ? "1-0 flag" : "0-1 flag",
      userOutcome: winner === state.playerColor ? "win" : "loss",
    };
  }

  if (state.game.isCheckmate()) {
    const winner = state.game.turn() === "w" ? "b" : "w";
    const playerWon = winner === state.playerColor;
    return {
      label: winner === "w" ? "1-0" : "0-1",
      userOutcome: playerWon ? "win" : "loss",
    };
  }

  return {
    label: "1/2-1/2",
    userOutcome: "draw",
  };
}

function undoMove() {
  cancelAiTimer();
  state.aiThinking = false;

  if (!state.game.history().length) {
    showToast("Откатывать пока нечего.");
    return;
  }

  const shouldUndoTwoPlies = state.mode === "ai" && state.game.turn() === state.playerColor && state.game.history().length >= 2;
  state.game.undo();
  if (shouldUndoTwoPlies) {
    state.game.undo();
  }

  state.analysisTrail = state.analysisTrail.filter((entry) => entry.ply <= state.game.history().length);
  state.lastCoachReport = state.analysisTrail[0] || null;
  const history = state.game.history({ verbose: true });
  state.lastMove = history.length ? history[history.length - 1] : null;
  state.lastFinishedSignature = null;
  clearSelection();
  persistSnapshot();
  renderAll();
}

function showBestHint() {
  applyClockTick();

  if (isMatchOver()) {
    showToast("Партия уже завершена.");
    renderAll();
    return;
  }

  const isPlayerTurn = state.mode === "local" || state.game.turn() === state.playerColor;
  if (state.aiThinking || !isPlayerTurn) {
    showToast("Подсказка появится на твоем ходе.");
    return;
  }

  const candidate = findBestCandidate(state.game, state.game.turn(), Math.max(1, AI_PRESETS[state.aiLevel].depth - 1));
  if (!candidate) {
    showToast("В этой позиции нет легальных ходов.");
    return;
  }

  state.hintMove = simplifyMove(candidate.move);
  state.selectedSquare = candidate.move.from;
  state.legalMoves = dedupePromotionMoves(state.game.moves({ square: candidate.move.from, verbose: true }));
  renderAll();
  showToast(`Идея: ${candidate.move.san}. ${describeBestMove(candidate.move)}`);
}

function startNewGame(message) {
  cancelAiTimer();
  state.aiThinking = false;
  state.game = new Chess();
  state.clock = createClock(state.timeControl);
  state.lastMove = null;
  state.analysisTrail = [];
  state.lastCoachReport = null;
  state.hintMove = null;
  state.lastFinishedSignature = null;
  clearSelection();
  persistSnapshot();
  renderAll();
  maybeTriggerAiTurn();
  if (message) {
    showToast(message);
  }
}

async function shareCurrentPosition() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("fen", state.game.fen());
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("side", state.playerColor);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url.toString());
      showToast("Ссылка на позицию скопирована.");
      return;
    }
  } catch (error) {
    console.error("Clipboard failed:", error);
  }

  window.prompt("Скопируй ссылку на позицию вручную", url.toString());
}

function persistSnapshot() {
  const snapshot = {
    pgn: state.game.pgn({ maxWidth: 0 }),
    mode: state.mode,
    aiLevel: state.aiLevel,
    timeControl: state.timeControl,
    playerColor: state.playerColor,
    orientation: state.orientation,
    clock: state.clock,
    lastMove: state.lastMove,
    analysisTrail: state.analysisTrail,
    lastCoachReport: state.lastCoachReport,
  };
  localStorage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(snapshot));
}

function persistPreferences() {
  localStorage.setItem(
    STORAGE_KEYS.preferences,
    JSON.stringify({
      mode: state.mode,
      aiLevel: state.aiLevel,
      playerColor: state.playerColor,
      theme: state.theme,
      boardTheme: state.boardTheme,
      timeControl: state.timeControl,
      coachEnabled: state.coachEnabled,
      orientation: state.orientation,
    }),
  );
}

function persistProfile() {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(state.profile));
}

function cancelAiTimer() {
  if (state.aiTimer) {
    window.clearTimeout(state.aiTimer);
    state.aiTimer = null;
  }
}

function clearSelection() {
  state.selectedSquare = null;
  state.legalMoves = [];
  state.hintMove = null;
}

function dedupePromotionMoves(moves) {
  const map = new Map();
  for (const move of moves) {
    const key = `${move.from}-${move.to}`;
    if (!map.has(key) || move.promotion === "q") {
      map.set(key, move);
    }
  }
  return [...map.values()];
}

function simplifyMove(move) {
  return {
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  };
}

function sameMove(left, right) {
  return left.from === right.from && left.to === right.to && (left.promotion || "q") === (right.promotion || "q");
}

function getAiColor() {
  return state.playerColor === "w" ? "b" : "w";
}

function canDragPiece(piece) {
  if (!piece || state.aiThinking || isMatchOver()) {
    return false;
  }

  const playableTurn = state.mode === "local" || state.game.turn() === state.playerColor;
  return playableTurn && piece.color === state.game.turn();
}

function createClock(timeControl) {
  const control = TIME_CONTROLS[timeControl] || TIME_CONTROLS.rapid;
  return {
    w: Number.isFinite(control.base) ? control.base : Infinity,
    b: Number.isFinite(control.base) ? control.base : Infinity,
    lastTick: Date.now(),
    expired: null,
  };
}

function hydrateClock(clock, timeControl) {
  const fallback = createClock(timeControl);
  if (!clock || typeof clock !== "object") {
    return fallback;
  }

  return {
    w: Number.isFinite(clock.w) ? clock.w : fallback.w,
    b: Number.isFinite(clock.b) ? clock.b : fallback.b,
    lastTick: Date.now(),
    expired: clock.expired === "w" || clock.expired === "b" ? clock.expired : null,
  };
}

function startClockTicker() {
  window.clearInterval(state.clockTimer);
  state.clockTimer = window.setInterval(() => {
    const expiredNow = applyClockTick();
    if (expiredNow) {
      persistCompletedGame();
      persistSnapshot();
      showToast(`${state.clock.expired === "w" ? "Белые" : "Черные"} проиграли по времени.`);
    }
    renderClocks();
    renderStatus();
    renderReviewLab();
  }, 1000);
}

function applyClockTick() {
  if (!isClockEnabled() || state.clock.expired || state.game.isGameOver()) {
    state.clock.lastTick = Date.now();
    return false;
  }

  const now = Date.now();
  const elapsed = Math.max(0, (now - state.clock.lastTick) / 1000);
  state.clock.lastTick = now;

  const color = state.game.turn();
  state.clock[color] = Math.max(0, state.clock[color] - elapsed);

  if (state.clock[color] <= 0) {
    state.clock.expired = color;
    state.aiThinking = false;
    cancelAiTimer();
    clearSelection();
    return true;
  }

  return false;
}

function addClockIncrement(color) {
  const control = TIME_CONTROLS[state.timeControl] || TIME_CONTROLS.rapid;
  if (!isClockEnabled() || !control.increment) {
    return;
  }
  state.clock[color] += control.increment;
  state.clock.lastTick = Date.now();
}

function isClockEnabled() {
  const control = TIME_CONTROLS[state.timeControl] || TIME_CONTROLS.rapid;
  return Number.isFinite(control.base);
}

function isMatchOver() {
  return state.game.isGameOver() || Boolean(state.clock.expired);
}

function findKingSquare(color) {
  for (const row of state.game.board()) {
    for (const piece of row) {
      if (piece && piece.type === "k" && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

function pieceAsset(piece) {
  return `./assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
}

function pieceName(piece) {
  const names = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return `${piece.color === "w" ? "white" : "black"} ${names[piece.type]}`;
}

function classifyMove(delta) {
  if (delta <= 0.15) {
    return "Лучший ход";
  }
  if (delta <= 0.5) {
    return "Сильный ход";
  }
  if (delta <= 1.1) {
    return "Нормальный ход";
  }
  if (delta <= 2.2) {
    return "Неточность";
  }
  if (delta <= 3.6) {
    return "Ошибка";
  }
  return "Зевок";
}

function buildShortInsight(move, grade) {
  if (move.flags && (move.flags.includes("k") || move.flags.includes("q"))) {
    return `${grade}: ты вовремя рокировал и улучшил безопасность короля.`;
  }
  if (move.captured) {
    return `${grade}: ход связан с разменом материала и сменой темпа.`;
  }
  if (move.piece === "p" && CENTER_SQUARES.has(move.to)) {
    return `${grade}: ты поставил пешку в центр и занял важное пространство.`;
  }
  if (move.san && move.san.includes("+")) {
    return `${grade}: шах создал практическое давление на соперника.`;
  }
  return `${grade}: позиция изменилась не только по материалу, но и по инициативе.`;
}

function describeBestMove(move) {
  if (move.flags.includes("k") || move.flags.includes("q")) {
    return "рокировка усиливала безопасность короля и готовила ладью к игре.";
  }
  if (move.captured) {
    return "этот размен выигрывал больше материала или улучшал структуру.";
  }
  if (CENTER_SQUARES.has(move.to) || EXTENDED_CENTER.has(move.to)) {
    return "ход усиливал контроль центра и расширял активность фигур.";
  }
  if (move.san.includes("+")) {
    return "шах заставлял соперника реагировать и не давал ему перехватить темп.";
  }
  return "это продолжение держало позицию плотнее и оставляло больше активных планов.";
}

function drawReason(game) {
  if (game.isStalemate()) {
    return "Пат: у стороны на ходе нет легальных ходов, но шаха нет.";
  }
  if (game.isInsufficientMaterial()) {
    return "Ничья по недостатку материала.";
  }
  if (game.isThreefoldRepetition()) {
    return "Ничья по троекратному повторению позиции.";
  }
  return "Позиция завершилась миром.";
}

function isDarkSquare(file, rank) {
  return (FILES.indexOf(file) + rank) % 2 === 1;
}

function formatPawnScore(score) {
  return `${score >= 0 ? "+" : ""}${score.toFixed(1)}`;
}

function formatClock(seconds) {
  if (!Number.isFinite(seconds)) {
    return "∞";
  }

  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function normalizeSan(value) {
  return String(value)
    .replace(/[+#?!]/g, "")
    .replace(/=Q|=R|=B|=N/g, "")
    .trim();
}

async function copyText(value, successMessage) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
      return;
    }
  } catch (error) {
    console.error("Clipboard failed:", error);
  }

  window.prompt("Скопируй вручную", value);
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to parse localStorage key ${key}:`, error);
    return fallback;
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("toast--visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("toast--visible");
  }, 2400);
}

function hashString(value) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 100000, 7);
}

function cleanInput(value, maxLength) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sameUtcDay(left, right) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function pluralizeGames(value) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return "партия";
  }
  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return "партии";
  }
  return "партий";
}
