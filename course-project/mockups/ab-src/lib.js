const IC={
play:'<path d="M6 4l10 6-10 6z"/>',
save:'<path d="M4 4h10l2 2v10H4z"/><path d="M7 4v4h5V4M7 16v-5h6v5"/>',
undo:'<path d="M8 5L4 9l4 4"/><path d="M4 9h7a4 4 0 010 8H9"/>',
redo:'<path d="M12 5l4 4-4 4"/><path d="M16 9H9a4 4 0 000 8h2"/>',
exp:'<path d="M10 3v9M6 8l4 4 4-4M4 16h12"/>',
share:'<circle cx="5" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 9l6-3M7 11l6 3"/>',
ai:'<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z"/>',
fmt:'<path d="M4 6h12M4 10h8M4 14h10"/>',
chk:'<path d="M4 10l4 4 8-8"/>',
x:'<path d="M5 5l10 10M15 5L5 15"/>',
warn:'<path d="M10 3l8 14H2z"/><path d="M10 8v4M10 14v.5"/>',
err:'<circle cx="10" cy="10" r="7"/><path d="M7 7l6 6M13 7l-6 6"/>',
search:'<circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/>',
gear:'<circle cx="10" cy="10" r="3"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.5 4.5l2 2M13.5 13.5l2 2M15.5 4.5l-2 2M6.5 13.5l-2 2"/>',
file:'<path d="M5 3h7l3 3v11H5z"/><path d="M12 3v3h3"/>',
pin:'<path d="M12 3l5 5-3 1-3 4-1-1-4 4M9 11L4 16"/>',
cloud:'<path d="M6 15a4 4 0 010-8 5 5 0 019.5 1.5A3.2 3.2 0 0115 15z"/>',
bulb:'<path d="M7 14h6M8 17h4M10 3a5 5 0 00-3 9v2h6v-2a5 5 0 00-3-9z"/>',
plus:'<path d="M10 4v12M4 10h12"/>',
chev:'<path d="M6 8l4 4 4-4"/>',
menu:'<path d="M3 6h14M3 10h14M3 14h14"/>',
code:'<path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/>',
eye:'<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2"/>',
dots:'<circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
home:'<path d="M3 10l7-6 7 6M5 9v7h10V9"/>',
q:'<circle cx="10" cy="10" r="7"/><path d="M8 8a2 2 0 114 0c0 1.5-2 1.5-2 3M10 14v.5"/>',
git:'<circle cx="6" cy="5" r="2"/><circle cx="6" cy="15" r="2"/><circle cx="14" cy="8" r="2"/><path d="M6 7v6M14 10c0 3-4 2-8 4"/>',
fit:'<path d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4"/>',
trash:'<path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"/>',
lock:'<rect x="5" y="9" width="10" height="7" rx="1"/><path d="M7 9V6a3 3 0 016 0v3"/>',
folder:'<path d="M3 6h5l2 2h7v8H3z"/>',
grid:'<path d="M4 4h12v12H4zM4 10h12M10 4v12"/>',
down:'<path d="M5 8l5 5 5-5"/>',
bell:'<path d="M5 14V9a5 5 0 0110 0v5l1 1H4zM8 17h4"/>',
};
const ic=(n,s=13)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${IC[n]||''}</svg>`;
const bt=(l,k='g',i,sm)=>`<span class="mb ${k}${l?'':' sq'}">${i?ic(i,12):''}${l?`<span>${l}</span>`:''}${sm?`<small>${sm}</small>`:''}</span>`;
const SP='<i class="sep"></i>',GAP='<i class="gap"></i>',FL='<i style="flex:1"></i>';
const tb=(...p)=>`<div class="mtb">${p.join('')}</div>`;
const pv=(inner,c='')=>`<div class="pv ${c}">${inner}</div>`;
const bd=(inner,st='')=>`<div class="bd" style="${st}">${inner}</div>`;
const tip=(t,st)=>`<div class="tip" style="${st}">${t}</div>`;
const mnu=(items,st,c='')=>`<div class="mnu ${c}" style="${st}">${items.map(i=>i==='-'?'<hr>':i[0]==='*'?`<div class="hi">${i.slice(1)}</div>`:`<div>${i}</div>`).join('')}</div>`;
const mdl=(t,p,btns)=>`<div class="mdl"><b>${t}</b><p>${p}</p><div class="bt">${btns.join('')}</div></div>`;
const toast=(t,st)=>`<div class="toast" style="${st}">${t}</div>`;
const tgl=(on,l)=>`<span class="tgl${on?' on':''}"><i></i>${l||''}</span>`;
const tab=(n,o={})=>`<span class="mt${o.act?' act':''}${o.sm?' sm':''}">${o.ico?ic('file',11):''}${o.pin?ic('pin',11):`<span>${n}${o.dirty==='star'?'*':''}</span>`}${o.dirty==='dot'?'<b class="dot"></b>':''}${o.x?`<em class="x">${ic('x',9)}</em>`:''}${o.bar?`<i class="nb" style="background:${o.bar}"></i>`:''}</span>`;
const tabs=(...t)=>`<div class="mtabs">${t.join('')}</div>`;
const K=s=>`<b class="k">${s}</b>`,S=s=>`<b class="s">${s}</b>`,C=s=>`<span class="c">${s}</span>`;
const L0=[`${K('diagram')} idef0 ${S('"Order"')}`,`${K('box')} A0 ${S('"Process order"')} {`,`  ${K('input')}: Order`,`  ${K('control')}: Rules`,`}`,`${K('box')} A1 ${S('"Ship"')}`];
const code=(ls=L0,o={})=>`<div class="med${o.fs?' f'+o.fs:''}${o.num===false?' nonum':''}">${ls.map((l,i)=>{const [c,t]=Array.isArray(l)?l:['',l];return `<div class="ln ${c}"><i>${i+1}</i><span>${t}</span></div>`}).join('')}${o.mm?'<div class="mm">'+'<i></i>'.repeat(10)+'</div>':''}${o.x||''}</div>`;
const ND=[[4,8,'A0'],[108,44,'A1'],[208,8,'A2']];
const zoom=st=>`<div class="zc" style="${st}"><span>+</span><span>−</span><span>${ic('fit',11)}</span></div>`;
const cv=(o={})=>{
 const n=o.nodes||ND;
 const ed=n.slice(1).map((p,i)=>{const a=n[i],dx=p[0]-a[0],dy=p[1]-a[1];const t=Math.min(dx?31/Math.abs(dx):9,dy?15/Math.abs(dy):9);
  const x1=a[0]+31+dx*t,y1=a[1]+15+dy*t,x2=p[0]+31-dx*t-(dx?Math.sign(dx)*2:0),y2=p[1]+15-dy*t-(dy?Math.sign(dy)*2:0);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--tx2)" stroke-width="1.3" marker-end="url(#ar)"/>`}).join('');
 const nd=n.map((p,i)=>`<div class="nd${o.sel===i||(Array.isArray(o.sel)&&o.sel.includes(i))?' sel':''}${o.bad===i?' bad':''}${o.blur===i?' blur':''}${o.r8?' r8':''}${o.anim?' fade'+(i+1):''}" style="left:${p[0]}px;top:${p[1]}px">${p[2]}${o.bad===i?`<span style="position:absolute;right:-7px;top:-8px;color:var(--er);background:var(--sf);border-radius:50%;display:flex">${ic('warn',13)}</span>`:''}</div>`).join('');
 const lb=o.labels==='off'?'':`<div class="el" style="left:${o.labels==='one'?70:76}px;top:26px">Order</div>${o.labels==='one'?'':'<div class="el" style="left:176px;top:26px">Invoice</div>'}`;
 return `<div class="mcv ${o.grid==null?'dots':o.grid==='none'?'':o.grid}"><div style="position:absolute;left:50%;top:50%;width:280px;height:118px;margin:-59px 0 0 -140px;transform:scale(${o.sc||1})"><svg class="ed" viewBox="0 0 280 118"><defs><marker id="ar" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="var(--tx2)"/></marker></defs>${ed}</svg>${lb}${nd}${o.in||''}</div>${o.x||''}</div>`};
