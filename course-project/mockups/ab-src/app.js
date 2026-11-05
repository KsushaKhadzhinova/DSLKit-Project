const KEY='dslkit-ab-v2';
let ans={};try{ans=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(ans))}catch(e){}};
try{if(localStorage.getItem(KEY+'-theme')==='dark')document.documentElement.classList.add('t-dark')}catch(e){}
const secs=[...new Set(Q.map(q=>q.sec))];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function card(q){
 let pr;try{pr=P[q.n]()}catch(e){console.error('preview',q.n,e);pr=['<div class="pv"></div>','<div class="pv"></div>']}
 const opt=(k,i,t)=>`<label class="opt">${pr[i]}<span class="ol"><b>${k.toUpperCase()}</b><span>${esc(t)}</span></span><input type="radio" name="q${q.n}" value="${k}"${ans[q.n]===k?' checked':''}></label>`;
 return `<article class="card${ans[q.n]?' done':''}" id="q${q.n}"><div class="qh"><span class="qn">${q.n}</span><div class="qt">${esc(q.q)}<span class="tag">${esc(q.tag)}</span></div></div><div class="ab">${opt('a',0,q.a)}${opt('b',1,q.b)}</div>${q.h?`<div class="hy">${esc(q.h)}</div>`:''}</article>`}
function render(){
 $('#nav').innerHTML=secs.map((s,i)=>{const qs=Q.filter(q=>q.sec===s);return `<a href="#s${i}" data-s="s${i}">${esc(s)}<span id="nc${i}">0/${qs.length}</span></a>`}).join('');
 $('#ct').innerHTML=secs.map((s,i)=>{const qs=Q.filter(q=>q.sec===s);return `<section class="sec" id="s${i}"><h2>${esc(s)} <small>${qs[0].n}–${qs[qs.length-1].n}</small></h2>${qs.map(card).join('')}</section>`}).join('')+'<div class="foot" id="foot"></div>';
 stats();
}
function stats(){
 const n=Object.keys(ans).length,a=Object.values(ans).filter(v=>v==='a').length;
 $('#cnt').textContent=n+' / '+Q.length;$('#a').textContent=a;$('#b').textContent=n-a;
 $('#pg').style.width=(n/Q.length*100)+'%';
 secs.forEach((s,i)=>{const qs=Q.filter(q=>q.sec===s);const e=document.getElementById('nc'+i);if(e)e.textContent=qs.filter(q=>ans[q.n]).length+'/'+qs.length});
 const f=$('#foot');if(f)f.innerHTML=n===Q.length?'Готово! Все '+Q.length+' ответов собраны. Нажмите «Скопировать итог» или «Скачать .md».':'Осталось ответить: '+(Q.length-n)+'. Ответы сохраняются в браузере автоматически.';
}
function summary(){
 const rows=Q.map(q=>{const v=ans[q.n];return `| ${q.n} | ${q.sec} | ${q.q.replace(/\|/g,'/')} | ${v?v.toUpperCase()+': '+(v==='a'?q.a:q.b).replace(/\|/g,'/'):'—'} |`});
 return '# DSLKit — результаты A/B тестов\n\nОтвечено: '+Object.keys(ans).length+' из '+Q.length+'\n\n| № | Раздел | Вопрос | Выбор |\n|---|---|---|---|\n'+rows.join('\n')+'\n'}
document.addEventListener('change',e=>{
 const t=e.target;if(t.type!=='radio')return;
 const n=+t.name.slice(1);ans[n]=t.value;persist();t.closest('.card').classList.add('done');stats()});
$('#theme').onclick=()=>{const d=document.documentElement.classList.toggle('t-dark');try{localStorage.setItem(KEY+'-theme',d?'dark':'light')}catch(e){}$('#theme').textContent=d?'☾ Тёмная':'☀ Светлая'};
$('#todo').onclick=()=>{const on=$('#todo').classList.toggle('on');document.querySelectorAll('.card.done').forEach(c=>c.style.display=on?'none':'')};
$('#copy').onclick=async()=>{const s=summary();try{await navigator.clipboard.writeText(s);$('#copy').textContent='Скопировано ✓'}catch(e){prompt('Скопируйте текст:',s)}setTimeout(()=>$('#copy').textContent='Скопировать итог',1800)};
$('#dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([summary()],{type:'text/markdown'}));a.download='dslkit-ab-results.md';a.click()};
$('#reset').onclick=()=>{if(confirm('Сбросить все ответы?')){ans={};persist();render();observe()}};
function observe(){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('cur',a.dataset.s===e.target.id))}}),{rootMargin:'-90px 0px -70% 0px'});
 document.querySelectorAll('.sec').forEach(s=>io.observe(s))}
render();observe();
