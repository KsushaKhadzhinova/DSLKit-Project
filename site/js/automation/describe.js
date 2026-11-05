// A simplified reading of a description in Russian or English by rules (not a neural network): steps, conditions, loops, actors with messages,
// entities with attributes and relations. The result feeds the builders of site/js/automation/builders.js.
export const detectLang = (text) => (/[а-яё]/i.test(text) ? 'ru' : 'en');

const MARKER = /^\s*(?:\d+[.)]|[-*•–—])\s+/;
const LEAD = {
  ru: /^(?:сначала|затем|потом|далее|после этого|после чего|в конце концов|в конце|наконец|и наконец|также|и)(?=[\s,:-]|$)[\s,:-]*/i,
  en: /^(?:first(?:ly)?|then|next|after that|afterwards|finally|at the end|lastly|and then|and)(?=[\s,:-]|$)[\s,:-]*/i,
};
const SPLIT = /\s*[,;]?\s+(?:а\s+)?(?:затем|потом|после этого|после чего|then|after that|and then)\s+/i;
const SEQUENCE_WORDS = /(^|\s)(сначала|затем|потом|далее|после этого|в конце|наконец|first|then|next|after that|finally|at the end)(?=[\s,:]|$)/i;
const CONDITION_START = /^(?:а\s+)?(?:if|если)(?=\s)/i;
const MAX_LABEL = 60;

