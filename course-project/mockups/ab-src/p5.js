const sr=(l,c)=>`<div class="set-r"><span>${l}</span>${c}</div>`;
const snav=(a)=>`<div class="side" style="width:84px"><div class="${a==0?'card2':''}">Editor</div><div class="${a==1?'card2':''}">Canvas</div><div class="${a==2?'card2':''}">Theme</div><div>AI</div></div>`;
const sbody=(rows)=>`<div class="fl" style="padding:8px 10px;background:var(--sf)">${rows}</div>`;
const SR=sr('Размер шрифта','13')+sr('Minimap',tgl(0))+sr('Автосохранение',tgl(1));
P[73]=()=>[
 pv(tb(bt('← Назад'),`<span class="ttl">Настройки</span>`)+bd(snav(0)+sbody(SR))),
 pv(ide({})+'<div class="scrim"></div>'+`<div style="position:absolute;right:0;top:0;bottom:0;width:58%;background:var(--sf);border-left:1px solid var(--br);box-shadow:var(--sh);padding:8px 10px;z-index:6"><b>Настройки</b>${SR}</div>`)];
P[74]=()=>[
 pv(tb(`<span class="ttl">Настройки</span>`,FL,`<span class="ok-c">${ic('chk',11)} Применено</span>`)+bd(sbody(SR))),
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(sbody(SR))+`<div class="msb" style="justify-content:flex-end;gap:6px">${bt('Отмена')}${bt('Save changes','blue')}</div>`)];
P[75]=()=>[
 pv(tb(`<span class="ttl">Тема</span>`)+bd(`<div style="display:flex;gap:8px;padding:10px;align-items:flex-start">${['#f8f9fc','#1e1e2e','#fff'].map((c,i)=>`<div style="width:62px"><div style="height:42px;border-radius:6px;border:2px solid ${i==0?'var(--ac)':'var(--br)'};background:${c}"></div><div style="text-align:center;margin-top:2px">${['Light','Dark','Contrast'][i]}</div></div>`).join('')}</div>`)),
 pv(tb(`<span class="ttl">Тема</span>`)+bd(`<div style="padding:10px"><div class="card2" style="width:140px;display:flex;justify-content:space-between">Light ${ic('down',10)}</div></div>`)+mnu(['*Light','Dark','High contrast'],'left:10px;top:70px;width:140px'))];
P[76]=()=>[
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(snav(3)+sbody(`<b>AI &amp; Integrations</b>`+sr('Модель','Авто ▾')+sr('Свой ключ (BYOK)','••••••')+sr('GitHub',bt('Подключить'))))),
 pv(ide({a:code(L0),b:`<div class="side l" style="width:120px"><b>${ic('ai',11)} AI</b><div class="skel"></div><div class="skel" style="width:60%"></div><div style="margin-top:6px">${bt('AI Settings','g','gear')}</div></div>`}))];
P[77]=()=>[
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(snav(0)+sbody(`<div class="card2" style="margin-bottom:4px;color:var(--tx3)">${ic('search',11)} Поиск настроек…</div>`+SR))),
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(snav(0)+sbody(SR)))];
P[78]=()=>[
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(snav(0)+sbody(SR+sr('Резервная копия',bt('Export (JSON)','g','exp'))+sr('',bt('Import','g','down'))))),
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(snav(0)+sbody(SR)))];
P[79]=()=>[
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(snav(1)+sbody(SR))),
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(`<div class="fl" style="background:var(--sf);padding:6px 10px"><div class="set-r"><b>${ic('down',10)} Editor</b></div>${sr('Шрифт','13')}<div class="set-r"><b>${ic('chev',10)} Canvas</b></div><div class="set-r"><b>${ic('chev',10)} Theme</b></div><div class="set-r"><b>${ic('chev',10)} AI</b></div></div>`))];
P[80]=()=>[
 pv(tb(`<span class="ttl">Настройки</span>`)+bd(sbody(SR+sr('',bt('Reset to defaults','err'))))+'<div class="scrim"></div>'+mdl('Сбросить настройки?','Все параметры вернутся к стандартным',[bt('Отмена'),bt('Сбросить','err')])),
 pv(bd(code(L0))+'<div class="scrim"></div>'+`<div class="mnu" style="left:50%;top:14px;transform:translateX(-50%);width:200px;z-index:7"><div style="color:var(--tx3)">&gt; reset sett</div><div class="hi">Reset settings</div></div>`)];
