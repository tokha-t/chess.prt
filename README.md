# ChessPulse

**ChessPulse** is a modern chess web app designed as a product prototype, not just a board demo.

It combines:

- legal chess gameplay with full move validation
- a built-in AI opponent
- an **AI Coach** that evaluates your decisions after each move
- persistent match history in `localStorage`
- a city-based leaderboard for a stronger social loop
- a premium-ready product layer with monetization cues
- a responsive interface that works well on desktop and mobile

## Product Idea

Most test assignments stop at “a chessboard that works”.

ChessPulse is framed differently: it is a **retention-focused chess product** for players who want quick matches, instant feedback, and a feeling of progression.

The app is built around 3 value loops:

1. **Play loop**: start a game instantly and face an AI opponent.
2. **Improve loop**: get feedback from AI Coach and understand which moves lost tempo.
3. **Return loop**: save your history, track accuracy, and climb a city leaderboard.

That makes the project feel closer to a startup MVP than a coding exercise.

## Core Features

- **Full chess rules** via `chess.js`
- **AI Opponent** with multiple personalities:
  - `Spark` for fast and aggressive play
  - `Studio` for balanced training games
  - `Apex` for colder positional play
- **AI Coach**
  - classifies moves
  - estimates evaluation loss
  - suggests a better continuation when available
- **Persistent profile**
  - player name
  - city
  - preferred side, theme, and board palette
- **Match history**
  - result
  - accuracy
  - biggest mistakes
  - move count
- **City leaderboard**
  - gives the product a social hook instead of a sterile stats panel
- **Shareable challenge links**
  - current board state can be shared through URL params
- **Premium-ready UX**
  - “Upgrade to Pro” card
  - clear room for deeper analysis, opening prep, and cosmetics

## Why This Stands Out

This project intentionally goes beyond the “medium” level from the assignment:

- it is playable
- it looks like a polished consumer product
- it includes coaching and retention mechanics
- it introduces a monetization layer
- it tells a clear product story in addition to shipping code

## Stack

- HTML
- CSS
- Vanilla JavaScript
- local `chess.js` vendor build
- custom minimax-based AI and move evaluation
- `localStorage` for persistence

## Run Locally

Because the app is static and self-contained, no Node.js setup is required.

From the project folder:

```bash
python3 -m http.server 4173
```

Then open:

[`http://localhost:4173`](http://localhost:4173)

## Deploy Fast

Because this is a static project, the fastest deployment paths are:

1. **Netlify Drop**
   - go to [Netlify Drop](https://app.netlify.com/drop)
   - drag the project folder
   - get a public URL in minutes
2. **GitHub + Vercel**
   - push the folder to a GitHub repo
   - import it into Vercel as a static project
3. **GitHub Pages**
   - push the repo
   - serve the root folder as a static site

For the assignment, Netlify Drop is usually the fastest option if time is tight.

## Files

- [index.html](/Users/lost_home/Documents/wool/index.html)
- [styles.css](/Users/lost_home/Documents/wool/styles.css)
- [app.js](/Users/lost_home/Documents/wool/app.js)
- [vendor/chess.js](/Users/lost_home/Documents/wool/vendor/chess.js)

## What I Would Build Next

- real-time multiplayer via WebSockets
- authentication and cloud sync
- global leaderboards backed by Supabase
- deeper post-game analysis with Stockfish
- paid Pro tier with opening labs and custom piece packs

## Submission Positioning

If you use this for the assignment, the short pitch can be:

> ChessPulse is a modern chess product prototype focused on retention and improvement.  
> It combines gameplay, AI coaching, persistent progress, social competition by city, and a premium-ready UX layer.
