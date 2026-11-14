import { creditedDistance } from './run-distance.js?v=3';
export function comparisonRows(rows) {
  return rows.map(row => ({...row, distance:row.runs.reduce((sum,run)=>sum+creditedDistance(run),0)}))
    .sort((a,b)=>b.distance-a.distance||a.member.name.localeCompare(b.member.name,'sk'));
}
