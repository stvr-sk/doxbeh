import { localDate } from './weeks.js';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money = value => `${value.toFixed(2).replace('.',',')} &euro;`;
const range = week => {const [,m,d]=week.start.split('-');const [,em,ed]=week.end.split('-');return `${Number(d)}. ${Number(m)}. &ndash; ${Number(ed)}. ${Number(em)}.`;};
export function selectedWeek(weeks, selected, today = localDate()) {
  return weeks.find(week=>week.start===selected) || weeks.find(week=>week.countStart<=today && week.end>=today) || [...weeks].reverse().find(week=>week.end<today) || weeks[0];
}
export function weeklyGroups(rows, week, today = localDate()) {
  const eligible=[],partial=[],empty=[];
  for(const row of rows){
    const status=row.statuses.find(item=>item.start===week.start);
    if(!status)continue;
    const shortRuns=row.runs.filter(run=>run.date>=week.countStart && run.date<=week.end && run.date<=today && Number(run.distance)<3).length;
    // Future-dated runs do not fulfil a goal before the day of the run.
    const count=row.runs.filter(run=>run.date>=week.countStart && run.date<=week.end && run.date<=today && Number(run.distance)>=3).length;
    const item={member:row.member,count,shortRuns,missing:Math.max(week.requiredRuns-count,0)};
    (item.missing===0?eligible:count>0?partial:empty).push(item);
  }
  for(const group of [eligible,partial,empty])group.sort((a,b)=>b.count-a.count||a.member.name.localeCompare(b.member.name,'sk'));
  return {eligible,partial,empty};
}
export function renderWeeklyOverview(rows,weeks,month,{selected, today=localDate(),memberPhoto=()=>''}={}) {
  const week=selectedWeek(weeks,selected,today);
  if(!week)return '<p class="muted">V tomto mesiaci nie je povinn&#253; t&#253;&#382;de&#328;.</p>';
  const future=week.countStart>today,closed=week.end<today;
  const choices=weeks.map((item,index)=>`<button type="button" class="week-choice" data-week-month="${month}" data-week-start="${item.start}" aria-pressed="${item.start===week.start}"><strong>${index+1}. t&#253;&#382;de&#328;</strong><span>${range(item)}</span><small>${item.end<today?'Ukon&#269;en&#253;':item.countStart>today?'Pripravuje sa':'Prebieha'}</small></button>`).join('');
  const groups=weeklyGroups(rows,week,today);
  const memberRow=item=>{
    const initials=item.member.name.trim().split(/\s+/).map(word=>word[0]).join('').slice(0,2).toUpperCase();
    const photo=memberPhoto(item.member);
    const complete=item.missing===0;
    const label=complete?'Splnen&#233;':`${closed ? (item.missing===1?'Ch&#253;bal':'Ch&#253;bali') : (item.missing===1?'Ch&#253;ba':'Ch&#253;baj&#250;')} ${item.missing} ${item.missing===1?'beh':'behy'}`;
    const dots=Array.from({length:week.requiredRuns},(_,index)=>`<span class="week-step ${index<item.count?'done':''}" aria-hidden="true">${index<item.count?'&#10003;':'&middot;'}</span>`).join('');
    return `<div class="week-member ${complete?'complete':closed?'missed':'in-progress'}"><div class="week-person"><span class="ledger-avatar" aria-hidden="true"><span>${escape(initials)}</span>${photo?`<img src="${escape(photo)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span><div><strong>${escape(item.member.name)}</strong>${item.shortRuns?`<small>${item.shortRuns} ${item.shortRuns===1?'beh':item.shortRuns<5?'behy':'behov'} pod limitom</small>`:''}</div></div><div class="week-progress" aria-label="${item.count} z ${week.requiredRuns} behov sp&#314;&#328;a limit">${dots}<span>${label}</span></div><span class="week-result">${closed?(complete?'<span class="ok">Bez pokuty</span>':money(item.missing*2.5)):complete?'<span class="ok">&#10003;</span>':'E&#353;te je &#269;as'}</span></div>`;
  };
  const section=(label,items,type)=>items.length?`<section class="week-group ${type}"><h4>${label}<span>${items.length}</span></h4>${items.map(memberRow).join('')}</section>`:'';
  return `<div class="week-choices" role="group" aria-label="Vybra&#357; t&#253;&#382;de&#328;">${choices}</div><div class="week-focus"><div><span class="eyebrow">${closed?'Ukon&#269;en&#253; t&#253;&#382;de&#328;':future?'Nadch&#225;dzaj&#250;ci t&#253;&#382;de&#328;':'Aktu&#225;lny t&#253;&#382;de&#328;'}</span><h3>${range(week)}</h3><p>${week.requiredRuns===1?'Sta&#269;&#237; 1 beh':'Cie&#318;: 2 behy'} s d&#314;&#382;kou aspo&#328; 3,0 km.</p></div>${!future?`<div class="week-completion"><strong>${groups.eligible.length}<small> / ${rows.length}</small></strong><span>&#269;lenov splnilo cie&#318;</span></div>`:''}</div>${future?'<div class="week-not-started">Tento t&#253;&#382;de&#328; sa e&#353;te neza&#269;al. Plnenie a pr&#237;padn&#233; pokuty sa zobrazia postupne.</div>':rows.length?section('Splnen&#233;',groups.eligible,'week-fulfilled')+section(closed?'&#268;iasto&#269;ne splnen&#233;':'Rozbehnut&#233;',groups.partial,'week-partial')+section('Bez zapo&#269;&#237;tan&#233;ho behu',groups.empty,'week-empty'):'<p class="muted">Najprv pridaj &#269;lenov.</p>'}`;
}
