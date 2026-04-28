# ChessMentor AI

ChessMentor AI is a modern web-based chess learning platform for beginners, students, and casual players. It combines a legal chess board, AI opponents, saved game history, progress tracking, daily missions, game reports, and simple post-game coaching in one product-like MVP.

Live demo: https://chessmentor-ai.netlify.app

## Product Idea

Most chess platforms show engine lines or the best move, but beginners often still do not understand why a move was good or bad. ChessMentor AI focuses on beginner-friendly learning: after each game, the user receives simple explanations, progress stats, and practical next steps.

The platform is built around a clear learning loop:

1. Play a chess game.
2. Get simple feedback.
3. Review mistakes.
4. Complete daily missions.
5. Track progress over time.
6. Share a clean game report.

## Target Users

- Beginner chess players who want guidance without a personal coach.
- Students learning chess in school or clubs.
- Casual players who want a friendly way to improve.
- Users who need a lightweight platform for practice, review, and progress tracking.

## Core Features

### Full Chess Rules

The chess logic is powered by `chess.js`, so the app supports real legal chess rules instead of acting like a static board.

- Legal moves only.
- Turn-based movement.
- Check detection.
- Checkmate detection.
- Stalemate and draw detection.
- Castling.
- En passant.
- Pawn promotion, currently auto-promotes to queen for speed.
- Resign button.
- Undo button where the current mode allows it.
- New game reset.
- Move history in SAN notation.
- Final FEN and PGN storage for saved games.

### Game Modes

ChessMentor AI supports several ways to play:

- `Local 2 Player`: two people can play on the same device.
- `Play vs AI`: user plays against a built-in AI opponent.
- `Online Room`: two players can join the same room code and play through Supabase Realtime WebSocket broadcasts.

### Time Controls

The play page includes common chess time-control presets:

- Classic: 30 minutes.
- Rapid: 10 minutes.
- Blitz: 5 minutes.

Each side has its own clock, and games can end by timeout.

### AI Opponent

The AI system is implemented in `src/lib/aiPlayer.js`.

- Easy: picks a random legal move.
- Medium: prefers captures, checks, checkmates, and material gain.
- Hard: uses a simple minimax-style search with material evaluation.

The AI has a short delay so it feels more natural instead of moving instantly.

### Move Evaluation

Per-move evaluation is implemented in `src/lib/moveEvaluation.js`.

In `Play vs AI` mode, the app evaluates only the user's moves. AI moves are intentionally not evaluated in the live move history, because the feedback should teach the player rather than grade the opponent.

Move evaluation is disabled in:

- `Local 2 Player`
- `Online Room`

Move labels:

- Excellent: green.
- Good: green.
- Neutral: gray.
- Inaccuracy: yellow.
- Mistake: red.
- Blunder: red.

The evaluator is rule-based and uses:

- Material balance.
- Captures.
- Checks.
- Checkmate.
- Early castling.
- Opening development.
- Early queen movement.
- Basic hanging-piece detection.

These evaluations are used for:

- Move history badges.
- Game review quality summary.
- Accuracy estimate.
- Good/bad move counts.
- Shareable game report.

### AI Coach / Post-Game Review

After a game ends, the app generates a beginner-friendly review in `src/lib/gameAnalysis.js`.

The review can detect patterns such as:

- Queen safety issues.
- King safety issues.
- Late or missing castling.
- Moving the same piece too often in the opening.
- Material loss.
- Missed mating threats.

The review shows:

- Estimated accuracy.
- Mistake cards.
- Practical tips.
- Suggested practice area.

This is intentionally labeled as rule-based coaching, not fake GPT or engine analysis.

### Shareable Game Report

After a game, ChessMentor AI generates a polished report using `src/lib/gameReport.js`.

The report includes:

- Player name.
- Date.
- Result.
- Opponent type.
- User color.
- Accuracy score.
- Number of moves.
- Good moves count.
- Mistakes count.
- Best move or best moment.
- Worst move or biggest mistake.
- Main weakness.
- Coach tip.
- XP earned.
- Share ID.

