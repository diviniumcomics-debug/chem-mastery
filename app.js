'use strict';
/* Chem Mastery — core: state, adaptive skill model, selection, gates, awards */
const LS_KEY='chemMastery.v1',DAY=864e5,INTERVALS=[1,3,7,21,60],T0=-0.9;
const LV=['Unrated','Novice','Foundation','Proficient','Advanced','Expert'];
const TAGS=[['concept','Concept gap'],['recall','Forgot / recall'],['careless','Careless slip'],['misread','Misread question'],['method','Wrong method'],['units','Units / sign / arithmetic'],['time','Time pressure'],['guess','Lucky guess / unsure']];
const RANKS=[[0,'Initiate'],[1,'Apprentice'],[3,'Adept'],[5,'Specialist'],[8,'Expert'],[12,'Grandmaster']];
let C,AB,DR,S,Q=[],QM={},BOOK={},TOP={},MOD={},annQ=[];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today0=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const sig=x=>1/(1+Math.exp(-x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const fmtD=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});

function defState(){return{v:1,created:Date.now(),settings:{strict:true,passChapter:90,passFinal:95,timed:false,secPerQ:75,target:0.78,sessionLen:12},
 checks:{},skill:{},items:{},history:[],errors:[],gates:{},placement:{},trophies:{},abil:{},lastBackup:0,extraQ:[]}}
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(LS_KEY))}catch(e){}
 const d=defState();S=Object.assign(d,s||{});S.settings=Object.assign(d.settings,(s&&s.settings)||{});
 ['checks','skill','items','gates','placement','trophies','abil'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]={}});
 ['history','errors','extraQ'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]})}
function save(){try{localStorage.setItem(LS_KEY,JSON.stringify(S))}catch(e){toast('⚠️ Could not save — storage full or blocked. Export a backup!')}}

async function jget(u){const r=await fetch(u);if(!r.ok)throw new Error(u+' '+r.status);return r.json()}
function addQ(q,b){q.b=b;if(!TOP[b+'.'+q.t]||QM[q.id])return false;q.k=b+'.'+q.t;QM[q.id]=q;Q.push(q);return true}
async function loadData(){
 C=await jget('data/curriculum.json');AB=await jget('data/abilities.json');DR=await jget('data/drills.json');
 C.modules.forEach(m=>MOD[m.id]=m);
 C.books.forEach(b=>{BOOK[b.id]=b;b.topics.forEach(t=>{t.key=b.id+'.'+t.id;t.book=b.id;TOP[t.key]=t})});
 await Promise.all(C.books.map(async b=>{try{const f=await jget('data/q/'+b.id+'.json');b._q=f.questions}catch(e){console.warn(e);b._q=[]}}));
 C.books.forEach(b=>b._q.forEach(q=>addQ(q,b.id)));
 S.extraQ.forEach(q=>addQ(q,q.b));
}

/* ---------- skill model (1-PL IRT / Elo style) ---------- */
const bOf=d=>(d-3)*0.9;
const level=th=>clamp(3+th/0.9,1,5);
function sk(k){return S.skill[k]||(S.skill[k]={th:T0,n:0,corr:0,streak:0,last:0,h:[]})}
function decayPen(s,now){now=now||Date.now();if(!s||!s.last)return 0;const grace=10+5*Math.min(s.streak,8);const over=(now-s.last)/DAY-grace;return over>0?0.6*(1-Math.exp(-over/45)):0}
const effTh=s=>s.th-decayPen(s);
const pExp=(q,th)=>{const g=q.c?0.2:0;return g+(1-g)*sig(th-bOf(q.d))};
function topicLv(k){const s=S.skill[k];return s&&s.n?level(effTh(s)):0}
function updateSkill(q,score,opt){const s=sk(q.k),now=Date.now();s.th=effTh(s);const before=level(s.th);const P=pExp(q,s.th);
 const K=Math.max(0.18,0.9/(1+0.35*s.n))*(opt&&opt.placement?1.3:1);
 s.th=clamp(s.th+K*(score-P),-3,3.2);s.n++;if(score>=1){s.corr++;s.streak++}else if(score<=0)s.streak=0;
 s.last=now;s.h=(s.h||[]).concat([[now,+level(s.th).toFixed(2)]]).slice(-40);
 return{before,after:level(s.th)}}
function item(id){return S.items[id]||(S.items[id]={seen:0,corr:0,streak:0,box:0,due:0,last:0})}
function updateItem(q,score){const it=item(q.id);it.seen++;it.last=Date.now();
 if(score>=1){it.corr++;it.streak++;it.box=Math.min(5,it.box+1)}else if(score>0){it.streak=0;it.box=Math.max(0,it.box-1)}else{it.streak=0;it.box=0}
 const iv=it.box===0?1:INTERVALS[Math.min(it.box-1,4)];it.due=today0()+iv*DAY;return it}
