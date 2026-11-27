// Label comparison for the harness. It is written on its own and does not use the product code, so a change of the product cannot move the measure.
const STOP = new Set([
  ...['the', 'a', 'an', 'of', 'to', 'is', 'are', 'be', 'and', 'or', 'in', 'on', 'for', 'by', 'with', 'it', 'its', 'that', 'this'],
  ...['и', 'в', 'на', 'с', 'по', 'к', 'о', 'об', 'для', 'из', 'от', 'до', 'за', 'что', 'это', 'этот', 'эта', 'не', 'ли'],
]);
const RU_TAIL =
  /(?:ами|ями|ого|его|ому|ему|ыми|ими|ов|ев|ей|ой|ом|ем|ам|ям|ах|ях|ая|яя|ую|юю|ый|ий|ое|ее|ые|ие|ет|ёт|ит|ют|ут|ат|ят|ать|ять|ить|ся|сь|а|я|у|ю|е|ы|и|о|ь|й)$/;
const EN_TAIL = /(?:ing|ed|es|s)$/;

// A light stem: enough to treat "заказ", "заказа" and "заказы" (or "order" and "orders") as one word.
export const stem = (word) => {
  const low = word.toLowerCase().replace(/ё/g, 'е');
  const cut = /[а-я]/.test(low) ? low.replace(RU_TAIL, '') : low.replace(EN_TAIL, '');
  return cut.length >= 3 ? cut : low;
};

export const tokens = (label) =>
  String(label)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '' && !STOP.has(word))
    .map(stem);

// The share of common stems (Jaccard): 1 for the same words, 0 for no common word.
export const similarity = (a, b) => {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (left.size === 0 && right.size === 0) return String(a).trim().toLowerCase() === String(b).trim().toLowerCase() ? 1 : 0;
  const common = [...left].filter((word) => right.has(word)).length;
  return common / (left.size + right.size - common);
};
