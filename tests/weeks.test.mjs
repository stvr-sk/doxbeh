import assert from "node:assert/strict";
import { monthWeeks } from "../weeks.js";
import { personalInsights } from "../insights.js";

const october = monthWeeks("2026-10").filter((week) => week.requiredRuns);
assert.equal(october[0].label, "1.10. – 4.10. (4 dní)");
assert.equal(october.at(-1).label, "26.10. – 31.10. (6 dní)");
assert.equal(october[0].requiredRuns, 1);
assert.equal(october.at(-1).requiredRuns, 1);
const november = monthWeeks("2026-11").filter((week) => week.requiredRuns);
assert.equal(november[0].label, "2.11. – 8.11. (7 dní)");
assert.equal(november[0].countStart, "2026-11-01");
assert.equal(november[0].requiredRuns, 2);
const runs = ["2026-10-31", "2026-11-01", "2026-11-04", "2026-11-09"].map((date) => ({ memberId: "a", date, distance: 5 }));
const counts = november.map((week) => runs.filter((run) => run.date >= week.countStart && run.date <= week.end).length);
assert.deepEqual(counts.slice(0, 2), [2, 1]);
assert.equal(Math.max(0, november[0].requiredRuns - counts[0]) * 2.5, 0);
for (const day of [1, 2, 8]) {
  const stats = personalInsights(runs, "a", "2026-11", new Date(2026, 10, day));
  assert.equal(stats.goal.required, 2);
  assert.equal(stats.goal.completed, day < 4 ? 1 : 2);
}
assert.equal(personalInsights(runs, "a", "2026-11", new Date(2026, 10, 9)).goal.completed, 1);
for (let year = 2025; year <= 2028; year++) {
  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const weeks = monthWeeks(key);
    for (const week of weeks) {
      assert(week.start.startsWith(key));
      assert(week.end.startsWith(key));
      assert(week.countStart.startsWith(key));
    }
    for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
      const date = `${key}-${String(day).padStart(2, "0")}`;
      assert.equal(weeks.filter((week) => date >= week.countStart && date <= week.end).length, 1, date);
    }
  }
}
console.log("PASS: clipped labels, November bonus Sunday, weekly goal, fees, no overlaps or missing days across 2025–2028.");
