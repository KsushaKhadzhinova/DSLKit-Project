// A small expert system: rules "if premises then conclusion" with certainty factors (the MYCIN scheme), forward chaining,
// questions about missing facts and a trace that answers "why is this the conclusion".
// A fact is { value, cf }: cf is from -1 (surely false) to 1 (surely true). A rule fires when every premise holds with cf above the threshold.
export const THRESHOLD = 0.2;
const OPS = {
  '=': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
};

const round = (value) => Math.round(value * 1000) / 1000;

// The combination of two certainty factors that support the same fact. It does not depend on the order.
export const combineCf = (a, b) => {
  if (a >= 0 && b >= 0) return round(a + b * (1 - a));
  if (a <= 0 && b <= 0) return round(a + b * (1 + a));
  return round((a + b) / (1 - Math.min(Math.abs(a), Math.abs(b))));
};

// A premise is { fact, op?, value? }; the default is "the fact is true". It gives the certainty of the fact when it holds, 0 when it does not.
export const premiseCf = (premise, facts) => {
  const known = facts.get(premise.fact);
  if (known === undefined) return 0;
  const test = OPS[premise.op ?? '='];
  return test(known.value, premise.value ?? true) ? Math.abs(known.cf) : 0;
};

export const createFacts = (initial = {}) =>
  new Map(Object.entries(initial).map(([name, item]) => [name, typeof item === 'object' && item !== null ? { cf: 1, ...item } : { value: item, cf: 1 }]));

// The depth of a rule: the rules that conclude its premises come first, so a fact is final before any rule uses it.
const depths = (rules) => {
  const makers = new Map();
  rules.forEach((rule) => makers.set(rule.then.fact, [...(makers.get(rule.then.fact) ?? []), rule]));
  const memo = new Map();
  const depthOf = (rule, path) => {
    if (memo.has(rule.id)) return memo.get(rule.id);
    if (path.has(rule.id)) return 0;
    const inner = new Set(path).add(rule.id);
    const below = rule.if.flatMap((premise) => makers.get(premise.fact) ?? []).filter((maker) => maker.id !== rule.id);
    const depth = below.length === 0 ? 0 : 1 + Math.max(...below.map((maker) => depthOf(maker, inner)));
    memo.set(rule.id, depth);
    return depth;
  };
  return rules.map((rule) => ({ rule, depth: depthOf(rule, new Set()) }));
};

// Runs the rules level by level (see depths), each rule at most once. The result: the facts (with the derived ones) and the trace of every fired rule.
export const infer = (rules, initial) => {
  const facts = initial instanceof Map ? new Map(initial) : createFacts(initial);
  const trace = [];
  const ordered = depths(rules).sort((a, b) => a.depth - b.depth);
  ordered.forEach(({ rule }) => {
    const premises = rule.if.map((premise) => ({ ...premise, cf: premiseCf(premise, facts), actual: facts.get(premise.fact)?.value }));
    if (premises.some((premise) => premise.cf < THRESHOLD)) return;
    const cf = round(Math.min(...premises.map((premise) => premise.cf)) * rule.then.cf);
    const before = facts.get(rule.then.fact);
    const merged = before === undefined ? cf : combineCf(before.cf, cf);
    facts.set(rule.then.fact, { value: rule.then.value ?? true, cf: merged, derived: true });
    trace.push({ rule: rule.id, premises, cf, fact: rule.then.fact, result: merged });
  });
  return { facts, trace };
};

// The facts that end with a value above the threshold and begin with the prefix, the strongest first.
export const conclusions = (facts, prefix) =>
  [...facts]
    .filter(([name, item]) => name.startsWith(prefix) && item.derived && item.cf >= THRESHOLD)
    .map(([name, item]) => ({ fact: name, cf: item.cf }))
    .sort((a, b) => b.cf - a.cf || a.fact.localeCompare(b.fact));

// The first question whose fact is unknown, whose condition holds and which some rule that has not fired could use.
export const nextQuestion = (kb, facts, trace) => {
  const fired = new Set(trace.map((step) => step.rule));
  const useful = new Set(kb.rules.filter((rule) => !fired.has(rule.id)).flatMap((rule) => rule.if.map((premise) => premise.fact)));
  return (
    kb.questions.find((question) => {
      const names = question.options ? question.options.map((option) => `${question.fact}:${option.id}`) : [question.fact];
      if (names.some((name) => facts.has(name))) return false;
      if (question.when && premiseCf(question.when, facts) < THRESHOLD) return false;
      return names.some((name) => useful.has(name));
    }) ?? null
  );
};

// Puts the answer of a question into the facts: a yes/no question gives one fact, a choice gives the fact of the chosen option (the others are false).
export const answerQuestion = (question, facts, answer) => {
  const next = new Map(facts);
  if (question.options) question.options.forEach((option) => next.set(`${question.fact}:${option.id}`, { value: option.id === answer, cf: 1 }));
  else next.set(question.fact, { value: answer === true, cf: 1 });
  return next;
};

// The reasons of a fact as a tree: the rules that gave it, and for every premise that was derived itself, the reasons of that premise.
export const explain = (trace, fact, seen = new Set()) => {
  if (seen.has(fact)) return [];
  seen.add(fact);
  return trace
    .filter((step) => step.fact === fact)
    .map((step) => ({ ...step, because: step.premises.flatMap((premise) => explain(trace, premise.fact, seen)) }));
};

// Checks a rule that came from outside (a developer edit): the shape, the numbers and the texts. The answer is a list of problems; empty means correct.
export const ruleProblems = (rule) => {
  const problems = [];
  if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) return ['rule'];
  if (typeof rule.id !== 'string' || rule.id === '') problems.push('id');
  if (
    !Array.isArray(rule.if) ||
    rule.if.length === 0 ||
    rule.if.some((premise) => typeof premise?.fact !== 'string' || (premise.op !== undefined && !(premise.op in OPS)))
  )
    problems.push('if');
  if (typeof rule.then?.fact !== 'string' || !(rule.then.cf > -1 && rule.then.cf <= 1) || rule.then.cf === 0) problems.push('then');
  if (typeof rule.reason?.ru !== 'string' || typeof rule.reason?.en !== 'string') problems.push('reason');
  if (rule.priority !== undefined && !['high', 'medium', 'low'].includes(rule.priority)) problems.push('priority');
  if (rule.text !== undefined && (typeof rule.text?.ru !== 'string' || typeof rule.text?.en !== 'string')) problems.push('text');
  return problems;
};
