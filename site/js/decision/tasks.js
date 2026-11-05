// Ready tasks of the decision page. The scores are examples (1 = poor, 10 = excellent; for a criterion where less is better, a smaller number is better): change them to your case.
const criterion = (ru, en, weight, direction = 'max') => ({ name: { ru, en }, weight, direction });
const alt = (ru, en, scores) => ({ name: { ru, en }, scores });

export const TASKS = {
  notation: {
    title: { ru: 'Выбор нотации', en: 'Choice of a notation' },
    criteria: [
      criterion('Простота освоения', 'Easy to learn', 3),
      criterion('Выразительность', 'Expressiveness', 4),
      criterion('Читаемость для заказчика', 'Readable for a customer', 3),
      criterion('Строгость правил', 'Strict rules', 2),
    ],
    alternatives: [
      alt('BPMN', 'BPMN', [6, 9, 8, 8]),
      alt('Блок-схема ГОСТ', 'GOST flowchart', [9, 6, 7, 6]),
      alt('UML: последовательность', 'UML sequence', [7, 7, 6, 7]),
      alt('DFD', 'DFD', [7, 7, 6, 7]),
      alt('ERD', 'ERD', [8, 6, 5, 9]),
    ],
  },
  engine: {
    title: { ru: 'Выбор движка отрисовки', en: 'Choice of a rendering engine' },
    criteria: [
      criterion('Работает без сети', 'Works offline', 4),
      criterion('Скорость', 'Speed', 3),
      criterion('Число нотаций', 'Number of notations', 3),
      criterion('Приватность кода', 'Privacy of the code', 4),
      criterion('Трудоёмкость настройки', 'Effort to set up', 2, 'min'),
    ],
    alternatives: [
      alt('Собственный (в браузере)', 'Own (in the browser)', [10, 9, 8, 10, 1]),
      alt('Сервер DSLKit', 'DSLKit server', [4, 8, 8, 9, 5]),
      alt('Kroki', 'Kroki', [1, 5, 10, 4, 3]),
    ],
  },
  export: {
    title: { ru: 'Выбор формата экспорта', en: 'Choice of an export format' },
    criteria: [
      criterion('Качество при увеличении', 'Quality when scaled', 4),
      criterion('Можно править дальше', 'Can be edited further', 3),
      criterion('Размер файла', 'File size', 2, 'min'),
      criterion('Открывается везде', 'Opens everywhere', 3),
    ],
    alternatives: [
      alt('SVG', 'SVG', [10, 6, 2, 8]),
      alt('PNG', 'PNG', [4, 1, 4, 10]),
      alt('JPEG', 'JPEG', [3, 1, 3, 10]),
      alt('draw.io', 'draw.io', [8, 10, 3, 6]),
      alt('HTML', 'HTML', [8, 3, 3, 7]),
    ],
  },
  custom: {
    title: { ru: 'Своя задача', en: 'Your own task' },
    criteria: [criterion('Критерий 1', 'Criterion 1', 1), criterion('Критерий 2', 'Criterion 2', 1)],
    alternatives: [alt('Вариант A', 'Option A', [5, 5]), alt('Вариант B', 'Option B', [7, 3])],
  },
};

export const TASK_KEYS = Object.keys(TASKS);

// A problem of the methods from a template, with the names in one language.
export const taskProblem = (key, lang = 'ru') => {
  const task = TASKS[key];
  const pick = (name) => name[lang === 'en' ? 'en' : 'ru'];
  return {
    title: pick(task.title),
    criteria: task.criteria.map((item) => ({ name: pick(item.name), weight: item.weight, direction: item.direction })),
    alternatives: task.alternatives.map((item) => ({ name: pick(item.name), scores: [...item.scores] })),
  };
};
