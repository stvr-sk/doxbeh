import { localDate, monthWeeks } from "./weeks.js";
export { localDate };

export function personalInsights(runs, memberId, month, today = new Date()) {
  const own = runs.filter((run) => run.memberId === memberId);
  const monthly = own.filter((run) => run.date.startsWith(`${month}-`));
  const distances = monthly.map((run) => Number(run.distance) || 0);
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  const currentMonth = localDate(today).slice(0, 7);
  const week = monthWeeks(currentMonth).find((item) => item.countStart <= localDate(today) && item.end >= localDate(today));
  const required = week.requiredRuns;
  const completed = own.filter((run) => run.date >= week.countStart && run.date <= week.end && run.date <= localDate(today)).length;
  const weeklyRuns = own.filter((run) => run.date >= week.countStart && run.date <= week.end && run.date <= localDate(today));
  const weeklyDistances = weeklyRuns.map((run) => Number(run.distance) || 0);
  const weeklyTotal = weeklyDistances.reduce((sum, distance) => sum + distance, 0);
  const [year, number] = month.split("-").map(Number);
  const history = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, number - 12 + index, 1);
    const key = localDate(date).slice(0, 7);
    return { month: key, distance: own.filter((run) => run.date.startsWith(`${key}-`)).reduce((sum, run) => sum + (Number(run.distance) || 0), 0) };
  });
  return { count: monthly.length, total, average: monthly.length ? total / monthly.length : 0, longest: Math.max(0, ...distances), goal: { required, completed, month: currentMonth, start: week.countStart, end: week.end }, weekly: { count: weeklyRuns.length, total: weeklyTotal, average: weeklyRuns.length ? weeklyTotal / weeklyRuns.length : 0, longest: Math.max(0, ...weeklyDistances) }, history };
}

export function monthContributions(members, allRuns, month, today = new Date()) {
  const weeks = monthWeeks(month).filter((week) => week.requiredRuns > 0);
  const date = localDate(today);
  const rows = members.map((member) => {
    const runs = allRuns.filter((run) => run.memberId === member.id && run.date.startsWith(`${month}-`));
    const statuses = weeks.map((week) => {
      const count = runs.filter((run) => run.date >= week.countStart && run.date <= week.end).length;
      const missingRuns = Math.max(week.requiredRuns - count, 0);
      const closed = week.end < date;
      return { ...week, count, missingRuns, closed };
    });
    const extra = statuses.reduce((sum, week) => sum + (week.closed ? week.missingRuns * 2.5 : 0), 0);
    return { member, runs, statuses, extra, total: 10 + extra };
  });
  const base = members.length * 10;
  const penalties = rows.reduce((sum, row) => sum + row.extra, 0);
  return { rows, weeks, base, penalties, pool: base + penalties, closedWeeks: weeks.filter((week) => week.end < date).length };
}

export function canEditRun(run, userId, memberId, isAdmin) {
  return !!run && (isAdmin || (!!userId && run.createdBy === userId && run.memberId === memberId));
}
