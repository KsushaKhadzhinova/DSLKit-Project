// Fake OpenAI-compatible server for the UX audit. Never uses a real key. Port from argv[2].
// Modes by file ../logs/fake-mode.txt: ok (default) | slow | error | garbage
import http from 'node:http';
import fs from 'node:fs';

const port = Number(process.argv[2] || 5393);
const modeFile = new URL('../logs/fake-mode.txt', import.meta.url);
const CODE = 'diagram bpmn "Order"\nstart s "Start"\ntask a "Check order"\nend e "Done"\ns -> a\na -> e';
const mode = () => {
  try {
    return fs.readFileSync(modeFile, 'utf8').trim();
  } catch {
    return 'ok';
  }
};
http
  .createServer((req, res) => {
    let b = '';
    req.on('data', (d) => (b += d));
    req.on('end', async () => {
      const m = mode();
      if (m === 'slow') await new Promise((r) => setTimeout(r, 6000));
      if (m === 'error') {
        res.writeHead(500);
        return res.end('boom');
      }
      let sys = '';
      try {
        sys = JSON.parse(b).messages[0].content;
      } catch {
        /* ignore */
      }
      let text = CODE;
      if (m === 'garbage') text = 'I am sorry, I cannot do that.';
      else if (/You review diagrams/.test(sys)) text = JSON.stringify({ variants: [{ title: 'Fixed', code: CODE, changes: ['added start and end'] }] });
      else if (/JSON array/.test(b)) text = JSON.stringify([{ id: 'q1', question: 'Who approves the order?', why: 'Missing actor' }]);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text } }] }));
    });
  })
  .listen(port, () => console.log('fake ai on', port));
