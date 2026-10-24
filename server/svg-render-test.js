const path = require('path');
const fs = require('fs');

const clientRoot = path.join(__dirname, '..', 'client');
const clientModules = path.join(clientRoot, 'node_modules');

const esbuild = require(path.join(clientModules, 'esbuild'));
const React = require(path.join(clientModules, 'react'));
const { renderToStaticMarkup } = require(path.join(clientModules, 'react-dom', 'server'));

const artPath = path.join(clientRoot, 'src', 'components', 'StampArt.jsx');

const src = fs.readFileSync(artPath, 'utf8');
const { code } = esbuild.transformSync(src, { loader: 'jsx', format: 'cjs' });
const module_ = { exports: {} };
const shimRequire = (p) => {
  if (p === 'react') return React;
  return require(p.startsWith('.') ? path.resolve(path.dirname(artPath), p) : p);
};
new Function('require', 'module', 'exports', 'React', code)(
  shimRequire,
  module_,
  module_.exports,
  React
);
const StampArt = module_.exports.default || module_.exports;

// Real payload shapes: `countryName` (denormalised) and a populated `country` object.
const stamps = [
  { name: 'Indian Independence', countryName: 'India', year: 1947, category: 'Historical', theme: 'Independence', denomination: '3½ Annas' },
  { name: 'Bengal Tiger', countryName: 'India', year: 1963, category: 'Wildlife', theme: 'Wildlife', denomination: '20 nP' },
  { name: 'Mangalyaan', countryName: 'India', year: 2016, category: 'Science', theme: 'Space', denomination: '₹25' },
  { name: 'Taj Mahal', country: { name: 'India', flag: '🇮🇳' }, year: 2004, category: 'Cultural', theme: 'Architecture', denomination: '₹15' },
  { name: 'Sachin Tendulkar', countryName: 'India', year: 2013, category: 'Sports', theme: 'Personalities', denomination: '₹45' },
  // Unknown category/theme must fall back cleanly, not crash or print junk.
  { name: 'Unknown Category Stamp', countryName: 'Atlantis', year: 2024, category: 'Alien', theme: 'Alien', denomination: 'X' },
  {},
];

const has = (html, text) => html.toLowerCase().includes(String(text).toLowerCase());
const label = (v) => (typeof v === 'string' ? v : v?.name);

let bad = 0;
for (const s of stamps) {
  try {
    const html = renderToStaticMarkup(React.createElement(StampArt, { stamp: s }));
    const checks = {
      'is svg': html.startsWith('<svg'),
      'has viewBox': /viewBox="0 0 300 322"/.test(html),
      'has perforation holes': (html.match(/r="5\.4"/g) || []).length >= 60,
      'shows name': has(html, s.name || 'Commemorative'),
      'shows country': !label(s.countryName || s.country) || has(html, label(s.countryName || s.country)),
      'shows year': !s.year || has(html, s.year),
      'shows category': !s.category || has(html, s.category),
      'shows theme': !s.theme || has(html, s.theme),
      'has guilloche paths': (html.match(/<path/g) || []).length >= 5,
      'no undefined/NaN': !/undefined|NaN/.test(html),
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    if (failed.length) { bad++; console.log(`  FAIL  ${s.name || '(empty stamp)'} -> ${failed.join(', ')}`); }
    else console.log(`  PASS  ${s.name || '(empty stamp)'}  [${html.length} chars]`);
  } catch (e) {
    bad++;
    console.log(`  THROW ${s.name || '(empty stamp)'}: ${e.message}`);
  }
}

// determinism: same stamp must produce identical markup
const a = renderToStaticMarkup(React.createElement(StampArt, { stamp: stamps[1] }));
const b = renderToStaticMarkup(React.createElement(StampArt, { stamp: stamps[1] }));
console.log(a === b ? '  PASS  deterministic (identical output for same stamp)' : '  FAIL  output is not deterministic');
if (a !== b) bad++;

// uniqueness: different stamps must look different
const c = renderToStaticMarkup(React.createElement(StampArt, { stamp: stamps[2] }));
console.log(a !== c ? '  PASS  distinct stamps render differently' : '  FAIL  all stamps look identical');
if (a === c) bad++;

console.log(bad === 0 ? '\nStampArt: all render checks passed' : `\nStampArt: ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
