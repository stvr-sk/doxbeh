import { creditedDistance, distanceBreakdown } from "./run-distance.js?v=3";
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const km = (value) => Number(value).toLocaleString('sk', {minimumFractionDigits:1,maximumFractionDigits:2});
const money = (value) => `${Number(value).toFixed(2).replace('.', ',')} &euro;`;
const dateLabel = (value) => { const [year, month, day] = value.split('-'); return `${Number(day)}. ${Number(month)}. ${year}`; };
const runWord = (count) => count === 1 ? 'beh' : count < 5 && count > 1 ? 'behy' : 'behov';

function runDistanceMarkup(run) {
  const value=distanceBreakdown(run);
  return `<strong class="run-credited">${km(value.credited)} <small>km</small>${value.rate?`<span class="run-original">p&#244;vodne ${km(value.original)} km</span><span class="run-deduction">${value.indoorRate?'Interi&#233;r &minus;10 %':''}${value.indoorRate&&value.lateRate?' &middot; ':''}${value.lateRate?'Neskor&#253; z&#225;pis &minus;50 %':''}</span>`:''}</strong>`;
}

export function groupRunRows(rows) {
  const active = rows.filter((row) => row.runs.length).map((row) => ({...row, distance:row.runs.reduce((sum, run) => sum + creditedDistance(run),0)}))
    .sort((a,b) => b.distance-a.distance || a.member.name.localeCompare(b.member.name,'sk'));
  const inactive = rows.filter((row) => !row.runs.length).sort((a,b) => a.member.name.localeCompare(b.member.name,'sk'));
  return {active,inactive};
}

export function renderRunOverview(rows, month, {renderPayment, editable, opened = new Set(), memberPhoto = (member) => member.nick ? `./assets/members/${encodeURIComponent(member.nick)}.svg` : ""}) {
  if (!rows.length) return '<p class="muted">Zatia&#318; tu nie s&#250; &#382;iadni &#269;lenovia.</p>';
  const {active,inactive} = groupRunRows(rows);
  const memberRow = (row, hasRuns) => {
    const member = row.member;
    const key = `${month}_${member.id}`;
    const detailId = `runs-${encodeURIComponent(key)}`;
    const open = opened.has(key);
    const runs = [...row.runs].sort((a,b) => b.date.localeCompare(a.date));
    const eligible = runs.filter((run) => Number(run.distance) >= 3).length;
    const initials = member.name.trim().split(/\s+/).map((word) => word[0]).join('').slice(0,2).toUpperCase();
    const photo = memberPhoto(member);
    const latest = runs[0];
    return `<article class="ledger-member ${hasRuns ? 'has-runs' : 'no-runs'}">
      <div class="ledger-row">
        <div class="ledger-person"><span class="ledger-avatar" aria-hidden="true"><span>${escape(initials)}</span>${photo ? `<img src="${escape(photo)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span><div><strong>${escape(member.name)}</strong><span class="ledger-person-note">${hasRuns ? `Posledn&#253; beh ${dateLabel(latest.date)}` : 'Tento mesiac e&#353;te nebehal/a'}</span></div></div>
        <div class="ledger-distance"><strong>${hasRuns ? km(row.distance) : '&mdash;'} <small>km</small></strong><span>${hasRuns ? `${runs.length} ${runWord(runs.length)} <span class="ledger-eligible">&middot; ${eligible} ${eligible === 1 ? "sp&#314;&#328;a" : "sp&#314;&#328;aj&#250;"} limit</span>` : 'Bez z&#225;znamu'}</span></div>
        <div class="ledger-contribution"><span>Pr&#237;spevok zatia&#318;</span><strong>${money(row.total)}</strong><small>${row.extra ? `z toho pokuta ${money(row.extra)}` : 'bez pokuty'}</small></div>
        <div class="ledger-payment">${renderPayment(member,month)}</div>
        ${hasRuns ? `<button type="button" class="ledger-toggle" data-run-member="${escape(member.id)}" data-run-month="${month}" aria-controls="${detailId}" aria-expanded="${open}">${open ? 'Skry&#357;' : 'Zobrazi&#357;'} behy <span aria-hidden="true">${open ? '&#8722;' : '+'}</span></button>` : '<span class="ledger-waiting">Zatia&#318; bez behu</span>'}
      </div>
      ${hasRuns ? `<div id="${detailId}" class="ledger-details" ${open ? '' : 'hidden'}><div class="ledger-detail-heading"><strong>Behy v mesiaci</strong><span>Limit pre t&#253;&#382;denn&#253; cie&#318; je 3,0 km.</span></div><div class="ledger-run-list run-list">${runs.map((run) => `<div class="ledger-run"><time datetime="${escape(run.date)}">${dateLabel(run.date)}</time>${runDistanceMarkup(run)}<span class="ledger-run-status ${Number(run.distance) >= 3 ? 'eligible' : 'short'}">${Number(run.distance) >= 3 ? '&#10003; Sp&#314;&#328;a limit' : 'Pod limitom'}</span><span class="run-actions">${editable(run) ? `<button type="button" class="button secondary edit-run" data-id="${escape(run.id)}" aria-label="Upravi&#357; beh z ${escape(run.date)}">Upravi&#357;</button><button type="button" class="button danger delete-run" data-id="${escape(run.id)}" aria-label="Zmaza&#357; beh z ${escape(run.date)}" title="Zmaza&#357; beh"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>` : ''}</span></div>`).join('')}</div></div>` : ''}
    </article>`;
  };
  return `<div class="ledger-intro"><span><b>${active.length}</b> z ${rows.length} &#269;lenov u&#382; behali</span><span class="ledger-intro-note">${month} &middot; zoraden&#233; pod&#318;a kilometrov</span></div>
    ${active.length ? `<section class="ledger-group"><h3><span class="ledger-group-dot"></span>U&#382; behali <span class="ledger-group-count">${active.length}</span></h3>${active.map((row) => memberRow(row,true)).join('')}</section>` : '<p class="ledger-empty">V tomto mesiaci zatia&#318; nikto nepridal beh.</p>'}
    ${inactive.length ? `<section class="ledger-group ledger-inactive"><h3><span class="ledger-group-dot"></span>Zatia&#318; bez behu <span class="ledger-group-count">${inactive.length}</span></h3>${inactive.map((row) => memberRow(row,false)).join('')}</section>` : ''}`;
}