Report actions:

- Copy report summary to clipboard.
- Download the report as an SVG image.
- Copy a public share link.
- Open a public report page at `/share/:shareId`.

Public share pages do not expose private user email or private game ownership data.

### Daily Mission System

Daily missions are implemented in `src/lib/dailyMissions.js`.

Logged-in users receive 3 daily missions:

- One easy mission.
- One skill mission.
- One challenge mission.

Example missions:

- Play one game.
- Win a game.
- Castle before move 10.
- Finish with accuracy above 70%.
- Avoid losing the queen.
- Make 5 good moves.
- Play against Hard AI.
- Complete a game review.

Mission progress updates after relevant game events. Completed missions reward XP and are protected against duplicate XP rewards.

The mission card appears on:

- Dashboard.
- Play sidebar.

### Authentication

Authentication is powered by Supabase Auth.

Supported flows:

- Email/password sign up.
- Email/password login.
- Logout.
- Persisted session.
- Guest mode for users who want to play without saving data.

Protected areas:

- Dashboard.
- History.
- Saved game review pages.

Guest users can still play games, but cloud saves, history, profile progress, and daily missions require login.

### Saved Game History

Logged-in users can save finished games to Supabase.

Saved game data includes:

- Opponent type.
- User color.
- Result.
- Final FEN.
- PGN.
- Move history.
- Mistake cards.
- Accuracy.
- Move evaluations.
- Game report data.
- XP earned.
- Share ID.

The history page shows saved games and links to review pages.

### Dashboard

The dashboard gives users a quick progress overview.

Dashboard cards include:

- Games played.
- Wins.
- Losses.
- Draws.
- Win rate.
- XP.
- Rating.
- City.
- Recent games.
- Recent report summaries.
- Daily missions.
- Skill profile.

The skill profile is calculated from saved games and mistakes:

- Opening.
- Tactics.
- Endgame.
- King Safety.
- Blunder Control.

### Leaderboard

The leaderboard uses profile data from Supabase.

Users can compare players by:

- Global ranking.
- City filter.
- Rating.
- XP.
- Games played.

Supported city filters:

- Astana.
- Almaty.
- Kostanay.
- Shymkent.
- Other.

### Dark / Light Theme

The app includes a theme toggle in the navbar.

- Theme preference is stored in `localStorage`.
- Both board and panels are styled for light and dark modes.
- Colors are designed to remain readable in both themes.

### Responsive UI

The interface is built with responsive CSS.

Desktop layout:

- Board on the left.
- Controls, status, move history, missions, and review panels on the right.

Mobile layout:

- Board becomes full width.
- Panels stack below the board.
- Buttons are touch-friendly.
- Horizontal scrolling is avoided.

## Routes

The app uses React Router.

- `/`: landing page.
- `/play`: main chess game.
- `/dashboard`: user progress dashboard.
- `/history`: saved games history.
- `/review/:id`: saved game review.
- `/leaderboard`: global/city leaderboard.
- `/login`: login page.
- `/signup`: sign up page.
- `/share/:shareId`: public shareable game report.

## Product Pages

### Landing Page

The home page explains the product value with:

- Hero section.
- Feature cards.
- Beginner-friendly positioning.
- Pricing mockup.
- Free and Pro plan cards.

The Pro plan is a mock business concept only. There are no real payments in this MVP.

### Play Page

The play page contains:

- Chessboard.
- AI thinking indicator.
- Game status.
- Mode selector.
- Difficulty selector.
- Side selector.
- Time control selector.
- Clocks.
- Online room controls.
- Move history.
- Daily missions.
- Game report after game end.
- Game review after game end.

### Dashboard Page

The dashboard contains:

- Profile summary.
- Stats cards.
- Skill profile bars.
- Daily missions.
- Recent games.
- Recent reports.

### History Page

The history page shows the user's saved games and allows opening a detailed review.

### Review Page

The review page shows:

