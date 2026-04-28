export function calculateGameXp({ result, accuracy = 0 } = {}) {
  let xp = 10;
  if (result === "win") xp += 20;
  if (result === "draw") xp += 10;
  if (accuracy >= 85) xp += 30;
  else if (accuracy >= 70) xp += 15;
  return xp;
}

export function addXp(profile, xp) {
  return {
    ...profile,
    xp: (profile?.xp ?? 0) + xp,
  };
}
