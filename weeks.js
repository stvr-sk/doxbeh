export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function monthWeeks(month) {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(year, number - 1, 1);
  const last = new Date(year, number, 0);
  const monday = new Date(first);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const weeks = [];
  for (const cursor = new Date(monday); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
    const sunday = new Date(cursor);
    sunday.setDate(sunday.getDate() + 6);
    const from = cursor < first ? first : new Date(cursor);
    const to = sunday > last ? last : sunday;
    const days = Math.round((to - from) / 86400000) + 1;
    weeks.push({
      start: localDate(from), end: localDate(to), countStart: localDate(from),
      daysInMonth: days, requiredRuns: days <= 3 ? 0 : days <= 6 ? 1 : 2,
      label: `${from.getDate()}.${number}. – ${to.getDate()}.${number}. (${days} dní)`
    });
  }
  // Bonus Sunday counts toward 2–8 November without adding a separate table column.
  if (month === "2026-11") {
    weeks.shift();
    weeks[0].countStart = "2026-11-01";
  }
  return weeks;
}
