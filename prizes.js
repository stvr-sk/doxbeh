export function prizeBreakdown(pool) {
  const amount = Number(pool);
  if (!Number.isFinite(amount) || amount < 30) return null;
  return [{place:1,amount:Math.round((amount-30)*100)/100},{place:2,amount:20},{place:3,amount:10}];
}
const money = value => `${value.toFixed(2).replace('.',',')} &euro;`;
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export function prizeStandings(rows) {
  const ranked=rows.filter(row=>Math.round(row.distance*100)>0).slice().sort((a,b)=>Math.round(b.distance*100)-Math.round(a.distance*100)||a.member.name.localeCompare(b.member.name,'sk'));
  return [1,2,3].map(place=>({place,rows:ranked.filter(row=>1+ranked.filter(other=>Math.round(other.distance*100)>Math.round(row.distance*100)).length===place)}));
}
export function renderPrizes(pool, rows = []) {
  const prizes=prizeBreakdown(pool);
  const standings=prizeStandings(rows);
  return `<div class="prize-heading"><span class="eyebrow">Mesa&#269;n&#233; v&#253;hry</span><span>Pod&#318;a aktu&#225;lneho poolu</span></div><div class="prize-grid">${[1,2,3].map(place=>{
    const people=standings[place-1].rows;
    return `<div class="prize-tier prize-${place}"><span class="prize-place"><span aria-hidden="true">${place}</span>${place}. miesto</span><strong>${prizes?money(prizes[place-1].amount):place===1?'Pool &minus; 30 &euro;':money(place===2?20:10)}</strong><span class="prize-names" ${people.length>1?'title="Rem&#237;za; rozdelenie v&#253;hry zatia&#318; nie je ur&#269;en&#233;"':''}>${people.length?people.map(row=>escape(row.member.name)).join(' &middot; '):'&mdash;'}</span></div>`;
  }).join('')}</div><p class="prize-note">${prizes?'Priebe&#382;n&#233; poradie a sumy. Kone&#269;n&#233; poradie sa ur&#269;&#237; po skon&#269;en&#237; mesiaca.':'Na rozdelenie v&#253;hier je potrebn&#253; pool aspo&#328; 30 &euro;.'}</p>`;
}
