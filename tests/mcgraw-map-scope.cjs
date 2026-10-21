const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('content-scripts/mcgraw-map.js', 'utf8');
const start = source.indexOf('  function questionScope(){');
const end = source.indexOf('\n  function problemText(', start);
assert(start >= 0 && end > start, 'Connect MAP question scope helper is present');

class Node {
  constructor(name, parent = null, controls = []) {
    this.name = name;
    this.parentElement = parent;
    this.controls = controls;
  }
  contains(target) {
    for (let node = target; node; node = node.parentElement) if (node === this) return true;
    return false;
  }
}

const body = new Node('body');
const item = new Node('item', body, [{ type: 'radio', visible: true }]);
const marker = new Node('question-info-holder', item);
const prompt = new Node('activity-content', item);
const unrelated = new Node('unrelated', body, [{ type: 'text', visible: true }]);
const document = {
  body,
  documentElement: new Node('html'),
  querySelector(selector) {
    if (selector === '.question-wrap[aria-label="Activity Content"]') return prompt;
    if (selector === '#question-info-holder') return marker;
    return null;
  },
};
const context = {
  document,
  $: selector => document.querySelector(selector),
  root: () => prompt,
  all: (_selector, scope) => scope?.controls || [],
  inputVisible: control => control.visible,
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, { filename: 'mcgraw-map.js' });

assert.equal(context.questionScope(), item, 'answer radios in a sibling section are found inside the current item');
assert.equal(item.contains(prompt), true, 'the returned scope includes the prompt');
assert.equal(unrelated.contains(prompt), false, 'a control elsewhere on the page cannot become the question scope');

context.$ = selector => selector === '.question-wrap[aria-label="Activity Content"]' ? prompt : null;
assert.equal(context.questionScope(), prompt, 'when no item heading exists, the adapter safely falls back to the prompt only');

console.log('PASS McGraw MAP sibling-answer question scope');
