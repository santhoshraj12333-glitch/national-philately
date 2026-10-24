/**
 * Renders every seeded stamp through the real StampArt component and writes a
 * static contact sheet to ../stamp-preview.html.
 *
 * Usage: node generate-preview.js   (server must be running on :5000)
 */
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

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

(async () => {
  const res = await fetch('http://localhost:5000/api/stamps?sort=az');
  if (!res.ok) {
    console.error(`API returned ${res.status}. Is the server running on :5000?`);
    process.exit(1);
  }
  const stamps = await res.json();

  const figures = stamps
    .map((s) => {
      const file = typeof s.image === 'string' && s.image.startsWith('/api/stamps/files/')
        ? path.join(__dirname, 'public', 'stamps', s.image.split('/').pop())
        : '';
      const art = file && fs.existsSync(file)
        ? `<img src="${esc(path.relative(path.join(__dirname, '..'), file)).replace(/\\/g, '/')}" alt="">`
        : renderToStaticMarkup(React.createElement(StampArt, { stamp: s }));
      const country = typeof s.country === 'string' ? s.country : s.countryName || s.country?.name || '';
      return (
        `<figure><div class="art">${art}</div>` +
        `<figcaption>${esc(s.name)}<br>` +
        `<span>${esc(country)} &middot; ${esc(s.year)} &middot; ${esc(s.category)} &middot; ${esc(s.theme)}</span>` +
        `</figcaption></figure>`
      );
    })
    .join('\n');

  const html =
    `<!doctype html><meta charset="utf-8"><title>National Philately - Stamp Art Preview</title>\n` +
    `<style>\n` +
    `body{font-family:Georgia,serif;background:#F6F1E7;margin:0;padding:32px;color:#1B3A5C}\n` +
    `h1{text-align:center;letter-spacing:2px}\n` +
    `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px;max-width:1200px;margin:0 auto}\n` +
    `figure{margin:0;background:#fff;padding:14px;border:1px solid #E2D9C6;border-radius:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)}\n` +
    `.art svg{width:100%;height:auto;display:block}\n` +
    `.art img{width:100%;height:280px;object-fit:contain;display:block;background:#F6F1E7}\n` +
    `figcaption{margin-top:10px;font-size:14px;font-weight:700}\n` +
    `figcaption span{font-weight:400;color:#7A8794;font-size:12px}\n` +
    `</style>\n` +
    `<h1>NATIONAL PHILATELY &mdash; STAMP CATALOGUE (${stamps.length})</h1>\n` +
    `<div class="grid">\n${figures}\n</div>\n`;

  const out = path.join(__dirname, '..', 'stamp-preview.html');
  fs.writeFileSync(out, html);
  console.log(`Wrote ${out} with ${stamps.length} stamps.`);
})();