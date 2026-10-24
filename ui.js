'use strict';
/* Chem Mastery — UI, sessions, router */
let SESS=null,OPEN=new Set(),tmr=null;
const $app=()=>document.getElementById('app');
const lvColor=l=>!l?'#556':l<2?'#e5534b':l<3?'#e8a33d':l<4?'#d6cf3a':l<5?'#4cc38a':'#4aa8ff';
const bar=(p,c)=>`<div class="bar"><i style="width:${clamp(p*100,0,100).toFixed(1)}%;${c?'background:'+c:''}"></i></div>`;
const pct=x=>Math.round(x*100)+'%';
const stars=d=>'●'.repeat(d)+'○'.repeat(5-d);
const nl=s=>esc(s).replace(/\n/g,'<br>');
const back=h=>`<a class="back" href="${h}">‹ Back</a>`;

function toast(msg){let w=document.getElementById('toasts');if(!w){w=document.createElement('div');w.id='toasts';document.body.appendChild(w)}
 const t=document.createElement('div');t.className='toast';t.textContent=msg;w.appendChild(t);setTimeout(()=>t.classList.add('out'),3400);setTimeout(()=>t.remove(),4000)}
let annOn=false;
function showAnn(){if(annOn||!annQ.length||(SESS&&SESS.phase==='q'&&location.hash==='#/q'))return;
 const a=annQ.shift();annOn=true;const el=document.createElement('div');el.className='ann';
 const head=a.kind==='Summit'?`You are now a <b>Master of Total Synthesis &amp; Retrosynthesis</b><div class="rank">${esc(C.summit.rank)}</div>`:a.kind==='Capstone'?`All ${C.books.length} books mastered.<br>You are now a <b>${esc(a.name)}</b>`:`You are now a master of<br><b>${esc(a.name)}</b>`;
 el.innerHTML=`<div class="annbox"><div class="confetti">✦ ✧ ✦ ✧ ✦</div><div class="bigbadge">${a.badge}</div><div class="annkind">${esc(a.kind)} mastery unlocked</div><div class="anntext">${head}</div><div class="muted sm">${esc(a.title||'')}</div>${a.note?`<div class="unlock">${esc(a.note)}</div>`:''}<button class="btn pri" id="annOk">Continue</button></div>`;
 document.body.appendChild(el);el.querySelector('#annOk').onclick=()=>{el.remove();annOn=false;showAnn()}}

/* ---------- small components ---------- */
function skillRow(k,act){const t=TOP[k],s=S.skill[k],lv=topicLv(k),dec=s&&decayPen(s)>0.02;
 return`<div class="sk" ${act?`data-act="${act}" data-k="${k}"`:''}><div class="skh"><span>${esc(t.name)}</span><span class="lvl" style="color:${lvColor(lv)}">${lv?lv.toFixed(1)+' · '+LV[Math.floor(lv)]:'Unrated'}${dec?' ⏳':''}</span></div>${bar(lv/5,lvColor(lv))}<div class="muted sm">${s?s.n:0} answers${dec?' · re-check due':''}</div></div>`}
function bookLevel(bid){const ks=BOOK[bid].topics.map(t=>bid+'.'+t.id).filter(k=>topicLv(k));if(!ks.length)return 0;return ks.reduce((a,k)=>a+topicLv(k),0)/ks.length}
function ratedCount(){return Object.keys(TOP).filter(k=>topicLv(k)).length}
function chkRow(x,locked){const dis=locked||x.kind==='auto';
 return`<label class="chk ${x.done?'on':''} ${x.kind==='auto'?'auto':''}"><input type="checkbox" ${x.done?'checked':''} ${dis?'disabled':''} ${x.kind==='chk'?`data-act="chk" data-id="${x.id}"`:''}><span>${x.kind==='auto'?'⚙️ ':''}${esc(x.text)}</span></label>`}

/* ---------- where you are ---------- */
function nextAction(){const m=C.modules.find(m=>!modDone(m.id));
 if(!m){return allMastered()&&!S.trophies.summit?{label:'Work the summit goal',href:'#/tree'}:{label:'Keep skills fresh',act:'daily'}}
 const bs=modBooks(m.id).filter(b=>!isM(b.id)).sort((a,b)=>bookProg(b.id)-bookProg(a.id)),b=bs[0];
 const answered=b.topics.some(t=>S.skill[b.id+'.'+t.id]&&S.skill[b.id+'.'+t.id].n);
 if(!answered&&!S.placement[b.id])return{label:'Take the placement test for '+b.title,act:'place',id:b.id};
 const due=dueItems().length;if(due)return{label:'Do today\'s '+due+' spaced reviews',act:'review'};
 const dec=decayedTopics();if(dec.length)return{label:'Re-check '+dec.length+' decayed topic'+(dec.length>1?'s':''),act:'recheck'};
 const rated=b.topics.map(t=>b.id+'.'+t.id).filter(k=>topicLv(k)).sort((x,y)=>topicLv(x)-topicLv(y));
 if(rated.length&&topicLv(rated[0])<3)return{label:'Practice your weakest topic: '+TOP[rated[0]].name,act:'topicPractice',k:rated[0]};
 const G=S.gates[b.id]||{};for(const t of b.topics){const k=b.id+'.'+t.id;if(t.focus.every((f,i)=>S.checks[k+'.f'+i])&&!(G.topic&&G.topic[t.id])&&Q.some(q=>q.k===k))return{label:'Take the chapter test: '+t.name,act:'test',id:b.id,t:t.id}}
 if(bookItems(b.id).some(x=>x.kind==='chk'&&!x.done))return{label:'Continue the checklist for '+b.title,href:'#/book/'+b.id};
 if(!G.final)return{label:'Take the final exam for '+b.title,act:'final',id:b.id};
 return{label:'Raise skill levels in '+b.title,act:'bookPractice',id:b.id}}
function whereYou(){const m=C.modules.find(m=>!modDone(m.id));
 const rated=Object.keys(TOP).filter(topicLv).sort((a,b)=>topicLv(b)-topicLv(a));
 let line;
 if(!m)line='All five modules are mastered. '+(S.trophies.summit?'You hold the summit title.':'The summit goal is next.');
 else{const b=modBooks(m.id).filter(b=>!isM(b.id)).sort((a,b)=>bookProg(b.id)-bookProg(a.id))[0];const lv=bookLevel(b.id);
  line=`You are in <b>Module ${m.n}: ${esc(m.name)}</b>, working on <b>${esc(b.title)}</b> (${pct(bookProg(b.id))} of its checklist${lv?`, skill level ${lv.toFixed(1)} · ${LV[Math.floor(lv)]}`:', not placed yet'}).`}
 const top=rated.slice(0,3).map(k=>`${esc(TOP[k].name)} (${topicLv(k).toFixed(1)})`),low=rated.slice(-3).reverse().filter(k=>topicLv(k)<3.5&&rated.length>3).map(k=>`${esc(TOP[k].name)} (${topicLv(k).toFixed(1)})`);
 return`<p>${line}</p>${top.length?`<p class="sm"><b>Strongest:</b> ${top.join(' · ')}</p>`:''}${low.length?`<p class="sm"><b>Needs work:</b> ${low.join(' · ')}</p>`:''}`}

