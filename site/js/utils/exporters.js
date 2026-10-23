const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const DEFAULT_SIZE = { width: 800, height: 600 };

const escapeXml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A readable file name from the title of the diagram: letters and digits of any language, parts joined by a hyphen.
export const fileName = (title, extension) => {
  const base = String(title ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'diagram'}.${extension}`;
};

const positive = (value) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

// The size of the drawing: the view box first, then the width and height attributes, then a default.
export const sizeOf = (svg) => {
  const box = (svg.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) return { width: box[2], height: box[3] };
  return { width: positive(svg.getAttribute('width')) ?? DEFAULT_SIZE.width, height: positive(svg.getAttribute('height')) ?? DEFAULT_SIZE.height };
};

// The text of a stand-alone SVG file: the namespace and a size are always present, so any viewer can open it.
export const serializeSvg = (svg, window) => {
  const copy = svg.cloneNode(true);
  const { width, height } = sizeOf(svg);
  copy.setAttribute('xmlns', SVG_NAMESPACE);
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  if (!copy.getAttribute('viewBox')) copy.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new window.XMLSerializer().serializeToString(copy)}`;
};

// PNG or JPEG: the SVG is loaded as an image and drawn on a canvas with a white background (JPEG has no transparency).
export const rasterize = async ({ svg, window, type = 'image/png', scale = 2, background = '#ffffff' }) => {
  const { width, height } = sizeOf(svg);
  const image = new window.Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('The drawing could not be converted to an image.'));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeSvg(svg, window))}`;
  await loaded;
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The canvas gave no image.'))), type, 0.92));
};

const toBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return btoa(binary);
};

// A diagrams.net (draw.io) file: the drawing is placed on the page as one SVG image that can be moved, scaled and annotated.
export const drawioFile = ({ title, svgText, width, height }) => {
  const style = `shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=data:image/svg+xml,${toBase64(svgText)};`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mxfile host="DSLKit">',
    `<diagram id="dslkit-1" name="${escapeXml(title || 'Diagram')}">`,
    `<mxGraphModel dx="${Math.round(width + 80)}" dy="${Math.round(height + 80)}" grid="1" gridSize="10" guides="1" page="1" pageWidth="${Math.round(width + 80)}" pageHeight="${Math.round(height + 80)}">`,
    '<root><mxCell id="0"/><mxCell id="1" parent="0"/>',
    `<mxCell id="2" value="" style="${escapeXml(style)}" vertex="1" parent="1"><mxGeometry x="40" y="40" width="${Math.round(width)}" height="${Math.round(height)}" as="geometry"/></mxCell>`,
    '</root></mxGraphModel></diagram></mxfile>',
  ].join('\n');
};

// One HTML file with everything inside: the drawing, the code and a little style. It opens without a network and without scripts.
export const htmlFile = ({ title, svgText, source, lang = 'ru' }) => {
  const heading = escapeXml(title || 'DSLKit');
  const inline = svgText.replace(/^<\?xml[^>]*\?>\s*/, '');
  const codeTitle = lang === 'en' ? 'Diagram code' : 'Код диаграммы';
  return `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'ru'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading}</title>
<style>
body{margin:0;padding:24px 16px;font:16px/1.5 system-ui,sans-serif;color:#1c1f2e;background:#f8f9fc}
main{max-width:1000px;margin:0 auto}
h1{font-size:1.4rem;margin:0 0 16px}
figure{margin:0;padding:16px;background:#fff;border:1px solid #dde1e9;border-radius:12px;overflow:auto}
figure svg{max-width:100%;height:auto}
h2{font-size:1.1rem;margin:24px 0 8px}
pre{margin:0;padding:16px;background:#fff;border:1px solid #dde1e9;border-radius:12px;overflow:auto;font:14px/1.6 ui-monospace,Consolas,monospace}
</style>
</head>
<body>
<main>
<h1>${heading}</h1>
<figure>${inline}</figure>
<h2>${codeTitle}</h2>
<pre>${escapeXml(source)}</pre>
</main>
</body>
</html>
`;
};
