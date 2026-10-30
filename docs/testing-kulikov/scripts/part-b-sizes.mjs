// C. size boundaries; D. big graphs, cycles, pathological input, latency
import { request, post, R, st, isJson, alive, J, svgIssues, short, TEMPLATES, recover } from './ctx.mjs';

{
  const g = 'C. Size boundaries';
  const mkv = (n) => { let s = 'diagram graph "x"\n'; while (s.length < n) s += 'vertex v' + s.length + '\n'; return s.slice(0, n); };
  const L = (n) => JSON.stringify({ source: n });
  const t = async (id, title, body, ex, okf, headers = J, path = '/api/render', note = '') => {
    const r = await request({ method: 'POST', path, headers, body, timeout: 60000 });
    R(id, g, title, `POST ${path} ${short(body.slice(0, 30))} (${body.length} bytes)`, ex, `${st(r)} ${Math.round(r.ms)} ms ${short(r.body, 70)}`, okf(r), note);
    return r;
  };
  const notRejected = (r) => r.status !== 413 && r.status !== 0 && r.status !== 500;
  await t('C01', 'source length 0', L(''), '400', (r) => r.status === 400);
  await t('C02', 'source length 1 ("a")', L('a'), '422', (r) => r.status === 422);
  await t('C03', 'source length 1 (validate)', L('a'), '200/422, not 500', (r) => [200, 422].includes(r.status), J, '/api/validate');
  const s99999 = mkv(99999), s100000 = mkv(100000), s100001 = mkv(100001);
  await t('C04', 'source 99999 chars (render)', L(s99999), 'not 413', notRejected);
  await t('C05', 'source exactly 100000 chars (render)', L(s100000), 'accepted (not 413)', notRejected);
  await t('C06', 'source 100001 chars (render)', L(s100001), '413', (r) => r.status === 413);
  await t('C07', 'source 100000 chars (validate)', L(s100000), '200', (r) => r.status === 200, J, '/api/validate');
  await t('C08', 'source 100001 chars (validate)', L(s100001), '413', (r) => r.status === 413, J, '/api/validate');
  await t('C09', 'source 100001 chars (parse)', L(s100001), '413', (r) => r.status === 413, J, '/api/parse');
  await t('C10', 'source 100001 chars (generate)', L(s100001), '413', (r) => r.status === 413, J, '/api/generate');
  await t('C11', 'text/plain 100000 chars', s100000, 'accepted', notRejected, { 'Content-Type': 'text/plain' });
  await t('C12', 'text/plain 100001 chars', s100001, '413', (r) => r.status === 413, { 'Content-Type': 'text/plain' });
  await t('C13', 'text/plain 101024 chars (limit + slack)', 'a'.repeat(101024), '413', (r) => r.status === 413, { 'Content-Type': 'text/plain' });
  await t('C14', 'text/plain 101025 chars', 'a'.repeat(101025), '413', (r) => r.status === 413, { 'Content-Type': 'text/plain' });
  await t('C15', 'body 200 KB JSON', JSON.stringify({ source: 'a'.repeat(200000) }), '413', (r) => r.status === 413);
  await t('C16', 'body 5 MB text', 'a'.repeat(5 * 1024 * 1024), '413 or connection closed', (r) => r.status === 413 || r.status === 0);
  await t('C17', 'body 50 MB text', 'a'.repeat(50 * 1024 * 1024), '413 or connection closed', (r) => r.status === 413 || r.status === 0);
  R('C18', g, 'server still alive after huge bodies', 'GET /api/grammar', '200', st(await request({ path: '/api/grammar' })), await alive());
  await t('C19', 'source of 50000 emoji (100000 UTF-16 units, 200000 bytes)', L('😀'.repeat(50000)), '200/422 (100000 units = at the limit), never 413', (r) => [200, 422].includes(r.status));
  await t('C20', 'source of 30000 Cyrillic chars (60000 bytes)', L('я'.repeat(30000)), '422', (r) => r.status === 422);
  await t('C21', 'source of 100000 Cyrillic chars (valid length, 200000 bytes)', L('я'.repeat(100000)), 'not 413: length is exactly 100000 chars', (r) => r.status !== 413, J, '/api/render', 'The byte limit (100000+1024) is checked in bytes, not characters: a valid 100000-char Cyrillic source is refused');
  await t('C22', 'source of 50000 Cyrillic chars (100000 bytes)', L('я'.repeat(50000)), 'not 413', (r) => r.status !== 413);
  await t('C23', 'source of 60000 Cyrillic chars (120000 bytes, 60000 chars < 100000)', L('я'.repeat(60000)), 'not 413 (60000 < 100000 chars)', (r) => r.status !== 413, J, '/api/render', 'Same defect as C21');
  await t('C24', '100000 chars written as \\u0000 escapes (600 KB JSON)', L('\u0000'.repeat(100000)), 'not 413 (source is 100000 chars)', (r) => r.status !== 413, J, '/api/render', 'JSON escapes count against the byte limit');
  await t('C25', 'long single word 99900 chars', L('diagram graph "x"\nvertex ' + 'A'.repeat(99900)), 'responds < 5 s', (r) => r.ms < 5000 && r.status !== 0);
  await t('C26', 'long title 99000 chars', L('diagram graph "' + 'T'.repeat(99000) + '"\nvertex A'), 'responds < 5 s', (r) => r.ms < 5000 && r.status !== 0);
}

