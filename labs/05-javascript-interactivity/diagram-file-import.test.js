import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { test } from 'node:test';
import { parseDiagram } from '../../site/js/notations/index.js';
import {
  classify,
  cleanLabel,
  delimiterOf,
  emitModel,
  importDiagramFile,
  inflateRaw,
  parseXml,
  sniffFormat,
  splitRow,
  vsdxToXml,
} from '../../site/js/utils/diagram-file-import.js';

const valid = (code) =>
  assert.deepEqual(
    parseDiagram(code).problems.filter((item) => item.severity === 'error'),
    [],
    code,
  );
const run = async (text, options) => importDiagramFile(text, options);

const mx = (cells) =>
  `<mxfile><diagram name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`;
const geo = (x, y, w = 80, h = 40) => `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>`;
const vertex = (id, value, style, g) => `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1">${g}</mxCell>`;
const edge = (id, source, target, value = '', style = '') =>
  `<mxCell id="${id}" value="${value}" style="${style}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`;

test('the XML reader decodes entities, CDATA, self-closing tags and skips what is broken', () => {
  const root = parseXml(
    '<?xml version="1.0"?><!DOCTYPE a [<!ENTITY x "y">]><!-- c --><a:r x="1&amp;2" y=\'q\'><b/><c><![CDATA[<raw>]]>t&#65;&#x42;&#0;&lt;</c></a:r></b></zz> <  ',
  );
  const [r] = root.children;
  assert.equal(r.name, 'r');
  assert.deepEqual(r.attrs, { x: '1&2', y: 'q' });
  assert.equal(r.children[1].text, '<raw>tAB<');
  assert.throws(() => parseXml('<a>'.repeat(300)), /too deep/);
});

test('labels lose HTML, quotes and spaces', () => {
  assert.equal(cleanLabel('<b>Hi</b><br/>"there"&nbsp;&amp; \\ x'), "Hi 'there' & ' x");
  assert.equal(cleanLabel(undefined), '');
  assert.equal(cleanLabel('x'.repeat(200)).length, 80);
  assert.equal(classify('rhombus;x'), 'decision');
  assert.equal(classify(undefined), 'process');
});

test('draw.io: shapes become a GOST flowchart with positions, labels and the direction of arrows', async () => {
  const xml = mx(
    vertex('2', 'Start', 'ellipse;whiteSpace=wrap', geo(100, 20)) +
      vertex('3', 'Read &lt;b&gt;n&lt;/b&gt;', 'shape=parallelogram', geo(100, 100)) +
      vertex('4', 'n &gt; 0?', 'rhombus', geo(100, 200)) +
      vertex('5', 'Store', 'shape=cylinder', geo(300, 200)) +
      vertex('6', 'End', 'ellipse', geo(100, 300)) +
      vertex('7', 'Title', 'text;html=1', geo(0, 0)) +
      vertex('8', 'Lane', 'swimlane', geo(0, 0)) +
      edge('9', '2', '3') +
      edge('10', '3', '4', 'go') +
      edge('11', '4', '6', 'no') +
      edge('12', '5', '4', 'No', 'endArrow=none;startArrow=classic') +
      edge('15', '5', '6') +
      edge('13', '4', '99') +
      `<mxCell id="14" value="Yes" style="edgeLabel" vertex="1" parent="11"/>`,
  );
  const result = await run(xml);
  assert.equal(result.ok, true);
  assert.equal(result.notation, 'gost');
  assert.match(result.code, /^diagram gost$/m);
  assert.match(result.code, /^start 2 "Start" pos=100x100$/m);
  assert.match(result.code, /^io 3 "Read n" pos=100x180$/m);
  assert.match(result.code, /^flow 4 -> 6 "Yes"$/m);
  assert.match(result.code, /^flow 4 -> 5 "No"$/m);
  assert.equal(result.warnings.length, 3);
  valid(result.code);
});

