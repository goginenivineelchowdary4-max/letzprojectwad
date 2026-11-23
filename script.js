// ---------- Config ----------
const K='fitforge_v1', DAY=864e5, MAX_MIN_PER_DAY=180, WEEK_GOAL=2500, BOSS_HP=4000;
const MET={Running:8.9,Cycling:7.5,'Push-ups':8,Gym:5};           // MET factors
const MUL={Low:.8,Medium:1,High:1.2};                              // intensity multipliers
const calc=(t,d,i)=>Math.round(d*MET[t]*MUL[i]);                   // Points = Duration * MET * Intensity
const BADGES=[
 {id:'first',e:'👟',n:'First Step',d:'Log your first workout',f:l=>l.length>=1},
 {id:'5k',e:'🏃',n:'5k Trailblazer',d:'Run 5 km in one go',f:l=>l.some(x=>x.t==='Running'&&x.di>=5)},
 {id:'10k',e:'🔥',n:'10k Runner',d:'Run 10 km in one go',f:l=>l.some(x=>x.t==='Running'&&x.di>=10)},
 {id:'streak',e:'📅',n:'7-Day Streak',d:'Work out 7 days in a row',f:l=>streak(l)>=7},
 {id:'beast',e:'🦁',n:'Consistency Beast',d:'Log 20 workouts',f:l=>l.length>=20},
 {id:'100',e:'💯',n:'Century Club',d:'Earn 500 points',f:l=>l.reduce((a,x)=>a+x.p,0)>=500},
 {id:'pedal',e:'🚴',n:'Pedal Pusher',d:'Cycle 50 km total',f:l=>l.filter(x=>x.t==='Cycling').reduce((a,x)=>a+x.di,0)>=50},
 {id:'core',e:'💪',n:'Iron Core',d:'120 min of gym or push-ups',f:l=>l.filter(x=>x.t==='Gym'||x.t==='Push-ups').reduce((a,x)=>a+x.d,0)>=120}
];
function streak(l){const s=new Set(l.map(x=>new Date(x.ts).toDateString()));let c=0,t=Date.now();
 if(!s.has(new Date(t).toDateString()))t-=DAY; while(s.has(new Date(t).toDateString())){c++;t-=DAY}return c}

// ---------- State ----------
let S=load(), tab='home', per='week', charts=[];
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}}
function load(){try{const r=localStorage.getItem(K);if(r)return JSON.parse(r)}catch(e){}return seed()}
function seed(){
 const def=[['Iron Legion','IRON42',['Arjun','Kiran','Meera','Rohan'],1850],['Thunder Paws','THND77',['Sneha','Vikram','Anil','Divya'],2100],
 ['Sweat Titans','TITN19',['Ravi','Pooja','Hari','Lata'],1500],['Fit Phoenix','PHNX08',['Nikhil','Isha','Varun','Tara'],1200],['Gym Rats','RATS55',['Karthik','Neha','Sai','Bhavya'],980]];
 const st={squads:[],users:{},logs:[],me:'Arjun'},types=Object.keys(MET),w=[.1,.15,.12,.18,.14,.16,.15],now=Date.now();
 def.forEach(([name,code,ms,T],si)=>{
  const id='s'+si;st.squads.push({id,name,code});
  const sh=[.22,.24,.26].map(x=>Math.round(T*x));sh.push(T-sh[0]-sh[1]-sh[2]);
  ms.forEach((m,mi)=>{st.users[m]=id;let used=0;
   for(let d=0;d<7;d++){const p=d===6?sh[mi]-used:Math.round(sh[mi]*w[d]);used+=p;
    const t=types[(mi+d)%4];
    st.logs.push({u:m,sq:id,t,d:Math.max(1,Math.round(p/MET[t])),di:t==='Running'?3+(d%3)*.5:t==='Cycling'?8+d:0,i:'Medium',p,ts:now-d*DAY})}});
 });
 return st;
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sqOf=n=>S.squads.find(s=>s.id===S.users[n]);
const mem=id=>Object.keys(S.users).filter(n=>S.users[n]===id);
const mine=n=>S.logs.filter(l=>l.u===n);
const inP=(l,p)=>p==='day'?new Date(l.ts).toDateString()===new Date().toDateString():Date.now()-l.ts<(p==='week'?7:30)*DAY;
const sum=a=>a.reduce((x,l)=>x+l.p,0);
const unlocked=n=>BADGES.filter(b=>b.f(mine(n))).map(b=>b.id);
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3500)}
function rankOf(id){const r=S.squads.map(s=>[s.id,sum(S.logs.filter(l=>l.sq===s.id&&inP(l,per))) ]).sort((a,b)=>b[1]-a[1]);return r.findIndex(x=>x[0]===id)+1}