/* ---------- views ---------- */
function vHome(){const due=dueItems().length,dec=decayedTopics().length,na=nextAction(),mc=C.books.filter(b=>isM(b.id)).length;
 const naBtn=na.href?`<a class="btn pri" href="${na.href}">${esc(na.label)}</a>`:`<button class="btn pri" data-act="${na.act}" data-id="${na.id||''}" data-t="${na.t||''}" data-k="${na.k||''}">${esc(na.label)}</button>`;
 const dueDays=S.lastBackup&&Date.now()-S.lastBackup>7*DAY||!S.lastBackup&&Object.keys(S.skill).length>3;
 return`<div class="card hero"><div class="rankrow"><div class="bigbadge sm">${S.trophies.summit?C.summit.badge:'🧪'}</div><div><div class="muted sm">Your rank</div><h2>${esc(rankName())}</h2><div class="muted sm">${mc}/${C.books.length} books mastered · ${Object.keys(S.trophies).length} trophies · ${Object.keys(S.abil).length}/${abilityCount()} abilities</div></div></div>${bar(overallProg())}<div class="muted sm">${pct(overallProg())} of the whole 24-month checklist</div></div>
 <div class="card"><h3>Due today</h3><div class="stats"><div><b>${due}</b><span>spaced reviews</span></div><div><b>${dec}</b><span>decayed topics</span></div><div><b>${ratedCount()}</b><span>topics rated</span></div></div>
 <div class="row"><button class="btn pri" data-act="daily">▶ Start daily session</button></div>
 <div class="row">${due?'<button class="btn" data-act="review">Reviews only ('+due+')</button>':''}${dec?'<button class="btn" data-act="recheck">Re-check decayed</button>':''}</div></div>
 <div class="card"><h3>Where you are</h3>${whereYou()}<div class="muted sm">Recommended next step</div><div class="row">${naBtn}</div></div>
 <a class="card summit" href="#/tree"><div class="bigbadge sm">${C.summit.badge}</div><div><div class="muted sm">Summit goal</div><b>${esc(C.summit.name)}</b><div class="muted sm">Rank: ${esc(C.summit.rank)} · ${pct(summitProg())} · tap for skill tree</div></div></a>
 <div class="card"><h3>Modules</h3>${C.modules.map(m=>{const bs=modBooks(m.id),p=bs.reduce((a,b)=>a+bookProg(b.id),0)/bs.length,u=modUnlocked(m.id);return`<div class="mrow"><div class="skh"><span>${u?'':'🔒 '}${m.badge} ${m.n}. ${esc(m.name)}</span><span class="muted sm">${pct(p)}</span></div>${bar(p)}</div>`}).join('')}</div>
 ${dueDays?`<div class="card warn">💾 Back up your progress: <a href="#/settings">export a backup</a> (data lives only in this browser).</div>`:''}`}

function vBooks(){return`<h2>Books</h2>`+C.modules.map(m=>{const u=modUnlocked(m.id);return`<div class="mod"><div class="modh"><span>${m.badge} Module ${m.n}: ${esc(m.name)}</span><span class="muted sm">months ${m.months[0]}–${m.months[1]}</span></div><div class="muted sm">${u?esc(m.blurb):'🔒 Locked — master every book in Module '+(m.n-1)+(m.n===2?' (including the Chemical Safety track)':'')+' first.'}</div>`+
 modBooks(m.id).map(b=>{const p=bookProg(b.id),lv=bookLevel(b.id);return`<a class="card book ${u?'':'locked'}" href="#/book/${b.id}"><div class="bigbadge sm">${isM(b.id)?'🏅':b.badge}</div><div class="grow"><b>${esc(b.title)}</b><div class="muted sm">${esc(b.authors)}${lv?` · Lv ${lv.toFixed(1)}`:''}</div>${bar(p)}<div class="muted sm">${isM(b.id)?'MASTERED':pct(p)+' of checklist'} · ${Q.filter(q=>q.b===b.id).length} questions</div></div></a>`}).join('')+`</div>`}).join('')}

function vBook(bid){const b=BOOK[bid];if(!b)return vBooks();const unl=unlockedBook(bid),L=bookItems(bid),done=L.filter(x=>x.done).length,lv=bookLevel(bid),G=S.gates[bid]||{};
 let h=back('#/books')+`<div class="card hero"><div class="rankrow"><div class="bigbadge sm">${isM(bid)?'🏅':b.badge}</div><div><h2>${esc(b.title)}</h2><div class="muted sm">${esc(b.authors)} · Module ${MOD[b.module].n} · months ${b.months[0]}–${b.months[1]}</div></div></div>
 ${isM(bid)?`<div class="chip gold">MASTERED · master of ${esc(b.masterTitle)}</div>`:`<div class="chip">${unl?'In progress':'🔒 Locked until the previous module is mastered'+(b.module==='m2'?' — including the Chemical Safety track':'')}</div>`}
 ${bar(done/L.length)}<div class="muted sm">${done}/${L.length} checklist items · mastery needs every item</div>
 <div class="muted sm">Skill level: ${lv?lv.toFixed(1)+' · '+LV[Math.floor(lv)]:'unrated'}${S.placement[bid]?' · placed '+fmtD(S.placement[bid].ts):''}</div>
 <div class="row"><button class="btn pri" data-act="place" data-id="${bid}">${S.placement[bid]?'Re-take placement':'Placement test'}</button><button class="btn" data-act="bookPractice" data-id="${bid}" ${unl?'':'disabled'}>Adaptive practice</button></div>
 <div class="row"><button class="btn" data-act="final" data-id="${bid}" ${unl?'':'disabled'}>Final exam (≥${S.settings.passFinal}%) ${G.final?'✅':''}</button></div></div>`;
 b.topics.forEach(t=>{const k=bid+'.'+t.id,items=L.filter(x=>x.topic===t.id),dn=items.filter(x=>x.done).length,ab=(AB[k]||[]),abu=ab.filter((a,i)=>S.abil[k+'#'+i]).length,np=Q.filter(q=>q.k===k).length;
  h+=`<details class="card topic" data-key="${k}" ${OPEN.has(k)?'open':''}><summary><div class="skh"><b>${esc(t.name)}</b><span class="muted sm">${dn}/${items.length}</span></div>${skillRow(k).replace('class="sk"','class="sk in"')}</summary>
  ${items.map(x=>chkRow(x,!unl)).join('')}
  <div class="row"><button class="btn" data-act="test" data-id="${bid}" data-t="${t.id}" ${unl&&np?'':'disabled'}>Chapter test (${np} Q in bank)</button><button class="btn" data-act="topicPractice" data-k="${k}" ${unl&&np?'':'disabled'}>Practice</button></div>
  ${ab.length?`<div class="abil"><div class="muted sm">Abilities ${abu}/${ab.length}</div>${ab.map((a,i)=>`<div class="ab ${S.abil[k+'#'+i]?'on':''}">${S.abil[k+'#'+i]?'✨':'🔒'} You can ${S.abil[k+'#'+i]?'now ':'(Lv '+a[1]+') '}${esc(a[0])}</div>`).join('')}</div>`:''}</details>`});
 const bl=L.filter(x=>!x.topic);h+=`<div class="card"><h3>Book-level gates</h3>${bl.map(x=>chkRow(x,!unl)).join('')}</div>`;return h}

