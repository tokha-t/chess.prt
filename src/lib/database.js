import { supabase } from "./supabaseClient.js";

const DEMO_LEADERS = [
  { id: "demo-1", username: "Aruzhan", city: "Almaty", rating: 1260, xp: 2180, games_played: 82, demo: true },
  { id: "demo-2", username: "Timur", city: "Astana", rating: 1190, xp: 1910, games_played: 74, demo: true },
  { id: "demo-3", username: "Miras", city: "Kostanay", rating: 1115, xp: 1500, games_played: 55, demo: true },
  { id: "demo-4", username: "Dana", city: "Shymkent", rating: 1088, xp: 1325, games_played: 47, demo: true },
  { id: "demo-5", username: "Guest Mentor", city: "Other", rating: 980, xp: 880, games_played: 31, demo: true },
];

export async function saveGame(gameData) {
  if (!supabase) throw new Error("Supabase is not configured, so guest games are not saved permanently.");

  const payload = {
    user_id: gameData.user_id,
    opponent_type: gameData.opponent_type,
    user_color: gameData.user_color,
    result: gameData.result,
    final_fen: gameData.final_fen,
    pgn: gameData.pgn,
    move_history: gameData.move_history,
    mistakes: gameData.mistakes,
    accuracy: gameData.accuracy,
  };

  const { data, error } = await supabase.from("games").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function getUserGames(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getGameById(gameId, userId) {
  if (!supabase || !gameId || !userId) return null;
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getProfile(userId, email = "") {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const fallbackName = email ? email.split("@")[0] : `player-${userId.slice(0, 6)}`;
  return updateProfile(userId, { username: fallbackName, city: "Other" });
}

export async function updateProfile(userId, profileData) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...profileData }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserStats(userId, result) {
  if (!supabase || !userId || result === "unfinished") return null;

  const profile = (await getProfile(userId)) || {};
  const isWin = result === "win";
  const isDraw = result === "draw";
  const isLoss = result === "loss" || result === "resigned";
  const nextProfile = {
    games_played: (profile.games_played ?? 0) + 1,
    wins: (profile.wins ?? 0) + (isWin ? 1 : 0),
    losses: (profile.losses ?? 0) + (isLoss ? 1 : 0),
    draws: (profile.draws ?? 0) + (isDraw ? 1 : 0),
    xp: (profile.xp ?? 0) + (isWin ? 30 : isDraw ? 12 : 6),
    rating: Math.max(100, (profile.rating ?? 800) + (isWin ? 18 : isDraw ? 2 : -12)),
  };

  return updateProfile(userId, nextProfile);
}

export async function getLeaderboard({ city = "All", sort = "rating" } = {}) {
  if (!supabase) return filterDemoLeaders(city, sort);

  let query = supabase
    .from("profiles")
    .select("id, username, city, rating, xp, games_played")
    .order(sort === "xp" ? "xp" : "rating", { ascending: false })
    .limit(50);

  if (city && city !== "All") {
    query = query.eq("city", city);
  }

  const { data, error } = await query;
  if (error || !data?.length) return filterDemoLeaders(city, sort);
  return data;
}

function filterDemoLeaders(city, sort) {
  const rows = city && city !== "All" ? DEMO_LEADERS.filter((row) => row.city === city) : DEMO_LEADERS;
  return [...rows].sort((a, b) => b[sort] - a[sort]);
}
