// Loads index.html / app.html in jsdom with theme.js and config.js inlined. supabase.js is replaced by a mock when given.
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
function load(file, { mock, seed } = {}) {
  const html = read(file)
    .replace('<script src="theme.js"></script>', () => '<script>' + read('theme.js') + '</script>')
    .replace('<script src="bodymap.js"></script>', () => '<script>' + read('bodymap.js') + '</script>')
    .replace('<script src="personalize.js"></script>', () => '<script>' + read('personalize.js') + '</script>')
    .replace('<script src="catalog.js"></script>', () => '<script>' + read('catalog.js') + '</script>')
    .replace('<script src="config.js"></script>', () => '<script>' + read('config.js') + '</script>')
    .replace('<script src="supabase.js"></script>', '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/UNS/' + file, pretendToBeVisual: true,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, getImageData() { return {}; }, putImageData() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} });
      w.__errs = []; w.addEventListener('error', e => w.__errs.push(e.message));
      if (mock) w.supabase = mock(w);
      for (const k in (seed || {})) w.localStorage.setItem(k, seed[k]);
    } });
  return dom.window;
}
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
let n = 0; const pass = m => console.log('PASS ' + m + (++n && ''));
module.exports = { load, tick, assert, pass, read };