function vPractice(){return`<h2>Practice</h2>
 <div class="card"><h3>Adaptive practice</h3><p class="sm muted">Questions are chosen just above your current level (~${pct(S.settings.target)} expected success), skip mastered items, and get harder as you improve.</p>
 <label class="sw"><input type="checkbox" id="optTimed" data-act="optTimed" ${S.settings.timed?'checked':''}> Timed mode (${S.settings.secPerQ}s per question; set in Settings)</label>
 <div class="row"><button class="btn pri" data-act="daily">Daily mix</button><button class="btn" data-act="adaptiveAll">All unlocked</button></div>
 <label class="sm muted">By book</label><select id="selBook">${C.books.map(b=>`<option value="${b.id}" ${unlockedBook(b.id)?'':'disabled'}>${esc(b.title)}</option>`).join('')}</select>
 <div class="row"><button class="btn" data-act="bookPracticeSel">Practice this book</button><button class="btn" data-act="placeSel">Placement test</button></div></div>
 <div class="card"><h3>Drills</h3><div class="row wrap"><a class="btn" href="#/drills">Open drills (stoichiometry, thermo, arrows, spectra)</a></div></div>
 <div class="card"><h3>Exams</h3><p class="sm muted">Chapter tests and final exams are on each book page. They give no feedback until the end.</p><a class="btn" href="#/books">Go to books</a>${S.settings.strict&&!allMastered()?'<p class="sm muted">The Synthesis Capstone Exam unlocks after every book (including Chemical Safety) is mastered.</p>':'<button class="btn pri" data-act="capstone">Synthesis Capstone Exam</button>'}</div>`}

function vDrills(){return back('#/practice')+`<h2>Drills</h2><p class="muted sm">Numbers are randomized each time. Wrong answers are logged and update your skill levels.</p>`+
 Object.keys(DRILL_SETS).map(k=>`<div class="card"><b>${esc(DRILL_SETS[k].name)}</b><div class="row"><button class="btn" data-act="drill" data-id="${k}">Start 8 problems</button></div></div>`).join('')+
 `<div class="card"><b>Arrow-pushing prompts</b><div class="muted sm">${DR.arrow.length} mechanisms · self-graded against a model answer</div><div class="row"><button class="btn" data-act="sdrill" data-id="arrow">Start</button></div></div>
 <div class="card"><b>Spectra interpretation</b><div class="muted sm">${DR.spectra.length} problems (IR / MS / NMR) · self-graded</div><div class="row"><button class="btn" data-act="sdrill" data-id="spectra">Start</button></div></div>`}

function vSkills(){const rated=ratedCount(),total=Object.keys(TOP).length;
 let h=`<h2>Skill map</h2><div class="card"><h3>Where you are</h3>${whereYou()}<div class="stats"><div><b>${rated}/${total}</b><span>topics rated</span></div><div><b>${Object.keys(S.abil).length}/${abilityCount()}</b><span>abilities</span></div><div><b>${decayedTopics().length}</b><span>decayed</span></div></div><div class="row"><a class="btn" href="#/abilities">Abilities list</a><a class="btn" href="#/trophies">Trophy shelf</a></div></div>`;
 C.modules.forEach(m=>{h+=`<div class="mod"><div class="modh"><span>${m.badge} Module ${m.n}</span><span class="muted sm">${modUnlocked(m.id)?'':'🔒'}</span></div>`;modBooks(m.id).forEach(b=>{h+=`<details class="card topic" data-key="sk-${b.id}" ${OPEN.has('sk-'+b.id)?'open':''}><summary><div class="skh"><b>${b.badge} ${esc(b.title)}</b><span class="lvl" style="color:${lvColor(bookLevel(b.id))}">${bookLevel(b.id)?bookLevel(b.id).toFixed(1):'—'}</span></div>${bar(bookLevel(b.id)/5,lvColor(bookLevel(b.id)))}</summary>${b.topics.map(t=>skillRow(b.id+'.'+t.id,modUnlocked(m.id)?'topicPractice':'')).join('')}</details>`});h+='</div>'});
 return h+`<p class="muted sm">Levels: 1 Novice · 2 Foundation · 3 Proficient · 4 Advanced · 5 Expert. ⏳ = not practiced recently; the level slowly decays until you re-check it. Tap a topic to practice it.</p>`}

function vAbilities(){let tot=0,got=0;const h=C.books.map(b=>{const rows=[];b.topics.forEach(t=>{const k=b.id+'.'+t.id;(AB[k]||[]).forEach((a,i)=>{tot++;const on=S.abil[k+'#'+i];if(on)got++;rows.push(`<div class="ab ${on?'on':''}">${on?'✨':'🔒'} You can ${on?'now ':''}${esc(a[0])} <span class="muted sm">· ${esc(t.name)}${on?' · '+fmtD(on):' · needs Lv '+a[1]}</span></div>`)})});return`<details class="card topic" data-key="ab-${b.id}" ${OPEN.has('ab-'+b.id)?'open':''}><summary><b>${b.badge} ${esc(b.title)}</b></summary>${rows.join('')}</details>`}).join('');
 return back('#/trophies')+`<h2>Abilities</h2><p class="muted sm">${got}/${tot} unlocked. Each ability unlocks when your adaptive level on that topic crosses its threshold.</p>`+h}

function vTrophies(){const tile=(id,badge,name,sub)=>{const t=S.trophies[id];return`<div class="trophy ${t?'on':''}"><div class="tb">${t?badge:'🔒'}</div><div class="tn">${esc(name)}</div><div class="muted sm">${t?fmtD(t.ts):sub}</div></div>`};
 return`<h2>Trophy shelf</h2><div class="card hero"><div class="muted sm">${Object.keys(S.trophies).length} earned · ${Object.keys(S.abil).length}/${abilityCount()} abilities · <a href="#/abilities">view abilities list</a></div></div>
 <h3>Summit</h3><div class="shelf">${tile('summit',C.summit.badge,C.summit.rank,C.summit.name)}${tile('capstone',C.capstone.badge,C.capstone.name,'Master all '+C.books.length+' books')}</div>
 <h3>Modules</h3><div class="shelf">${C.modules.map(m=>tile('mod.'+m.id,m.badge,m.masterTitle,'Module '+m.n)).join('')}</div>
 <h3>Titles</h3><div class="shelf">${C.titles.map(t=>tile(t.id,t.badge,'Master of '+t.name,t.books.length+' book'+(t.books.length>1?'s':''))).join('')}</div>
 <h3>Books</h3><div class="shelf">${C.books.map(b=>tile('book.'+b.id,b.badge,'Master of '+b.masterTitle,b.title)).join('')}</div>`}

