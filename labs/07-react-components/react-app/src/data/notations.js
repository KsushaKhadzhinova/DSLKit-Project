// Static mock data: notations in the order of the DSLKit site (by popularity).
export const mockNotations = [
  { id: 1, code: 'UML', title: 'Диаграммы классов и последовательностей', status: 'beta', example: 'class Order { id: int }' },
  { id: 2, code: 'BPMN', title: 'Бизнес-процессы с событиями и шлюзами', status: 'beta', example: 'process Checkout { start -> pay -> end }' },
  { id: 3, code: 'ERD', title: 'Сущности и связи для баз данных', status: 'beta', example: 'entity User { id, email }' },
  { id: 4, code: 'DFD', title: 'Потоки данных между процессами', status: 'planned', example: 'flow Client -> System : order' },
  { id: 5, code: 'IDEF0', title: 'Функциональные блоки со входами и выходами', status: 'planned', example: 'box A0 "Process order" { input: Order }' },
  { id: 6, code: 'Петри', title: 'Сети Петри: места, переходы и фишки', status: 'planned', example: 'place P1 (1) -> transition T1' },
];

export const NOTATION_STATUSES = { beta: 'В бете', planned: 'В планах' };
