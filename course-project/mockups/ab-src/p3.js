const c3=(o)=>bd(cv(o));
const TAB3=(...a)=>pv(tabs(...a)+bd(code(L0)));
P[31]=()=>[
 pv(bd(code([L0[0],['hl',L0[1]],L0[2],L0[3],L0[4]])+cv({sel:0}))),
 pv(bd(cv({sel:0})+`<div class="side l" style="width:104px"><b>A0</b><div class="skel"></div><div class="mut">name</div><div class="card2" style="margin:2px 0">Process order</div><div class="mut">inputs: 1</div></div>`))];
P[32]=()=>[
 pv(bd(code(L0)+cv())),
 pv(bd(code(L0.slice(0,3))+cv(),'flex-direction:column'))];
P[33]=()=>[
 pv(bd(cv({x:zoom('right:8px;bottom:8px')}))),
 pv(bd(cv())+sbar(['IDEF0'],[ic('plus',10),'100%',ic('fit',11)]))];
P[34]=()=>[
 pv(bd(code([L0[0],L0[1],['hl',`  ${K('pos')}: (120, 40)`],L0[3],L0[4]])+cv({sel:0}))),
 pv(bd(code(L0)+cv({sel:0})+`<div class="side l" style="width:96px;font:10px/1.5 monospace"><b>layout.json</b><br>{ "A0":<br>&nbsp;[120,40] }</div>`))];
P[35]=()=>[pv(c3({bad:1})),pv(c3({blur:1,x:tip('Неизвестный порт «mechanism»','left:50%;top:70%;transform:translateX(-30%)')}))];
P[36]=()=>[pv(c3({anim:1})),pv(c3({}))];
P[37]=()=>[pv(c3({})),pv(c3({labels:'one'}))];
P[38]=()=>[pv(tb(tgl(1,'Сетка'))+c3({})),pv(tb(tgl(0,'Сетка'))+c3({grid:'none'}))];
P[39]=()=>[
 pv(tb(bt('Export','g','exp'))+c3({})+mnu(['*SVG','PNG','-','.dsl'],'left:8px;top:34px')),
 pv(tb(bt('Export','g','exp'))+c3({})+mnu(['*PDF','PNG','-','.dsl'],'left:8px;top:34px'))];
P[40]=()=>[
 pv(c3({x:'<div class="mmap" style="right:8px;bottom:8px"><i style="left:4px;top:5px;width:20px;height:14px"></i></div>'})),
 pv(c3({x:tip('колесо — zoom · drag — сдвиг','left:8px;bottom:8px')}))];
P[41]=()=>[
 pv(tb(tgl(1,'Auto-layout'))+c3({})),
 pv(tb(bt('Auto-layout','g','grid'))+c3({nodes:[[10,52,'A0'],[130,6,'A1'],[196,84,'A2']]}))];
P[42]=()=>[
 pv(c3({sel:[0,1],in:'<div style="position:absolute;left:-2px;top:2px;width:178px;height:84px;border:1px dashed var(--ac);background:var(--acs);opacity:.45"></div>',x:'<span class="bdg" style="position:absolute;left:8px;top:8px">рамка · drag</span>'})),
 pv(c3({sel:[0,1],x:'<span class="bdg" style="position:absolute;left:8px;top:8px">Shift + клик</span>'}))];
P[43]=()=>[TAB3(tab('order.dsl',{act:1,dirty:'dot'}),tab('rules.dsl')),TAB3(tab('order.dsl',{act:1,dirty:'star'}),tab('rules.dsl'))];
P[44]=()=>[
 pv(tabs(tab('order.dsl',{act:1,dirty:'dot',x:1}))+bd(code(L0))+'<div class="scrim"></div>'+mdl('Закрыть order.dsl?','Есть несохранённые изменения',[bt('Отмена'),bt('Не сохранять'),bt('Сохранить','blue')])),
 pv(tabs(tab('order.dsl',{act:1,dirty:'dot',x:1}))+bd(code(L0))+tip('Сначала сохраните или отмените правки','left:6px;top:32px'))];
P[45]=()=>[
 TAB3(tab('order.dsl',{act:1,x:1}),tab('rules.dsl'),tab('invoice.dsl')),
 TAB3(tab('order.dsl',{act:1,x:1}),tab('rules.dsl',{x:1}),tab('invoice.dsl',{x:1}))];
const MT=['order.dsl','rules.dsl','invoice.dsl','customer.dsl','report.dsl','archive.dsl'];
P[46]=()=>[
 pv(tabs(tab(MT[0],{act:1}),...MT.slice(1).map(n=>tab(n)),'<span style="position:absolute;right:0;top:0;bottom:0;width:20px;background:var(--sf);display:grid;place-items:center;border-left:1px solid var(--br)">›</span>')+bd(code(L0))),
 pv(tabs(tab('order…',{act:1,sm:1}),...MT.slice(1,5).map(n=>tab(n,{sm:1})),'<span class="mt" style="margin-left:auto;background:var(--sf)">'+ic('dots',12)+'</span>')+bd(code(L0)))];
P[47]=()=>[
 pv(tabs(tab('order.dsl',{act:1}),tab('invoice.dsl'),'<span class="mt" style="position:absolute;left:62px;top:6px;background:var(--sf);box-shadow:var(--sh);border:1px solid var(--ac);transform:rotate(-3deg)">rules.dsl</span>')+bd(code(L0))),
 pv(tabs(tab('order.dsl',{act:1}),tab('rules.dsl'),tab('invoice.dsl'))+bd(code(L0))+tip('Порядок вкладок фиксирован','left:8px;bottom:8px'))];
P[48]=()=>[
 TAB3(tab('order.dsl',{act:1,bar:'#2563eb'}),tab('db.dsl',{bar:'#16a34a'}),tab('flow.dsl',{bar:'#d97706'})),
 TAB3(tab('order.dsl',{act:1,ico:1}),tab('db.dsl',{ico:1}),tab('flow.dsl',{ico:1}))];
P[49]=()=>[
 pv(tabs(tab('order.dsl',{act:1}),tab('rules.dsl'),tab('db.dsl'),tab('flow.dsl'))+bd(code(L0))+toast(ic('chk',12)+' Восстановлено 4 вкладки','right:8px;bottom:8px')),
 pv(tabs()+bd('<div style="margin:auto;text-align:center;color:var(--tx3)">'+ic('file',22)+'<br>Откройте файл или создайте новый<br>'+bt('Открыть','g','folder')+'</div>'))];
P[50]=()=>[
 pv(tabs(tab('order.dsl',{act:1}),tab('rules.dsl'))+bd(code(L0))+mnu(['*Закрыть','Закрыть другие','Закрыть все','Скопировать путь'],'left:10px;top:34px')),
 pv(tabs(tab('order.dsl',{act:1}),tab('rules.dsl'))+bd(code(L0))+mnu(['*Закрыть','Скопировать путь'],'left:10px;top:34px'))];
P[51]=()=>[
 TAB3(tab('',{pin:1,sm:1}),tab('order.dsl',{act:1}),tab('rules.dsl')),
 TAB3(tab('rules.dsl',{bar:'var(--wn)'}),tab('order.dsl',{act:1}),tab('db.dsl'))];
P[52]=()=>[
 pv(tabs(tab('order.dsl',{act:1}))+bd(code(L0))+toast('rules.dsl закрыта · Ctrl+Z вернуть','right:8px;bottom:8px')),
 pv(tabs(tab('order.dsl',{act:1}),tab('rules.dsl'))+bd(code(L0))+tip('Клик колёсиком — без действия','right:8px;bottom:8px'))];