test('draw.io: wrappers, nested geometry, no start or end falls back to a graph, undirected edges', async () => {
  const xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
    <UserObject label="A" id="a"><mxCell style="rounded=1" vertex="1" parent="1">${geo(10, 10)}</mxCell></UserObject>
    <object label="B" id="b"><mxCell style="rounded=1" vertex="1" parent="a">${geo(10, 10)}</mxCell></object>
    <object id="empty"/>
    <mxCell id="c" vertex="1" style="rhombus" parent="1"/>
    <mxCell id="e1" edge="1" style="endArrow=none" source="a" target="b" parent="1"/>
    <mxCell id="e2" edge="1" source="a" parent="1"/>
  </root></mxGraphModel>`;
  const result = await run(xml);
  assert.equal(result.notation, 'graph');
  assert.match(result.code, /^mode undirected$/m);
  assert.match(result.code, /^edge a -- b$/m);
  assert.match(result.code, /^vertex a "A"$/m);
  assert.ok(result.warnings.some((item) => /Правила блок-схемы/.test(item)));
  valid(result.code);
  const undirected = await run(mx(vertex('2', 'A', '', geo(0, 0)) + vertex('3', 'B', '', geo(0, 0)) + edge('4', '2', '3', '', 'endArrow=none')), {
    lang: 'en',
  });
  assert.equal(undirected.notation, 'graph');
  assert.match(undirected.code, /^mode undirected$/m);
  assert.match(undirected.code, /^edge 2 -- 3$/m);
  const bare = await run('<mxGraphModel><root><mxCell id="v" vertex="1" value="X"/></root></mxGraphModel>');
  assert.match(bare.code, /vertex v "X"/);
});

test('draw.io: BPMN shapes give a BPMN diagram', async () => {
  const xml = mx(
    vertex('2', 'S', 'shape=mxgraph.bpmn.shape;outline=standard;perimeter=ellipsePerimeter', geo(0, 0)) +
      vertex('3', 'Do', 'shape=mxgraph.bpmn.task', geo(100, 0)) +
      vertex('4', 'XOR', 'shape=mxgraph.bpmn.gateway2;gwType=exclusive', geo(200, 0)) +
      vertex('5', 'AND', 'shape=mxgraph.bpmn.gateway2;gwType=parallel', geo(300, 0)) +
      vertex('6', 'Mid', 'shape=mxgraph.bpmn.shape;outline=catching', geo(400, 0)) +
      vertex('7', 'E', 'shape=mxgraph.bpmn.shape;outline=end', geo(500, 0)) +
      [2, 3, 4, 5, 6].map((n) => edge(`e${n}`, n, n + 1)).join(''),
  );
  const result = await run(xml);
  assert.equal(result.notation, 'bpmn');
  assert.match(result.code, /^parallel 5 "AND"/m);
  valid(result.code);
});

test('draw.io: compressed content is unpacked, a broken one gets a warning', async () => {
  const graph = mx(vertex('2', 'A', '', geo(0, 0))).match(/<mxGraphModel>[\s\S]*<\/mxGraphModel>/)[0];
  const packed = deflateRawSync(Buffer.from(encodeURIComponent(graph))).toString('base64');
  const good = await run(`<mxfile><diagram>${packed}</diagram></mxfile>`);
  assert.match(good.code, /vertex 2 "A"/);
  const broken = await run('<mxfile><diagram>@@@</diagram></mxfile>', { lang: 'en' });
  assert.equal(broken.ok, false);
  assert.equal(broken.reason, 'no-structure');
  assert.equal((await run('<mxfile><diagram></diagram></mxfile>')).ok, false);
  const nograph = await run(`<mxfile><diagram>${deflateRawSync(Buffer.from('<a/>')).toString('base64')}</diagram></mxfile>`, { inflate: inflateRaw });
  assert.equal(nograph.reason, 'no-structure');
});

test('SVG: draw.io export, Graphviz and Mermaid', async () => {
  const embedded = mx(vertex('2', 'A', '', geo(0, 0)) + vertex('3', 'B', '', geo(0, 0)) + edge('4', '2', '3'));
  const drawio = await run(`<svg xmlns="http://www.w3.org/2000/svg" content="${embedded.replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"><g/></svg>`);
  assert.match(drawio.code, /edge 2 -> 3/);
  const dot = `<?xml version="1.0"?><svg><g id="graph0" class="graph"><g class="node"><title>a</title><ellipse/><text>Alpha</text></g><g class="node"><title>b</title><text>Beta</text></g>
    <g class="edge"><title>a&#45;&gt;b</title><text>go</text></g><g class="edge"><title>a:p&#45;&#45;b:q</title></g><g class="edge"><title>???</title></g></g></svg>`;
  const graphviz = await run(dot);
  assert.equal(graphviz.notation, 'graph');
  assert.match(graphviz.code, /^edge a -> b "go"$/m);
  const mermaid = `<svg><g class="nodes"><g class="node default" id="flowchart-A_1-0" transform="translate(10, 20)"><circle/><foreignObject><div><span>Start</span></div></foreignObject></g>
    <g id="flowchart-B-1" transform="translate(10,90)"><polygon/><text>Choice?</text></g><g id="flowchart-C-2"><circle/><text>End</text></g><g id="flowchart-D-3"><rect/><text>Work</text></g><g id="x"/></g>
    <path id="L_A_1_B_0"/><path id="L-B-C-1"/><path id="L_B_D_2"/><path id="L_D_C_3"/><path id="L_X_Y_0"/><path id="other"/><path/></svg>`;
  const flow = await run(mermaid);
  assert.equal(flow.notation, 'gost');
  assert.match(flow.code, /^start A_1 "Start" pos=100x100$/m);
  assert.match(flow.code, /^flow B -> C$/m);
  assert.equal((await run('<svg><rect/></svg>')).reason, 'no-structure');
});

