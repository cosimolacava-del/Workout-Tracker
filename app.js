let DB,NUTRITION;
const $=s=>document.querySelector(s);
const setText=(s,e)=>s.kg==null?`${s.reps} reps`:`${s.kg} kg × ${s.reps}${e.perLeg?' /gamba':''}`;
function exHTML(e){return `<div class="exercise"><div><b>${e.name}</b>${e.note?`<div class="muted">${e.note}</div>`:''}</div><div class="sets">${e.sets.map(s=>`<span class="set">${setText(s,e)}</span>`).join('')}</div></div>`}
function render(){
 const sets=DB.sessions.reduce((n,s)=>n+s.exercises.reduce((m,e)=>m+e.sets.length,0),0);
 const reps=DB.sessions.reduce((n,s)=>n+s.exercises.reduce((m,e)=>m+e.sets.reduce((q,x)=>q+(x.reps||0),0),0),0);
 $('#stats').innerHTML=[['Sedute',DB.sessions.length],['Serie',sets],['Ripetizioni',reps],['Ultimo','13/09/2026']].map(x=>`<div class="stat"><b>${x[1]}</b><span class="muted">${x[0]}</span></div>`).join('');
 const latest=DB.sessions[0]; $('#latestTitle').textContent=latest.label; $('#latest').innerHTML=latest.exercises.map(exHTML).join('');
 $('#program').innerHTML=Object.entries(DB.program).map(([k,v])=>`<div class="day"><b>Giorno ${k}</b>${v.map(x=>`<div class="prog"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div>`).join('');
 renderSessions('');
 const names=[...new Set(DB.sessions.flatMap(s=>s.exercises.map(e=>e.name)))].sort();
 $('#exerciseSelect').innerHTML=names.map(n=>`<option>${n}</option>`).join('');
 $('#exerciseSelect').value=names.includes('Panca piana manubri')?'Panca piana manubri':names[0];
 draw($('#exerciseSelect').value); renderNutrition();
}
function renderSessions(q){q=q.toLowerCase();$('#sessions').innerHTML=DB.sessions.filter(s=>!q||s.label.toLowerCase().includes(q)||s.exercises.some(e=>e.name.toLowerCase().includes(q))).map(s=>`<article class="session"><b>${s.label}</b><div class="muted">${s.date||'Data non recuperata'} • ${s.location}</div>${s.exercises.map(exHTML).join('')}</article>`).join('')}
function sumDay(day){return (day?.meals||[]).reduce((a,m)=>({kcal:a.kcal+(m.kcal||0),protein:a.protein+(m.protein||0),carbs:a.carbs+(m.carbs||0),fat:a.fat+(m.fat||0)}),{kcal:0,protein:0,carbs:0,fat:0})}
function renderNutrition(){
 const today=new Date().toISOString().slice(0,10), days=NUTRITION?.days||[], day=days.find(d=>d.date===today)||days[0], totals=sumDay(day);
 $('#nutritionDate').textContent=day?.date||today;
 const items=[['kcal',Math.round(totals.kcal),'kcal'],['Proteine',Math.round(totals.protein),'g'],['Carboidrati',Math.round(totals.carbs),'g'],['Grassi',Math.round(totals.fat),'g']];
 $('#nutritionTotals').innerHTML=items.map(x=>`<div class="macro"><span class="muted">${x[0]}</span><b>${x[1]} ${x[2]}</b></div>`).join('');
 $('#nutritionMeals').innerHTML=day?.meals?.length?day.meals.map(m=>`<div class="meal"><div class="meal-head"><b>${m.name||'Pasto'}</b><span>${Math.round(m.kcal||0)} kcal</span></div><div>${m.description||''}</div><div class="meal-macros">P ${Math.round(m.protein||0)} g • C ${Math.round(m.carbs||0)} g • G ${Math.round(m.fat||0)} g${m.estimated?' • stima':''}</div></div>`).join(''):'<p class="muted">Nessun pasto registrato oggi.</p>';
 $('#nutritionHistory').innerHTML=days.length?days.map(d=>{const t=sumDay(d);return `<div class="session"><b>${d.date}</b><div class="muted">${Math.round(t.kcal)} kcal • P ${Math.round(t.protein)} g • C ${Math.round(t.carbs)} g • G ${Math.round(t.fat)} g • ${(d.meals||[]).length} pasti</div></div>`}).join(''):'<p class="muted">Il diario alimentare è pronto. I prossimi pasti compariranno qui.</p>';
}
function draw(name){const c=$('#chart'),ctx=c.getContext('2d'),dpr=devicePixelRatio||1,w=c.clientWidth,h=220;c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);const pts=[];[...DB.sessions].reverse().forEach(s=>{const e=s.exercises.find(x=>x.name===name);if(!e)return;const z=e.sets.filter(x=>x.kg!=null).sort((a,b)=>b.kg-a.kg||b.reps-a.reps)[0];if(z)pts.push({label:s.date||s.label,kg:z.kg,reps:z.reps})});ctx.font='12px system-ui';ctx.fillStyle='#94a3b8';if(!pts.length){ctx.fillText('Nessun dato con carico.',20,28);return}const p={l:44,r:16,t:24,b:36},W=w-p.l-p.r,H=h-p.t-p.b,min=Math.min(...pts.map(x=>x.kg)),max=Math.max(...pts.map(x=>x.kg)),span=Math.max(1,max-min);ctx.strokeStyle='#263249';for(let i=0;i<4;i++){const y=p.t+H*i/3;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(p.l+W,y);ctx.stroke()}ctx.strokeStyle='#a7f3d0';ctx.lineWidth=3;ctx.beginPath();pts.forEach((x,i)=>{const xx=p.l+(pts.length===1?W/2:W*i/(pts.length-1)),yy=p.t+H-(x.kg-min)/span*H;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke();pts.forEach((x,i)=>{const xx=p.l+(pts.length===1?W/2:W*i/(pts.length-1)),yy=p.t+H-(x.kg-min)/span*H;ctx.fillStyle='#a7f3d0';ctx.beginPath();ctx.arc(xx,yy,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e2e8f0';ctx.fillText(`${x.kg}×${x.reps}`,Math.max(4,xx-15),Math.max(13,yy-9))})}
Promise.all([fetch('data/workouts.json').then(r=>r.json()),fetch('data/nutrition.json').then(r=>r.json())]).then(([w,n])=>{DB=w;NUTRITION=n;render();$('#search').addEventListener('input',e=>renderSessions(e.target.value));$('#exerciseSelect').addEventListener('change',e=>draw(e.target.value));$('#exportBtn').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({workouts:DB,nutrition:NUTRITION},null,2)],{type:'application/json'}));a.download='fitness-export.json';a.click()});window.addEventListener('resize',()=>draw($('#exerciseSelect').value))});