// The phone settings page in the wearer's language. Its words are English in
// the code; each language maps them (shared/ui-text.json, built by
// tools/generate-ui-text.mjs from i18n/ui/). The page is translated as it is
// drawn: text and labels are swapped for their translations whenever the code
// writes them, so the controls need no changes. An English string with {}
// matches any text there, and the matched text is translated too; a
// translation names the matches {1}, {2}... in its own order.
import TEXT from './ui-text.json' with {type: 'json'};
export const UI_LANGUAGES = Object.keys(TEXT.languages);
const escape = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
export function uiDictionary(code) {
  const words = TEXT.languages[code];
  if (!words) return null;
  const exact = new Map(), patterns = [];
  TEXT.keys.forEach((key, i) => {
    if (!words[i]) return;
    if (key.includes('{}')) patterns.push([new RegExp('^' + key.split('{}').map(s => escape(s.replace(/\{\}/g, ''))).join('(.+?)') + '$'), words[i], key.replace(/\{\}/g, '').length]);
    else exact.set(key, words[i]);
  });
  // The most specific pattern first.
  patterns.sort((a, b) => b[2] - a[2]);
  const translate = text => {
    if (exact.has(text)) return exact.get(text);
    for (const [re, to] of patterns) {
      const m = text.match(re);
      if (!m) continue;
      let next = 0;
      return to.replace(/\{(\d*)\}/g, (_, n) => { const value = m[n ? +n : ++next] ?? ''; return translate(value) ?? value; });
    }
    return null;
  };
  return translate;
}
const ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'label'];
// Translates the document from now on, until called again with another language.
export function translatePage(doc, code) {
  const state = translatePage.state ||= {source: new WeakMap(), shown: new WeakMap(), observer: null, translate: null};
  state.translate = code === 'en' ? null : uiDictionary(code);
  const html = doc.documentElement;
  html.lang = code;html.dir = code === 'ar' ? 'rtl' : 'ltr';
  // A node's English, remembered so another language can be chosen later.
  const text = node => {
    const current = node.nodeValue, shown = state.shown.get(node);
    if (shown !== current) state.source.set(node, current);
    const source = state.source.get(node), trimmed = source.trim();
    const out = state.translate && trimmed ? state.translate(trimmed) : null;
    const next = out === null ? source : source.replace(trimmed, out);
    if (next !== current) node.nodeValue = next;
    state.shown.set(node, next);
  };
  const attribute = (el, name) => {
    const current = el.getAttribute(name), key = 'i18n' + name.replace(/-./g, c => c[1].toUpperCase());
    if (current === null) return;
    if (el.dataset[key + 'Shown'] !== current) el.dataset[key] = current;
    const source = el.dataset[key], out = state.translate ? state.translate(source.trim()) : null, next = out ?? source;
    if (next !== current) el.setAttribute(name, next);
    el.dataset[key + 'Shown'] = next;
  };
  const walk = root => {
    if (root.nodeType === 3) { if (!/^(SCRIPT|STYLE)$/.test(root.parentNode?.nodeName)) text(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.nodeName)) return;
    for (const name of ATTRIBUTES) if (root.hasAttribute(name)) attribute(root, name);
    for (const child of root.childNodes) walk(child);
  };
  state.observer?.disconnect();
  const observer = state.observer = new MutationObserver(records => {
    observer.disconnect();
    for (const r of records) {
      if (r.type === 'characterData') text(r.target);
      else if (r.type === 'attributes') attribute(r.target, r.attributeName);
      else r.addedNodes.forEach(walk);
    }
    start();
  });
  const start = () => observer.observe(doc.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES});
  walk(doc.body);
  if (state.title === undefined) state.title = doc.title;
  doc.title = state.translate?.(state.title) ?? state.title;
  start();
}