const isMasteredItem=(it,now)=>it&&it.box>=3&&it.streak>=2&&!(it.due<=now);

/* adaptive selection: aim near target success probability, avoid mastered/recent, prefer due + decayed */
function pickNext(sess){const now=Date.now(),tg=sess.target;let best=null,bs=1e9,fb=null,fs=1e9;
 for(const q of sess.pool){if(sess.used.has(q.id))continue;
  const it=S.items[q.id],s=S.skill[q.k],th=s?effTh(s):T0,p=pExp(q,th);let sc=Math.abs(p-tg)*2;
  const dueNow=it&&it.due&&it.due<=now;
  if(dueNow)sc-=0.6;
  if(it&&!dueNow){const age=(now-it.last)/DAY;if(age<1)sc+=0.8;else if(age<3)sc+=0.3}
  if(!it)sc-=0.1;
  if(s&&decayPen(s)>0)sc-=0.25;
  sc+=(sess.tc[q.k]||0)*(sess.kind==='placement'?0.6:0.12)+Math.random()*0.12;
  if(isMasteredItem(it,now)){if(sc+2<fs){fs=sc+2;fb=q}continue}
  if(sc<bs){bs=sc;best=q}}
 return best||fb}
function decayedTopics(){return Object.keys(S.skill).filter(k=>TOP[k]&&S.skill[k].n>0&&decayPen(S.skill[k])>0.02&&unlockedBook(TOP[k].book))}

/* ---------- checklists, gates, locks ---------- */
const bookTopics=bid=>BOOK[bid].topics;
function bookItems(bid){const b=BOOK[bid],G=S.gates[bid]||{},L=[];
 b.topics.forEach(t=>{const k=bid+'.'+t.id;
  t.focus.forEach((f,i)=>L.push({id:k+'.f'+i,text:f,kind:'chk',topic:t.id}));
  L.push({id:k+'.prob',text:'Worked the full problem set unaided (≥90% correct)',kind:'chk',topic:t.id});
  L.push({id:k+'.teach',text:'Teach-back: explained this topic aloud from a blank page',kind:'chk',topic:t.id});
  L.push({id:k+'.test',text:'Passed the chapter test (≥'+S.settings.passChapter+'%)',kind:'auto',topic:t.id,done:!!(G.topic&&G.topic[t.id])})});
 L.push({id:bid+'.lit',text:'Read and summarized 2 primary-literature papers that use this material',kind:'chk'});
 L.push({id:bid+'.skill',text:'Adaptive skill ≥ Advanced (4.0) on every topic (≥3 answers each)'+(b.topics.some(t=>gateLv(bid+'.'+t.id)<4)?' (bar is lower on topics with no hard questions yet)':''),kind:'auto',done:b.topics.every(t=>{const s=S.skill[bid+'.'+t.id];return s&&s.n>=3&&level(effTh(s))>=gateLv(bid+'.'+t.id)})});
 L.push({id:bid+'.final',text:'Passed the final exam (≥'+S.settings.passFinal+'%)',kind:'auto',done:!!G.final});
 L.forEach(x=>{if(x.kind==='chk')x.done=!!S.checks[x.id]});return L}
const bookProg=bid=>{const L=bookItems(bid);return L.filter(x=>x.done).length/L.length};
const isM=bid=>!!S.trophies['book.'+bid];
const modBooks=mid=>C.books.filter(b=>b.module===mid);
const modDone=mid=>modBooks(mid).every(b=>isM(b.id));
function modUnlocked(mid){if(!S.settings.strict)return true;const i=C.modules.findIndex(m=>m.id===mid);return i<=0||modDone(C.modules[i-1].id)}
const unlockedBook=bid=>modUnlocked(BOOK[bid].module);
const allMastered=()=>C.books.every(b=>isM(b.id));
function summitItems(){const su=C.summit,L=[{id:'sm.books',text:'All '+C.books.length+' books MASTERED (including the Chemical Safety track)',kind:'auto',done:allMastered()}];
 su.targets.forEach(t=>L.push({id:'sm.t.'+t.id,text:'Analyzed: '+t.name,kind:'chk'}));
 su.tasks.forEach(t=>L.push(t.id==='capstone'?{id:'sm.capstone',text:t.text,kind:'auto',done:!!S.gates.capstone}:{id:'sm.k.'+t.id,text:t.text,kind:'chk'}));
 L.forEach(x=>{if(x.kind==='chk')x.done=!!S.checks[x.id]});return L}
const summitProg=()=>{const L=summitItems();return L.filter(x=>x.done).length/L.length};
function overallProg(){return C.books.reduce((a,b)=>a+bookProg(b.id),0)/C.books.length}
function rankName(){if(S.trophies.summit)return C.summit.rank;const m=C.books.filter(b=>isM(b.id)).length;let r=RANKS[0][1];RANKS.forEach(x=>{if(m>=x[0])r=x[1]});return r}
function dueItems(){const now=Date.now();return Object.keys(S.items).filter(id=>QM[id]&&S.items[id].due&&S.items[id].due<=now&&unlockedBook(QM[id].b)).sort((a,b)=>S.items[a].due-S.items[b].due)}