function vTree(){const su=C.summit,L=summitItems(),sp=summitProg(),cur=C.modules.find(m=>!modDone(m.id));
 let h=back('#/')+`<h2>Path to the summit</h2><p class="muted sm">Read from the top: finish each stage to unlock the one above it. “You are here” marks your current stage.</p>`;
 h+=`<div class="tnode summit ${S.trophies.summit?'done':allMastered()?'open':'lock'}"><div class="tb">${su.badge}</div><div class="grow"><b>${esc(su.name)}</b><div class="muted sm">Rank: ${esc(su.rank)} · ${pct(sp)}</div>${bar(sp)}<div class="muted sm">${esc(su.text)}</div>
 <details class="topic" data-key="sm" ${OPEN.has('sm')?'open':''}><summary class="sm">${L.filter(x=>!x.done).length} remaining tasks</summary>${L.map(x=>chkRow(x,S.settings.strict&&!allMastered())).join('')}
 <div class="row"><button class="btn" data-act="capstone" ${(S.settings.strict&&!allMastered())?'disabled':''}>Synthesis Capstone Exam ${S.gates.capstone?'✅':''}</button></div></details></div></div>`;
 [...C.modules].reverse().forEach(m=>{const bs=modBooks(m.id),p=bs.reduce((a,b)=>a+bookProg(b.id),0)/bs.length,st=modDone(m.id)?'done':modUnlocked(m.id)?'open':'lock';
  h+=`<div class="tline"></div><div class="tnode ${st}"><div class="tb">${m.badge}</div><div class="grow"><b>Module ${m.n}: ${esc(m.name)}</b>${cur&&cur.id===m.id?' <span class="chip">You are here</span>':''}<div class="muted sm">${st==='done'?'Mastered':st==='lock'?'Locked':pct(p)+' complete'} · ${bs.filter(b=>isM(b.id)).length}/${bs.length} books · months ${m.months[0]}–${m.months[1]}</div>${bar(p)}
  <div class="branches">${bs.map(b=>`<a class="bnode ${isM(b.id)?'done':''}" href="#/book/${b.id}"><span>${isM(b.id)?'🏅':b.badge}</span> ${esc(b.title.length>34?b.title.slice(0,32)+'…':b.title)}<span class="muted sm"> ${isM(b.id)?'mastered':pct(bookProg(b.id))}</span></a>`).join('')}</div></div></div>`});
 return h}

function vErrors(){const open=S.errors.filter(e=>!e.resolved),counts={};TAGS.forEach(t=>counts[t[0]]=0);counts.untagged=0;open.forEach(e=>counts[e.tag||'untagged']++);const mx=Math.max(1,...Object.values(counts));
 const f=window._ef||'';const list=S.errors.slice().reverse().filter(e=>!f||(e.tag||'untagged')===f).slice(0,60);
 return back('#/more')+`<h2>Error log</h2><div class="card"><h3>Root causes (unresolved: ${open.length})</h3>${TAGS.concat([['untagged','Untagged']]).map(t=>`<div class="erow" data-act="ef" data-id="${t[0]}"><span>${t[1]}</span><div class="bar"><i style="width:${counts[t[0]]/mx*100}%"></i></div><b>${counts[t[0]]}</b></div>`).join('')}<div class="row"><button class="btn pri" data-act="errPractice" ${open.some(e=>QM[e.qid])?'':'disabled'}>Practice my mistakes</button>${f?'<button class="btn" data-act="ef" data-id="">Clear filter</button>':''}</div></div>
 ${list.map(e=>`<div class="card err ${e.resolved?'res':''}"><div class="muted sm">${fmtD(e.ts)} · ${esc(e.b?BOOK[e.b].title:'')} · ${esc(e.t&&TOP[e.b+'.'+e.t]?TOP[e.b+'.'+e.t].name:'')} · ${e.resolved?'resolved ✅':esc((TAGS.find(t=>t[0]===e.tag)||[0,'untagged'])[1])}</div><div>${nl(e.text||'')}</div></div>`).join('')||'<p class="muted">No mistakes logged yet.</p>'}`}