// ---------- Actions ----------
function logWorkout(t,d,di,i){
 const me=S.me,sq=sqOf(me);
 if(!sq)return toast('Join a squad first.');
 if(!(d>0))return toast('Enter a duration above 0 minutes.');
 const today=mine(me).filter(l=>inP(l,'day')).reduce((a,l)=>a+l.d,0);
 if(today+d>MAX_MIN_PER_DAY)return toast('Limit reached: max 3 hours of exercise per day.');
 const last=mine(me).slice(-1)[0];
 if(last&&Date.now()-last.ts<4000)return toast('Slow down: wait a few seconds between logs.');
 const before=unlocked(me),beforeRank=rankOf(sq.id),p=calc(t,d,i);
 S.logs.push({u:me,sq:sq.id,t,d,di,i,p,ts:Date.now()});save();
 const nb=unlocked(me).filter(x=>!before.includes(x)).map(x=>BADGES.find(b=>b.id===x));
 let m='+'+p+' points for '+sq.name+'!';
 if(nb.length)m+=' Badge unlocked: '+nb.map(b=>b.e+' '+b.n).join(', ');
 const nr=rankOf(sq.id);if(nr<beforeRank)m+=' Squad moved up to #'+nr+'!';
 toast(m);render();
}
function submitLog(){logWorkout(g('wt').value,+g('wd').value,+g('wk').value||0,g('wi').value)}
function demo(){logWorkout('Running',30,5,'High')}
const g=id=>document.getElementById(id);
function setMe(n){S.me=n;save();render()}
function joinSquad(){const c=g('code').value.trim().toUpperCase(),s=S.squads.find(x=>x.code===c);
 if(!s)return toast('Invalid invite code.');if(mem(s.id).length>=6)return toast('That squad is full (max 6).');
 S.users[S.me]=s.id;save();toast('Joined '+s.name+'!');render()}
function createSquad(){const n=g('sname').value.trim();if(!n)return toast('Enter a squad name.');
 const id='s'+Date.now(),code=n.replace(/[^a-z]/gi,'').slice(0,4).toUpperCase()+Math.floor(10+Math.random()*89);
 S.squads.push({id,name:n,code});S.users[S.me]=id;save();toast('Squad created. Invite code: '+code);render()}
function addUser(){const n=g('uname').value.trim();if(!n||S.users[n]!==undefined)return toast('Enter a new unique name.');
 S.users[n]=null;S.me=n;save();render()}
function resetAll(){if(confirm('Reset all data to demo data?')){S=seed();save();render()}}

