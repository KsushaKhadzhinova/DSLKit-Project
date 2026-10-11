export const pickQuestions = (variant, total) =>
  [...new Set([variant - 1, variant, variant + 1].map((n) => ((((n - 1) % total) + total) % total) + 1))].sort((a, b) => a - b);

export const variantOf = (read) => JSON.parse(read('variant.json')).variant;
