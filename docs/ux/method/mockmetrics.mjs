import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = 'E:/DSLKit-Project/docs/project/figma-svg';
const OUT = 'C:/Users/zheny/AppData/Local/Temp/claude/E--DSLKit-Project/74e916db-b67e-49d9-9921-47e8c85bb931/scratchpad/mock';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });

const analysis = `
(() => {
  const svg = document.querySelector('svg');
  const W = +svg.getAttribute('width'), H = +svg.getAttribute('height');
  const lum = (r,g,b) => { const c=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4}); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
  const rgb = s => { const m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}; };
  const cr = (a,b) => { const x=lum(a.r,a.g,a.b), y=lum(b.r,b.g,b.b); const hi=Math.max(x,y), lo=Math.min(x,y); return (hi+0.05)/(lo+0.05); };
  const hex = c => '#'+[c.r,c.g,c.b].map(v=>v.toString(16).padStart(2,'0')).join('');
  const box = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
  const res = { W, H };
  // layout blocks (named groups)
  res.blocks = [...svg.children].filter(e=>e.tagName==='g'&&e.id).map(g=>{const b=box(g); return {id:g.id,...b, share:+(b.w*b.h/(W*H)*100).toFixed(1)};});
  res.subblocks = [...svg.querySelectorAll(':scope > g[id] > g[id]')].map(g=>({parent:g.parentNode.id,id:g.id,...box(g)}));
  // texts
  const texts = [...svg.querySelectorAll('text')].flatMap(t => t.querySelector('tspan') ? [...t.querySelectorAll('tspan')] : [t]);
  const items = [];
  for (const t of texts) {
    const cs = getComputedStyle(t);
    const b = box(t); if (b.w===0||b.h===0) continue;
    const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
    const fg = rgb(cs.fill); if (!fg) continue;
    const cx=b.x+b.w/2, cy=b.y+b.h/2;
    const stack = document.elementsFromPoint(cx, cy);
    const own = t.tagName==='tspan' ? t.parentNode : t;
    const at = stack.indexOf(own);
    let bg = null;
    for (const el of stack.slice(at+1)) {
      if (!['rect','path','circle','ellipse','polygon'].includes(el.tagName)) continue;
      const c = rgb(getComputedStyle(el).fill);
      if (c && c.a===1 && getComputedStyle(el).fill!=='none') { bg=c; break; }
    }
    if (!bg) bg = rgb(getComputedStyle(svg.querySelector('rect')).fill);
    const ratio = cr(fg,bg);
    const large = fs>=24 || (fs>=18.66 && fw>=700);
    items.push({txt:t.textContent.trim().slice(0,30), fs, fw, mono:/mono/i.test(cs.fontFamily), fg:hex(fg), bg:hex(bg), ratio:+ratio.toFixed(2), pass: ratio >= (large?3:4.5), op: +(cs.opacity)});
  }
  res.textCount = items.length;
  res.words = items.map(i=>i.txt).join(' ').split(/\\s+/).filter(Boolean).length;
  res.sizes = {}; items.forEach(i=>res.sizes[i.fs]=(res.sizes[i.fs]||0)+1);
  res.weights = {}; items.forEach(i=>res.weights[i.fw]=(res.weights[i.fw]||0)+1);
  res.monoShare = +(items.filter(i=>i.mono).length/Math.max(1,items.length)*100).toFixed(0);
  res.minFs = Math.min(...items.map(i=>i.fs));
  res.smallText = items.filter(i=>i.fs<12).length;
  res.contrast = { total: items.length, fails: items.filter(i=>!i.pass).length, min: Math.min(...items.map(i=>i.ratio)), worst: items.filter(i=>!i.pass).sort((a,b)=>a.ratio-b.ratio).slice(0,6).map(i=>i.txt+' '+i.fg+'/'+i.bg+'='+i.ratio+' ('+i.fs+'px)') };
  // interactive targets: rounded rects that contain a text or an icon group at their centre
  const rects = [...svg.querySelectorAll('rect')].filter(r=>r.getAttribute('rx') && +r.getAttribute('rx')>=3);
  const targets = [];
  for (const r of rects) {
    const b = box(r);
    if (b.w<14||b.h<14||b.w>420||b.h>64) continue;
    const stack = document.elementsFromPoint(b.x+b.w/2, b.y+b.h/2);
    const ri = stack.indexOf(r);
    const above = stack.slice(0, ri).filter(e=>e!==svg&&e!==document.body&&e!==document.documentElement);
    if (above.length) targets.push({w:+b.w.toFixed(1), h:+b.h.toFixed(1), x:+b.x.toFixed(0), y:+b.y.toFixed(0), label: (above.find(e=>e.tagName==='text'||e.tagName==='tspan')||{textContent:'icon'}).textContent.trim().slice(0,22)});
  }
  res.targets = targets;
  res.targetStats = { n: targets.length, minSide: targets.length?Math.min(...targets.map(t=>Math.min(t.w,t.h))):null, under24: targets.filter(t=>Math.min(t.w,t.h)<24).length, under32: targets.filter(t=>Math.min(t.w,t.h)<32).length, under44: targets.filter(t=>Math.min(t.w,t.h)<44).length };
  // 8px grid share over rect geometry (excluding the full-canvas background)
  const geo = [];
  svg.querySelectorAll('rect').forEach(r=>{ const b=box(r); if(b.w>=W&&b.h>=H) return; geo.push(b.x,b.y,b.w,b.h); });
  const on = u => geo.filter(v=>Math.abs(v/u-Math.round(v/u))<0.02).length/Math.max(1,geo.length);
  res.grid = { values: geo.length, mult8: +(on(8)*100).toFixed(0), mult4: +(on(4)*100).toFixed(0) };
  // palette
  const colors = {}; svg.querySelectorAll('rect,path,circle,text,tspan').forEach(e=>{ const c=rgb(getComputedStyle(e).fill); if(c) colors[hex(c)]=(colors[hex(c)]||0)+1; });
  res.distinctFills = Object.keys(colors).length;
  res.topFills = Object.entries(colors).sort((a,b)=>b[1]-a[1]).slice(0,12);
  res.elements = svg.querySelectorAll('*').length;
  // Hick's choice counts per top-level block: interactive targets inside each block
  res.choicesByBlock = res.blocks.map(bl=>({id:bl.id, n: targets.filter(t=>t.x>=bl.x-1&&t.y>=bl.y-1&&t.x<=bl.x+bl.w&&t.y<=bl.y+bl.h).length}));
  return res;
})()
`;

