// E. all notations; F. XSS and reflection; J. internal errors
import { request, post, R, st, isJson, J, svgIssues, short, TEMPLATES } from './ctx.mjs';

{
  const g = 'E. All notations';
  const nl = JSON.parse((await request({ path: '/api/notations' })).body).notations;
  const ids = nl.map((x) => x.id);
  R('E00', g, 'every notation has a template and vice versa', 'GET /api/notations vs TEMPLATES', '33 = 33, identical sets', `${ids.length} vs ${Object.keys(TEMPLATES).length}, missing: ${ids.filter((i) => !TEMPLATES[i]).join(',') || '-'}`, ids.length === 33 && ids.every((i) => TEMPLATES[i]) && Object.keys(TEMPLATES).length === 33);
  for (const n of nl) {
    const src = TEMPLATES[n.id];
    const r = await request({ method: 'POST', path: '/api/render', headers: J, body: JSON.stringify({ source: src }) });
    let issues = [], body = {};
    try { body = JSON.parse(r.body); issues = svgIssues(body.svg); } catch { issues = ['not JSON']; }
    R(`E-${n.id}-render`, g, `render template ${n.id}`, `POST /api/render (${src.length} chars)`, '200, valid=true, valid SVG without script/on*/javascript:, < 500 ms', `${st(r)} valid=${body.valid} ${Math.round(r.ms)} ms issues=${issues.join(';') || 'none'}`, r.status === 200 && body.valid === true && issues.length === 0 && r.ms < 500 && body.notation === n.id);
    const rv = await request({ method: 'POST', path: '/api/validate', headers: J, body: JSON.stringify({ source: src }) });
    const bv = isJson(rv) ? JSON.parse(rv.body) : {};
    R(`E-${n.id}-validate`, g, `validate template ${n.id}`, 'POST /api/validate', '200 valid=true, no errors/warnings (info allowed)', `${st(rv)} valid=${bv.valid} problems=${(bv.problems || []).length} (non-info: ${(bv.problems || []).filter((p) => p.severity !== 'info').length})`, rv.status === 200 && bv.valid === true && (bv.problems || []).filter((p) => p.severity !== 'info').length === 0);
    const rs = await request({ method: 'POST', path: '/api/render', headers: { ...J, Accept: 'image/svg+xml' }, body: JSON.stringify({ source: src }) });
    R(`E-${n.id}-svg`, g, `render ${n.id} as image/svg+xml`, 'POST /api/render Accept: image/svg+xml', '200 image/svg+xml, valid SVG', `${st(rs)} ${rs.headers['content-type']} issues=${svgIssues(rs.body).join(';') || 'none'}`, rs.status === 200 && /svg/.test(rs.headers['content-type']) && svgIssues(rs.body).length === 0);
    for (const f of n.formats) {
      const rg = await request({ method: 'POST', path: '/api/generate', headers: J, body: JSON.stringify({ source: src, format: f }) });
      const bg = isJson(rg) ? JSON.parse(rg.body) : {};
      R(`E-${n.id}-gen-${f}`, g, `generate ${f} for ${n.id}`, `POST /api/generate format=${f}`, '200, non-empty text, format as asked', `${st(rg)} format=${bg.format} len=${(bg.text || '').length}`, rg.status === 200 && bg.format === f && typeof bg.text === 'string' && bg.text.length > 10);
    }
    const rp = await request({ method: 'POST', path: '/api/parse', headers: J, body: JSON.stringify({ source: src }) });
    R(`E-${n.id}-parse`, g, `parse template ${n.id}`, 'POST /api/parse', '200, model object', `${st(rp)} len=${rp.body.length}`, rp.status === 200 && isJson(rp) && typeof JSON.parse(rp.body).model === 'object');
  }
  for (const n of nl) {
    const r = await post('/api/render', { source: n.header });
    let msg = short(r.body, 50);
    let svgOk = true;
    if (r.status === 200) { const s = JSON.parse(r.body).svg; const i = svgIssues(s); svgOk = i.length === 0; msg = i.join(';') || 'svg ok'; }
    R(`E-${n.id}-empty`, g, `empty ${n.id} diagram (header only)`, `POST /api/render "${n.header}"`, '200 or 422, no 500, SVG valid when 200', `${st(r)} ${msg}`, [200, 422].includes(r.status) && svgOk);
  }
}

