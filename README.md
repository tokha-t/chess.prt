# ChessMentor AI

## Short description
ChessMentor AI is a web-based chess learning platform for beginners and students. It allows users to play chess, compete against AI, save game history, track progress, and receive simple post-game mistake analysis.

Live demo: https://chesspulse-great.netlify.app/

## Problem
Most chess platforms show users what the best move is, but beginners often do not understand why their move was wrong. This makes improvement difficult without a coach.

## Solution
ChessMentor AI turns each game into a learning experience by explaining mistakes in simple language, tracking progress, and giving users a clear direction for improvement.

## Target users
- Beginner chess players
- Students
- People who want to improve without hiring a coach
- Casual players who want feedback after games

## Features
- Full chess rules with `chess.js`
- Local two-player mode
- Play against AI
- AI difficulty levels: Easy, Medium, Hard
- Online room mode using Supabase Realtime WebSocket broadcasts
- Time controls: Classic, Rapid, Blitz
- User authentication with Supabase
- Saved game history
- Post-game review
- Rule-based mistake cards
- Daily mission system with XP rewards
- Shareable game reports
- Per-move evaluation with green/red feedback
- Dashboard with progress
- City leaderboard
- Dark/light theme
- Responsive desktop and mobile design

## Tech stack
- React
- Vite dev server
- `chess.js`
- `react-chessboard`
- Supabase Auth and Database
- Supabase Realtime for WebSocket-style online rooms
- Rule-based move evaluation and report generation
- CSS modules via plain responsive CSS
- Netlify-ready SPA build

## Database
The Supabase schema is in `supabase-schema.sql`.

Tables:
- `profiles`: user profile, city, rating, XP, games played, wins, losses, draws
- `games`: saved PGN/FEN, move history, result, mistakes, accuracy, opponent type, move evaluations, report data, XP earned
- `daily_missions`: three daily tasks per user with progress, completion state, and XP rewards
- `game_reports`: public-safe shareable report rows keyed by `share_id`

Security:
- Row Level Security is enabled.
- Users can read, insert, and update their own games.
- Users can update their own profile.
- Profile ranking fields are readable for the leaderboard.

## Business potential
ChessMentor AI can start as a free learning platform for casual players, then expand into a Pro plan for advanced AI analysis, unlimited reviews, custom board skins, city tournaments, and school chess programs.

## Advanced Creative Features

### Daily Mission System
The platform gives logged-in users daily chess tasks such as playing a game, castling early, reaching high accuracy, making good moves, or reviewing a game. Completing missions rewards XP and encourages consistent learning.

### Shareable Game Report
After each game, users receive a performance report with result, accuracy, good moves, mistakes, main weakness, coach tip, and XP earned. Reports can be copied, downloaded as an SVG image, or shared through a public `/share/:shareId` link that does not expose email/private data.

### Per-Move Evaluation
Every legal move is evaluated with a beginner-friendly rule-based model. Good moves are highlighted in green, inaccuracies in yellow/gray, and mistakes/blunders in red. Move history, game review, and reports use these evaluations to explain progress clearly.

## Future improvements
- Rated matchmaking and public invite links
- Real Stockfish cloud analysis
- Puzzle generation from user mistakes
- School and university tournaments
- Stripe integration
- Mobile app

## How to run locally
Install dependencies:

```bash
npm install
```

Start the local app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The local build writes production files to `dist/`.

## Environment variables
Create `.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Do not commit real Supabase keys. Without these variables, guest play still works, but authentication and cloud saves are disabled.

## Supabase setup
1. Create a Supabase project.
2. Open the SQL editor.
3. Run the contents of `supabase-schema.sql`.
4. Copy the project URL and anon public key into `.env`.
5. Restart `npm run dev`.

Realtime multiplayer:
- The `/play` page includes an Online Room mode powered by Supabase Realtime broadcasts.
- Players use the same room code and choose opposite sides.
- No extra table is required for the live room because moves are sent over the Realtime WebSocket channel.

Advanced feature setup:
- Run the latest `supabase-schema.sql` after pulling updates so `daily_missions`, `game_reports`, and the new `games` report columns exist.
- If the new schema is not applied yet, guest play and basic saving still work, but missions/share links cannot persist.

## Product flow
1. Visit `/` to understand the product value.
2. Go to `/play` to play locally, against AI, or in an Online Room.
3. Sign up or log in to save finished games.
4. Open `/history` to review saved games.
5. Use `/dashboard` to track progress and skills.
6. Complete daily missions for XP.
7. Copy or share a game report after a finished game.
8. Use `/leaderboard` to compare players by city, XP, or rating.

## Legacy version
The previous static ChessPulse implementation is preserved in `legacy/` so the project history is not lost.