// ---------- Views ----------
const TABS=[['home','Log'],['board','Leaderboard'],['chart','Progress'],['badges','Badges'],['squad','Squad']];
function render(){
 charts.forEach(c=>c.destroy());charts=[];
 g('tabs').innerHTML=TABS.map(([k,v])=>`<button class="${tab===k?'on':''}" onclick="tab='${k}';render()">${v}</button>`).join('');
 g('view').innerHTML=({home,board,chart,badges,squad})[tab]();
 if(tab==='chart')drawCharts();
}
function userSel(){return `<label>Playing as</label><select onchange="setMe(this.value)">${Object.keys(S.users).map(n=>`<option ${n===S.me?'selected':''}>${esc(n)}</option>`).join('')}</select>`}
function home(){
 const sq=sqOf(S.me),tot=sum(S.logs.filter(l=>sq&&l.sq===sq.id)),wk=sq?sum(S.logs.filter(l=>l.sq===sq.id&&inP(l,'week'))):0;
 const mp=sum(mine(S.me));
 return `<div class="card">${userSel()}
 <p class="sub" style="margin-top:10px">${sq?esc(sq.name)+' • rank #'+rankOf(sq.id)+' this '+per:'No squad yet. Open the Squad tab.'}</p>
 <div class="row"><div><div class="big">${tot}</div><small>squad points</small></div><div><div class="big" style="color:var(--acc2)">${mp}</div><small>your points</small></div></div></div>
 ${sq?`<div class="card"><h2>Weekly squad goal</h2><div class="bar"><i style="width:${Math.min(100,wk/WEEK_GOAL*100)}%"></i></div>
 <small class="sub">${wk} / ${WEEK_GOAL} points</small>
 <h2 style="margin-top:12px">Boss battle: Iron Titan 🐲</h2><div class="bar boss"><i style="width:${Math.max(0,100-wk/BOSS_HP*100)}%"></i></div>
 <small class="sub">${Math.max(0,BOSS_HP-wk)} HP left. Your squad's weekly points chip it down.</small></div>`:''}
 <div class="card"><h2>Log a workout</h2>
 <div class="row"><div><label>Exercise</label><select id="wt">${Object.keys(MET).map(t=>`<option>${t}</option>`).join('')}</select></div>
 <div><label>Intensity</label><select id="wi">${Object.keys(MUL).map(t=>`<option ${t==='Medium'?'selected':''}>${t}</option>`).join('')}</select></div></div>
 <div class="row" style="margin:8px 0"><div><label>Duration (min)</label><input id="wd" type="number" min="1" max="180" inputmode="numeric" placeholder="30"></div>
 <div><label>Distance (km)</label><input id="wk" type="number" min="0" step="0.1" inputmode="decimal" placeholder="0"></div></div>
 <p class="sub" id="prev"></p>
 <button class="btn" onclick="submitLog()">Log workout</button>
 <button class="btn ghost" style="margin-top:8px" onclick="demo()">Demo: log 5 km run (30 min, high)</button></div>
 <div class="card"><h2>Recent workouts</h2>${mine(S.me).slice(-5).reverse().map(l=>`<div class="log"><span>${l.t} • ${l.d} min${l.di?' • '+l.di+' km':''}</span><span class="pill">+${l.p}</span></div>`).join('')||'<p class="sub">Nothing logged yet.</p>'}</div>
 <button class="btn ghost" onclick="resetAll()">Reset demo data</button>`;
}
document.addEventListener('input',()=>{const d=g('wd');if(!d||!g('prev'))return;const p=calc(g('wt').value,+d.value||0,g('wi').value);g('prev').textContent=p?'You will earn about '+p+' points.':''});
function seg(){return `<div class="seg">${[['day','Daily'],['week','Weekly'],['month','Monthly']].map(([k,v])=>`<button class="${per===k?'on':''}" onclick="per='${k}';render()">${v}</button>`).join('')}</div>`}
function board(){
 const sr=S.squads.map(s=>({n:s.name,id:s.id,p:sum(S.logs.filter(l=>l.sq===s.id&&inP(l,per)))})).sort((a,b)=>b.p-a.p);
 const mr=Object.keys(S.users).map(n=>({n,p:sum(mine(n).filter(l=>inP(l,per)))})).sort((a,b)=>b.p-a.p).slice(0,10);
 const my=sqOf(S.me);
 return seg()+`<div class="card"><h2>Squads</h2>${sr.map((r,i)=>`<div class="lb ${my&&my.id===r.id?'me':''}"><b class="rk">${i+1}</b><span class="n">${esc(r.n)}</span><span class="p">${r.p}</span></div>`).join('')}</div>
 <div class="card"><h2>Top members</h2>${mr.map((r,i)=>`<div class="lb ${r.n===S.me?'me':''}"><b class="rk">${i+1}</b><span class="n">${esc(r.n)} <small class="sub">${esc((sqOf(r.n)||{name:'No squad'}).name)}</small></span><span class="p">${r.p}</span></div>`).join('')}</div>`;
}
function chart(){return `<div class="card"><h2>Your points, last 7 days</h2><canvas id="c1" height="200"></canvas></div><div class="card"><h2>Squad points per day</h2><canvas id="c2" height="200"></canvas></div>${typeof Chart==='undefined'?'<p class="sub">Charts need an internet connection to load Chart.js.</p>':''}`}
function drawCharts(){
 if(typeof Chart==='undefined')return;
 const days=[...Array(7)].map((_,i)=>new Date(Date.now()-(6-i)*DAY)),lab=days.map(d=>d.toLocaleDateString('en',{weekday:'short'}));
 const by=(arr)=>days.map(d=>sum(arr.filter(l=>new Date(l.ts).toDateString()===d.toDateString())));
 const cs=getComputedStyle(document.documentElement),acc=cs.getPropertyValue('--acc').trim(),acc2=cs.getPropertyValue('--acc2').trim(),tx=cs.getPropertyValue('--mut').trim();
 const sq=sqOf(S.me),o={plugins:{legend:{display:false}},scales:{x:{ticks:{color:tx}},y:{beginAtZero:true,ticks:{color:tx}}}};
 charts.push(new Chart(g('c1'),{type:'line',data:{labels:lab,datasets:[{data:by(mine(S.me)),borderColor:acc,backgroundColor:acc,tension:.3}]},options:o}));
 charts.push(new Chart(g('c2'),{type:'bar',data:{labels:lab,datasets:[{data:by(S.logs.filter(l=>sq&&l.sq===sq.id)),backgroundColor:acc2}]},options:o}));
}
function badges(){const u=unlocked(S.me);
 return `<div class="card">${userSel()}</div><div class="badges">${BADGES.map(b=>`<div class="bd ${u.includes(b.id)?'':'lock'}"><div class="e">${b.e}</div><b>${b.n}</b><small>${b.d}</small></div>`).join('')}</div>`}
function squad(){
 const sq=sqOf(S.me);
 return `<div class="card">${userSel()}</div>
 ${sq?`<div class="card"><h2>${esc(sq.name)}</h2><p class="sub">Invite code: <b>${esc(sq.code)}</b> • ${mem(sq.id).length}/6 members</p>
 ${mem(sq.id).map(n=>`<div class="lb"><span class="n">${esc(n)}</span><span class="p">${sum(mine(n))}</span></div>`).join('')}</div>`:''}
 <div class="card"><h2>Join with invite code</h2><div class="row"><input id="code" placeholder="e.g. IRON42"><button class="btn" style="flex:0 0 100px" onclick="joinSquad()">Join</button></div></div>
 <div class="card"><h2>Create a squad</h2><div class="row"><input id="sname" placeholder="Squad name"><button class="btn alt" style="flex:0 0 100px" onclick="createSquad()">Create</button></div></div>
 <div class="card"><h2>Add a new player</h2><div class="row"><input id="uname" placeholder="Your name"><button class="btn ghost" style="flex:0 0 100px" onclick="addUser()">Add</button></div></div>`;
}
render();