{
  const g = 'F. XSS and reflection';
  const PAY = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', '</text><script>alert(1)</script>', "' onload='alert(1)", 'javascript:alert(1)', '<svg onload=alert(1)>', '&lt;script&gt;', '&#x3c;script&#x3e;alert(1)', '</style><script>alert(1)</script>', ']]><script>alert(1)</script>', '<a href="javascript:alert(1)">x</a>', '"onmouseover="alert(1)', '\u2028<script>', '<![CDATA[<script>alert(1)</script>]]>', '${alert(1)}', '{{constructor.constructor("alert(1)")()}}'];
  const inject = (id, p) => {
    const esc = p.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return TEMPLATES[id].replace(/"([^"\n]*)"/g, `"$1${esc}"`);
  };
  let bad = [], total = 0;
  for (const id of Object.keys(TEMPLATES)) {
    for (const p of PAY) {
      total++;
      const r = await request({ method: 'POST', path: '/api/render', headers: J, body: JSON.stringify({ source: inject(id, p) }) });
      let svg = '';
      try { svg = JSON.parse(r.body).svg ?? ''; } catch {}
      if (r.status === 500 || r.status === 0) { bad.push(`${id}/${JSON.stringify(p)}: ${r.status}`); continue; }
      if (svg) { const iss = svgIssues(svg); if (iss.length) bad.push(`${id}/${JSON.stringify(p)}: ${iss.join(',')}`); }
    }
  }
  R('F01', g, 'injection payloads in every quoted string of every template', `${Object.keys(TEMPLATES).length} notations x ${PAY.length} payloads = ${total} requests`, 'no script/on*/javascript:, SVG balanced, no 500', bad.length ? `${bad.length} bad: ${short(bad.slice(0, 5).join(' | '), 400)}` : 'no violations', bad.length === 0, bad.join('\n'));
  bad = []; total = 0;
  for (const id of Object.keys(TEMPLATES)) {
    for (const p of ['<script>alert(1)</script>', 'x"onload="alert(1)', 'a<b>c', 'a&b', "a'b"]) {
      total++;
      const src = TEMPLATES[id].replace(/\b(A1|u1|s|n1|a|e1|p1|c1|Customer)\b/g, (m) => m + p.replace(/\s/g, ''));
      const r = await request({ method: 'POST', path: '/api/render', headers: J, body: JSON.stringify({ source: src }) });
      let svg = '';
      try { svg = JSON.parse(r.body).svg ?? ''; } catch {}
      if (r.status === 500 || r.status === 0) bad.push(`${id}/${p}: ${r.status}`);
      else if (svg) { const iss = svgIssues(svg); if (iss.length) bad.push(`${id}/${p}: ${iss.join(',')}`); }
    }
  }
  R('F02', g, 'injection payloads in identifiers (unquoted)', `${total} requests`, 'no 500, safe SVG', bad.length ? `${bad.length} bad: ${short(bad.slice(0, 4).join(' | '), 300)}` : 'no violations', bad.length === 0, bad.join('\n'));
  let r = await post('/api/generate', { source: 'diagram graph "<script>alert(1)</script>"\nvertex A' });
  R('F03', g, 'JSON responses are JSON type + nosniff', 'POST /api/generate with <script> title', 'application/json, X-Content-Type-Options: nosniff', `${r.headers['content-type']} nosniff=${r.headers['x-content-type-options'] ?? '-'}`, /application\/json/.test(r.headers['content-type']) && r.headers['x-content-type-options'] === 'nosniff');
  r = await request({ method: 'POST', path: '/api/render', headers: { ...J, Accept: 'image/svg+xml' }, body: JSON.stringify({ source: 'diagram graph "<script>alert(1)</script>"\nvertex A' }) });
  R('F04', g, 'SVG served directly: no raw <script>, CSP present', 'POST /api/render Accept svg with <script> title', 'no <script>; CSP header present', `${st(r)} script=${/<script/i.test(r.body)} csp=${r.headers['content-security-policy'] ? 'yes' : '-'}`, !/<script/i.test(r.body) && !!r.headers['content-security-policy']);
  r = await post('/api/render', { source: '<script>alert(1)</script>' });
  R('F05', g, 'reflection in 422 message', 'POST /api/render <script> without header', 'JSON type (not HTML) so reflection is inert', `${st(r)} ${r.headers['content-type']} ${short(r.body, 120)}`, /application\/json/.test(r.headers['content-type']));
  r = await request({ path: '/api/<script>alert(1)</script>' });
  R('F06', g, 'path reflected in 404 JSON', 'GET /api/<script>alert(1)</script>', '404 JSON', `${st(r)} ${r.headers['content-type']} ${short(r.body, 120)}`, r.status === 404 && /json/.test(r.headers['content-type']));
  r = await request({ method: 'POST', path: '/api/%3Cscript%3E', headers: J, body: '{}' });
  R('F07', g, 'encoded path reflected', 'POST /api/%3Cscript%3E', '404 JSON', `${st(r)} ${short(r.body, 120)}`, r.status === 404);
  r = await request({ path: '/api/notations?lang=<script>alert(1)</script>' });
  R('F08', g, 'query reflected', 'GET /api/notations?lang=<script>', 'not reflected', `${st(r)} reflected=${r.body.includes('<script>')}`, !r.body.includes('<script>'));
  r = await request({ path: '/api/notations', headers: { Origin: 'http://evil.example', Referer: 'http://evil.example/' } });
  R('F09', g, 'CORS: foreign Origin', 'GET /api/notations Origin: evil.example', 'no Access-Control-Allow-Origin', `ACAO=${r.headers['access-control-allow-origin'] ?? '-'}`, !r.headers['access-control-allow-origin']);
  r = await request({ method: 'OPTIONS', path: '/api/render', headers: { Origin: 'http://evil.example', 'Access-Control-Request-Method': 'POST' } });
  R('F10', g, 'CORS preflight from foreign origin', 'OPTIONS /api/render Origin evil', 'no ACAO (cross-origin denied)', `${st(r)} ACAO=${r.headers['access-control-allow-origin'] ?? '-'}`, !r.headers['access-control-allow-origin']);
  r = await request({ method: 'POST', path: '/api/render', headers: { 'Content-Type': 'text/plain', Origin: 'http://evil.example' }, body: TEMPLATES.graph });
  R('F11', g, 'simple cross-origin POST (text/plain) is processed', 'POST text/plain Origin evil', 'harmless: stateless, no cookies, CORS blocks reading', `${st(r)}`, true, 'No CSRF impact: the API is stateless and has no cookies');
  r = await request({ path: '/api/notations', headers: { Host: 'evil.example' } });
  R('F12', g, 'Host header spoofing', 'GET /api/notations Host: evil.example', 'Host not reflected', `${st(r)} reflected=${r.body.includes('evil.example')}`, !r.body.includes('evil.example'));
  r = await post('/api/render', { source: 'diagram graph "\\u003cscript\\u003e"\nvertex A' });
  let b = isJson(r) ? JSON.parse(r.body) : {};
  R('F13', g, 'escape sequences in titles do not become tags', 'title with \\u003c', 'no <script> in svg', `${st(r)}`, !/<script/i.test(b.svg ?? ''));
  r = await post('/api/render', { source: 'diagram graph "x"\nvertex A "a\nb"\nvertex B "\\"\\"\\""\nedge A -- B "</text><circle onload=1>"' });
  b = isJson(r) ? JSON.parse(r.body) : {};
  R('F14', g, 'quote-breaking labels', 'vertex with embedded quote/newline', 'SVG valid', `${st(r)} ${b.svg ? svgIssues(b.svg).join(';') || 'ok' : short(r.body, 80)}`, r.status !== 500 && (!b.svg || svgIssues(b.svg).length === 0));
}

