const R1=`${E1} Неизвестное свойство «mechanism» <span class="mut">order.dsl:3</span>`;
const R2=`${E1} Не закрыта скобка <span class="mut">order.dsl:5</span>`;
const R3=`${W1} Блок A1 без выходов <span class="mut">rules.dsl:2</span>`;
const withPn=(pn,t='')=>pv(bd(code(LE)+cv())+pn,t);
P[53]=()=>[
 withPn(pnl(['Problems <span class="bdg r">3</span>'],[R1,R2])),
 pv(bd(code(LE)+`<div class="col fl">${cv()}${pnl(['Problems <span class="bdg r">3</span>'],[R1])}</div>`))];
P[54]=()=>[
 withPn(pnl(['Problems'],[['',`<b>order.dsl</b> <span class="bdg r">2</span>`],R1,R2]),'tall'),
 withPn(pnl(['Problems'],[['',`<b class="er-c">Errors</b> <span class="bdg r">2</span>`],R1,R2]),'tall')];
P[55]=()=>[
 pv(tb(bt('Run','run','play'),FL,`<span style="position:relative;display:inline-flex">${bt('','g','warn')}<span class="bdg r" style="position:absolute;right:-6px;top:-6px;font-size:9px">3</span></span>`)+bd(code(LE)+cv())),
 pv(ide({a:code(LE),sb:sbar([`<span class="er-c">${ic('err',11)} 3 Errors</span>`,`<span class="wn-c">${ic('warn',11)} 1</span>`],['IDEF0'])}))];
P[56]=()=>[
 pv(bd(code([L0[0],L0[1],['hl',L0[2]],L0[3],L0[4]]))+pnl(['Problems'],[['hi',R1],R2])),
 pv(bd(code(LE)+`<div class="side l" style="width:130px"><b>Свойство «mechanism»</b><div class="mut" style="margin:3px 0">Допустимо: input, control, output, mechanism в блоке box.</div>${bt('Показать в коде','g')}</div>`)+pnl(['Problems'],[['hi',R1]]))];
P[57]=()=>[
 pv(bd(code([L0[0],L0[1],['er',`<span style="position:absolute;left:-1px;color:var(--wn)">${ic('bulb',12)}</span>  ${K('imput')}: <span class="wave">Order</span>`],L0[3],L0[4]]))),
 pv(bd(code(LE))+pnl(['Problems'],[`${R1} ${FL} ${bt('Fix with AI','g','ai')}`,R2]))];
P[58]=()=>[
 withPn(pnl(['Problems <span class="bdg r">3</span>'],[R1,R2])),
 pv(ide({a:code(LE),sb:sbar([`<span class="er-c">${ic('err',11)} 3</span>`],['IDEF0'])})+tip('Панель скрыта · клик по счётчику открывает','right:8px;bottom:30px'))];
P[59]=()=>[
 withPn(pnl(['Problems'],[R1,R3]),'tall'),
 withPn(pnl(['Problems'],[['',`<span class="er-c">Неизвестное свойство «mechanism»</span>`],['',`<span class="wn-c">Блок A1 без выходов</span>`]]),'tall')];
P[60]=()=>[
 pv(bd(code(LE))+pnl(['Problems'],[R1,R2,R3])+'<div style="position:absolute;right:2px;bottom:4px;width:4px;height:36px;background:var(--tx3);border-radius:2px"></div>','tall'),
 pv(bd(code(L0.slice(0,3)))+pnl(['Problems'],[R1,R2,R3,R1,R2]),'tall')];
P[61]=()=>[
 withPn(pnl([`${ic('search',11)} <span class="mut">Фильтр…</span>`,'<span class="bdg r">Errors 2</span>','<span class="bdg y">Warnings 1</span>'],[R1,R2,R3]),'tall'),
 withPn(pnl(['Problems'],[R1,R2,R3]),'tall')];
P[62]=()=>[
 pv(ide({a:code(L0),pn:'',sb:sbar([`<span class="ok-c">${ic('chk',11)} 0</span>`],['IDEF0'])})+toast(ic('chk',12)+' Ошибок нет · панель закрыта','right:8px;bottom:30px')),
 pv(bd(code(L0))+pnl(['Problems'],[`<span class="ok-c">${ic('chk',12)} 0 errors</span>`]))];
const welc=`<div class="bd" style="flex-direction:column;align-items:center;justify-content:center;gap:6px;background:var(--bg)"><b style="font-size:12px">Добро пожаловать в DSLKit</b><div style="display:flex;gap:6px"><div class="card2">IDEF0</div><div class="card2">ERD</div><div class="card2">BPMN</div></div>${bt('Пустой файл')}</div>`;
P[63]=()=>[
 pv(ide({a:code([C('# Начните печатать…'),C('# diagram idef0 "Название"'),''])})),
 pv(welc)];
