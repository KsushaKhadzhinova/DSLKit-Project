export const TEMPLATES = [
  { id: 1, title: 'Диаграмма последовательности входа', notation: 'UML', description: 'Обмен сообщениями между клиентом, сервером и базой при авторизации.' },
  { id: 2, title: 'Процесс согласования заказа', notation: 'BPMN', description: 'Шаги, шлюзы и роли в процессе согласования.' },
  { id: 3, title: 'Модель данных интернет-магазина', notation: 'ERD', description: 'Сущности клиентов, заказов и товаров со связями.' },
  { id: 4, title: 'Поток данных заявки', notation: 'DFD', description: 'Как данные заявки проходят через процессы и хранилища.' },
  { id: 5, title: 'Функциональная модель отдела', notation: 'IDEF0', description: 'Функции, входы, выходы, управление и механизмы.' },
];

export const findTemplate = (id) => TEMPLATES.find((t) => String(t.id) === String(id));