- Final board position.
- Game report.
- AI Coach review.
- Colored move history if evaluations exist.
- Play Again button.

### Share Page

The share page displays a public-safe game report by `share_id`.

## Tech Stack

- React 18.
- Vite.
- React Router.
- `chess.js`.
- `react-chessboard`.
- Supabase Auth.
- Supabase Postgres.
- Supabase Realtime broadcasts for online rooms.
- Plain responsive CSS.
- Netlify deployment.

## Project Structure

```text
src/
  App.jsx
  main.jsx
  styles.css
  context/
    AuthContext.jsx
  components/
    AIThinkingIndicator.jsx
    AuthForm.jsx
    ChessBoard.jsx
    DailyMissionsCard.jsx
    DashboardStats.jsx
    GameControls.jsx
    GameReportCard.jsx
    GameReview.jsx
    GameStatus.jsx
    LeaderboardTable.jsx
    MissionItem.jsx
    MistakeCard.jsx
    MoveEvaluationBadge.jsx
    MoveHistory.jsx
    MoveQualitySummary.jsx
    Navbar.jsx
    PricingCards.jsx
    SkillProfile.jsx
    ThemeToggle.jsx
  lib/
    aiPlayer.js
    chessEngine.js
    dailyMissions.js
    database.js
    gameAnalysis.js
    gameReport.js
    moveEvaluation.js
    supabaseClient.js
    xpSystem.js
  pages/
    Dashboard.jsx
    History.jsx
    Home.jsx
    Leaderboard.jsx
    Login.jsx
    Play.jsx
    Review.jsx
    ShareReport.jsx
    Signup.jsx
```

## Main Libraries and Responsibilities

### `src/lib/chessEngine.js`

Handles chess game helpers:

- Game creation.
- Status detection.
- Result detection.
- Move serialization.
- Move history formatting.
- King-square lookup for check highlighting.

### `src/lib/aiPlayer.js`

Handles AI move selection:

- Easy random AI.
- Medium tactical/material AI.
- Hard minimax-style AI.

### `src/lib/moveEvaluation.js`

Handles rule-based move classification:

- Position evaluation.
- Move classification.
- Accuracy calculation.
- Move quality summary.
- Badge label/color mapping.

### `src/lib/gameAnalysis.js`

Handles post-game coaching:

- Mistake pattern detection.
- Practice area recommendation.
- Accuracy fallback when move evaluations are unavailable.

### `src/lib/gameReport.js`

Handles report generation:

- Share ID creation.
- Report summary formatting.
- Share URL creation.
- Stored report normalization.

### `src/lib/dailyMissions.js`

Handles missions:

- Generate daily missions.
- Ensure today's missions exist.
- Update mission progress.
- Complete missions.
- Reward XP.

### `src/lib/database.js`

Handles Supabase data access:

- Save games.
- Load games.
- Load game by ID.
- Update profile stats.
- Load leaderboard.
- Load/update profile.
- Create game reports.
- Load public game reports by share ID.

### `src/lib/supabaseClient.js`

Creates the Supabase client from environment variables.

### `src/lib/xpSystem.js`

Calculates XP from game result and accuracy.

## Database

The full database setup is in `supabase-schema.sql`.

### Tables

#### `profiles`

Stores user progress and leaderboard data.

Fields:

- `id`
- `username`
- `city`
- `rating`
- `xp`
- `games_played`
- `wins`
- `losses`
- `draws`
- `created_at`
- `updated_at`

#### `games`

Stores saved games.

Fields:

- `id`
- `user_id`
- `opponent_type`
- `user_color`
- `result`
- `final_fen`
- `pgn`
- `move_history`
- `mistakes`
- `accuracy`
- `report`
- `move_evaluations`
- `good_moves_count`
- `bad_moves_count`
- `xp_earned`
- `share_id`
- `created_at`

#### `daily_missions`

Stores daily mission progress.

Fields:

- `id`
- `user_id`
- `mission_type`
- `title`
- `description`
- `target_value`
- `current_value`
- `xp_reward`
- `completed`
- `completed_at`
- `mission_date`
- `created_at`

