const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const saved = {};
const listeners = [];
let failWrite = false;
const context = vm.createContext({
  chrome: {storage: {
    local: {
      get: async (key) => ({[key]: saved[key]}),
      set: async (values) => {
        if (failWrite) throw Error('Storage is unavailable');
        for (const [key, newValue] of Object.entries(values)) {
          saved[key] = newValue;
          listeners.forEach((listener) => listener({[key]: {newValue}}, 'local'));
        }
      },
    },
    onChanged: {addListener: (listener) => listeners.push(listener)},
  }},
});
vm.runInContext(fs.readFileSync('shared/course-ui.js', 'utf8'), context);

function intro() {
  const details = {open: true};
  const button = {hidden: false, focus() { this.focused = true; }};
  const status = {hidden: true};
  const root = {querySelector: (selector) => ({
    details, button, '[role="status"]': status,
  })[selector]};
  const permit = context.StudyCourseUI.canvasIntroduction(root);
  return {details, button, status, permit};
}

(async () => {
  const toggle = {attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }};
  const options = {id: 'course-options', hidden: true, selected: ['accounting']};
  context.StudyCourseUI.disclosure(toggle, options);
  assert.deepEqual(toggle.attributes, {'aria-controls': 'course-options', 'aria-expanded': 'false'});
  toggle.onclick();
  assert.equal(toggle.textContent, 'Collapse');
  assert.equal(options.hidden, false);
  toggle.onclick();
  assert.equal(options.hidden, true);
  assert.deepEqual(options.selected, ['accounting']);

  const page = intro();
  const panel = intro();
  assert.equal(await page.permit(), false);
  assert.equal(page.details.open, true);
  assert.equal(page.button.focused, true);
  failWrite = true;
  await page.button.onclick();
  assert.equal(page.status.hidden, false);
  assert.equal(await page.permit(), false);
  failWrite = false;
  await page.button.onclick();
  assert.equal(await page.permit(), true);
  assert.equal(await panel.permit(), true, 'acknowledgement follows the course to the other surface');
  assert.equal(page.details.open, false, 'returning users can reopen the walkthrough');
  assert.equal(await intro().permit(), true, 'a later visit remembers acknowledgement');
  saved.studyCanvasCourseIntro = 0;
  assert.equal(await intro().permit(), false, 'a new warning version needs acknowledgement');
  console.log('PASS Canvas Course Auto disclosure and shared first-open acknowledgement');
})().catch(error => { console.error(error); process.exitCode = 1; });
