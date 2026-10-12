const ed1=(ls,o={})=>pv(bd(code(ls,o)),o.c||'');
const T3=[L0[0],L0[1],`  ${K('input')}: Order`,`  ${K('con')}`];
P[16]=()=>[ed1([L0[0],L0[1],['er',`  ${K('imput')}: <span class="wave">Order</span>`],L0[3],L0[4]]),ed1([L0[0],L0[1],`  ${K('imput')}: <span class="wave">Order</span>`,L0[3],L0[4]])];
P[17]=()=>[
 ed1([L0[0],L0[1],`  ${K('i')}<span class="cur"></span>`],{x:`<div class="pop" style="left:60px;top:56px"><div class="hi">input</div><div>inherit</div><div>include</div></div>`}),
 ed1([L0[0],L0[1],`  ${K('i')}<span class="cur"></span>`],{x:`<div class="tip" style="right:8px;bottom:8px">Ctrl+Space — подсказки</div>`})];
P[18]=()=>[
 pv(bd(code([L0[0],L0[1],['hl',L0[2]],L0[3],L0[4]])+cv({sel:0}))),
 pv(bd(code([L0[0],L0[1],['gut',L0[2]],L0[3],L0[4]])+cv({sel:0})))];
P[19]=()=>[ed1(L0,{fs:13}),ed1(L0,{fs:14})];
P[20]=()=>[ed1(L0,{}),ed1(L0,{num:false})];
P[21]=()=>[
 ed1([L0[0],`${K('box')} A0 ${S('"Process"')} {<span class="cur"></span>}`,''],{}),
 ed1([L0[0],`${K('box')} A0 ${S('"Process"')} {<span class="cur"></span>`,''],{})];
P[22]=()=>[
 ed1([L0[0],L0[1],`  ${K('input')}: Order<span class="cur"></span><span class="gh"> → Invoice</span>`],{x:`<div class="tip" style="right:8px;bottom:8px">Tab — принять</div>`}),
 ed1([L0[0],L0[1],`  ${K('input')}: Order<span class="cur"></span>`],{x:`<div class="pop" style="left:90px;top:56px"><div class="hi">→ Invoice</div><div style="color:var(--tx3)">Enter — принять</div></div>`})];
P[23]=()=>[ed1([...L0,`${K('box')} A2`,`${K('box')} A3`],{mm:true}),ed1([...L0,`${K('box')} A2`,`${K('box')} A3`],{})];
P[24]=()=>[
 ed1([L0[0],`${K('box')} A0 ${S('"Очень длинное имя функции процесса,')}`,`${S('которое переносится"')} {`,L0[2]],{}),
 ed1([L0[0],`${K('box')} A0 ${S('"Очень длинное имя функции процесса, которое уходит за край экрана и ещё дальше…"')} {`,L0[2]],{x:'<div style="position:absolute;left:0;right:0;bottom:0;height:6px;background:var(--br)"><i style="display:block;width:40%;height:100%;background:var(--tx3)"></i></div>'})];
P[25]=()=>[
 pv(bd(code(L0,{x:mnu(['Копировать','Вставить','Выделить всё','-','Проверить'],'left:70px;top:40px','nat')}))),
 pv(bd(code(L0,{x:mnu(['*Перейти к определению','Переименовать','Fix with AI','-','Копировать как DSL'],'left:70px;top:40px','dk')})))];
P[26]=()=>[
 ed1(L0,{x:`<div class="mnu" style="right:6px;top:4px;width:140px;display:flex;gap:4px;align-items:center;padding:4px 6px">${ic('search',11)}<span style="color:var(--tx3)">Найти…</span>${FL}1/3</div>`}),
 pv(bd(code(L0))+'<div class="scrim"></div>'+mdl('Найти и заменить','Найти: box  →  Заменить: node',[bt('Закрыть'),bt('Заменить','blue')]))];
P[27]=()=>[
 ed1([L0[0],`${K('box')} A0 ${S('"P"')} <span class="bm">{</span>`,L0[2],`<span class="bm">}</span>`],{}),
 ed1([L0[0],`${K('box')} A0 ${S('"P"')} <span class="bb">{</span>`,L0[2],`<span class="bb">}</span>`],{})];
P[28]=()=>[
 ed1(L0,{x:`<div class="mnu" style="left:70px;top:48px;width:150px;display:block"><b>input</b><div style="padding:0;color:var(--tx2)">Вход функции: данные или материал, который преобразуется.</div><div style="padding:0;color:var(--ac)">Документация →</div></div>`}),
 ed1(L0,{x:`<div class="tip" style="left:70px;top:48px">input: Port</div>`})];
P[29]=()=>[
 ed1([L0[0],`bo<span class="cur"></span>`,'',C('# Tab → вставит шаблон box')],{x:`<div class="pop" style="left:34px;top:34px"><div class="hi">box ⇥ box A "name" { }</div></div>`}),
 pv(tb(bt('Snippets','g','code'),ic('down',10))+bd(code(L0))+mnu(['*box','arrow','group','note'],'left:8px;top:34px'))];
P[30]=()=>[
 pv(tabs(tab('order.dsl',{act:1,dirty:'dot'}))+bd(code([L0[0],['dirty',L0[1]],['dirty',L0[2]],L0[3],L0[4]]))),
 pv(tabs(tab('order.dsl',{act:1,dirty:'dot'}))+bd(code(L0)))];