const jobs = [];
for (const dir of ['wireframes','mockups','designs-light','designs-dark'])
  for (const f of readdirSync(`${ROOT}/${dir}`).filter(f=>f.endsWith('.svg'))) jobs.push({dir, f});

const all = {};
for (const {dir,f} of jobs) {
  const svg = readFileSync(`${ROOT}/${dir}/${f}`,'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}svg{display:block}</style></head><body>${svg}<pre id="out"></pre><script>document.getElementById('out').textContent=JSON.stringify(${analysis});</script></body></html>`;
  const page = `${OUT}/${dir}__${f}.html`;
  writeFileSync(page, html);
  let dom = '';
  try {
    dom = execFileSync(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars','--virtual-time-budget=4000','--window-size=1600,1200','--dump-dom','file:///'+page], { encoding:'utf8', maxBuffer: 64*1024*1024 });
  } catch (e) { dom = e.stdout || ''; }
  const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
  if (!m || !m[1].trim()) { all[`${dir}/${f}`] = { error: 'no output' }; continue; }
  const txt = m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
  try { all[`${dir}/${f}`] = JSON.parse(txt); } catch (e) { all[`${dir}/${f}`] = { error: 'parse', head: txt.slice(0,120) }; }
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(all, null, 1));
console.log(Object.keys(all).length, 'files;', Object.values(all).filter(v=>v.error).length, 'errors');
