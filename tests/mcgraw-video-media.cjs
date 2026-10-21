const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class MediaNode {
  constructor(tag, { parent = null, attrs = {}, classes = [], rect = { width: 120, height: 80 } } = {}) {
    this.tagName = tag.toUpperCase();
    this.parent = parent;
    this.attrs = attrs;
    this.classes = new Set(classes);
    this.rect = rect;
    this.isConnected = true;
  }
  closest(selectorList) {
    const selectors = selectorList.split(',').map(value => value.trim());
    for (let node = this; node; node = node.parent) {
      if (selectors.some(selector => {
        if (selector === 'video') return node.tagName === 'VIDEO';
        if (selector === '[aria-label*="Video Player"]') return String(node.attrs['aria-label'] || '').includes('Video Player');
        if (selector === '[id^="GASPAR_"]') return String(node.attrs.id || '').startsWith('GASPAR_');
        if (selector.startsWith('.')) return node.classes.has(selector.slice(1));
        if (selector === '[hidden],[aria-hidden="true"]') return Boolean(node.attrs.hidden || node.attrs['aria-hidden'] === 'true');
        return false;
      })) return node;
    }
    return null;
  }
  matches(selector) { return selector.split(',').some(value => this.classes.has(value.trim().slice(1))); }
  getClientRects() { return [{ width: this.rect.width, height: this.rect.height }]; }
  getBoundingClientRect() { return { ...this.rect, x: 0, y: 0, right: this.rect.width, bottom: this.rect.height }; }
}

const poster = new MediaNode('img', { parent: new MediaNode('div', { attrs: { id: 'GASPAR_ember844' } }) });
const playerSvg = new MediaNode('svg', { parent: new MediaNode('div', { attrs: { 'aria-label': 'Video Player' } }) });
const realDiagram = new MediaNode('img');
const nativeVideo = new MediaNode('video');
const root = { querySelectorAll: selector => selector.startsWith('video,') ? [nativeVideo, poster.parent, playerSvg.parent] : [poster, playerSvg, realDiagram] };
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('shared/media.js', 'utf8'), context);
const media = context.globalThis.StudyMedia;

assert.deepEqual(Array.from(media.graphics(root)), [realDiagram], 'video player artwork is not mistaken for a question diagram');
assert.equal(media.videos(root).length, 3, 'native video and Connect GASPAR video-player wrappers are detected');
console.log('PASS Connect video is distinguished from question images');