{
  const g = 'D. Large graphs and performance';
  const t = async (id, title, src, ex, okf, path = '/api/render', note = '') => {
    const r = await request({ method: 'POST', path, headers: J, body: JSON.stringify({ source: src }), timeout: 30000 });
    if (r.status === 0) await recover();
    R(id, g, title, `POST ${path} (${src.length} chars)`, ex, `${st(r)} ${Math.round(r.ms)} ms ${short(r.body.replace(/"svg":"[^"]*"/, '"svg":…'), 60)}`, okf(r), note);
    return r;
  };
  const vs = (n) => Array.from({ length: n }, (_, i) => `vertex n${i}`).join('\n');
  const chain = (n) => 'diagram graph "chain"\nmode directed\n' + vs(n) + '\n' + Array.from({ length: n - 1 }, (_, i) => `edge n${i} -> n${i + 1}`).join('\n');
  const cyc = (n) => chain(n) + `\nedge n${n - 1} -> n0`;
  const self = (n) => 'diagram graph "self"\nmode directed\n' + Array.from({ length: n }, (_, i) => `vertex n${i}\nedge n${i} -> n${i}`).join('\n');
  const dense = (n) => 'diagram graph "dense"\nmode directed\n' + vs(n) + '\n' + Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? null : `edge n${i} -> n${j}`)).filter(Boolean).join('\n')).join('\n');
  const star = (n) => 'diagram graph "star"\nmode directed\nvertex hub\n' + Array.from({ length: n }, (_, i) => `vertex n${i}\nedge hub -> n${i}`).join('\n');
  const dag = (n) => 'diagram dag "d"\n' + Array.from({ length: n }, (_, i) => `task t${i} "T${i}" duration=1`).join('\n') + '\n' + Array.from({ length: n - 1 }, (_, i) => `depend t${i} -> t${i + 1}`).join('\n');
  const dagc = (n) => dag(n) + `\ndepend t${n - 1} -> t0`;
  const ok200 = (r) => r.status === 200 && isJson(r);
  const fast = (ms) => (r) => r.status !== 0 && r.status !== 500 && r.ms < ms;
  await t('D01', 'chain of 300 nodes', chain(300), '200, valid SVG, < 3 s', (r) => ok200(r) && r.ms < 3000 && svgIssues(JSON.parse(r.body).svg).length === 0);
  await t('D02', 'chain of 600 nodes', chain(600), 'answer < 10 s, not 500', fast(10000));
  await t('D03', 'cycle of 300 nodes', cyc(300), '200 < 3 s', (r) => ok200(r) && r.ms < 3000);
  await t('D04', '300 self-loops', self(300), '200 < 3 s', (r) => ok200(r) && r.ms < 3000);
  await t('D05', 'complete graph of 40 nodes (1560 edges)', dense(40), '200 < 5 s', (r) => ok200(r) && r.ms < 5000);
  await t('D06', 'complete graph of 60 nodes (3540 edges)', dense(60).slice(0, 99999), 'answer < 15 s, not 500', fast(15000));
  await t('D07', 'star of 500 nodes', star(500), 'answer < 10 s, not 500', fast(10000));
  await t('D08', 'DAG chain 400 tasks', dag(400), '200 < 5 s', (r) => ok200(r) && r.ms < 5000);
  await t('D09', 'DAG with a cycle of 400 tasks', dagc(400), '200 valid=false (cycle reported) < 5 s', (r) => ok200(r) && r.ms < 5000 && JSON.parse(r.body).valid === false);
  await t('D10', 'DAG cycle, validate', dagc(50), 'valid=false with a cycle problem', (r) => ok200(r) && JSON.parse(r.body).valid === false, '/api/validate');
  await t('D11', 'validate of a chain of 800 vertices', chain(800), '200 < 5 s', (r) => ok200(r) && r.ms < 5000, '/api/validate');
  await t('D12', 'parse of a chain of 800 vertices', chain(800), '200 < 5 s', (r) => ok200(r) && r.ms < 5000, '/api/parse');
  await t('D12b', 'validate of a chain of 400 vertices', chain(400), '200 < 2 s', (r) => ok200(r) && r.ms < 2000, '/api/validate');
  await t('D12c', 'validate of a DAG of 800 tasks (for comparison)', dag(800), '200 < 2 s', (r) => ok200(r) && r.ms < 2000, '/api/validate');
  for (const f of ['graphviz', 'mermaid']) {
    const rg = await request({ method: 'POST', path: '/api/generate', headers: J, body: JSON.stringify({ source: chain(400), format: f }), timeout: 30000 });
    if (rg.status === 0) await recover();
    R(`D13-${f}`, g, `generate ${f} for 400 nodes`, 'POST /api/generate', '200 < 5 s', `${st(rg)} ${Math.round(rg.ms)} ms`, rg.status === 200 && rg.ms < 5000);
  }
  const evil = [
    ['D14', 'many quotes', 'diagram graph "x"\nvertex ' + '"'.repeat(50000)],
    ['D15', 'many backslashes', 'diagram graph "' + '\\'.repeat(50000) + '"\nvertex A'],
    ['D16', 'long run of spaces then x', 'diagram graph "x"\n' + ' '.repeat(90000) + 'x'],
    ['D17', 'long unterminated string', 'diagram graph "x"\nvertex A "' + 'b'.repeat(90000)],
    ['D18', 'long word of dots/dashes', 'diagram graph "x"\nvertex ' + '.-'.repeat(40000)],
    ['D19', 'weight with 50000 digits', 'diagram graph "x"\nvertex A\nvertex B\nedge A -- B weight=' + '9'.repeat(50000)],
    ['D20', 'weights 1e999 / NaN / -0', 'diagram graph "x"\nvertex A\nvertex B\nedge A -- B weight=1e999\nedge A -- B weight=NaN\nedge A -- B weight=-0\npath A -> B'],
    ['D21', '20000 empty lines then header', '\n'.repeat(20000) + 'diagram graph "x"\nvertex A'],
    ['D22', '19000 comment lines', 'diagram graph "x"\n' + '// c\n'.repeat(19000)],
    ['D23', '5000 unclosed braces (uml class)', 'diagram uml class "x"\n' + 'class A {\n'.repeat(5000)],
    ['D24', 'id of 60000 letters + "!"', 'diagram graph "x"\nvertex ' + 'a'.repeat(60000) + '!'],
  ];
  for (const [id, title, src] of evil) await t(id, title, src.slice(0, 99999), 'answer < 5 s, no 500/hang', fast(5000));
  await t('D25', 'idef0 with 500 boxes', 'diagram idef0 "x"\n' + Array.from({ length: 500 }, (_, i) => `box A${i} "B${i}" {\n input: x${i}\n output: y${i}\n}`).join('\n'), 'answer < 5 s', fast(5000));
  await t('D26', 'erd with 300 entities and relations', 'diagram erd "x"\n' + Array.from({ length: 300 }, (_, i) => `entity E${i} {\n  id: int pk\n}`).join('\n') + '\n' + Array.from({ length: 299 }, (_, i) => `relationship E${i} 1:N E${i + 1} "r"`).join('\n'), 'answer < 5 s', fast(5000));
  await t('D27', 'uml sequence with 2000 messages', 'diagram uml sequence "x"\nparticipant A\nparticipant B\n' + 'message A -> B "hi"\n'.repeat(2000), 'answer < 5 s', fast(5000));
  await t('D28', 'mindmap depth 2000', 'diagram mindmap "x"\nroot r "R"\n' + Array.from({ length: 2000 }, (_, i) => `topic t${i} "T"\nbranch ${i ? 't' + (i - 1) : 'r'} -> t${i}`).join('\n'), 'answer < 5 s, no stack overflow', fast(5000));
  await t('D29', 'orgchart depth 3000 (recursion?)', 'diagram orgchart "x"\n' + Array.from({ length: 3000 }, (_, i) => `unit u${i} "U"\n`).join('') + Array.from({ length: 2999 }, (_, i) => `leads u${i} -> u${i + 1}`).join('\n'), 'answer < 5 s, no 500', fast(5000));
  await t('D30', 'decision tree depth 3000', 'diagram decision "x"\n' + Array.from({ length: 3000 }, (_, i) => `question q${i} "Q"\n`).join('') + Array.from({ length: 2999 }, (_, i) => `answer q${i} -> q${i + 1} "yes"`).join('\n'), 'answer < 5 s, no 500', fast(5000));
  const times = [];
  for (let i = 0; i < 20; i++) times.push((await post('/api/render', { source: TEMPLATES.gost })).ms);
  times.sort((a, b) => a - b);
  R('D31', g, 'latency of a normal render, 20 sequential requests', 'POST /api/render gost template x20', 'median < 100 ms, max < 500 ms', `median ${times[10].toFixed(1)} ms, max ${times[19].toFixed(1)} ms`, times[10] < 100 && times[19] < 500);
}