{
  const g = 'J. Internal errors (500)';
  const odd = [
    ['J01', 'header with leading spaces', '   diagram graph "x"'],
    ['J02', 'diagram keyword only', 'diagram'],
    ['J03', 'diagram uml only', 'diagram uml'],
    ['J04', 'diagram uml unknown kind', 'diagram uml nosuch "x"'],
    ['J05', 'diagram constructor', 'diagram constructor "x"'],
    ['J06', 'diagram __proto__', 'diagram __proto__ "x"'],
    ['J07', 'diagram toString', 'diagram toString'],
    ['J08', 'diagram hasOwnProperty', 'diagram hasOwnProperty'],
    ['J09', 'diagram uml constructor', 'diagram uml constructor'],
    ['J10', 'diagram uml __proto__', 'diagram uml __proto__'],
    ['J11', 'vertex named __proto__/constructor', 'diagram graph "x"\nvertex __proto__\nvertex constructor\nedge __proto__ -- constructor'],
    ['J12', 'vertex named toString/hasOwnProperty', 'diagram graph "x"\nvertex toString\nvertex hasOwnProperty\nedge toString -- hasOwnProperty'],
    ['J13', 'attribute __proto__=1', 'diagram graph "x"\nvertex A __proto__=1 constructor=2\nvertex B'],
    ['J14', 'dag task __proto__', 'diagram dag "x"\ntask __proto__ "a" duration=1\ntask constructor "b" duration=2\ndepend __proto__ -> constructor'],
    ['J15', 'erd entity __proto__', 'diagram erd "x"\nentity __proto__ {\n  constructor: int pk\n}\nentity toString {\n  id: int pk\n}\nrelationship __proto__ 1:N toString "r"'],
    ['J16', 'uml class named constructor', 'diagram uml class "x"\nclass constructor {\n  +__proto__: int\n}\nclass toString\nconstructor --|> toString'],
    ['J17', 'idef0 box __proto__', 'diagram idef0 "x"\nbox __proto__ "a" {\n input: constructor\n}\narrow __proto__.input -> __proto__.output'],
    ['J18', 'gost node __proto__', 'diagram gost "x"\nstart __proto__ "S"\nend constructor "E"\nflow __proto__ -> constructor'],
    ['J19', 'sequence participants __proto__', 'diagram uml sequence "x"\nparticipant __proto__\nparticipant constructor\nmessage __proto__ -> constructor "hi"'],
    ['J20', 'dag duration negative / not a number', 'diagram dag "x"\ntask a "a" duration=-5\ntask b "b" duration=abc\ndepend a -> b'],
    ['J21', 'graph path to missing node', 'diagram graph "x"\nvertex A\npath A -> Z'],
    ['J22', 'graph negative weight path', 'diagram graph "x"\nmode undirected\nvertex A\nvertex B\nedge A -- B weight=-1\npath A -> B'],
    ['J23', 'petri negative / huge tokens', 'diagram petri "x"\nplace p tokens=-3\nplace q tokens=1e9\ntransition t\narc p -> t\narc t -> p'],
    ['J24', 'petri tokens 99999999999', 'diagram petri "x"\nplace p tokens=99999999999\ntransition t\narc p -> t'],
    ['J25', 'mindmap two roots and a cycle', 'diagram mindmap "x"\nroot a "A"\nroot b "B"\ntopic c "C"\nbranch a -> c\nbranch b -> c\nbranch c -> a'],
    ['J26', 'orgchart cycle', 'diagram orgchart "x"\nunit a "A"\nunit b "B"\nleads a -> b\nleads b -> a'],
    ['J27', 'decision cycle', 'diagram decision "x"\nquestion a "A"\nquestion b "B"\nanswer a -> b "y"\nanswer b -> a "n"'],
    ['J28', 'orgchart self lead', 'diagram orgchart "x"\nunit a "A"\nleads a -> a'],
    ['J29', 'mindmap self branch', 'diagram mindmap "x"\nroot a "A"\nbranch a -> a'],
    ['J30', 'epc cycle', 'diagram epc "x"\nevent e1 "E"\nfunction f1 "F"\nflow e1 -> f1\nflow f1 -> e1'],
    ['J31', 'bpmn cycle + self loop', 'diagram bpmn "x"\ntask a "A"\ntask b "B"\nflow a -> b\nflow b -> a\nflow a -> a'],
    ['J32', 'uml class inheritance cycle', 'diagram uml class "x"\nclass A\nclass B\nA --|> B\nB --|> A\nA --|> A'],
    ['J33', 'uml package contains cycle', 'diagram uml package "x"\npackage a\npackage b\ncontains a -> b\ncontains b -> a'],
    ['J34', 'uml state cycle without initial', 'diagram uml state "x"\nstate a\nstate b\ntransition a -> b\ntransition b -> a'],
    ['J35', 'c4 self relation', 'diagram c4 "x"\nsystem s "S"\nuses s -> s "self"'],
    ['J36', 'network self link', 'diagram network "x"\nrouter r\nlink r -> r'],
    ['J37', 'idef3 loop', 'diagram idef3 "x"\nuob a "A"\nuob b "B"\nprecedence a -> b\nprecedence b -> a'],
    ['J38', 'dfd self flow', 'diagram dfd "x"\nprocess p "P"\nflow p -> p'],
    ['J39', 'duplicate ids and edges', 'diagram graph "x"\nvertex A\nvertex A\nedge A -- A\nedge A -- A'],
    ['J40', 'uml activity self flow', 'diagram uml activity "x"\nstart s\naction a "A"\nflow s -> a\nflow a -> a'],
  ];
  for (const [id, title, src] of odd) {
    const rr = await request({ method: 'POST', path: '/api/render', headers: J, body: JSON.stringify({ source: src }) });
    let iss = [];
    try { const b = JSON.parse(rr.body); if (b.svg) iss = svgIssues(b.svg); } catch {}
    R(id, g, title, `POST /api/render "${short(src.replace(/\n/g, '\\n'), 50)}"`, '200 or 422, never 500; SVG valid', `${st(rr)} ${short(rr.body.replace(/"svg":"[^"]*"/, '"svg":…'), 80)} ${iss.join(';')}`, [200, 422].includes(rr.status) && iss.length === 0);
    for (const ep of ['validate', 'parse', 'generate']) {
      const re = await request({ method: 'POST', path: `/api/${ep}`, headers: J, body: JSON.stringify({ source: src }) });
      if (re.status === 500 || re.status === 0) R(`${id}-${ep}`, g, `${title} via ${ep}`, `POST /api/${ep}`, 'not 500', st(re) + ' ' + short(re.body, 80), false);
    }
  }
}
