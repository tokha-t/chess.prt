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
    depth: 2,
    randomness: 0,
    style: "positional",
  },
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
  aiThinking: false,
  aiTimer: null,
  toastTimer: null,
  lastFinishedSignature: null,
};

const elements = {};

init();

function init() {
  captureElements();
  prioritizeBoardPanel();
  hydrateFromShareOrSnapshot();
  bindEvents();
  applyTheme();
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
  elements.momentumBadge = document.getElementById("momentum-badge");
  elements.momentumCopy = document.getElementById("momentum-copy");
  elements.moveList = document.getElementById("move-list");
  elements.moveCountBadge = document.getElementById("move-count-badge");
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
  elements.themeSelect = document.getElementById("theme-select");
  elements.boardThemeSelect = document.getElementById("board-theme-select");
  elements.coachToggle = document.getElementById("coach-toggle");
  elements.toast = document.getElementById("toast");
  elements.newGameBtn = document.getElementById("new-game-btn");
  elements.shareBtn = document.getElementById("share-btn");
  elements.flipBtn = document.getElementById("flip-btn");
  elements.undoBtn = document.getElementById("undo-btn");
  elements.resetBtn = document.getElementById("reset-btn");
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
    state.playerColor = snapshot.playerColor || state.playerColor;
    state.orientation = snapshot.orientation || state.orientation;
    state.lastMove = snapshot.lastMove || null;
    state.analysisTrail = Array.isArray(snapshot.analysisTrail) ? snapshot.analysisTrail : [];
    state.lastCoachReport = snapshot.lastCoachReport || state.analysisTrail[0] || null;
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

function renderAll() {
  syncControls();
  renderStatus();
  renderBoard();
  renderMoveList();
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
  elements.themeSelect.value = state.theme;
  elements.boardThemeSelect.value = state.boardTheme;
  elements.coachToggle.checked = Boolean(state.coachEnabled);
}

function renderStatus() {
  const preset = AI_PRESETS[state.aiLevel];
  const moveCount = state.game.history().length;
  const aiColor = getAiColor();
  const playerTurn = state.game.turn() === state.playerColor;

  let title = "Матч готов к старту";
  let subtitle = "Выбери фигуру, чтобы увидеть доступные ходы.";
  let badge = moveCount < 12 ? "Opening" : moveCount < 40 ? "Middlegame" : "Endgame";
  let dotColor = "var(--accent)";

  if (state.game.isCheckmate()) {
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

        const pieceMarkup = piece
          ? `<img class="piece" src="${pieceAsset(piece)}" alt="${pieceName(piece)}" draggable="false" />`
          : "";
        const dotMarkup = legalMove && !piece ? `<span class="move-dot"></span>` : "";
        const rankLabel = visualColumnIndex === 0 ? `<span class="square__coord square__coord--rank">${rank}</span>` : "";
        const fileLabel = visualRowIndex === 7 ? `<span class="square__coord square__coord--file">${file}</span>` : "";

        return `
          <button class="${classes.join(" ")}" type="button" data-square="${square}" aria-label="${square}">
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
  state.legalMoves = legalMoves;
  renderStatus();
  renderBoard();
}

function playHumanMove(move) {
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
  state.lastMove = move;
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

  if (state.game.isGameOver()) {
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

  const aiTurn = state.mode === "ai" && !state.game.isGameOver() && state.game.turn() === getAiColor();
  state.aiThinking = aiTurn;
  renderStatus();

  if (!aiTurn) {
    return;
  }

  state.aiTimer = window.setTimeout(() => {
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

  if (!legalMoves.length) {
    return null;
  }

  const scoredMoves = legalMoves.map((move) => {
    searchGame.move(simplifyMove(move));
    const score = minimax(searchGame, preset.depth, -Infinity, Infinity, aiColor, preset.style);
    searchGame.undo();
    return { move, score };
  });

  scoredMoves.sort((left, right) => right.score - left.score);
  const bestScore = scoredMoves[0].score;
  const shortlist = scoredMoves.filter((entry) => entry.score >= bestScore - preset.randomness);
  const picked = shortlist[Math.floor(Math.random() * shortlist.length)] || scoredMoves[0];
  return simplifyMove(picked.move);
}

function minimax(game, depth, alpha, beta, perspective, style) {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(game, perspective);
  }

  const maximizing = game.turn() === perspective;
  const moves = orderMoves(game.moves({ verbose: true }), style);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(simplifyMove(move));
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, perspective, style));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) {
        break;
      }
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    game.move(simplifyMove(move));
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, perspective, style));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) {
      break;
    }
  }
  return best;
}

function analyzeMove(game, moveInput, perspective) {
  const preset = AI_PRESETS[state.aiLevel];
  const analysisGame = new Chess(game.fen());
  const legalMoves = dedupePromotionMoves(analysisGame.moves({ verbose: true }));
  let bestCandidate = null;
  let chosenScore = null;

  for (const move of legalMoves) {
    analysisGame.move(simplifyMove(move));
    const score = minimax(analysisGame, Math.max(1, preset.depth), -Infinity, Infinity, perspective, "balanced");
    analysisGame.undo();

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = { move, score };
    }

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
  const signature = `${state.game.fen()}|${state.game.history().length}`;
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
  };

  state.history.unshift(entry);
  state.history = state.history.slice(0, 12);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function summarizeResult() {
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

function startNewGame(message) {
  cancelAiTimer();
  state.aiThinking = false;
  state.game = new Chess();
  state.lastMove = null;
  state.analysisTrail = [];
  state.lastCoachReport = null;
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
    playerColor: state.playerColor,
    orientation: state.orientation,
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