test('JSON: a plain graph, D3 links, Cytoscape, Excalidraw and Lucid', async () => {
  const plain = await run(
    JSON.stringify({
      title: 'T',
      notation: 'flowchart',
      nodes: [
        { id: 'a', label: 'A', shape: 'start', x: 10, y: 20 },
        { id: 'b', name: 'B', type: 'end' },
      ],
      edges: [{ from: 'a', to: 'b', label: 'x' }],
    }),
  );
  assert.equal(plain.notation, 'gost');
  assert.match(plain.code, /^diagram gost "T"$/m);
  const d3 = await run(
    JSON.stringify({
      directed: false,
      nodes: [{ id: 1 }, { key: 2, position: { x: 1, y: 2 } }, 3],
      links: [
        { source: 1, target: { id: 2 } },
        { start: 2, end: 3 },
      ],
    }),
  );
  assert.match(d3.code, /^mode undirected$/m);
  assert.match(d3.code, /^edge 1 -- 2$/m);
  const cyto = await run(
    JSON.stringify({ elements: { nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }], edges: [{ data: { source: 'a', target: 'b' } }] } }),
  );
  assert.match(cyto.code, /edge a -> b/);
  const cytoList = await run(
    JSON.stringify({
      elements: [
        { group: 'nodes', data: { id: 'a' } },
        { group: 'edges', data: { source: 'a', target: 'a' } },
      ],
    }),
  );
  assert.match(cytoList.code, /edge a -> a/);
  const exc = await run(
    JSON.stringify({
      type: 'excalidraw',
      elements: [
        { id: 'r', type: 'rectangle', x: 0, y: 0 },
        { id: 'd', type: 'diamond', x: 100, y: 0, width: 10, height: 10 },
        { id: 'o', type: 'ellipse', x: 200, y: 0 },
        { id: 'x', type: 'rectangle', isDeleted: true },
        { id: 't', type: 'text', containerId: 'r', text: 'Task' },
        { id: 'a1', type: 'arrow', startBinding: { elementId: 'r' }, endBinding: { elementId: 'd' } },
        { id: 'a2', type: 'arrow', startBinding: { elementId: 'd' }, endBinding: { elementId: 'o' } },
        { id: 'a3', type: 'arrow', isDeleted: true },
      ],
    }),
  );
  assert.match(exc.code, /^vertex r "Task"$/m);
  const arr = await run(JSON.stringify([{ id: 'r', type: 'rectangle', x: 0, y: 0 }]));
  assert.equal(arr.ok, true);
  const lucid = await run(
    JSON.stringify({
      pages: [
        {
          shapes: [
            { id: 's', text: 'S', type: 'terminator', boundingBox: { x: 0, y: 0, w: 4, h: 4 } },
            { id: 'u', textAreas: [{ text: 'U' }], type: 'process', boundingBox: { x: 0, y: 0 } },
          ],
          lines: [{ endpoint1: { connectedTo: 's' }, endpoint2: { connectedTo: 'u' }, text: 'l' }, {}],
        },
      ],
    }),
  );
  assert.match(lucid.code, /^edge s -> u "l"$/m);
  for (const bad of ['{"x":1}', '{"nodes":[],"edges":[]}', '{"nodes":{},"edges":[]}', '[]']) {
    assert.equal((await run(bad, { format: 'json' })).reason, 'no-structure', bad);
  }
  assert.equal((await run('null', { format: 'json' })).reason, 'no-structure');
  assert.equal((await run('{oops', { format: 'json' })).reason, 'bad-file');
});