P[81]=()=>[
 pv(tb(`<span class="ttl">Горячие клавиши</span>`)+bd(sbody(sr('Run','<span class="card2">Ctrl+Enter ✎</span>')+sr('Save','<span class="card2">Ctrl+S ✎</span>')+sr('Format','<span class="card2">Shift+Alt+F ✎</span>')))),
 pv(tb(`<span class="ttl">Горячие клавиши</span>`)+bd(sbody(sr('Пресет','<span class="card2">VS Code ▾</span>')+`<div class="mut" style="margin-top:6px">Доступно: VS Code · JetBrains · Vim</div>`)))];
P[82]=()=>[
 pv(tb(`<span class="ttl">Синхронизация</span>`)+bd(sbody(sr(ic('cloud',13)+' Настройки в облаке',tgl(1))+'<div class="mut">Доступны на всех устройствах</div>'))),
 pv(tb(`<span class="ttl">Хранение</span>`)+bd(sbody(sr(ic('lock',13)+' Только на этом устройстве','')+'<div class="mut">Данные в localStorage, ничего не уходит в сеть</div>')))];
const SBX=(l,r,c)=>pv(ide({sb:sbar(l,r,c)}));
P[83]=()=>[SBX([`<span class="er-c">${ic('err',11)} 2</span>`,`<span class="wn-c">${ic('warn',11)} 1</span>`],[]),SBX(['IDEF0','DSL 1.2'],[])];
P[84]=()=>[SBX(['IDEF0'],['Ln 3, Col 8','Saved 12:41']),SBX(['IDEF0'],['Saved 12:41'])];
P[85]=()=>[SBX(['IDEF0'],['Ln 3, Col 8']),SBX(['IDEF0'],['Ln 3, Col 8'],'tall')];
P[86]=()=>[SBX(['IDEF0',`<span class="ok-c">${ic('cloud',11)} Autosave</span>`],['Ln 3']),SBX(['IDEF0'],['Ln 3'])];
P[87]=()=>[SBX(['IDEF0'],['Ln 3','UTF-8']),SBX(['IDEF0'],['Ln 3'])];
P[88]=()=>[SBX(['IDEF0','12 nodes · 8 edges'],['Ln 3']),SBX(['IDEF0'],['Ln 3'])];
P[89]=()=>[SBX(['IDEF0'],['Ln 3']),SBX(['IDEF0'],['Ln 3'],'alt')];
P[90]=()=>[
 pv(tb(bt('File','ghost'),bt('View','ghost'),FL)+bd(code(L0)+cv())+mnu(['Sidebar','*Hide Status Bar','Fullscreen'],'left:44px;top:34px')),
 pv(ide({}))];
const MC=(o)=>cv({sc:.34,grid:o&&o.g});
const fileRows=`<div style="padding:6px;width:100%"><b>Мои диаграммы</b>${['Order process','Shop ERD','HR BPMN'].map(n=>`<div class="card2" style="margin-top:3px">${n}</div>`).join('')}</div>`;
P[91]=()=>[pv(phone(`${ic('menu',11)}<b>Order</b>${ic('share',11)}`,MC()),'ph'),pv(phone(`<b>DSLKit</b>${ic('plus',11)}`,fileRows),'ph')];
P[92]=()=>[pv(phone(`<b>order.dsl</b>${bt('Run','run')}`,code(L0)),'ph'),pv(phone(`<b>order.dsl</b>${ic('lock',11)}`,MC({}),''),'ph')];
const botNav=`<div class="msb">${['code','eye','folder','gear'].map(i=>ic(i,14)).join('')}</div>`;
P[93]=()=>[pv(phone(`<b>Order</b>`,MC(),botNav),'ph'),pv(phone(`${ic('menu',12)}<b>Order</b>`,MC()+mnu(['*Code','Canvas','Files','Settings'],'left:2px;top:0;min-width:70px'),''),'ph')];
P[94]=()=>[
 pv(phone(`<b>Order</b>`,code(L0)+'<span style="position:absolute;right:2px;top:40%;color:var(--tx3)">›</span>','<div class="msb" style="justify-content:center;gap:4px">● ○</div>'),'ph'),
 pv(phone(`<span class="mb g" style="background:var(--acs);color:var(--ac)">Code</span><span class="mb g">Preview</span>`,code(L0)),'ph')];