/* ---------- awards: trophies (books, modules, titles, capstone, summit) + abilities ---------- */
function abilityOK(k,thr){const s=S.skill[k];if(!s||!s.n)return false;const need=thr<3?2:thr<4?3:4;return s.n>=need&&s.corr>=Math.ceil(s.n*0.5)&&level(effTh(s))>=thr}
function bookNote(b){const left=modBooks(b.module).filter(x=>!isM(x.id)&&x.id!==b.id).length;return left?left+' more book'+(left>1?'s':'')+' to finish Module '+MOD[b.module].n:'Module '+MOD[b.module].n+' books complete'}
function gateLv(k){const mx=Math.max(0,...Q.filter(q=>q.k===k).map(q=>q.d));return mx>=4?4:Math.max(3,mx+0.5)}
function nextModNote(m){const i=C.modules.findIndex(x=>x.id===m.id),n=C.modules[i+1];return n?'🔓 Unlocked: Module '+n.n+' — '+n.name:'🔓 All five modules complete — the capstone and summit goal are open'}
function checkAwards(){const out=[],ab=[];
 const give=(id,o)=>{if(!S.trophies[id]){S.trophies[id]=Object.assign({ts:Date.now()},o);out.push(Object.assign({id},o))}};
 C.books.forEach(b=>{if(bookItems(b.id).every(x=>x.done))give('book.'+b.id,{kind:'Book',name:b.masterTitle,badge:b.badge,title:b.title,note:b.id==='safety'?'🦺 Safety track cleared: you can now reason about hazards, exposure limits, incompatibilities and runaway risk. Keep applying it in every later module.':bookNote(b)})});
 C.modules.forEach(m=>{if(modBooks(m.id).every(b=>S.trophies['book.'+b.id]))give('mod.'+m.id,{kind:'Module',name:m.masterTitle,badge:m.badge,title:'Module '+m.n+': '+m.name,note:nextModNote(m)})});
 C.titles.forEach(t=>{if(t.books.every(b=>S.trophies['book.'+b]))give(t.id,{kind:'Title',name:t.name,badge:t.badge,title:'Title: '+t.name})});
 if(allMastered())give('capstone',{kind:'Capstone',name:C.capstone.name,badge:C.capstone.badge,title:'All '+C.books.length+' books mastered'});
 if(summitItems().every(x=>x.done))give('summit',{kind:'Summit',name:C.summit.name,badge:C.summit.badge,title:C.summit.rank});
 Object.keys(AB).forEach(k=>{if(!TOP[k])return;AB[k].forEach((a,i)=>{const id=k+'#'+i;if(!S.abil[id]&&abilityOK(k,a[1])){S.abil[id]=Date.now();ab.push(a[0])}})});
 if(out.length||ab.length)save();
 out.forEach(o=>annQ.push(o));ab.forEach(t=>toast('✨ You can now '+t));
 if(typeof showAnn==='function')showAnn();return out}
const abilityCount=()=>Object.keys(AB).reduce((a,k)=>a+(TOP[k]?AB[k].length:0),0);

/* ---------- backup ---------- */
function exportJSON(){return JSON.stringify({app:'chem-mastery',exported:new Date().toISOString(),state:S},null,1)}
function importJSON(txt){const o=JSON.parse(txt);const st=o&&o.state?o.state:o;if(!st||typeof st!=='object'||!st.settings||!st.skill)throw new Error('Not a Chem Mastery backup');
 S=Object.assign(defState(),st);S.settings=Object.assign(defState().settings,st.settings);load_fix();Q.length=0;Object.keys(QM).forEach(k=>delete QM[k]);C.books.forEach(b=>b._q.forEach(q=>addQ(q,b.id)));S.extraQ.forEach(q=>addQ(q,q.b));save()}
function load_fix(){['checks','skill','items','gates','placement','trophies','abil'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]={}});['history','errors','extraQ'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]})}
function importPack(txt){const o=JSON.parse(txt);const arr=Array.isArray(o)?o:o.questions;if(!Array.isArray(arr))throw new Error('Expected {"questions":[...]}');let ok=0,bad=0;
 arr.forEach(q=>{const b=q.b||o.book;const valid=b&&BOOK[b]&&q.id&&q.q&&q.d>=1&&q.d<=5&&(q.c&&q.c.length>=3&&q.e||q.m);if(valid&&!QM[q.id]){q.b=b;if(addQ(q,b)){S.extraQ.push(q);ok++}else bad++}else bad++});save();return{ok,bad}}