P[64]=()=>[
 pv(ide({})+'<div class="scrim"></div>'+`<div class="mnu" style="left:8px;top:40px;width:150px;z-index:7"><b>1/5 · Run</b><div style="padding:0;color:var(--tx2)">Запускает проверку и рисует диаграмму.</div><div style="padding:3px 0;justify-content:flex-end">${bt('Далее','blue')}</div></div>`),
 pv(tb(bt('Run','run','play'),FL,bt('Start tour','g','q'))+bodyC())];
P[65]=()=>[
 pv(ide({})+'<div class="scrim"></div>'+mdl('Новая диаграмма','Нотация: IDEF0 / ERD / BPMN / DFD',[bt('Создать с шаблоном','blue')])),
 pv(bd(code(['','',''],{})+cv({grid:'none'})))];
P[66]=()=>[
 pv(bd(code([L0[0],`<span class="gh">  Try: box A0 "name" { … }</span>`,''])+cv({grid:'none'}))),
 pv(bd(code([L0[0],'',''])+`<div class="side l" style="width:110px"><b>Справка</b><div class="mut" style="margin-top:3px">box — блок<br>input — вход<br>control — управление</div></div>`))];
const tpl=(n)=>`<div class="card2" style="width:62px;height:46px;display:grid;place-items:center">${n}</div>`;
P[67]=()=>[
 pv(`<div class="bd" style="flex-direction:column;padding:8px;gap:6px"><b>Шаблоны</b><div style="display:flex;gap:6px;flex-wrap:wrap">${tpl('IDEF0')}${tpl('ERD')}${tpl('BPMN')}${tpl('DFD')}</div></div>`),
 pv(bd(`<div class="side" style="width:110px"><b>${ic('folder',11)} Примеры</b><div class="mut" style="margin-top:3px">${ic('lock',10)} idef0-order.dsl<br>${ic('lock',10)} erd-shop.dsl<br>${ic('lock',10)} bpmn-hr.dsl</div></div>`+code(L0)))];
P[68]=()=>[
 pv(`<div class="bd" style="flex-direction:column;align-items:center;justify-content:center;gap:6px"><div style="width:90px;height:50px;border-radius:8px;background:var(--acs);display:grid;place-items:center;color:var(--ac)">${ic('play',22)}</div><b>Код → диаграмма за 30 секунд</b></div>`),
 pv(bd(code([C('# Шаг 1 из 5: напишите первый блок'),`${K('box')} A0 ${S('"…"')}`,''])+`<div class="side l" style="width:100px"><b>Урок 1</b><div class="skel"></div><div class="skel" style="width:60%"></div>${bt('Дальше','blue')}</div>`))];
P[69]=()=>[
 pv(bd(`<div class="side" style="width:120px"><b>Начало работы 2/5</b><div style="margin-top:3px">${ic('chk',10)} Создать файл<br>${ic('chk',10)} Запустить<br><span class="mut">○ Экспорт<br>○ Поделиться<br>○ AI</span></div></div>`+code(L0))),
 pv(ide({}))];
P[70]=()=>[
 pv(bd(code(L0))+'<div class="scrim"></div>'+`<div class="mnu" style="left:50%;top:14px;transform:translateX(-50%);width:200px;z-index:7"><div style="color:var(--tx3)">${ic('search',11)} Поиск по документации…</div><div class="hi">Синтаксис box</div><div>Порты и стрелки</div></div>`),
 pv(`<div class="mtabs"><span class="mt act">DSLKit</span><span class="mt">docs.dslkit.dev ${ic('share',10)}</span></div>`+bd(code(L0)))];
P[71]=()=>[
 pv(ide({})+'<div class="scrim"></div>'+`<div class="mnu" style="left:50%;top:42px;transform:translateX(-50%);width:170px;z-index:7"><b>Шаг 1</b><div style="padding:0">Создайте блок</div><div style="justify-content:space-between;padding:4px 0 0"><span class="mut">Пропустить</span>${bt('Далее','blue')}</div></div>`),
 pv(ide({})+'<div class="scrim"></div>'+`<div class="mnu" style="left:50%;top:42px;transform:translateX(-50%);width:170px;z-index:7"><b>Шаг 1</b><div style="padding:0">Создайте блок</div><div style="justify-content:flex-end;padding:4px 0 0">${bt('Далее','blue')}</div></div>`)];
P[72]=()=>[
 pv(ide({sb:sbar(['IDEF0',`<span style="color:var(--ac)">${ic('bulb',11)} Совет: Ctrl+K — быстрый поиск</span>`],['Ln 3']),})),
 pv(ide({}))];
