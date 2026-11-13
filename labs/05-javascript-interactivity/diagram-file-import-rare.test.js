import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emitModel, importDiagramFile } from '../../site/js/utils/diagram-file-import.js';

const run = async (text, options) => importDiagramFile(text, options);

test('rare shapes of the inputs are read without a crash', async () => {
  const node = (id, kind) => [id, { id, label: '', kind }];
  const mid = emitModel(
    {
      hint: null,
      title: '',
      warnings: [],
      edges: [
        { from: 'a', to: 'b', label: '', directed: true },
        { from: 'b', to: 'c', label: '', directed: true },
      ],
      nodes: new Map([node('a', 'terminal'), node('b', 'terminal'), node('c', 'terminal')]),
    },
    'en',
  );
  assert.match(mid.code, /^process b$/m);
  assert.equal(
    (
      await run(
        '<mxGraphModel><root><object id="v" value="V"><mxCell vertex="1" parent="1"/></object><object id="w"><mxCell vertex="1" parent="1"/></object></root></mxGraphModel>',
      )
    ).ok,
    true,
  );
  assert.equal((await run('<mxfile/>')).reason, 'no-structure');
  const cy = await run(
    JSON.stringify({ elements: { nodes: [{ data: { id: 'p' }, position: { x: 3, y: 4 } }], edges: [{ data: { source: { key: 'p' }, target: 'p' } }] } }),
  );
  assert.match(cy.code, /edge p -> p/);
  assert.equal((await run(JSON.stringify({ nodes: [null, { id: 'x' }], edges: [null] }))).ok, true);
  assert.equal((await run(JSON.stringify({ pages: [{ shapes: [{ id: 's' }] }] }))).ok, true);
  const bounds = await run(
    '<bpmn:definitions xmlns:bpmn="x"><bpmn:startEvent id="a"/><bpmndi:BPMNShape bpmnElement="a"><dc:Bounds x="1" y="2"/></bpmndi:BPMNShape></bpmn:definitions>',
    { format: 'bpmn' },
  );
  assert.match(bounds.code, /^start a pos=100x100$/m);
  const named = await run(
    '<xmi:XMI xmlns:xmi="x"><packagedElement xmi:type="uml:Class" xmi:id="a" name="&lt;i&gt;&lt;/i&gt;"><ownedAttribute association="r" type="a"/></packagedElement></xmi:XMI>',
  );
  assert.match(named.code, /^C --> C$/m);
  assert.equal((await run('<graphml><key id="k"/><graph><node id="1"/></graph></graphml>')).ok, true);
  const page =
    '<PageContents><Shapes><Shape ID="1"><Cell N="PinX">5</Cell><Cell N="PinY" V="1"/><Text>A</Text></Shape><Shape ID="2"/><Shape ID="3"/></Shapes><Connects><Connect FromSheet="3" ToSheet="1"/><Connect FromSheet="3" ToSheet="2" FromCell="EndX"/></Connects></PageContents>';
  assert.equal((await run(page)).ok, true);
  assert.equal((await run('', { fileName: 'a.csv' })).reason, 'no-structure');
  assert.equal((await run('digraph { a [x= ', { format: 'dot' })).ok, true);
});