const sbar=(l,r,c='')=>`<div class="msb ${c}">${l.join('')}${FL}${r.join('')}</div>`;
const pnl=(head,rows)=>`<div class="mpn"><div class="h">${head.join('')}</div>${rows.map(r=>`<div class="r${Array.isArray(r)?' '+r[0]:''}">${Array.isArray(r)?r[1]:r}</div>`).join('')}</div>`;
const ERR=ic('err',12).replace('currentColor','var(--er)'),WRN=ic('warn',12);
const E1=`<span class="er-c">${ic('err',12)}</span>`,W1=`<span class="wn-c">${ic('warn',12)}</span>`;
const ide=(o={})=>`${o.tb||tb(bt('Run','run','play'),bt('Validate'),FL,bt('Save','g','save'))}${o.tabs===0?'':o.tabs||tabs(tab('order.dsl',{act:1,x:1}),tab('rules.dsl'))}${bd((o.side||'')+(o.a||code())+(o.b||cv()),o.dir?'flex-direction:'+o.dir:'')}${o.pn||''}${o.sb===0?'':o.sb||sbar(['IDEF0'],['Ln 3, Col 8'])}`;
const ph=(inner,c='')=>`<div style="flex:1;padding:6px 0;display:flex;gap:10px;justify-content:center"><div class="ph-frame ${c}">${inner}</div></div>`;
const phone=(top,bodyHtml,bottom,c='')=>ph(`<div class="mtb" style="justify-content:space-between">${top}</div><div class="bd" style="position:relative">${bodyHtml}</div>${bottom||''}`,c);
const phs=(...a)=>`<div style="flex:1;padding:6px 0;display:flex;gap:10px;justify-content:center">${a.join('')}</div>`;
const phf=(top,bodyHtml,bottom,c='')=>`<div class="ph-frame ${c}"><div class="mtb" style="justify-content:space-between">${top}</div><div class="bd" style="position:relative">${bodyHtml}</div>${bottom||''}</div>`;
const P={};
