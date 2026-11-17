import { creditedDistance, distanceBreakdown, registrationDate } from './run-distance.js?v=3';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
function creationTime(value) {
  if (typeof value?.seconds === 'number' && Number.isFinite(value.seconds)) return [value.seconds, Number(value.nanoseconds) || 0];
  const millis = typeof value?.toMillis === 'function' ? value.toMillis() : value instanceof Date ? value.getTime() : NaN;
  if (!Number.isFinite(millis)) return [-Infinity, 0];
  const seconds = Math.floor(millis / 1000);
  return [seconds, Math.round((millis - seconds * 1000) * 1000000)];
}
function newestCreatedFirst(a, b) {
  const first = creationTime(a.createdAt), second = creationTime(b.createdAt);
  if (first[0] !== second[0]) return first[0] > second[0] ? -1 : 1;
  return second[1] - first[1];
}
function addedTime(value) {
  const [seconds, nanoseconds] = creationTime(value);
  if (!Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000 + nanoseconds / 1000000);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
  return { iso: date.toISOString(), text: `${parts.day}.${parts.month}. ${parts.hour}:${parts.minute}` };
}
export function recentRuns(rows, today=registrationDate()) {
  return rows.flatMap(row=>row.runs.filter(run=>run.date<=today).map(run=>({run,member:row.member})))
    .sort((a,b)=>b.run.date.localeCompare(a.run.date)||newestCreatedFirst(a.run,b.run)||a.member.name.localeCompare(b.member.name,'sk')).slice(0,8);
}
export function renderRecentActivity(rows, {memberPhoto=()=>'', today=registrationDate()}={}) {
  const recent=recentRuns(rows,today);
  const header='<div class="recent-heading"><span class="eyebrow">Najnov&#353;ie behy</span><span>Vo vybranom mesiaci</span></div>';
  if(!recent.length)return header+'<p class="recent-empty">Prv&#253; beh sa tu zobraz&#237; po pridan&#237;.</p>';
  return header+`<div class="recent-list" tabindex="0" role="region" aria-label="Najnov&#353;ie behy, pos&#250;van&#237;m zobraz&#237;te &#271;al&#353;ie">${recent.map(({run,member})=>{
    const photo=memberPhoto(member);
    const initials=member.name.trim().split(/\s+/).map(word=>word[0]).join('').slice(0,2).toUpperCase();
    const details=distanceBreakdown(run);
    const time=addedTime(run.createdAt);
    return `<div class="recent-run"><span class="ledger-avatar" aria-hidden="true"><span>${escape(initials)}</span>${photo?`<img src="${escape(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span><div class="recent-person"><strong>${escape(member.name)}</strong><span class="recent-added"><span>&#268;as pridania</span>${time?`<time datetime="${time.iso}">${time.text}</time>`:'<span>Nezn&#225;my</span>'}</span></div><strong class="recent-distance" title="P&#244;vodn&#225; vzdialenos&#357; ${details.original.toLocaleString('sk')} km">${creditedDistance(run).toLocaleString('sk',{minimumFractionDigits:1,maximumFractionDigits:2})}<small> km</small></strong></div>`;
  }).join('')}</div>`;
}