function vHistory(){const h=S.history.slice(-30);const W=320,H=120;const pts=h.map((x,i)=>[h.length>1?i/(h.length-1)*(W-20)+10:W/2,H-10-(x.pct/100)*(H-20)]);
 const svg=`<svg viewBox="0 0 ${W} ${H}" class="chart"><line x1="0" x2="${W}" y1="${H-10-.9*(H-20)}" y2="${H-10-.9*(H-20)}" stroke="#4cc38a" stroke-dasharray="3 3"/><line x1="0" x2="${W}" y1="${H-10-.95*(H-20)}" y2="${H-10-.95*(H-20)}" stroke="#e8a33d" stroke-dasharray="3 3"/>${pts.length?`<polyline fill="none" stroke="#4aa8ff" stroke-width="2" points="${pts.map(p=>p.join(',')).join(' ')}"/>`:''}${pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${h[i].pass===true?'#4cc38a':h[i].pass===false?'#e5534b':'#4aa8ff'}"/>`).join('')}</svg>`;
 return back('#/more')+`<h2>Score history</h2><div class="card">${svg}<div class="muted sm">Last ${h.length} sessions · dashed lines = 90% and 95% pass gates</div></div>`+S.history.slice().reverse().slice(0,60).map(x=>`<div class="card hrow"><div><b>${esc(x.title)}</b><div class="muted sm">${fmtD(x.ts)} · ${x.n} Q · ${Math.round(x.secs/60)} min${x.timed?' · timed':''}</div></div><div class="score ${x.pass===true?'ok':x.pass===false?'bad':''}">${x.pct}%${x.pass===true?' ✅':x.pass===false?' ✗':''}</div></div>`).join('')}

function vMore(){return`<h2>More</h2><div class="list">${[['#/trophies','🏆 Trophy shelf'],['#/abilities','✨ Abilities list'],['#/tree','⚗️ Path to the summit'],['#/errors','🧾 Error log'],['#/history','📈 Score history'],['#/drills','🎯 Drills'],['#/settings','⚙️ Settings & backup'],['#/help','❓ How it works']].map(x=>`<a class="card linkrow" href="${x[0]}">${x[1]}</a>`).join('')}</div>`}

function vHelp(){return back('#/more')+`<h2>How Chem Mastery works</h2><div class="card help"><p><b>Mastery gates.</b> A book is MASTERED only when every item is done: each topic's checklist, the problem set, teach-back, a passed chapter test (≥${S.settings.passChapter}%), skill ≥ Advanced on every topic, the literature item, and a passed final exam (≥${S.settings.passFinal}%). Modules unlock in order.</p>
 <p><b>Adaptive skill.</b> Every answer updates a per-topic skill estimate (Elo/IRT). Questions carry a topic and difficulty (1–5). The app picks items you should get right ~${pct(S.settings.target)} of the time, skips mastered items, and re-checks topics that decay.</p>
 <p><b>Spaced repetition.</b> Missed or new questions return after 1, 3, 7, 21 and 60 days.</p>
 <p><b>Placement.</b> A short adaptive test per book finds your starting level per topic.</p>
 <p><b>Self-graded answers.</b> Short-answer questions show a model answer; mark yourself honestly — your skill map depends on it.</p>
 <p><b>Data.</b> Everything is stored on this device only. Export a backup regularly.</p></div>`}

function vSettings(){const s=S.settings;return back('#/more')+`<h2>Settings & backup</h2>
 <div class="card"><h3>Rules</h3>
 <label class="sw"><input type="checkbox" data-act="setStrict" ${s.strict?'checked':''}> Strict module gating (modules unlock in order)</label>
 <label class="sw"><input type="checkbox" data-act="optTimed" ${s.timed?'checked':''}> Timed mode on</label>
 <label class="fld">Seconds per question (timed)<input type="number" id="setSec" value="${s.secPerQ}" min="20" max="600"></label>
 <label class="fld">Chapter test pass %<input type="number" id="setCh" value="${s.passChapter}" min="50" max="100"></label>
 <label class="fld">Final exam pass %<input type="number" id="setFi" value="${s.passFinal}" min="50" max="100"></label>
 <label class="fld">Target success rate for adaptive questions (%)<input type="number" id="setTg" value="${Math.round(s.target*100)}" min="60" max="90"></label>
 <label class="fld">Session length<input type="number" id="setLen" value="${s.sessionLen}" min="5" max="40"></label>
 <button class="btn pri" data-act="saveSet">Save settings</button></div>
 <div class="card"><h3>Backup</h3><p class="muted sm">Last backup: ${S.lastBackup?new Date(S.lastBackup).toLocaleString():'never'}</p>
 <div class="row wrap"><button class="btn pri" data-act="exportFile">Download backup file</button><button class="btn" data-act="copyBackup">Copy to clipboard</button></div>
 <label class="btn file">Restore from file<input type="file" accept=".json,application/json" data-act="importFile" hidden></label>
 <textarea id="pasteBox" placeholder="…or paste backup JSON here"></textarea><button class="btn" data-act="importPaste">Restore pasted JSON</button></div>
 <div class="card"><h3>Add questions</h3><p class="muted sm">Import a question pack JSON (same format as data/q/*.json plus a "book" field). Extra questions are stored on this device and included in backups.</p>
 <label class="btn file">Import question pack<input type="file" accept=".json,application/json" data-act="importPack" hidden></label><p class="muted sm">Question bank: ${Q.length} questions (${S.extraQ.length} imported).</p></div>
 <div class="card"><h3>Danger zone</h3><button class="btn bad" data-act="wipe">Erase all progress</button></div>`}

/* ---------- sessions ---------- */
const secFor=q=>S.settings.secPerQ*(q.gen?2:q.c?1:2.5);
function startSession(o){clearInterval(tmr);const s=Object.assign({kind:'adaptive',fb:true,target:S.settings.target,used:new Set(),tc:{},res:[],i:0,t0:Date.now(),phase:'q',gate:null,fixed:false,timed:S.settings.timed},o);
 if(s.fixed)s.n=s.qs.length;else s.n=Math.min(s.n||S.settings.sessionLen,s.pool.length);
 if(!s.n){toast('No questions available for this selection yet.');return}
 s.snap={};Object.keys(TOP).forEach(k=>s.snap[k]=topicLv(k));
 if(s.timed){const est=s.fixed?s.qs.reduce((a,q)=>a+secFor(q),0):s.n*S.settings.secPerQ*1.3;s.deadline=Date.now()+est*1000}
 SESS=s;if(s.timed)tmr=setInterval(tick,1000);nextQ()}
function tick(){const el=document.getElementById('timer');if(!SESS||!SESS.deadline){clearInterval(tmr);return}const left=Math.round((SESS.deadline-Date.now())/1000);
 if(el)el.textContent='⏱ '+Math.max(0,Math.floor(left/60))+':'+String(Math.max(0,left%60)).padStart(2,'0');
 if(left<=0&&SESS.phase!=='result'){SESS.timedOut=true;toast('⏱ Time is up');timeUp()}}
function timeUp(){const s=SESS;clearInterval(tmr);if(s.phase==='q'&&s.cur&&!s.cur.done){if(s.fb||!s.cur.q.sa){recordNow(s.cur.q,0,'(timed out)')}}
 if(s.fixed)for(let i=s.i+(s.cur&&s.cur.done?1:0);i<s.qs.length;i++){const q=s.qs[i];if(!s.res.find(r=>r.q.id===q.id)&&!(s.pendingSA||[]).find(e=>e.q.id===q.id)){finalize({q,score:0,ans:'(unanswered)',timeout:true})}}
 finishSession()}
function nextQ(){const s=SESS;if(s.i>=s.n||(s.stopWhen&&s.stopWhen(s)))return finishSession();
 const q=s.fixed?s.qs[s.i]:pickNext(s);if(!q){s.n=s.i;return finishSession()}
 s.used.add(q.id);s.tc[q.k]=(s.tc[q.k]||0)+1;s.cur={q,order:q.c?shuf(q.c.map((_,i)=>i)):null,ts:Date.now(),done:false,reveal:false};
 if(location.hash!=='#/q')location.hash='#/q';else render()}
function finalize(e){const s=SESS,q=e.q;const lvc=updateSkill(q,e.score,{placement:s.kind==='placement'});e.lv=lvc;
 let it=null;if(!q.gen&&!q.drill)it=updateItem(q,e.score);
 if(e.score<1){S.errors.push({ts:Date.now(),qid:(q.gen||q.drill)?null:q.id,b:q.b,t:q.t,tag:null,resolved:false,text:q.q+(q.gen?'  → '+(q.sol||''):'')});e.err=S.errors.length-1}
 else if(it&&it.streak>=2)S.errors.forEach(x=>{if(x.qid===q.id)x.resolved=true});
 s.res.push(e);save();checkAwards()}
function recordNow(q,score,ans){const s=SESS;s.cur.done=true;s.cur.score=score;finalize({q,score,ans,secs:Math.round((Date.now()-s.cur.ts)/1000)});s.cur.entry=s.res[s.res.length-1]}
function finishSession(){const s=SESS;clearInterval(tmr);if(s.phase==='result')return;
 const pend=(s.pendingSA||[]).filter(e=>e.score==null);
 if(pend.length&&!s.timedOut){s.phase='grade';location.hash='#/q';render();return}
 (s.pendingSA||[]).forEach(e=>{if(e.score==null){e.score=0;finalize(e)}});
 s.phase='result';const n=s.fixed?s.qs.length:s.res.length,sum=s.res.reduce((a,r)=>a+r.score,0),p=n?Math.round(sum/n*100):0;s.pct=p;s.total=n;
 const complete=s.res.length>=n&&!s.timedOut;let pass=null;
 if(s.gate==='test'){const need=S.settings.passChapter;pass=complete&&p>=need;const G=S.gates[s.bid]||(S.gates[s.bid]={topic:{}});G.topic=G.topic||{};if(pass)G.topic[s.tid]=Date.now()}
 if(s.gate==='final'){const need=S.settings.passFinal;pass=complete&&p>=need;const G=S.gates[s.bid]||(S.gates[s.bid]={topic:{}});if(pass){G.final=Date.now();G.finalBest=Math.max(G.finalBest||0,p)}}
 if(s.gate==='capstone'){pass=complete&&p>=S.settings.passFinal;if(pass)S.gates.capstone=Date.now()}
 if(s.kind==='placement'){S.placement[s.bid]={ts:Date.now(),levels:Object.fromEntries(BOOK[s.bid].topics.map(t=>[t.id,+topicLv(s.bid+'.'+t.id).toFixed(2)]))}}
 s.pass=pass;if(n)S.history.push({ts:Date.now(),title:s.title,kind:s.kind,b:s.bid||null,n:s.res.length,pct:p,pass,secs:Math.round((Date.now()-s.t0)/1000),timed:!!s.timed});
 if(S.history.length>600)S.history.shift();save();checkAwards();location.hash='#/q';render()}

function unlockedPool(){return Q.filter(q=>unlockedBook(q.b))}
const needStrict=bid=>{if(!unlockedBook(bid)){toast('🔒 Master the previous module first'+(BOOK[bid].module==='m2'?' (Chemical Safety is part of Module 1)':''));return true}return false};
const poolBook=bid=>Q.filter(q=>q.b===bid);
function startAdaptive(pool,title,extra){startSession(Object.assign({kind:'adaptive',title,pool},extra||{}))}
function startPlacement(bid){const pool=poolBook(bid);const tp=BOOK[bid].topics.filter(t=>pool.some(q=>q.t===t.id)).length;
 startSession({kind:'placement',title:'Placement · '+BOOK[bid].title,pool,bid,target:0.55,n:Math.min(pool.length,Math.max(8,tp*2)),stopWhen:s=>s.res.length>=2*tp&&BOOK[bid].topics.every(t=>!pool.some(q=>q.t===t.id)||(s.tc[bid+'.'+t.id]||0)>=2)})}
function balanced(pool,n,key){const g={};shuf(pool).forEach(q=>(g[q[key]]=g[q[key]]||[]).push(q));const out=[];const ks=shuf(Object.keys(g));let more=true;while(out.length<n&&more){more=false;for(const k of ks){if(g[k].length&&out.length<n){out.push(g[k].shift());more=true}}}return shuf(out)}
function startTest(bid,tid){if(needStrict(bid))return;const pool=Q.filter(q=>q.k===bid+'.'+tid);if(!pool.length)return toast('No questions yet for this topic');
 startSession({kind:'test',gate:'test',fb:false,fixed:true,qs:shuf(pool).slice(0,8),bid,tid,title:'Chapter test · '+TOP[bid+'.'+tid].name})}
function startFinal(bid){if(needStrict(bid))return;startSession({kind:'final',gate:'final',fb:false,fixed:true,qs:balanced(poolBook(bid),25,'t'),bid,title:'Final exam · '+BOOK[bid].title})}
function startCapstone(){if(S.settings.strict&&!allMastered())return toast('🔒 Master all '+C.books.length+' books first');
 const pool=Q.filter(q=>['zweifel','kurti','carey'].includes(q.b)||q.k==='klein.mech'||q.b==='wade');startSession({kind:'capstone',gate:'capstone',fb:false,fixed:true,qs:balanced(pool,25,'b'),title:'Synthesis Capstone Exam'})}
function startReview(){const ids=dueItems().slice(0,20);if(!ids.length)return toast('Nothing due right now 🎉');startSession({kind:'review',title:'Spaced review',fixed:true,qs:ids.map(i=>QM[i])})}
function startRecheck(){const ks=new Set(decayedTopics());const pool=Q.filter(q=>ks.has(q.k));if(!pool.length)return toast('No decayed topics 🎉');startAdaptive(pool,'Re-check decayed topics',{n:Math.min(10,pool.length),target:0.7})}
function startDrill(id){startSession({kind:'drill',title:DRILL_SETS[id].name,fixed:true,qs:makeDrill(id,8)})}
function startStatic(id){const arr=shuf(DR[id]).slice(0,8).map((x,i)=>Object.assign({},x,{id:'dr-'+id+'-'+i,drill:true,k:x.b+'.'+x.t}));startSession({kind:'drill',title:id==='arrow'?'Arrow-pushing':'Spectra interpretation',fixed:true,qs:arr})}
function startErrors(){const ids=[...new Set(S.errors.filter(e=>!e.resolved&&QM[e.qid]).map(e=>e.qid))].slice(-15);if(!ids.length)return toast('No mistakes to practice');startSession({kind:'review',title:'Practice my mistakes',fixed:true,qs:shuf(ids.map(i=>QM[i]))})}

/* ---------- session views ---------- */
function vQ(){const s=SESS;if(!s)return vHome();if(s.phase==='result')return vResult();if(s.phase==='grade')return vGrade();
 const c=s.cur,q=c.q,t=TOP[q.k];let h=`<div class="qh"><button class="x" data-act="endSess">✕</button><div class="qt">${esc(s.title)} · ${s.i+1}/${s.n}</div><div id="timer" class="timer"></div></div>${bar(s.i/s.n)}
 <div class="qmeta"><span class="chip">${esc(t?t.name:'')}</span><span class="chip dif" title="difficulty">${stars(q.d)}</span><span class="chip">${q.gen?'calculate':q.c?'multiple choice':'short answer'}</span></div><div class="card qcard"><div class="qtext">${nl(q.q)}</div>`;
 if(q.c){h+=`<div class="choices">`+c.order.map((oi,i)=>{let cl='';if(c.done){if(oi===0)cl='ok';else if(c.pick===i)cl='bad';else cl='dim'}return`<button class="choice ${cl}" data-act="choose" data-i="${i}" ${c.done?'disabled':''}><b>${'ABCDEFG'[i]}</b><span>${esc(q.c[oi])}</span></button>`}).join('')+`</div>`;
  if(!c.done)h+=`<button class="btn ghost" data-act="dontknow">I don't know</button>`}
 else if(q.gen){h+=`<div class="numrow"><input id="numIn" type="text" inputmode="decimal" placeholder="Your answer" autocomplete="off" ${c.done?'disabled':''}><span class="unit">${esc(q.unit||'')}</span></div>${c.done?'':'<button class="btn pri" data-act="numCheck">Check</button>'}`}
 else{h+=`<textarea id="saText" placeholder="Write your answer / sketch the mechanism on paper, then reveal…" ${c.reveal?'disabled':''}>${esc(c.text||'')}</textarea>`;
  if(s.fb){if(!c.reveal)h+=`<button class="btn pri" data-act="reveal">Show model answer</button>`;else h+=`<div class="model"><b>Model answer</b><div>${nl(q.m)}</div></div>${c.done?'':`<div class="muted sm">Grade yourself honestly:</div><div class="row"><button class="btn good" data-act="grade" data-v="1">✅ Got it</button><button class="btn" data-act="grade" data-v="0.5">◐ Partly</button><button class="btn bad" data-act="grade" data-v="0">✗ Missed</button></div>`}`}
  else h+=`<button class="btn pri" data-act="saveSA">Save & next</button>`}
 h+=`</div>`;
 if(c.done&&s.fb){const ok=c.score>=1;h+=`<div class="card fbk ${ok?'ok':c.score>0?'part':'bad'}"><b>${ok?'✅ Correct':c.score>0?'◐ Partly right':'✗ Not quite'}</b>${q.gen?`<div>Answer: ${esc(r3(q.ans))} ${esc(q.unit||'')}</div><div class="sm">${esc(q.sol)}</div>`:q.c?`<div class="sm">${nl(q.e||'')}</div>`:''}
  ${c.entry&&c.entry.lv&&Math.floor(c.entry.lv.after)>Math.floor(c.entry.lv.before)?`<div class="up">⬆ Level up: ${esc(t.name)} → ${LV[Math.floor(c.entry.lv.after)]}</div>`:''}
  ${!ok&&c.entry&&c.entry.err!=null?`<div class="muted sm">Why did you miss it? (error log)</div><div class="tags">${TAGS.map(g=>`<button class="tag ${S.errors[c.entry.err].tag===g[0]?'on':''}" data-act="tag" data-id="${g[0]}">${g[1]}</button>`).join('')}</div>`:''}
  <button class="btn pri" data-act="next">${s.i+1>=s.n?'Finish':'Next →'}</button></div>`}
 return h}
function vGrade(){const s=SESS,p=s.pendingSA.filter(e=>e.score==null);
 return`<div class="qh"><div class="qt">Grade your written answers</div></div><p class="muted sm">Compare each answer with the model answer and grade honestly.</p>`+s.pendingSA.map((e,i)=>`<div class="card"><div class="qtext">${nl(e.q.q)}</div><div class="muted sm">Your answer:</div><div class="mine">${nl(e.ans||'(blank)')}</div><div class="model"><b>Model answer</b><div>${nl(e.q.m)}</div></div>${e.score==null?`<div class="row"><button class="btn good" data-act="gradeSA" data-i="${i}" data-v="1">✅ Got it</button><button class="btn" data-act="gradeSA" data-i="${i}" data-v="0.5">◐ Partly</button><button class="btn bad" data-act="gradeSA" data-i="${i}" data-v="0">✗ Missed</button></div>`:`<div class="chip">${e.score>=1?'✅':e.score>0?'◐':'✗'} graded</div>`}</div>`).join('')+`<button class="btn pri" data-act="finishGrade" ${p.length?'disabled':''}>See results</button>`}
function vResult(){const s=SESS,p=s.pct;const touched={};s.res.forEach(r=>{const k=r.q.k;(touched[k]=touched[k]||{n:0,s:0}).n++;touched[k].s+=r.score});
 const gateTxt=s.gate==='test'?`Chapter test gate: ≥${S.settings.passChapter}%`:s.gate==='final'?`Final exam gate: ≥${S.settings.passFinal}%`:s.gate==='capstone'?`Capstone gate: ≥${S.settings.passFinal}%`:'';
 const missed=s.res.filter(r=>r.score<1&&r.err!=null);
 return`<div class="card hero center"><div class="bigscore ${s.pass===true?'ok':s.pass===false?'bad':''}">${p}%</div><div>${s.res.reduce((a,r)=>a+r.score,0)} / ${s.total} · ${esc(s.title)}</div>${s.gate?`<div class="chip ${s.pass?'gold':''}">${s.pass?'PASSED ✅':'Not passed yet'} · ${gateTxt}</div>`:''}${s.timedOut?'<div class="muted sm">⏱ Time ran out; unanswered items counted as missed.</div>':''}${s.kind==='placement'?'<div class="chip gold">Placement complete — your skill map is set</div>':''}</div>
 <div class="card"><h3>Topic breakdown</h3>${Object.keys(touched).map(k=>{const a=s.snap[k],b=topicLv(k);return`<div class="skh"><span>${esc(TOP[k].name)}</span><span class="muted sm">${touched[k].s}/${touched[k].n} · Lv ${a?a.toFixed(1)+' → ':''}<b style="color:${lvColor(b)}">${b.toFixed(1)}</b></span></div>`}).join('')}</div>
 ${missed.length&&!s.fb?`<div class="card"><h3>Tag your mistakes</h3>${missed.map(r=>`<div class="miss"><div class="sm">${esc(r.q.q.slice(0,110))}${r.q.q.length>110?'…':''}</div><div class="tags">${TAGS.map(g=>`<button class="tag ${S.errors[r.err]&&S.errors[r.err].tag===g[0]?'on':''}" data-act="tagE" data-e="${r.err}" data-id="${g[0]}">${g[1]}</button>`).join('')}</div></div>`).join('')}</div>`:''}
 <details class="card"><summary>Review all answers</summary>${s.res.map(r=>`<div class="rv ${r.score>=1?'ok':'bad'}"><b>${r.score>=1?'✅':r.score>0?'◐':'✗'}</b> ${nl(r.q.q)}<div class="sm muted">${r.q.gen?'Answer: '+esc(r.q.ans)+' '+esc(r.q.unit||'')+' — '+esc(r.q.sol):r.q.c?'Correct: '+esc(r.q.c[0])+' — '+esc(r.q.e||''):'Model: '+esc(r.q.m)}</div></div>`).join('')}</details>
 <div class="row"><button class="btn pri" data-act="again">Again</button><a class="btn" href="#/">Home</a>${s.bid?`<a class="btn" href="#/book/${s.bid}">Book page</a>`:''}</div>`}

/* ---------- router ---------- */
function render(keep){const y=window.scrollY;const h=location.hash||'#/',parts=h.replace(/^#\//,'').split('/'),r=parts[0]||'';let html;
 try{switch(r){case'':html=vHome();break;case'books':html=vBooks();break;case'book':html=vBook(parts[1]);break;case'practice':html=vPractice();break;case'drills':html=vDrills();break;case'skills':html=vSkills();break;case'abilities':html=vAbilities();break;case'trophies':html=vTrophies();break;case'tree':html=vTree();break;case'errors':html=vErrors();break;case'history':html=vHistory();break;case'more':html=vMore();break;case'help':html=vHelp();break;case'settings':html=vSettings();break;case'q':html=SESS?vQ():vHome();break;default:html=vHome()}}
 catch(e){console.error(e);html=`<div class="card bad">Something went wrong: ${esc(e.message)}</div>`}
 $app().innerHTML=html;const tab={'':'home',books:'books',book:'books',practice:'practice',drills:'practice',q:'practice',skills:'skills',abilities:'skills'}[r]||'more';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.tab===tab));document.body.classList.toggle('inq',r==='q');
 if(keep)window.scrollTo(0,y);else window.scrollTo(0,0);if(r==='q'&&SESS&&SESS.timed)tick();if(r!=='q')showAnn()}
