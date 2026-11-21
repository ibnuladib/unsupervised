// Learning stats: streaks and weekly progress. No XP, no games —
// just honest signal about the work.

function todayStr(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function computeStreak(items, now = new Date()) {
  const doneDays = new Set(
    items
      .filter((i) => i.status === "Done" && i.completedAt)
      .map((i) => i.completedAt.slice(0, 10))
  );
  let cursor = doneDays.has(todayStr(now))
    ? todayStr(now)
    : doneDays.has(addDays(todayStr(now), -1))
    ? addDays(todayStr(now), -1)
    : null;
  if (!cursor) return 0;
  let streak = 0;
  while (doneDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function computeStats(items, now = new Date()) {
  const weekAgo = addDays(todayStr(now), -7);
  return {
    streak: computeStreak(items, now),
    doneThisWeek: items.filter(
      (i) => i.status === "Done" && i.completedAt && i.completedAt.slice(0, 10) >= weekAgo
    ).length,
    learning: items.filter((i) => i.status === "Learning").length,
    backlog: items.filter((i) => i.status === "Backlog").length,
    totalDone: items.filter((i) => i.status === "Done").length,
  };
}

module.exports = { todayStr, addDays, computeStreak, computeStats };
