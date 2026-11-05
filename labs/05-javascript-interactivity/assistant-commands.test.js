import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEMPLATES } from '../../site/js/notations/index.js';
import { assistant } from '../../site/js/utils/editor-tools.js';

test('the assistant builds a diagram from a description by rules and says so honestly', () => {
  const ru = assistant('построй по описанию: Сначала принять заказ, затем проверить его. Если товара нет, то отказать.', '');
  assert.match(ru.text, /Построено по правилам \(BPMN/);
  assert.match(ru.text, /а не нейросетью/);
  assert.match(ru.code, /^diagram bpmn/);
  const en = assistant('Build from description: A customer has many orders. An order contains many items.', '', 'en');
  assert.match(en.text, /Built by rules \(ERD/);
  assert.match(en.code, /^diagram erd/);
  const warned = assistant('построй по описанию: Пользователь отправляет заявку в систему. Система сохраняет заявку в базе.', '');
  assert.match(warned.text, /Ошибок: 0/);
  const none = assistant('построй по описанию', '');
  assert.match(none.text, /Не получилось построить/);
  assert.equal(none.code, undefined);
});

test('the assistant reviews the diagram on the screen', () => {
  const clean = assistant('проверь диаграмму', TEMPLATES.erd);
  assert.equal(clean.text, 'Рецензия: замечаний нет.');
  const bad = assistant('review the diagram', 'diagram bpmn "x"\ntask a "A"\ntask b "B"\nflow a -> b', 'en');
  assert.match(bad.text, /^Review: \d+ remarks\./);
  assert.match(assistant('рецензия', 'diagram dag "A"').text, /Рецензия: замечаний 1\./);
});

test('the assistant advises a notation from the words of the task', () => {
  const ru = assistant('какую нотацию выбрать: нужны таблицы и сущности базы данных', '');
  assert.match(ru.text, /Лучше всего подходит: .*ERD/);
  const en = assistant('which notation to choose for the team and the manager and the department', '', 'en');
  assert.match(en.text, /Best fits: .*Organisation chart/);
  assert.match(assistant('какую нотацию', '').text, /Опишите задачу подробнее/);
  assert.match(assistant('what notation: zzz', '', 'en').text, /Describe the task in more detail|Describe the task after the colon/);
});
