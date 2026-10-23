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
  const [year, number] = month.split("-").map(Number);
  const history = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, number - 12 + index, 1);
    const key = localDate(date).slice(0, 7);
    return { month: key, distance: own.filter((run) => run.date.startsWith(`${key}-`)).reduce((sum, run) => sum + (Number(run.distance) || 0), 0) };
  });
  return { count: monthly.length, total, average: monthly.length ? total / monthly.length : 0, longest: Math.max(0, ...distances), goal: { required, completed, month: currentMonth }, history };
}

export function canEditRun(run, userId, memberId, isAdmin) {
  return !!run && (isAdmin || (!!userId && run.createdBy === userId && run.memberId === memberId));
}
