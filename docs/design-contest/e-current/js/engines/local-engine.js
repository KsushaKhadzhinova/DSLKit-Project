const PORTS = ['input', 'control', 'output', 'mechanism'];
const BOX_WIDTH = 200;
const COLUMN_GAP = 150;
const ROW_GAP = 32;
const MARGIN = 40;
const TITLE_HEIGHT = 32;
const HEADER_HEIGHT = 44;
const LINE_HEIGHT = 16;

const escapeXml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Longest-path layering: a box sits one column to the right of everything that feeds it; cycles stop at the last column.
const rankBoxes = (boxes, arrows) => {
  const rank = new Map(boxes.map((box) => [box.id, 0]));
  boxes.forEach(() =>
    arrows.forEach(({ from, to }) => {
      if (rank.get(from) + 1 > rank.get(to) && rank.get(from) + 1 < boxes.length) rank.set(to, rank.get(from) + 1);
    }),
  );
  return rank;
};

const boxLines = (box) => PORTS.filter((port) => box.ports[port].length > 0).map((port) => `${port}: ${box.ports[port].join(', ')}`);

// The engine that runs in the browser: it lays the model out itself and returns live SVG text, so nothing is sent to a server.
export const renderLocal = (model) => {
  const arrows = model.arrows.filter(({ from, to }) => model.boxes.some((box) => box.id === from) && model.boxes.some((box) => box.id === to));
  const rank = rankBoxes(model.boxes, arrows);
  const columnTop = new Map();
  const placed = new Map();
  let width = MARGIN * 2 + BOX_WIDTH;
  let height = MARGIN * 2 + TITLE_HEIGHT;

  model.boxes.forEach((box) => {
    const column = rank.get(box.id);
    const lines = boxLines(box);
    const boxHeight = HEADER_HEIGHT + lines.length * LINE_HEIGHT;
    const x = MARGIN + column * (BOX_WIDTH + COLUMN_GAP);
    const y = columnTop.get(column) ?? MARGIN + TITLE_HEIGHT;
    columnTop.set(column, y + boxHeight + ROW_GAP);
    placed.set(box.id, { box, lines, x, y, height: boxHeight });
    width = Math.max(width, x + BOX_WIDTH + MARGIN);
    height = Math.max(height, y + boxHeight + MARGIN);
  });

  const edges = arrows
    .map(({ from, to, fromPort, toPort }, index) => {
      const source = placed.get(from);
      const target = placed.get(to);
      const x1 = source.x + BOX_WIDTH;
      const y1 = source.y + source.height / 2;
      const x2 = target.x;
      const y2 = target.y + target.height / 2;
      const label = [fromPort && `from: ${fromPort}`, toPort && `to: ${toPort}`].filter(Boolean).join(' ');
      const path = `<path class="local-engine__edge" id="edge-${index}" d="M${x1} ${y1} C${x1 + COLUMN_GAP / 2} ${y1} ${x2 - COLUMN_GAP / 2} ${y2} ${x2} ${y2}" fill="none" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)"/>`;
      const text = label
        ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="11" fill="#475569">${escapeXml(label)}</text>`
        : '';
      return path + text;
    })
    .join('');

  const boxes = [...placed.values()]
    .map(({ box, lines, x, y, height: boxHeight }) => {
      const details = lines
        .map((line, row) => `<text x="${x + 12}" y="${y + HEADER_HEIGHT + row * LINE_HEIGHT - 2}" font-size="12" fill="#475569">${escapeXml(line)}</text>`)
        .join('');
      return (
        `<g class="local-engine__box" data-id="${escapeXml(box.id)}"><title>${escapeXml(`${box.id} ${box.name}`)}</title>` +
        `<rect x="${x}" y="${y}" width="${BOX_WIDTH}" height="${boxHeight}" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>` +
        `<text x="${x + 12}" y="${y + 26}" font-size="14" font-weight="700" fill="#0f172a">${escapeXml(`${box.id} ${box.name}`)}</text>${details}</g>`
      );
    })
    .join('');

  const title = model.title ? `<text x="${MARGIN}" y="${MARGIN}" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(model.title)}</text>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">` +
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>${title}${edges}${boxes}</svg>`
  );
};
