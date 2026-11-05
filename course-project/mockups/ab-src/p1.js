const LE=[L0[0],L0[1],['er',`  ${K('imput')}: <span class="wave">Order</span>`],L0[3],L0[4],L0[5]];
const bodyC=(l=L0)=>bd(code(l)+cv({}));
P[1]=()=>[
 pv(tb(bt('Run','dis','play'),bt('Validate'),FL,'<span class="bdg r">3 ошибки</span>')+bodyC(LE)+tip('Исправьте ошибки перед запуском','left:8px;top:34px')),
 pv(tb(bt('Run','err','play'),bt('Validate'),FL,'<span class="bdg r">3 ошибки</span>')+bodyC(LE)+'<div class="scrim"></div>'+mdl('Не удалось запустить','3 ошибки в order.dsl',[bt('Закрыть'),bt('К ошибкам','blue')]))];
P[2]=()=>[
 pv(tb(`<span class="ttl">order.dsl</span>`,'<span class="bdg">IDEF0</span>',FL,bt('Run','run','play'))+bodyC()),
 pv(tb(bt('IDEF0','g','code'),ic('down',10),SP,`<span class="ttl">order.dsl</span>`,FL,bt('Run','run','play'))+bodyC()+mnu(['*IDEF0','ERD','BPMN','DFD'],'left:8px;top:34px'))];
P[3]=()=>[
 pv(tb(bt('Save','g','save','Ctrl+S'),bt('Export','g','exp'),FL,bt('Run','run','play'))+bodyC()),
 pv(tb(bt('Save','g','save'),ic('down',10),FL,bt('Run','run','play'))+bodyC()+mnu(['*Save','Save as…','-','Export SVG','Export PNG'],'left:8px;top:34px'))];
P[4]=()=>[
 pv(tb(bt('Save','g','save'),tgl(1,'Autosave'),FL,bt('Run','run','play'))+bodyC()),
 pv(tb(bt('Save','g','save'),FL,bt('Run','run','play'),bt('','ghost','gear'))+bodyC()+mnu(['Редактор','*Сохранение: Autosave ✓','Холст'],'right:8px;top:34px'))];
P[5]=()=>[
 pv(tb(bt('','g','undo'),bt('','g','redo'),SP,bt('Validate'),FL,bt('Run','run','play'))+bodyC()+tip('Undo (Ctrl+Z)','left:6px;top:34px')),
 pv(tb(bt('Undo','g','undo'),bt('Redo','g','redo'),SP,bt('Validate'),FL,bt('Run','run','play'))+bodyC())];
P[6]=()=>[
 pv(ide({sb:sbar(['IDEF0'],['<span class="ok-c">'+ic('chk',11)+' Saved 2s ago</span>','Ln 3'])})),
 pv(ide({sb:sbar(['IDEF0'],['Ln 3'])})+toast(ic('chk',12)+' Сохранено','left:50%;top:8px;transform:translateX(-50%)'))];
P[7]=()=>[
 pv(tb(bt('Run','run','play'),bt('Validate'),bt('Save','g','save'))+bodyC()+tip('Run · Ctrl+Enter','left:8px;top:34px')),
 pv(tb(bt('Run','run','play','Ctrl+↵'),bt('Validate','g','','Ctrl+K'),bt('Save','g','save','Ctrl+S'))+bodyC())];
P[8]=()=>[
 pv(tb(bt('Run','run','play'),bt('Validate'),SP,bt('','g','undo'),bt('','g','redo'),SP,bt('Format','g','fmt'))+bodyC()),
 pv(tb(bt('Run','run','play'),bt('Validate'),GAP,bt('','g','undo'),bt('','g','redo'),GAP,bt('Format','g','fmt'))+bodyC())];
P[9]=()=>[
 pv(tb(bt('Run','run','play'),SP,bt('','g','fmt'))+bodyC()+tip('Format (Shift+Alt+F)','left:70px;top:34px')),
 pv(tb(bt('Run','run','play'),SP,bt('Format','g','fmt'))+bodyC())];
P[10]=()=>[
 pv(tb(bt('Run','run','play'),FL,bt('','g','ai'))+bd(code()+cv()+`<div class="side l" style="width:96px"><b>${ic('ai',11)} AI</b><div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel"></div></div>`)),
 pv(tb(bt('Run','run','play'),FL,bt('Ask AI…','g','ai'))+bodyC()+`<div class="mnu" style="right:8px;top:34px;width:150px"><div style="color:var(--tx3)">Опишите диаграмму…</div></div>`)];
P[11]=()=>[
 pv(tb(bt('Run','run','play'),bt('Save','g','save'))+tabs(tab('order.dsl',{act:1,dirty:'dot'}))+bodyC()+toast(ic('chk',12)+' Сохранено, запуск…','right:8px;bottom:8px')),
 pv(tb(bt('Run','run','play'),bt('Save','g','save'))+tabs(tab('order.dsl',{act:1,dirty:'dot'}))+bodyC()+'<div class="scrim"></div>'+mdl('Сохранить перед запуском?','Есть несохранённые изменения',[bt('Отмена'),bt('Не сохранять'),bt('Сохранить','blue')]))];
P[12]=()=>[
 pv(tb(bt('Run','run','play'),bt('Validate'),bt('Export','g','exp'))+bodyC()),
 pv(tb(bt('Run','blue','play'),bt('Validate'),bt('Export','g','exp'))+bodyC())];
P[13]=()=>[
 pv(tb(bt('Run','run','play'),FL,`<span class="ttl" style="font-size:13px">Order / order.dsl</span>`,FL,bt('Save','g','save'))+tabs(tab('order.dsl',{act:1}))+bodyC()),
 pv(tb(bt('Run','run','play'),FL,bt('Save','g','save'))+tabs(tab('order.dsl',{act:1,x:1}),tab('rules.dsl'))+bodyC())];
P[14]=()=>[
 pv(tb(bt('Run','run','play'),FL,bt('Share','g','share'),bt('PNG','g','exp'))+bodyC()),
 pv(tb(bt('File','ghost'),bt('Edit','ghost'),bt('Run','run','play'))+bodyC()+mnu(['Новый','Открыть','-','*Поделиться…','Экспорт PNG','Экспорт SVG'],'left:8px;top:34px'))];
P[15]=()=>[
 pv(tb(`<span class="mb run"><span class="spin"></span><span>Run</span></span>`,bt('Validate'))+bodyC()),
 pv(tb(bt('Stop','err'),bt('Validate'))+'<div class="prog"><i></i></div>'+bodyC())];