export const cleanLabel = (text) => {
  const flat = String(text)
    .replace(/["\\]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.!?-]+|[\s,;:.!?-]+$/g, '');
  const cut = flat.length > MAX_LABEL ? flat.slice(0, MAX_LABEL).replace(/\s+\S*$/, '') : flat;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
};
const asQuestion = (text) => `${cleanLabel(text)}?`;

// The items of a description: lines, list markers removed, sentences and "then" parts split.
export const splitItems = (text, lang = detectLang(text)) =>
  String(text)
    .split(/\r?\n/)
    .map((line) => line.replace(MARKER, ''))
    .flatMap((line) => line.split(/(?<=[.!?;])\s+/))
    .flatMap((sentence) => (CONDITION_START.test(sentence) ? [sentence] : sentence.split(SPLIT)))
    .map((item) =>
      item
        .trim()
        .replace(LEAD[lang], '')
        .replace(/[.!;]+$/, '')
        .trim(),
    )
    .filter((item) => item !== '');

const CONDITIONS = {
  ru: [/^(?:а\s+)?если\s+(.+?),?\s+то\s+(.+?)(?:\s*[,;]?\s*иначе\s+(.+))?$/i, /^(?:а\s+)?если\s+(.+?),\s*(.+?)(?:\s*[,;]?\s*иначе\s+(.+))?$/i],
  en: [/^if\s+(.+?),?\s+then\s+(.+?)(?:\s*,?\s*(?:else|otherwise)\s+(.+))?$/i, /^if\s+(.+?),\s*(.+?)(?:\s*,?\s*(?:else|otherwise)\s+(.+))?$/i],
};
const LOOPS = {
  ru: [
    { re: /^(?:повторять|повторяй)\s+(.+?)\s+пока\s+(.+)$/i, body: 1, cond: 2 },
    { re: /^пока\s+(.+?),\s*(.+)$/i, body: 2, cond: 1 },
  ],
  en: [
    { re: /^repeat\s+(.+?)\s+while\s+(.+)$/i, body: 1, cond: 2 },
    { re: /^while\s+(.+?),?\s+(?:do\s+)?(.+)$/i, body: 2, cond: 1 },
  ],
};
const ELSE = { ru: /^(?:иначе|в противном случае)(?=[\s,:-]|$)[\s,:-]*(.*)$/i, en: /^(?:otherwise|else)(?=[\s,:-]|$)[\s,:-]*(.*)$/i };

// Steps, decisions and loops, in the order of the text.
export const parseSteps = (items, lang) => {
  const steps = [];
  items.forEach((item) => {
    const other = item.match(ELSE[lang]);
    const last = steps.at(-1);
    if (other && last?.type === 'decision' && last.no === null) {
      if (other[1] !== '') last.no = cleanLabel(other[1]);
      return;
    }
    const loop = LOOPS[lang].map((entry) => ({ entry, found: item.match(entry.re) })).find((candidate) => candidate.found);
    if (loop) return steps.push({ type: 'loop', cond: asQuestion(loop.found[loop.entry.cond]), body: cleanLabel(loop.found[loop.entry.body]) });
    const condition = CONDITIONS[lang].map((re) => item.match(re)).find(Boolean);
    if (condition)
      return steps.push({
        type: 'decision',
        cond: asQuestion(condition[1]),
        yes: cleanLabel(condition[2]),
        no: condition[3] ? cleanLabel(condition[3]) : null,
      });
    return steps.push({ type: 'step', text: cleanLabel(item) });
  });
  return steps;
};

// ----- words: a light stem for matching a noun in different cases
const RU_ENDINGS = [
  'ами',
  'ями',
  'ов',
  'ев',
  'ей',
  'ой',
  'ом',
  'ем',
  'ам',
  'ям',
  'ах',
  'ях',
  'ая',
  'яя',
  'ую',
  'юю',
  'ый',
  'ий',
  'ое',
  'ее',
  'ые',
  'ие',
  'а',
  'я',
  'у',
  'ю',
  'е',
  'ы',
  'и',
  'о',
  'ь',
  'й',
];
const stemWord = (word) => {
  const low = word.toLowerCase().replace(/ё/g, 'е');
  if (/[а-я]/.test(low)) {
    const ending = RU_ENDINGS.find((suffix) => low.endsWith(suffix) && low.length - suffix.length >= 3);
    return ending ? low.slice(0, -ending.length) : low;
  }
  return low
    .replace(/ies$/, 'y')
    .replace(/(?:es|s)$/, '')
    .replace(/e$/, '');
};
const stemOf = (phrase) => phrase.trim().split(/\s+/).map(stemWord).join(' ');

// The base forms of words that often name entities and actors, so that "заказов" and "заказ" become one entity.
const LEMMAS = {
  ru: 'клиент заказ товар позиция пользователь курс студент книга автор сотрудник отдел проект задача счёт платёж оплата покупатель продавец категория статья комментарий сообщение билет сеанс фильм врач пациент приём преподаватель группа предмет оценка адрес поставщик склад заявка договор база хранилище архив журнал система сервер банк магазин оператор менеджер администратор курьер директор'.split(
    ' ',
  ),
  en: 'customer order product item user course student book author employee department project task invoice payment buyer seller category article comment message ticket session movie doctor patient appointment teacher group subject grade address supplier warehouse request contract database storage archive system server bank shop operator manager administrator courier director'.split(
    ' ',
  ),
};
const LEMMA_BY_STEM = Object.fromEntries(Object.entries(LEMMAS).flatMap(([, list]) => list.map((lemma) => [stemWord(lemma), lemma])));
const capital = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// A name for an entity or an actor: the base form when it is known, the word as written otherwise; several words are joined by "_".
export const nameOf = (phrase) => {
  const cleaned = phrase
    .toLowerCase()
    .replace(/^(?:an?|the|each|every|этот|эта|это|каждый|каждая|каждое)\s+/, '')
    .replace(/["\\]/g, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const named = parts.map((part, index) => (index === parts.length - 1 ? (LEMMA_BY_STEM[stemWord(part)] ?? part) : part));
  return named.map((part) => part.replace(/[^\p{L}\p{N}_-]/gu, '')).join('_');
};
export const entityName = (phrase) => capital(nameOf(phrase));

// ----- data: entities, attributes, relations
const MANY = '(?:много|несколько|множество|многие|many|several|multiple|several)';
const ONE = '(?:один|одна|одно|одного|одну|one|a single|a|an)';
const ATTR_TYPES = [
  [/дата|date|time|время/i, 'date'],
  [/сумм|цена|стоим|price|total|amount|cost|sum|salary|зарплат/i, 'decimal'],
  [/^id$|номер|количеств|число|qty|count|number|age|возраст|quantity/i, 'int'],
];
export const attrType = (name) => ATTR_TYPES.find(([re]) => re.test(name))?.[1] ?? 'string';
const attrName = (text) => nameOf(text.replace(/^(?:an?|the)\s+/i, '')).replace(/^_+|_+$/g, '');

const splitList = (text) =>
  text
    .split(/\s*,\s*|\s+(?:и|and)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

const DATA_PATTERNS = {
  ru: {
    list: /^(?:сущности|таблицы|объекты)\s*[:—-]\s*(.+)$/i,
    attrsPlain: /^(\S+(?:\s\S+)?)\s*(?::|\s[—-]\s)\s*(.+)$/,
    attrsParen: /^(.+?)\s*\(([^)]+)\)$/,
    has: /^(?:у|в)\s+(.+?)\s+(?:есть|имеется|хранятся|хранится)\s+(.+)$/i,
    hasVerb: /^(.+?)\s+(?:имеет|имеют|характеризуется)\s+(.+)$/i,
    quant: new RegExp(`^(?:у|в)\\s+(.+?)\\s+(?:есть\\s+)?(${MANY}|${ONE})\\s+(.+)$`, 'i'),
    verb: new RegExp(
      `^(.+?)\\s+(содержит|включает|состоит из|делает|оформляет|создаёт|создает|пишет|заказывает|покупает|принадлежит|относится к|входит в|читает|изучает|посещает|выдаёт|выдает|назначает)\\s+(?:(${MANY}|${ONE})\\s+)?(.+)$`,
      'i',
    ),
    manyToMany: /^(.+?)\s+и\s+(.+?)\s+(?:связаны\s+)?(?:как\s+|связью\s+)?(?:многие ко многим|многие-ко-многим)$/i,
    owned: /^(принадлежит|относится к|входит в)$/,
    structural: /^(?:содержит|включает|состоит из|принадлежит|относится к|входит в)$/,
    many: /(?:изучает|посещает|читает|заказывает|покупает)/,
  },
  en: {
    list: /^(?:entities|tables|objects)\s*[:—-]\s*(.+)$/i,
    attrsPlain: /^(\S+(?:\s\S+)?)\s*(?::|\s[—-]\s)\s*(.+)$/,
    attrsParen: /^(.+?)\s*\(([^)]+)\)$/,
    has: /^(?!)$/,
    hasVerb: /^(.+?)\s+(?:has|have|is described by)\s+(.+)$/i,
    quant: new RegExp(`^(.+?)\\s+(?:has|have|owns?)\\s+(${MANY}|${ONE})\\s+(.+)$`, 'i'),
    verb: new RegExp(
      `^(.+?)\\s+(contains?|includes?|consists of|places?|makes?|creates?|writes?|owns?|belongs to|buys?|enrolls in|takes?|reads?|attends?|issues?|assigns?)\\s+(?:(${MANY}|${ONE})\\s+)?(.+)$`,
      'i',
    ),
    manyToMany: /^(.+?)\s+and\s+(.+?)\s+(?:are\s+)?(?:related\s+)?(?:as\s+|by\s+)?many-to-many$/i,
    owned: /^belongs to$/,
    structural: /^(?:contains?|includes?|consists of|belongs to)$/,
    many: /^(?:buys?|enrolls in|takes?|reads?|attends?)$/,
  },
};
const isMany = (quant) => new RegExp(`^${MANY}$`, 'i').test(quant);

// Entities (name -> { name, attrs }) and relations ({ from, to, card, label }), by the patterns above.
export const parseData = (items, lang) => {
  const p = DATA_PATTERNS[lang];
  const entities = new Map();
  const relations = [];
  const touch = (phrase) => {
    const name = entityName(phrase);
    const key = stemOf(nameOf(phrase));
    if (!entities.has(key)) entities.set(key, { name, attrs: [] });
    return entities.get(key);
  };
  const addAttrs = (entity, text) =>
    splitList(text).forEach((raw) => {
      const attr = attrName(raw);
      if (attr !== '' && !entity.attrs.some((item) => item.name === attr)) entity.attrs.push({ name: attr, type: attrType(attr) });
    });
  const relate = (fromPhrase, toPhrase, card, label) => {
    const from = touch(fromPhrase);
    const to = touch(toPhrase);
    relations.push({ from: from.name, to: to.name, card, label: label.toLowerCase() });
  };
  const known = (phrase) => entities.has(stemOf(nameOf(phrase)));
  const verbs = [];
  let strong = 0;
  items.forEach((item) => {
    let m;
    if ((m = item.match(p.list))) return (strong += 1) && splitList(m[1]).forEach(touch);
    if ((m = item.match(p.manyToMany))) return (strong += 1) && relate(m[1], m[2], 'N:M', lang === 'ru' ? 'связаны' : 'related');
    if ((m = item.match(p.quant)) && isMany(m[2])) return (strong += 1) && verbs.push({ line: 'quant', m });
    if ((m = item.match(p.has) ?? item.match(p.hasVerb))) return (strong += 1) && verbs.push({ line: 'has', m });
    if ((m = item.match(p.verb))) return verbs.push({ line: 'verb', m });
    if ((m = item.match(p.attrsParen) ?? item.match(p.attrsPlain))) return (strong += 1) && addAttrs(touch(m[1]), m[2]);
    return undefined;
  });
  // The second pass: an entity named in a list may be needed before it is used, so the facts are decided when all names are known.
  verbs.forEach(({ line, m }) => {
    if (line === 'quant') return relate(m[1], m[3], '1:N', lang === 'ru' ? 'имеет' : 'has');
    if (line === 'has') {
      const objects = splitList(m[2]);
      const entityLike = objects.length === 1 && known(objects[0]);
      return entityLike ? relate(m[1], objects[0], '1:N', lang === 'ru' ? 'имеет' : 'has') : addAttrs(touch(m[1]), m[2]);
    }
    const [, subject, verb, quant, object] = m;
    const lowVerb = verb.toLowerCase();
    if (p.structural.test(lowVerb)) strong += 1;
    if (p.owned.test(lowVerb)) return relate(object, subject, '1:N', verb);
    const card = quant && isMany(quant) && p.many.test(lowVerb) ? 'N:M' : '1:N';
    return relate(subject, object, card, verb);
  });
  return { entities: [...entities.values()], relations, strong };
};

// ----- actors and messages
const RU_VERB = /^[\p{L}]+(?:ет|ёт|ит|ют|ут|ат|ят|ется|ится|ются)$/u;
const EN_VERBS = new Set(
  'sends checks returns validates saves requests confirms creates notifies charges responds replies calls stores loads approves rejects processes displays shows receives submits logs selects opens reads writes updates deletes verifies forwards asks answers gets issues generates publishes transfers authorizes signs pays enters fills sees clicks ships delivers packs prints'.split(
    ' ',
  ),
);
const REPLY = /^(?:возвращает|отвечает|сообщает|подтверждает|уведомляет|присылает ответ|returns|replies|responds|confirms|notifies|answers)$/i;
const PREPOSITIONS = new Set(['в', 'на', 'к', 'для', 'to', 'from', 'in', 'into', 'with', 'by']);
const TRIMMED = new Set(['the', 'a', 'an', 'в', 'на', 'к', 'для', 'to', 'from', 'in', 'into', 'with', 'by']);
const ARTICLES = new Set(['the', 'a', 'an', 'этот', 'эта', 'это']);
const STORE_WORDS = /^(?:баз|хранилищ|архив|журнал|реестр|каталог|database|db|storage|store|archive|log|registry|catalog)/i;
const EXTERNAL_WORDS =
  /^(?:пользовател|клиент|заказчик|банк|поставщик|покупател|администратор|оператор|курьер|студент|user|customer|client|bank|supplier|buyer|admin|operator|courier|student|visitor|посетител)/i;

export const isStore = (name) => STORE_WORDS.test(name.toLowerCase());
export const isExternal = (name) => EXTERNAL_WORDS.test(name.toLowerCase());

// Messages { from, to, verb, rest, text, kind }: the actor is the words before the verb, the receiver is a known actor named in the rest of the sentence.
export const parseMessages = (items, lang) => {
  const heads = items.map((item) => {
    const tokens = item.split(/\s+/);
    const at = tokens.findIndex(
      (token, index) =>
        index > 0 && (lang === 'ru' ? RU_VERB.test(token) : EN_VERBS.has(token.toLowerCase()) || (/^[a-z]{3,}s$/i.test(token) && !/ss$/i.test(token))),
    );
    if (at < 1) return null;
    const subject = tokens
      .slice(0, at)
      .filter((token) => !ARTICLES.has(token.toLowerCase()))
      .join(' ');
    return subject === '' ? null : { subject: entityName(subject), verb: tokens[at].toLowerCase(), rest: tokens.slice(at + 1).join(' ') };
  });
  const names = [...new Set(heads.filter(Boolean).map((head) => head.subject))];
  const messages = [];
  heads.forEach((head, index) => {
    if (head === null) return;
    const restWords = head.rest.split(/\s+/).filter(Boolean);
    const stemIs = (word, name) => stemWord(name.toLowerCase()) === stemWord(word);
    const at = restWords.findIndex((word) => {
      const bare = word.toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '');
      return (
        names.some((name) => name !== head.subject && stemIs(bare, name)) || isStore(bare) || (isExternal(bare) && !names.some((name) => stemIs(bare, name)))
      );
    });
    const bare = at < 0 ? '' : restWords[at].toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '');
    const reply = REPLY.test(head.verb);
    const previous = messages.at(-1);
    const next = heads.slice(index + 1).find((later) => later !== null && later.subject !== head.subject);
    let to = at < 0 ? undefined : (names.find((name) => name !== head.subject && stemIs(bare, name)) ?? entityName(bare));
    if (to === undefined && reply && previous) to = previous.from === head.subject ? previous.to : previous.from;
    if (to === undefined) to = next?.subject ?? head.subject;
    // The receiver (and the preposition before it) is not part of the text of the message.
    const dropped = (i) =>
      at >= 0 && (i === at || (i === at - 1 && PREPOSITIONS.has(restWords[i].toLowerCase())) || (i === at + 1 && /^(?:данных|data)$/i.test(restWords[i])));
    const kept = restWords.filter((_, i) => !dropped(i));
    while (kept.length > 0 && TRIMMED.has(kept.at(-1).toLowerCase())) kept.pop();
    while (kept.length > 0 && TRIMMED.has(kept[0].toLowerCase())) kept.shift();
    const rest = kept.join(' ');
    messages.push({
      from: head.subject,
      to,
      verb: head.verb,
      rest: cleanLabel(rest || head.verb),
      text: cleanLabel(`${head.verb} ${rest}`).toLowerCase(),
      kind: reply ? 'return' : 'sync',
    });
  });
  return messages;
};

// Everything the builders may need, from one description.
export const parseDescription = (text, lang = detectLang(text)) => {
  const lines = String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  const title = lines.length > 1 ? (lines[0].match(/^(?:название|тема|title|topic)\s*:\s*(.+)$/i)?.[1] ?? '') : '';
  const items = splitItems(title ? lines.slice(1).join('\n') : text, lang);
  const steps = parseSteps(items, lang);
  return {
    lang,
    title: cleanLabel(title),
    items,
    steps,
    data: parseData(items, lang),
    messages: parseMessages(items, lang),
    ordered: SEQUENCE_WORDS.test(text) || lines.some((line) => MARKER.test(line)) || steps.some((step) => step.type !== 'step'),
  };
};