P[95]=()=>[
 pv(phs(phf(`<b>Order</b>${ic('share',11)}`,MC(),'')+'',`<div class="ph-frame" style="justify-content:flex-end"><div style="background:var(--sf);border-top:1px solid var(--br);padding:6px;border-radius:12px 12px 0 0;box-shadow:var(--sh)"><b>Поделиться</b><div class="skel"></div><div class="mut">PNG · SVG · Mail</div></div></div>`),'ph'),
 pv(phone(`<b>Order</b>${ic('share',11)}`,MC()+toast('Ссылка скопирована','left:4px;bottom:6px;font-size:9px;padding:3px 6px'),''),'ph')];
P[96]=()=>[
 pv(phone(`<b>Order</b>`,MC()+'<svg width="60" height="40" style="position:absolute;left:20px;top:30px" viewBox="0 0 60 40" fill="none" stroke="var(--ac)" stroke-width="2"><path d="M10 30l12-12M50 10L38 22"/><circle cx="8" cy="32" r="4"/><circle cx="52" cy="8" r="4"/></svg>'),'ph'),
 pv(phone(`<b>Order</b>`,MC({})+zoom('right:3px;bottom:4px;font-size:9px'),''),'ph')];
P[97]=()=>[
 pv(phs(`<div class="ph-frame" style="justify-content:flex-end"><div style="flex:1;background:var(--bg)"></div><div style="background:var(--sf);border-top:1px solid var(--br);padding:5px;border-radius:12px 12px 0 0;box-shadow:var(--sh);font-size:9px"><b>Ошибки · 3</b>${['Неизвестное свойство','Не закрыта скобка','Блок A1 без выходов'].map((r,i)=>`<div style="padding:2px 0;white-space:nowrap;overflow:hidden"><span class="${i<2?'er-c':'wn-c'}">●</span> ${r}</div>`).join('')}</div></div>`),'ph'),
 pv(phone(`<b>Order</b><span class="bdg r">3</span>`,MC()+'<div class="scrim"></div>'+'<div class="mdl" style="width:84%;font-size:9px"><b>Ошибки</b><p>3 ошибки в order.dsl</p><div class="bt">'+bt('OK','blue')+'</div></div>',''),'ph')];
P[98]=()=>[
 pv(phone(`<b>Order</b>`,MC()+'<div class="mdl" style="top:auto;bottom:4px;transform:translateX(-50%);width:92%;font-size:9px"><b>Добавить на экран</b>'+bt('Установить','blue')+'</div>',''),'ph'),
 pv(phone(`<b>Order</b>${ic('dots',12)}`,MC()+mnu(['Share','*Install app','Settings'],'right:2px;top:0;min-width:66px;font-size:9px'),''),'ph')];
P[99]=()=>[
 pv(phone(`<b>Order</b><span class="bdg g">offline</span>`,code(L0)),'ph'),
 pv(phone(`<b>Order</b><span class="bdg y">${ic('lock',9)} кэш</span>`,MC()),'ph')];
P[100]=()=>[
 pv(phs(phf(`<b>Order</b>`,MC(),''),phf(`<b>Order</b>`,MC(),'','t-dark')),'ph'),
 pv(phs(phf(`<b>Order</b>`,MC(),'','t-dark')),'ph')];
