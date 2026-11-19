// Sends BROKEN diagrams to /api/ai/generate (mode review) and /api/ai/clarify (questions) of a running server, with a pause for the rate limit.
// Prints a JSON summary: no key is read or printed. Usage: node run-review-clarify.mjs [port] [review|clarify|both]
import { BROKEN } from './broken-diagrams.mjs';
const port = process.argv[2] ?? '5199';
const what = process.argv[3] ?? 'both';
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const post = async (path, body) => {
  for (let tries = 0; tries < 4; tries += 1) {
    const answer = await fetch(`http://localhost:${port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (answer.status !== 429) return { status: answer.status, json: await answer.json() };
    await pause(15000 * (tries + 1));
  }
  return { status: 429, json: {} };
};
const rows = [];
for (const [name, code] of BROKEN) {
  const row = { name };
  if (what !== 'clarify') {
    const { status, json } = await post('/api/ai/generate', { mode: 'review', text: code, lang: 'en' });
    const ai = (json.variants ?? []).filter((v) => v.source === 'ai');
    Object.assign(row, { reviewStatus: status, reviewAi: json.ai, aiError: json.aiError ?? null, rulesVariants: (json.variants ?? []).length - ai.length, aiVariants: ai.length, aiErrors: ai.map((v) => v.errors) });
    if (process.env.SHOWCODE) row.aiCode = ai.map((v) => v.code);
    await pause(11000);
  }
  if (what !== 'review') {
    const { status, json } = await post('/api/ai/clarify', { step: 'questions', code, lang: 'en' });
    const extra = (json.questions ?? []).filter((q) => String(q.id).startsWith('ai-'));
    Object.assign(row, { clarifyStatus: status, clarifySource: json.source, rulesQuestions: (json.questions ?? []).length - extra.length, aiQuestions: extra.map((q) => `${q.kind}: ${q.text?.en}`) });
    await pause(11000);
  }
  rows.push(row);
  console.log(JSON.stringify(row));
}
