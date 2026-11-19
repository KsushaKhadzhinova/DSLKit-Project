// Small helpers of the auth modules: hex text, random bytes and the comparison of secrets.
export const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export const HEX = /^(?:[0-9a-f]{2})+$/;

export const fromHex = (hex) => Uint8Array.from(hex.match(/../g), (pair) => Number.parseInt(pair, 16));

export const randomHex = (crypto, bytes) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

// Equal length strings are compared to the end, whatever the first difference is.
export const same = (first, second) => {
  let diff = first.length ^ second.length;
  for (let index = 0; index < first.length && index < second.length; index += 1) {
    diff |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return diff === 0;
};
