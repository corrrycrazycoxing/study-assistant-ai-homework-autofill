const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('content-scripts/mheducation.js', 'utf8');
const routine = source.slice(source.indexOf('function getOrderingItems('), source.indexOf('function getMatchingComponent('));
function fixture({reject = false, cancel = false, resetOnPickup = false, changed = false, duplicate = false, deferred = false} = {}) {
  let order = ['investing', 'operating', 'financing', 'combine'];
  const events = [];
  let picked = false, current = true, destination = -1;
  const component = {};
  const container = {
    isConnected: true,
    querySelector: () => component,
    querySelectorAll: () => order.map(id => ({
      id, getAttribute: () => null, focus() {},
      text: duplicate && id === 'operating' ? 'investing' : id,
      dispatchEvent(e) {
        events.push([id, e.type, e.key, e.keyCode]);
        if (e.type !== 'keydown') return;
        if (e.key === 'Escape') { picked = false; return; }
        if (e.key === ' ') {
          picked = !picked;
          if (picked && resetOnPickup) order = [id, ...order.filter(x => x !== id)];
          if (picked) destination = order.indexOf(id);
          else if (deferred && !reject) { order.splice(order.indexOf(id), 1); order.splice(destination, 0, id); }
        } else if (picked && !reject) {
          const from = deferred ? destination : order.indexOf(id), to = from + (e.key === 'ArrowUp' ? -1 : 1);
          if (to >= 0 && to < order.length) {
            if (deferred) destination = to;
            else [order[from], order[to]] = [order[to], order[from]];
          }
        }
        if (cancel) current = false;
        if (changed) order[0] = 'different';
      }
    }))
  };
  const context = vm.createContext({
    normalizeChoiceText: text => text.trim(),
    getMatchingChoiceText: item => item.text,
    delay: async () => {},
    KeyboardEvent: class { constructor(type, init) { Object.assign(this, init, {type}); } }
  });
  vm.runInContext(routine, context);
  return {events, order: () => order, picked: () => picked,
    fill: (answer = ['operating', 'investing', 'financing', 'combine']) => context.applyOrderingAnswer(container, answer, () => current)};
}
(async () => {
  const signatureSource = source.slice(source.indexOf('function getQuestionSignature('), source.indexOf('function waitForMcGrawNextQuestion('));
  const signatureContext = vm.createContext({detectQuestionType: () => 'sortable', normalizeChoiceText: text => text.trim(), getOrderingItems: root => root.items, getMatchingChoiceText: item => item.text});
  vm.runInContext(signatureSource, signatureContext);
  const root = {items:[{id:'a',text:'First'},{id:'b',text:'Second'}],querySelector:()=>({textContent:'Arrange steps'})};
  const before = signatureContext.getQuestionSignature(root);
  root.items.reverse();
  assert.equal(signatureContext.getQuestionSignature(root), before, 'own reordering must not invalidate the pending question');
  root.items[0] = {id:'different',text:'Changed choice'};
  assert.notEqual(signatureContext.getQuestionSignature(root), before, 'new choice set must invalidate the pending question');
  const normal = fixture();
  assert.equal(await normal.fill(), true);
  assert.deepEqual(normal.order(), ['operating', 'investing', 'financing', 'combine']);
  assert.deepEqual(normal.events.filter(e => e[1] === 'keydown').map(e => e[2]), [' ', 'ArrowUp', ' ']);
  assert.equal(normal.picked(), false);
  const count = normal.events.length;
  assert.equal(await normal.fill(), true);
  assert.equal(normal.events.length, count, 'already ordered answers are untouched');
  const delayed = fixture({deferred:true});
  assert.equal(await delayed.fill(['combine', 'operating', 'investing', 'financing']), true, 'verify order after drop when arrow movement only changes the keyboard target');
  const reset = fixture({resetOnPickup:true});
  assert.equal(await reset.fill(['combine', 'financing', 'operating', 'investing']), true, 're-read order after pickup');
  for (const answer of [['operating'], ['operating','operating','financing','combine'], ['operat','investing','financing','combine'], 'operating, investing, financing, combine']) {
    const invalid = fixture();
    assert.equal(await invalid.fill(answer), false);
    assert.equal(invalid.events.length, 0, 'invalid orders cannot partly mutate the page');
  }
  const duplicate = fixture({duplicate:true});
  assert.equal(await duplicate.fill(), false);
  assert.equal(duplicate.events.length, 0);
  const rejected = fixture({reject:true});
  assert.equal(await rejected.fill(), false);
  assert.equal(rejected.events.at(-2)[2], ' ');
  assert.equal(rejected.picked(), false);
  for (const settings of [{cancel:true}, {changed:true}]) {
    const stale = fixture(settings);
    assert.equal(await stale.fill(), false);
    assert.equal(stale.events.length, 1, 'stop input immediately when question changes or user stops');
  }
  const background = fs.readFileSync('background/background.js','utf8');
  const prompt = vm.runInNewContext('(' + background.slice(background.indexOf('function legacyPrompt('), background.indexOf('async function request(')) + ')');
  assert.match(prompt({type:'sortable',question:'Arrange steps',options:['A','B']}), /every exact option text in the required order/);
  assert.match(source, /questionType === "sortable"/);
  console.log('PASS SmartBook ordering: keyboard moves, retention, ambiguity, rejection and cancellation');
})().catch(error => { console.error(error); process.exitCode = 1; });