test('BPMN 2.0 XML keeps events, tasks, gateways, flows and shapes', async () => {
  const xml = `<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="p">
    <bpmn:startEvent id="s" name="Go"/><bpmn:userTask id="t" name="Task"/><bpmn:exclusiveGateway id="g"/><bpmn:parallelGateway id="pg"/><bpmn:intermediateCatchEvent id="i"/>
    <bpmn:task id="t2"/><bpmn:subProcess id="sp"><bpmn:endEvent id="e"/></bpmn:subProcess>
    <bpmn:sequenceFlow sourceRef="s" targetRef="t"/><bpmn:sequenceFlow sourceRef="t" targetRef="g" name="ok"/><bpmn:sequenceFlow sourceRef="g" targetRef="e"/></bpmn:process>
    <bpmndi:BPMNDiagram><bpmndi:BPMNShape bpmnElement="s"><dc:Bounds x="10" y="10" width="36" height="36"/></bpmndi:BPMNShape><bpmndi:BPMNShape bpmnElement="t"><dc:Bounds x="10"/></bpmndi:BPMNShape><bpmndi:BPMNShape bpmnElement="z"/></bpmndi:BPMNDiagram></bpmn:definitions>`;
  const result = await run(xml);
  assert.equal(result.notation, 'bpmn');
  assert.match(result.code, /^start s "Go" pos=100x100$/m);
  assert.match(result.code, /^parallel pg/m);
  assert.match(result.code, /^flow t -> g "ok"$/m);
  assert.equal((await run('<bpmn:definitions xmlns:bpmn="x"><bpmn:startEvent id="a"/></bpmn:definitions>', { format: 'bpmn' })).notation, 'bpmn');
});