#### `game_reports`

Stores public-safe shareable report data.

Fields:

- `id`
- `game_id`
- `user_id`
- `username`
- `result`
- `opponent_type`
- `user_color`
- `accuracy`
- `total_moves`
- `good_moves_count`
- `bad_moves_count`
- `best_move`
- `worst_move`
- `main_weakness`
- `coach_tip`
- `xp_earned`
- `share_id`
- `report`
- `created_at`

### View

#### `leaderboard`

The `leaderboard` view exposes profile ranking data:

- `user_id`
- `username`
- `city`
- `rating`
- `xp`
- `games_played`
- `updated_at`

### Row Level Security

RLS is enabled for the main tables.

Security rules:

- Users can insert and update only their own profile.
- Users can read, insert, and update only their own games.
- Users can read, insert, and update only their own daily missions.
- Users can read and insert only their own reports.
- Public users can read shareable reports when `share_id` exists.
- Public leaderboard/profile ranking fields are readable.

## Environment Variables

Create `.env` from `.env.example`.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Important:

- Use the public Supabase anon key only.
- Do not commit real credentials.
- Without Supabase variables, guest play still works.
- Authentication, cloud saves, missions, leaderboard updates, online rooms, and share persistence require Supabase configuration.

## Local Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The production build is written to `dist/`.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the contents of `supabase-schema.sql`.
4. Copy the project URL into `VITE_SUPABASE_URL`.
5. Copy the public anon key into `VITE_SUPABASE_ANON_KEY`.
6. Restart the dev server.
7. Create a user through the app signup page.
8. Confirm that a profile row is created automatically.

Realtime online rooms use Supabase Realtime broadcast channels, so no extra room table is required.

## Deployment

The app is deployed on Netlify as a Vite SPA.

Production URL:

```text
https://chesspulse-great.netlify.app/
```

Recommended Netlify build settings:

```text
Build command: npm run build
Publish directory: dist
```

For SPA routing, Netlify should redirect all app routes to `index.html`. The project includes Netlify-ready deployment behavior.

## Business Potential

ChessMentor AI can start with a free plan and expand into paid learning features.

Free plan:

- Play games.
- Save limited history.
- Basic AI Coach.
- Daily missions.
- Basic reports.

Pro plan concept:

- Unlimited game analysis.
- Stronger engine-based review.
- Advanced mistake explanations.
- Custom board themes.
- Puzzle generation from mistakes.
- City tournaments.
- School or club dashboards.

No real payment system is implemented in this MVP.

## Current Limitations

- The AI is rule-based/minimax-style, not a real Stockfish engine.
- Pawn promotion auto-selects queen.
- Online rooms use broadcast channels and are designed as a lightweight MVP, not a tournament-grade multiplayer server.
- Move evaluation is educational and approximate, not engine-perfect.
- Per-move evaluation is intentionally live only for the user's moves in AI mode.
- Local and online games do not show live move evaluation to avoid grading both players or confusing multiplayer flow.

## Quality Checklist

The project currently supports:

- Legal chess gameplay.
- AI opponent.
- Local 2-player mode.
- Online room mode.
- Classic/Rapid/Blitz time controls.
- Authentication.
- Guest mode.
- Saved games.
- Game history.
- Game review.
- Dashboard.
- Leaderboard.
- Daily missions.
- Shareable game reports.
- User-only move evaluation in AI games.
- Dark/light theme.
- Responsive design.
- Netlify deployment.

## Future Improvements

- Real Stockfish analysis.
- Real-time multiplayer with authoritative server validation.
- Invite links for online rooms.
- Puzzle generation from user mistakes.
- More detailed opening/endgame lessons.
- Stripe subscription integration.
- School and university tournament mode.
- Mobile app.
- User avatars and profile customization.
- More board themes and piece sets.

## Legacy Version

The previous static ChessPulse implementation is preserved in `legacy/` so the project history is not lost.
