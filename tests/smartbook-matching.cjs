const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('content-scripts/mheducation.js', 'utf8');
const matching = source.slice(source.indexOf('function getMatchingComponent('),
  source.indexOf('function extractChoicesFromCombinedAnswer('));

function fixture({retain = true, cancel = false, legacy = false} = {}) {
  const events = [];
  const pool = [];
  let activeCard;
  let current = true;
  const rect = {left: 1, top: 2, width: 10, height: 10};
  function element(props, handler) {
    return {
      isConnected: true,
      getClientRects: () => [rect],
      getBoundingClientRect: () => rect,
      dispatchEvent(event) {
        events.push(event);
        handler?.(event);
        return true;
      },
      ...props,
    };
  }
  function card(key, label) {
    return element({
      dataset: legacy ? {} : {itemKey: key},
      matches: (selector) => !legacy && selector === '[draggable="true"]',
      querySelector: (selector) => selector === 'p' ? {textContent: label} : null,
    }, (event) => {
      if (event.type === 'dragstart') {
        activeCard = {key, label};
        if (cancel) current = false;
      }
    });
  }
  pool.push(card('retained', 'Retained earnings'), card('paid-in', 'Paid-in capital'));
  const rows = ['Earned capital', 'Contributed capital'].map((label) => {
    const row = {placed: null};
    const response = {
      querySelector: (selector) =>
        selector === '.draggableItem[data-item-key]' && !legacy ? row.placed : null,
    };
    const zone = element({}, (event) => {
      if (event.type !== 'drop' || !retain) return;
      const index = pool.findIndex((item) => item.dataset.itemKey === activeCard.key);
      pool.splice(index, 1)[0].isConnected = false;
      row.placed = card(activeCard.key, activeCard.label);
    });
    row.querySelector = (selector) => {
      if (selector === '.match-prompt .content') return {textContent: label};
      if (selector === '.match-single-response-wrapper') return response;
      return null;
    };
    row.querySelectorAll = (selector) =>
      selector === '.match-single-response-wrapper .droppableContainer[data-drop-target-for-element="true"]' ? [zone] : [];
    return row;
  });
  const component = {
    querySelectorAll(selector) {
      if (selector === '.responses-container .match-row') return rows;
      if (selector === '.draggableItem[data-item-key]') {
        return legacy ? [] : [...rows.map((row) => row.placed).filter(Boolean), ...pool];
      }
      if (selector.includes('.choice-item-wrapper')) return legacy ? pool : [];
      return [];
    },
  };
  const container = element({
    ownerDocument: element({}),
    querySelector: (selector) => selector === '.matching-component' ? component : null,
  });
  const context = vm.createContext({
    normalizeChoiceText: (value) => value.trim(),
    isAnswerMatch: (a, b) => a === b,
    dedupeAnswers: (values) => [...new Set(values)],
    stripWrappingQuotes: (value) => value,
    delay: async () => {},
    DataTransfer: class {},
    DragEvent: class {
      constructor(type, init) { Object.assign(this, init, {type}); }
    },
  });
  vm.runInContext(matching, context);
  const answer = {'Earned capital': 'Retained earnings', 'Contributed capital': 'Paid-in capital'};
  return {
    events,
    rows,
    choices: () => Array.from(context.getMatchingChoiceItems(container), context.getMatchingChoiceText),
    fill: (overrides) => context.applyMatchingAnswer(container, {...answer, ...overrides}, () => current),
  };
}

(async () => {
  const modern = fixture();
  assert.deepEqual(modern.choices(), ['Retained earnings', 'Paid-in capital']);
  assert.equal(await modern.fill(), true);
  assert.deepEqual(modern.rows.map((row) => row.placed.dataset.itemKey), ['retained', 'paid-in']);
  const sequence = ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend'];
  assert.deepEqual(modern.events.map((event) => event.type), [...sequence, ...sequence]);
  assert(modern.events.slice(0, 5).every((event) => event.dataTransfer === modern.events[0].dataTransfer));
  assert.equal(await modern.fill(), true);
  assert.equal(modern.events.length, 10, 'a placed answer needs no further drags');

  const rejected = fixture({retain: false});
  assert.equal(await rejected.fill(), false);
  assert.deepEqual(rejected.events.map((event) => event.type), sequence);

  const stopped = fixture({cancel: true});
  assert.equal(await stopped.fill(), false);
  assert.deepEqual(stopped.events.map((event) => event.type), ['dragstart', 'dragend']);

  const duplicate = fixture();
  assert.equal(await duplicate.fill({'Contributed capital': 'Retained earnings'}), false);
  assert.equal(duplicate.events.length, 0);

  const old = fixture({legacy: true});
  assert.deepEqual(old.choices(), ['Retained earnings', 'Paid-in capital']);
  assert.equal(await old.fill(), false);
  assert.equal(old.events.length, 0);
  console.log('PASS SmartBook matching reads cards, verifies drops, and stops on rejected or stale moves');
})().catch((error) => { console.error(error); process.exitCode = 1; });
