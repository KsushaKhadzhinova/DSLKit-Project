import { luminance } from './contrast.js';

// A colour of a block is written in the code as #rgb or #rrggbb and nothing else: no names, no functions, no spaces.
// Everything that reaches a drawing, a style or a file goes through isColor first.
const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isColor = (value) => typeof value === 'string' && COLOR.test(value);

// The six-digit lower-case form of a valid colour, so equal colours are written equally.
export const normalizeColor = (value) => {
  const hex = value.slice(1).toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex}`;
};

// Black or white text, whichever reads better on the colour; either gives a contrast of at least 4.5 to 1 on any background.
export const inkOn = (color) => (luminance(normalizeColor(color)) > 0.179 ? '#000000' : '#ffffff');