test('XMI keeps UML classes, members and relations', async () => {
  const xml = `<xmi:XMI xmlns:xmi="x" xmlns:uml="u"><uml:Model><packagedElement xmi:type="uml:Class" xmi:id="a" name="Animal" isAbstract="true"><ownedAttribute name="age"/><ownedOperation name="eat"/><ownedOperation/><ownedAttribute/></packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="b" name="Dog"><generalization general="a"/><ownedAttribute name="owner" association="x" type="c"/><interfaceRealization contract="i"/></packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="c" name="Dog"><ownedAttribute name="pets" association="r" type="b"/></packagedElement>
    <packagedElement xmi:type="uml:Interface" xmi:id="i" name="Run"/><packagedElement xmi:type="uml:Package" name="p"/></uml:Model></xmi:XMI>`;
  const result = await run(xml, { lang: 'en' });
  assert.equal(result.notation, 'uml class');
  assert.match(result.code, /^abstract class Animal \{/m);
  assert.match(result.code, /^Dog --\|> Animal$/m);
  assert.match(result.code, /^Dog_2 --> Dog : pets$/m);
  assert.match(result.code, /^Dog \.\.\|> Run$/m);
  valid(result.code);
  assert.equal((await run('<xmi:XMI xmlns:xmi="x"/>')).reason, 'no-structure');
});

test('GraphML and GEXF', async () => {
  const ml = `<graphml><key id="d0" for="node" attr.name="label"/><key id="d1" for="edge" name="name"/><graph edgedefault="undirected"><node id="n0"><data key="d0">Zero</data></node><node id="n1"><data key="d9">x</data><data key="d0"> </data></node>
    <node id="n2"><y:ShapeNode><y:NodeLabel>Y</y:NodeLabel></y:ShapeNode></node><edge source="n0" target="n1"><data key="d1">e</data></edge><edge source="n1" target="n2" directed="true"/><edge source="n1" target="n2" directed="false"/></graph></graphml>`;
  const a = await run(ml);
  assert.match(a.code, /^vertex n0 "Zero"$/m);
  assert.match(a.code, /^vertex n2 "Y"$/m);
  assert.match(a.code, /^edge n0 -> n1 "e"$/m);
  assert.equal((await run('<graphml/>')).reason, 'no-structure');
  const gx = await run(
    '<gexf><graph defaultedgetype="directed"><nodes><node id="1" label="One"/><node id="2"/></nodes><edges><edge source="1" target="2" label="x"/><edge source="2" target="1" type="undirected"/></edges></graph></gexf>',
  );
  assert.match(gx.code, /^edge 1 -> 2 "x"$/m);
  assert.equal((await run('<gexf/>')).reason, 'no-structure');
});

const visio = `<VisioDocument><Masters><Shape ID="77"/></Masters><Pages><Page><Shapes>
  <Shape ID="1" NameU="Start/End"><XForm><PinX>1</PinX><PinY>2</PinY></XForm><Text>Begin</Text></Shape>
  <Shape ID="2" NameU="Decision"><Cell N="PinX" V="3"/><Cell N="PinY" V="2"/><Text>Q<cp/>?</Text></Shape>
  <Shape ID="3" Name="Plain"><Text/></Shape><Shape ID="4"><Shapes><Shape ID="5"/></Shapes></Shape>
  <Shape ID="6"><Text>flow</Text></Shape><Shape ID="7"/></Shapes><Connects><Connect FromSheet="6" ToSheet="1" FromCell="BeginX"/><Connect FromSheet="6" ToSheet="2" FromCell="EndX"/></Connects></Page></Pages></VisioDocument>`;
test('Visio XML: shapes with inches, connectors by Connect', async () => {
  const result = await run(visio);
  assert.equal(result.ok, true);
  assert.match(result.code, /^edge 1 -> 2 "flow"$/m);
  assert.match(result.code, /^vertex 2 "Q\?"$/m);
});

const zipOf = (name, data, method = 8) => {
  const nameBytes = Buffer.from(name);
  const packed = method === 8 ? deflateRawSync(data) : data;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(nameBytes.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt16LE(nameBytes.length, 28);
  const other = Buffer.alloc(46);
  other.writeUInt32LE(0x02014b50, 0);
  other.writeUInt16LE(3, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(2, 10);
  const head = Buffer.concat([local, nameBytes, packed]);
  end.writeUInt32LE(head.length, 16);
  return new Uint8Array(Buffer.concat([head, central, nameBytes, other, Buffer.from('abc'), end]));
};
test('VSDX: the first page is read from the zip, stored or deflated', async () => {
  for (const method of [8, 0]) {
    const xml = await vsdxToXml(zipOf('visio/pages/page1.xml', Buffer.from(visio), method));
    assert.match(xml, /VisioDocument/);
    assert.equal((await run(xml)).ok, true);
  }
  await assert.rejects(vsdxToXml(zipOf('other.xml', Buffer.from('x'))), /no page/);
  await assert.rejects(vsdxToXml(new Uint8Array(40)), /not a zip/);
});

test('DOT: nodes, edges, attributes, subgraphs, ports, comments', async () => {
  const dot = `/* c */ // c
    # hash
    digraph "My graph" { rankdir=LR; label="Title"; node [shape=box]; graph [x=1];
    a [label="Alpha\\n\\"q\\""]; b; a -> b -> c [label=go]; "d e":p1 -> { f g }; subgraph s { h } -> i; subgraph { j }; k [label=<<b>K</b>>]; x = ; ; , }`;
  const result = await run(dot);
  assert.equal(result.notation, 'graph');
  assert.match(result.code, /^diagram graph "My graph"$/m);
  assert.match(result.code, /^vertex a "Alpha 'q'"$/m);
  assert.match(result.code, /^edge b -> c "go"$/m);
  assert.match(result.code, /^edge d_e -> f$/m);
  assert.match(result.code, /^vertex k "K"$/m);
  valid(result.code);
  const undirected = await run('strict graph { a -- b; label="L" }');
  assert.match(undirected.code, /^mode undirected$/m);
  assert.match(undirected.code, /^diagram graph "L"$/m);
  assert.equal((await run('digraph { }', { format: 'dot' })).reason, 'no-structure');
  assert.equal((await run('digraph G { node [a=1 b ]; } ', { format: 'dot' })).reason, 'no-structure');
  assert.equal((await run('nothing', { format: 'dot' })).reason, 'no-structure');
  assert.equal((await run('graph x', { format: 'dot' })).reason, 'no-structure');
  assert.equal((await run('{ a }', { format: 'dot' })).reason, 'no-structure');
});

test('CSV and TSV edge lists', async () => {
  const csv = await run('source,target,label\n"A, one",B,"say ""hi"""\nB,C\n,\nlonely\nX,', { fileName: 'e.csv' });
  assert.match(csv.code, /^edge A_one -> B "say 'hi'"$/m);
  const tsv = await run('A\tB\tx\nB\tC\n', { fileName: 'x.tsv' });
  assert.match(tsv.code, /^edge A -> B "x"$/m);
  const semi = await run('from;to\nA;B', { fileName: 'x.csv' });
  assert.match(semi.code, /edge A -> B/);
  assert.equal(delimiterOf('abc'), ',');
  assert.deepEqual(splitRow('a,"b,c"', ','), ['a', 'b,c']);
});

test('sniffing finds the format by content and by name', () => {
  const cases = [
    ['<mxfile/>', '', 'drawio'],
    ['<svg/>', '', 'svg'],
    ['<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"/>', '', 'bpmn'],
    ['<XMI/>', '', 'xmi'],
    ['<graphml/>', '', 'graphml'],
    ['<gexf/>', '', 'gexf'],
    ['<PageContents/>', '', 'visio'],
    ['digraph G {\n}', '', 'dot'],
    ['  {"a":1}', '', 'json'],
    ['graph TD\n A-->B', 'a.dot', 'code'],
    ['@startuml\n@enduml', '', 'code'],
    ['diagram graph', '', 'code'],
    ['x', 'a.GV', 'dot'],
    ['x', 'a.md', 'markdown'],
    ['a,b\nc,d', '', 'csv'],
    ['hello world', 'a.bin', 'unknown'],
    ['a,b,c,d\n1,2,3,4', '', 'unknown'],
    ['a b\nc d', '', 'unknown'],
    ['a,b\nc', '', 'unknown'],
  ];
  for (const [text, name, expected] of cases) assert.equal(sniffFormat(text, name), expected, `${text} ${name}`);
  assert.equal(sniffFormat('x'), 'unknown');
});

test('unknown and empty results are reported, not guessed', async () => {
  assert.deepEqual(await run('hello', { format: 'what' }), { ok: false, reason: 'unknown', warnings: [] });
  assert.equal((await run('﻿{"nodes":[{"id":1}],"edges":[]}')).ok, true);
  assert.equal((await run(undefined)).ok, false);
  assert.equal(emitModel({ nodes: new Map(), edges: [], warnings: [], hint: null }, 'ru').reason, 'no-structure');
  const many = { nodes: new Map(Array.from({ length: 2000 }, (_, n) => [n, { id: n, label: '' }])), edges: [], warnings: [], hint: null };
  assert.match(emitModel(many, 'en').warnings[0], /Too many/);
  const same = await run(JSON.stringify({ nodes: [{ id: 'a b' }, { id: 'a_b' }, { id: '--' }, { id: 'é' }], edges: [] }));
  assert.match(same.code, /vertex a_b_2/);
});

test('RT-03: a decompression bomb is refused with a clear message, a normal file still unpacks', async () => {
  const bomb = deflateRawSync(Buffer.alloc(9 * 1024 * 1024));
  assert.ok(bomb.length < 100000);
  await assert.rejects(inflateRaw(bomb), { code: 'inflate-limit' });
  assert.equal((await inflateRaw(deflateRawSync(Buffer.from('abc')))).length, 3);
  assert.equal((await inflateRaw(deflateRawSync(Buffer.alloc(5000, 1)), 10000)).length, 5000);
  await assert.rejects(inflateRaw(deflateRawSync(Buffer.alloc(5000, 1)), 100), { code: 'inflate-limit' });
  const packed = bomb.toString('base64');
  const ru = await run(`<mxfile><diagram>${packed}</diagram></mxfile>`, { inflate: inflateRaw });
  assert.equal(ru.ok, false);
  const en = await run(`<mxfile><diagram>${packed}</diagram></mxfile>`, { inflate: inflateRaw, lang: 'en' });
  assert.equal(en.ok, false);
  const refuse = async () => {
    throw Object.assign(new Error('x'), { code: 'inflate-limit' });
  };
  const svg = await run(`<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>`, { inflate: refuse });
  assert.equal(typeof svg.ok, 'boolean');
  await assert.rejects(vsdxToXml(zipOf('visio/pages/page1.xml', Buffer.from('<a/>'), 8), refuse), { code: 'inflate-limit' });
});
