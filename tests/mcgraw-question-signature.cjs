const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("content-scripts/mheducation.js", "utf8");
const stableStart = source.indexOf("function stablePromptText(");
const signatureStart = source.indexOf("function getQuestionSignature(", stableStart);
const signatureEnd = source.indexOf("\nfunction pauseForManualMatchingAndResume(", signatureStart);
assert(stableStart >= 0 && signatureStart > stableStart && signatureEnd > signatureStart);

class TextNode {
  constructor(text) {
    this.kind = "text";
    this.text = text;
    this.parentNode = null;
  }
  get textContent() { return this.text; }
  cloneNode() { return new TextNode(this.text); }
}

class ElementNode {
  constructor(tag, classes = [], children = []) {
    this.kind = "element";
    this.tagName = tag.toLowerCase();
    this.classes = new Set(classes);
    this.children = [];
    this.parentNode = null;
    children.forEach((child) => this.append(child));
  }
  append(child) {
    child.parentNode = this;
    this.children.push(child);
    return this;
  }
  get textContent() { return this.children.map((child) => child.textContent).join(""); }
  cloneNode(deep = false) {
    return new ElementNode(
      this.tagName,
      [...this.classes],
      deep ? this.children.map((child) => child.cloneNode(true)) : []
    );
  }
  matches(selector) {
    const [tag, ...classes] = selector.split(".");
    return (!tag || tag === this.tagName) && classes.every((name) => this.classes.has(name));
  }
  querySelectorAll(selectorList) {
    const selectors = selectorList.split(",").map((part) => part.trim());
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.kind !== "element") continue;
        if (selectors.some((selector) => child.matches(selector))) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
  replaceWith(replacement) {
    if (!this.parentNode) return;
    const parent = this.parentNode;
    const index = parent.children.indexOf(this);
    if (index < 0) return;
    replacement.parentNode = parent;
    parent.children.splice(index, 1, replacement);
    this.parentNode = null;
  }
  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentNode = null;
  }
}

const context = {
  document: { createTextNode: (text) => new TextNode(text) },
  detectQuestionType: () => "fill_in_the_blank",
  normalizeChoiceText: (text) => String(text).replace(/\s+/g, " ").trim(),
};
vm.createContext(context);
vm.runInContext(
  source.slice(stableStart, signatureEnd),
  context,
  { filename: "mheducation.js" }
);

function prompt(...children) {
  return new ElementNode("div", ["prompt"], children);
}
function signatureFor(promptEl) {
  const container = {
    querySelector: (selector) => selector === ".prompt" ? promptEl : null,
    querySelectorAll: () => [],
  };
  return context.getQuestionSignature(container);
}

const beforeGrade = prompt(
  new TextNode("The legal right to receive cash from a credit sale is called an accounts "),
  new ElementNode("input", ["fitb-input"]),
  new TextNode(".")
);
const afterGrade = prompt(
  new TextNode("The legal right to receive cash from a credit sale is called an accounts "),
  new ElementNode("span", ["response-container"], [
    new ElementNode("span", ["fitb-answer-container"], [
      new ElementNode("span", ["fitb-span"], [new TextNode("receivable")]),
    ]),
  ]),
  new ElementNode("span", ["correctness"], [new TextNode("Correct")]),
  new ElementNode("span", ["_visuallyHidden"], [new TextNode("Field 1")]),
  new TextNode(".")
);

const beforeSignature = signatureFor(beforeGrade);
const afterSignature = signatureFor(afterGrade);
assert.equal(beforeSignature, afterSignature, "grading a blank must not look like a new question");
assert.match(beforeSignature, /\[BLANK\]/);
assert.notEqual(
  beforeSignature,
  signatureFor(prompt(new TextNode("A different question."))),
  "a genuinely different prompt must invalidate the current-question guard"
);

const flow = source.slice(source.indexOf("async function processChatGPTResponse("));
assert.match(flow, /const activeContainer=document\.querySelector\("\.probe-container"\)/);
assert.doesNotMatch(flow.slice(0, flow.indexOf("function addAssistantButton")), /container\.isConnected/);

let currentPrompt = afterGrade;
let isAnswered = true;
let nextClicks = 0;
const container = {
  querySelector: (selector) => {
    if (selector === ".prompt") return currentPrompt;
    if (selector === ".awd-probe-correctness") return isAnswered ? {} : null;
    return null;
  },
};
const nextButton = {
  click() {
    nextClicks += 1;
    if (nextClicks === 2) {
      currentPrompt = prompt(new TextNode("A new synthetic question."));
      isAnswered = false;
    }
  },
};
context.isAutomating = true;
context.legacyEpoch = 7;
context.handleTopicOverview = () => false;
context.handleForcedLearning = () => false;
context.setTimeout = (callback) => {
  callback();
  return 1;
};
context.document.querySelector = (selector) => {
  if (selector === ".probe-container") return container;
  if (selector === ".next-button") return isAnswered ? nextButton : null;
  return null;
};

(async () => {
  const advanced = await context.waitForMcGrawNextQuestion(afterSignature, 7);
  assert.equal(advanced, true, "Auto should resume when the next question is answerable");
  assert.equal(nextClicks, 2, "a still-answered page should cause Next to be retried");
  console.log("McGraw answer-check transition regression checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
