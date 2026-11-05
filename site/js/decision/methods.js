// Decision support: the weighted sum, the analytic hierarchy process (AHP) with the consistency ratio, TOPSIS, and the sensitivity of the winner to the weights.
// A problem is { criteria: [{ name, weight, direction: 'max' | 'min' }], alternatives: [{ name, scores: [number per criterion] }] }.
export const METHODS = ['wsm', 'ahp', 'topsis'];
// The random index of Saaty for matrices of order 1..10.
const RANDOM_INDEX = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
export const CR_LIMIT = 0.1;
// The scale of Saaty: 1 equal, 3 moderate, 5 strong, 7 very strong, 9 extreme; the even numbers lie between, the inverse means "less important".
export const SAATY_SCALE = [1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const round = (value, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;
const sum = (list) => list.reduce((total, value) => total + value, 0);
const column = (problem, index) => problem.alternatives.map((alternative) => alternative.scores[index]);

export const normalizeWeights = (weights) => {
  const total = sum(weights);
  return total > 0 ? weights.map((weight) => weight / total) : weights.map(() => 1 / weights.length);
};

// Checks the shape of a problem; the answer is a list of problem codes, empty when the problem can be solved.
export const problemErrors = (problem) => {
  const errors = [];
  if (!Array.isArray(problem?.criteria) || problem.criteria.length < 1) errors.push('criteria');
  if (!Array.isArray(problem?.alternatives) || problem.alternatives.length < 2) errors.push('alternatives');
  if (errors.length > 0) return errors;
  if (problem.criteria.some((criterion) => !(criterion.weight >= 0) || !['max', 'min'].includes(criterion.direction))) errors.push('criterion');
  if (
    problem.alternatives.some(
      (alternative) => alternative.scores.length !== problem.criteria.length || alternative.scores.some((score) => !Number.isFinite(score)),
    )
  )
    errors.push('scores');
  if (!problem.criteria.some((criterion) => criterion.weight > 0)) errors.push('weights');
  return errors;
};

// The weighted sum on scores scaled to 0..1 (the best value of a criterion gets 1, the worst 0).
export const weightedSum = (problem, weights = problem.criteria.map((criterion) => criterion.weight)) => {
  const w = normalizeWeights(weights);
  const scaled = problem.criteria.map((criterion, index) => {
    const values = column(problem, index);
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    return values.map((value) => (hi === lo ? 1 : criterion.direction === 'max' ? (value - lo) / (hi - lo) : (hi - value) / (hi - lo)));
  });
  return problem.alternatives.map((_, row) => round(sum(w.map((weight, index) => weight * scaled[index][row]))));
};

// TOPSIS: the closeness of every alternative to the ideal one (1) and its distance from the worst one (0).
export const topsis = (problem, weights = problem.criteria.map((criterion) => criterion.weight)) => {
  const w = normalizeWeights(weights);
  const weighted = problem.criteria.map((_, index) => {
    const values = column(problem, index);
    const length = Math.sqrt(sum(values.map((value) => value * value))) || 1;
    return values.map((value) => (value / length) * w[index]);
  });
  const best = weighted.map((values, index) => (problem.criteria[index].direction === 'max' ? Math.max(...values) : Math.min(...values)));
  const worst = weighted.map((values, index) => (problem.criteria[index].direction === 'max' ? Math.min(...values) : Math.max(...values)));
  return problem.alternatives.map((_, row) => {
    const near = Math.sqrt(sum(weighted.map((values, index) => (values[row] - best[index]) ** 2)));
    const far = Math.sqrt(sum(weighted.map((values, index) => (values[row] - worst[index]) ** 2)));
    return round(near + far === 0 ? 1 : far / (near + far));
  });
};

// The priorities of a matrix of pairwise comparisons by the power method (the principal eigenvector), with the consistency of the judgements.
export const ahpPriorities = (matrix) => {
  const n = matrix.length;
  let vector = new Array(n).fill(1 / n);
  for (let step = 0; step < 200; step += 1) {
    const product = matrix.map((row) => sum(row.map((value, index) => value * vector[index])));
    const total = sum(product);
    const next = product.map((value) => value / total);
    const moved = Math.max(...next.map((value, index) => Math.abs(value - vector[index])));
    vector = next;
    if (moved < 1e-12) break;
  }
  const lambda = sum(matrix.map((row, index) => sum(row.map((value, k) => value * vector[k])) / vector[index])) / n;
  const ci = n > 2 ? (lambda - n) / (n - 1) : 0;
  const ri = RANDOM_INDEX[Math.min(n, RANDOM_INDEX.length) - 1];
  const cr = n > 2 ? Math.max(0, ci) / ri : 0;
  return { priorities: vector.map((value) => round(value)), lambda: round(lambda), ci: round(Math.max(0, ci)), cr: round(cr), consistent: cr <= CR_LIMIT };
};

// A matrix of comparisons that is perfectly consistent, built from weights: a(i,j) = w(i) / w(j). Used to start a table with a sensible guess.
export const matrixFromWeights = (weights) => weights.map((a) => weights.map((b) => round(a / b, 3)));

// Makes a matrix reciprocal from its upper triangle: the diagonal is 1, a(j,i) = 1 / a(i,j).
export const reciprocal = (matrix) => matrix.map((row, i) => row.map((value, j) => (i === j ? 1 : i < j ? value : 1 / matrix[j][i])));

// AHP over the problem: the weights of the criteria come from the matrix of comparisons; the alternatives are compared by their scores as ratios
// (the share of the sum; for a criterion where less is better, the share of the inverse values).
export const ahp = (problem, matrix) => {
  const criteria = ahpPriorities(matrix);
  const local = problem.criteria.map((criterion, index) => {
    const values = column(problem, index).map((value) => (criterion.direction === 'max' ? Math.max(value, 1e-9) : 1 / Math.max(value, 1e-9)));
    const total = sum(values);
    return values.map((value) => value / total);
  });
  const scores = problem.alternatives.map((_, row) => round(sum(criteria.priorities.map((weight, index) => weight * local[index][row]))));
  return {
    scores,
    weights: criteria.priorities,
    lambda: criteria.lambda,
    ci: criteria.ci,
    cr: criteria.cr,
    consistent: criteria.consistent,
    warning: !criteria.consistent,
  };
};

// The ranking of alternatives by score, the best first; equal scores keep the order of the table.
export const rank = (problem, scores) =>
  problem.alternatives
    .map((alternative, index) => ({ index, name: alternative.name, score: scores[index] }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item, place) => ({ ...item, place: place + 1 }));

// Solves a problem by a method. The matrix is needed by AHP only; without it the criteria are compared by their weights.
export const solve = (problem, method = 'wsm', matrix = matrixFromWeights(normalizeWeights(problem.criteria.map((criterion) => criterion.weight || 1e-6)))) => {
  const errors = problemErrors(problem);
  if (errors.length > 0) return { ok: false, errors };
  const weights = normalizeWeights(problem.criteria.map((criterion) => criterion.weight));
  if (method === 'ahp') {
    const result = ahp(problem, matrix);
    return { ok: true, method, ...result, ranking: rank(problem, result.scores) };
  }
  const scores = method === 'topsis' ? topsis(problem) : weightedSum(problem);
  return { ok: true, method, scores, weights: weights.map((weight) => round(weight)), ranking: rank(problem, scores) };
};

// How the winner changes when the weight of one criterion goes from 0 to 1 and the other weights keep their proportions.
export const sensitivity = (problem, method = 'wsm', steps = 10) => {
  const base = normalizeWeights(problem.criteria.map((criterion) => criterion.weight));
  const score = (weights) => (method === 'topsis' ? topsis(problem, weights) : weightedSum(problem, weights));
  const winner = (weights) => rank(problem, score(weights))[0].name;
  return problem.criteria.map((criterion, index) => {
    const others = sum(base) - base[index];
    const points = Array.from({ length: steps + 1 }, (_, step) => {
      const share = step / steps;
      const weights = base.map((value, k) => (k === index ? share : others > 0 ? (value / others) * (1 - share) : (1 - share) / (base.length - 1)));
      return { weight: round(share, 2), winner: winner(weights) };
    });
    const changes = points.filter((point, at) => at > 0 && point.winner !== points[at - 1].winner).map((point) => point.weight);
    return { criterion: criterion.name, points, changes, stable: changes.length === 0 };
  });
};

// A short explanation of the result: the winner, the margin and the criteria that gave the winner the most.
export const explainResult = (problem, result, lang = 'ru') => {
  const [first, second] = result.ranking;
  const leads = (criterion, index) => {
    const values = column(problem, index);
    return problem.alternatives[first.index].scores[index] === (criterion.direction === 'max' ? Math.max(...values) : Math.min(...values));
  };
  const strong = problem.criteria
    .map((criterion, index) => ({ name: criterion.name, share: leads(criterion, index) ? result.weights[index] : 0 }))
    .filter((item) => item.share > 0)
    .sort((a, b) => b.share - a.share)
    .slice(0, 2)
    .map((item) => item.name);
  const margin = round((first.score - second.score) * 100, 1);
  const names = strong.join(', ');
  if (lang === 'en')
    return `The best alternative is "${first.name}" (${round(first.score * 100, 1)} %), ahead of "${second.name}" by ${margin} points.${names ? ` It leads in: ${names}.` : ''}`;
  return `Лучшая альтернатива — «${first.name}» (${round(first.score * 100, 1)} %), впереди «${second.name}» на ${margin} п.п.${names ? ` Лидирует по критериям: ${names}.` : ''}`;
};