window.addEventListener('hashchange',()=>render());
document.addEventListener('toggle',e=>{const d=e.target;if(d.tagName==='DETAILS'&&d.dataset.key){d.open?OPEN.add(d.dataset.key):OPEN.delete(d.dataset.key)}},true);

/* ---------- actions ---------- */
const val=id=>{const e=document.getElementById(id);return e?e.value:''};
function dl(name,txt){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function answerMC(i){const s=SESS,c=s.cur,q=c.q;if(c.done)return;c.pick=i;const ok=c.order[i]===0;
 if(s.fb){recordNow(q,ok?1:0,q.c[c.order[i]]);render(true)}else{recordNow(q,ok?1:0,q.c[c.order[i]]);s.i++;nextQ()}}
function checkNum(txt){const q=SESS.cur.q;const v=parseFloat(String(txt).replace(/,/g,'').replace(/×10\^?/,'e').trim());if(!isFinite(v))return null;
 return q.abs!=null?Math.abs(v-q.ans)<=q.abs:Math.abs(v-q.ans)<=Math.abs(q.ans)*(q.tol||0.02)}
const A={
 chk(el){const id=el.dataset.id;if(S.checks[id])delete S.checks[id];else S.checks[id]=Date.now();save();render(true);checkAwards()},
 daily(){const pool=unlockedPool();startSession({kind:'daily',title:'Daily session',pool,n:15})},
 review(){startReview()},recheck(){startRecheck()},
 adaptiveAll(){startAdaptive(unlockedPool(),'Adaptive · all unlocked')},
 bookPractice(el){const b=el.dataset.id;if(needStrict(b))return;startAdaptive(poolBook(b),'Adaptive · '+BOOK[b].title)},
 bookPracticeSel(){A.bookPractice({dataset:{id:val('selBook')}})},
 topicPractice(el){const k=el.dataset.k;if(!TOP[k]||needStrict(TOP[k].book))return;startAdaptive(Q.filter(q=>q.k===k),'Topic · '+TOP[k].name,{n:Math.min(10,Q.filter(q=>q.k===k).length)})},
 place(el){startPlacement(el.dataset.id)},placeSel(){startPlacement(val('selBook'))},
 test(el){startTest(el.dataset.id,el.dataset.t)},final(el){startFinal(el.dataset.id)},capstone(){startCapstone()},
 drill(el){startDrill(el.dataset.id)},sdrill(el){startStatic(el.dataset.id)},errPractice(){startErrors()},
 ef(el){window._ef=el.dataset.id;render(true)},
 optTimed(el){S.settings.timed=el.checked;save()},setStrict(el){S.settings.strict=el.checked;save();toast(el.checked?'Strict gating on':'Gating relaxed: all modules open')},
 saveSet(){const n=(id,a,b,d)=>clamp(parseFloat(val(id))||d,a,b);const s=S.settings;s.secPerQ=n('setSec',20,600,75);s.passChapter=n('setCh',50,100,90);s.passFinal=n('setFi',50,100,95);s.target=n('setTg',60,90,78)/100;s.sessionLen=Math.round(n('setLen',5,40,12));save();toast('Saved');render(true)},
 exportFile(){dl('chem-mastery-backup-'+new Date().toISOString().slice(0,10)+'.json',exportJSON());S.lastBackup=Date.now();save();toast('Backup downloaded');render(true)},
 copyBackup(){const t=exportJSON();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{S.lastBackup=Date.now();save();toast('Backup copied')}).catch(()=>{const b=document.getElementById('pasteBox');if(b){b.value=t;b.select();toast('Select all & copy the text shown')}})},
 importFile(el){const f=el.files[0];if(!f)return;f.text().then(t=>{if(!confirm('Replace ALL current progress with this backup?'))return;try{importJSON(t);toast('Backup restored');render()}catch(e){toast('Import failed: '+e.message)}})},
 importPaste(){const t=val('pasteBox');if(!t.trim())return;if(!confirm('Replace ALL current progress with this backup?'))return;try{importJSON(t);toast('Backup restored');render()}catch(e){toast('Import failed: '+e.message)}},
 importPack(el){const f=el.files[0];if(!f)return;f.text().then(t=>{try{const r=importPack(t);toast(r.ok+' questions added'+(r.bad?', '+r.bad+' skipped':''));render(true)}catch(e){toast('Import failed: '+e.message)}})},
 wipe(){if(confirm('Erase ALL progress on this device? Export a backup first!')&&confirm('Really erase everything?')){localStorage.removeItem(LS_KEY);load();Q.length=0;Object.keys(QM).forEach(k=>delete QM[k]);C.books.forEach(b=>b._q.forEach(q=>addQ(q,b.id)));SESS=null;location.hash='#/';render()}},
 choose(el){answerMC(+el.dataset.i)},
 dontknow(){const s=SESS,c=s.cur;c.pick=-1;recordNow(c.q,0,"(don't know)");if(s.fb){S.errors[c.entry.err].tag='concept';save();render(true)}else{s.i++;nextQ()}},
 reveal(){const c=SESS.cur;c.text=val('saText');c.reveal=true;render(true)},
 grade(el){const c=SESS.cur;recordNow(c.q,+el.dataset.v,c.text||'');render(true)},
 saveSA(){const s=SESS,c=s.cur;c.done=true;(s.pendingSA=s.pendingSA||[]).push({q:c.q,ans:val('saText'),score:null,secs:Math.round((Date.now()-c.ts)/1000)});s.i++;nextQ()},
 gradeSA(el){const e=SESS.pendingSA[+el.dataset.i];if(e.score!=null)return;e.score=+el.dataset.v;finalize(e);render(true)},
 finishGrade(){finishSession()},
 numCheck(){const s=SESS,c=s.cur,v=val('numIn'),ok=checkNum(v);if(ok===null)return toast('Enter a number');recordNow(c.q,ok?1:0,v);render(true)},
 tag(el){const s=SESS,e=s.cur.entry;if(e&&e.err!=null){S.errors[e.err].tag=el.dataset.id;save();render(true)}},
 tagE(el){const e=S.errors[+el.dataset.e];if(e){e.tag=el.dataset.id;save();render(true)}},
 next(){SESS.i++;nextQ()},
 endSess(){if(!confirm('End this session now?'))return;const s=SESS;if(s.phase==='q'||s.phase==='grade'){s.timedOut=true;if(s.pendingSA)s.pendingSA.forEach(e=>{if(e.score==null){e.score=0;finalize(e)}});finishSession()}else{SESS=null;location.hash='#/'}},
 again(){const s=SESS;if(s.kind==='placement')return startPlacement(s.bid);if(s.gate==='test')return startTest(s.bid,s.tid);if(s.gate==='final')return startFinal(s.bid);if(s.gate==='capstone')return startCapstone();
  if(s.kind==='drill'){SESS=null;location.hash='#/drills';return}if(s.kind==='review'){SESS=null;location.hash='#/';return}startSession({kind:s.kind,title:s.title,pool:s.pool,n:s.n0||S.settings.sessionLen,target:s.target})}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.tagName==='INPUT'&&el.type==='file')return;if(el.tagName==='INPUT'&&el.type==='checkbox'&&el.dataset.act!=='chk'){return}
 const f=A[el.dataset.act];if(f){if(el.tagName==='INPUT'&&el.type==='checkbox'&&el.dataset.act==='chk'){e.preventDefault&&0}f(el)}});
document.addEventListener('change',e=>{const el=e.target;if(el.tagName==='INPUT'&&(el.type==='file'||el.dataset.act==='optTimed'||el.dataset.act==='setStrict')){const f=A[el.dataset.act];if(f)f(el)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='numIn'&&SESS&&!SESS.cur.done)A.numCheck()});

/* ---------- boot ---------- */
async function boot(){load();try{await loadData()}catch(e){document.getElementById('app').innerHTML='<div class="card bad">Could not load data files. Serve this folder over http(s) (not file://).<br>'+esc(e.message)+'</div>';return}
 checkAwards();if(!location.hash)location.hash='#/';render();
 if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{})}
window.addEventListener('DOMContentLoaded',boot);
