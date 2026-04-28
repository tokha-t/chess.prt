import { getProfile, updateProfile } from "./database.js";
import { supabase } from "./supabaseClient.js";

const EASY_MISSIONS = [
  {
    mission_type: "play_game",
    title: "Play One Game",
    description: "Complete one chess game today.",
    target_value: 1,
    xp_reward: 20,
  },
  {
    mission_type: "complete_review",
    title: "Review Your Game",
    description: "Open a saved game review and read the coach notes.",
    target_value: 1,
    xp_reward: 20,
  },
];

const SKILL_MISSIONS = [
  {
    mission_type: "castle_early",
    title: "Protect Your King",
    description: "Castle before move 10 in a game.",
    target_value: 1,
    xp_reward: 30,
  },
  {
    mission_type: "good_moves",
    title: "Find Good Moves",
    description: "Make 5 good or excellent moves in one game.",
    target_value: 5,
    xp_reward: 35,
  },
  {
    mission_type: "avoid_queen_loss",
    title: "Queen Safety",
    description: "Finish a game without losing your queen.",
    target_value: 1,
    xp_reward: 30,
  },
];

const CHALLENGE_MISSIONS = [
  {
    mission_type: "high_accuracy",
    title: "Play Clean Chess",
    description: "Finish a game with at least 70% accuracy.",
    target_value: 1,
    xp_reward: 50,
  },
  {
    mission_type: "win_game",
    title: "Score a Win",
    description: "Win one game today.",
    target_value: 1,
    xp_reward: 45,
  },
  {
    mission_type: "play_hard_ai",
    title: "Challenge Hard AI",
    description: "Complete a game against Hard AI.",
    target_value: 1,
    xp_reward: 45,
  },
];

export async function getTodayMissions(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("daily_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", getTodayKey())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function generateDailyMissions(userId) {
  if (!supabase || !userId) return [];
  const missionDate = getTodayKey();
  const seed = hash(`${userId}-${missionDate}`);
  const templates = [
    pickTemplate(EASY_MISSIONS, seed),
    pickTemplate(SKILL_MISSIONS, seed >> 2),
    pickTemplate(CHALLENGE_MISSIONS, seed >> 4),
  ];
  const payload = templates.map((template) => ({
    ...template,
    user_id: userId,
    mission_date: missionDate,
  }));

  const { data, error } = await supabase.from("daily_missions").insert(payload).select("*");
  if (error) {
    if (error.code === "23505") return getTodayMissions(userId);
    throw error;
  }
  return data ?? [];
}

export async function ensureTodayMissions(userId) {
  if (!supabase || !userId) return [];
  const existing = await getTodayMissions(userId);
  if (existing.length) return existing;
  return generateDailyMissions(userId);
}

export async function refreshDailyMissionsIfNeeded(userId) {
  return ensureTodayMissions(userId);
}

export async function updateMissionProgress(userId, missionType, increment = 1) {
  if (!supabase || !userId || !missionType || increment <= 0) return [];
  const missions = await ensureTodayMissions(userId);
  const matching = missions.filter((mission) => mission.mission_type === missionType && !mission.completed);
  const updated = [];

  for (const mission of matching) {
    const currentValue = Math.min((mission.current_value ?? 0) + increment, mission.target_value ?? 1);
    const shouldComplete = currentValue >= (mission.target_value ?? 1);
    const payload = {
      current_value: currentValue,
      completed: shouldComplete,
      completed_at: shouldComplete ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase
      .from("daily_missions")
      .update(payload)
      .eq("id", mission.id)
      .eq("completed", false)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (data) {
      updated.push(data);
      if (shouldComplete) await rewardMissionXP(userId, mission.xp_reward ?? 0);
    }
  }

  return updated;
}

export async function completeMission(missionId) {
  if (!supabase || !missionId) return null;
  const { data: mission, error: readError } = await supabase
    .from("daily_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (readError) throw readError;
  if (!mission || mission.completed) return mission;

  const { data, error } = await supabase
    .from("daily_missions")
    .update({
      current_value: mission.target_value ?? 1,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", missionId)
    .eq("completed", false)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (data) await rewardMissionXP(data.user_id, data.xp_reward ?? 0);
  return data;
}

export async function rewardMissionXP(userId, xpReward) {
  if (!userId || !xpReward) return null;
  const profile = (await getProfile(userId)) || {};
  return updateProfile(userId, { xp: (profile.xp ?? 0) + xpReward });
}

export async function updatePostGameMissions(userId, signals = {}) {
  if (!userId) return [];
  const updates = [];
  const safeUpdate = async (missionType, increment = 1) => {
    try {
      const result = await updateMissionProgress(userId, missionType, increment);
      updates.push(...result);
    } catch {
      // Missing mission tables should not break the chess game itself.
    }
  };

  await safeUpdate("play_game");
  if (signals.result === "win") await safeUpdate("win_game");
  if (signals.accuracy >= 70) await safeUpdate("high_accuracy");
  if (signals.castledEarly) await safeUpdate("castle_early");
  if (signals.queenSafe) await safeUpdate("avoid_queen_loss");
  if (signals.playedHardAi) await safeUpdate("play_hard_ai");
  if (signals.goodMovesCount > 0) await safeUpdate("good_moves", signals.goodMovesCount);

  return updates;
}

function pickTemplate(templates, seed) {
  return templates[Math.abs(seed) % templates.length];
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return result;
}
