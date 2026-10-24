#!/usr/bin/env node
/**
 * Real stamp acquisition pipeline.
 *
 * Turns `data/stamp-manifest.json` (a curated list of the stamps we want) into
 * `data/stamps.json` (the exact shape seed.js inserts), by pulling the image
 * and licence metadata from Wikimedia Commons and, where the manifest does not
 * supply prose, a summary from Wikipedia.
 *
 *   node scripts/fetch-stamps.js discover   # list Commons candidates per entry
 *   node scripts/fetch-stamps.js fetch      # download images, write stamps.json
 *   node scripts/fetch-stamps.js review     # contact sheet for eyeballing
 *
 * Nothing here runs at request time - it is a build-time tool, so the app
 * itself stays a plain MERN app with no runtime third-party API calls.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MANIFEST = path.join(DATA_DIR, 'stamp-manifest.json');
const OUTPUT = path.join(DATA_DIR, 'stamps.json');
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'stamps');
const REVIEW = path.join(__dirname, '..', 'public', 'stamp-review.html');

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIKIPEDIA = 'https://en.wikipedia.org/w/api.php';
const UA = 'NationalPhilately/1.0 (college FSD project; polite crawler)';
const THUMB_WIDTH = 560;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

async function api(url) {
  let last = 'unknown';
  for (let attempt = 1; attempt <= 6; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    } catch (e) {
      last = e.message;
      await sleep(800 * attempt);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      last = `HTTP ${res.status}`;
      if (attempt === 6) break;
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter ? Math.min(retryAfter, 45) * 1000 : 1500 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }
  throw new Error(`giving up on ${url} (${last})`);
}

/** Strip the HTML that MediaWiki puts in metadata values. */
const stripTags = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Score how well a Commons file title matches what the manifest asks for. */
function scoreTitle(title, entry) {
  const t = title.toLowerCase();
  let score = 0;
  for (const must of entry.titleMustContain || []) {
    if (t.includes(String(must).toLowerCase())) score += 3;
    else score -= 4;
  }
  for (const want of entry.titleShouldContain || []) {
    if (t.includes(String(want).toLowerCase())) score += 1;
  }
  // Ceremony photos, first-day covers and blocks are not straight stamp scans.
  for (const bad of [
    'ceremony', 'releasing', 'minister', 'inaugural', 'exhibition', 'first day cover',
    'block of', 'sheet', 'perforation block', 'cover', 'postmark', 'envelope', 'back',
    'folder', 'souvenir', 'miniature sheet', 'pane',
  ]) {
    if (t.includes(bad)) score -= 3;
  }
  // Philatelic scans from experienced uploaders tend to be numbered scans.
  if (/\b(misc|mi|sc|sg|yvert|colnect)\b/i.test(title)) score += 2;
  return score;
}

/** Commons category names for a manifest entry's country, most specific first. */
function categoryNames(entry) {
  const explicit = entry.commonsCategory;
  if (explicit) return Array.isArray(explicit) ? explicit : [explicit];
  const name = COUNTRY_NAMES[entry.country];
  if (!name) return [];
  const out = [];
  if (entry.year) out.push(`${entry.year} stamps of ${name}`);
  return out;
}

const COUNTRY_NAMES = {
  IN: 'India',
  GB: 'the United Kingdom',
  US: 'the United States',
  FR: 'France',
  DE: 'Germany',
  JP: 'Japan',
  CN: 'China',
  BR: 'Brazil',
  AU: 'Australia',
  IT: 'Italy',
  EG: 'Egypt',
  KE: 'Kenya',
};

/** Every file sitting directly in the given Commons categories. */
async function categoryFiles(names) {
  const titles = [];
  for (const name of names) {
    const url =
      `${COMMONS}?action=query&format=json&list=categorymembers` +
      `&cmtitle=${encodeURIComponent('Category:' + name)}&cmtype=file&cmlimit=500`;
    try {
      const json = await api(url);
      titles.push(...(json.query?.categorymembers || []).map((m) => m.title));
    } catch {
      // Category simply does not exist - fall through to search.
    }
    await sleep(250);
  }
  return titles;
}

/** Titles only, so a whole year-category can be scored without N metadata calls. */
async function searchTitles(q, limit = 30) {
  const url =
    `${COMMONS}?action=query&format=json&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url`;
  const json = await api(url);
  return Object.values(json.query?.pages || {})
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map((p) => p.title);
}

/** Licence, credit and thumbnail url for the files we actually settled on. */
async function fileInfos(titles) {
  if (!titles.length) return [];
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const url =
      `${COMMONS}?action=query&format=json&titles=${encodeURIComponent(batch.join('|'))}` +
      `&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=${THUMB_WIDTH}`;
    try {
      const json = await api(url);
      for (const p of Object.values(json.query?.pages || {})) {
        if (p.imageinfo?.[0]) out.push({ title: p.title, imageinfo: p.imageinfo[0] });
      }
    } catch (e) {
      console.log(`    (metadata batch failed: ${e.message})`);
    }
    await sleep(250);
  }
  return out;
}

/**
 * Returns the best-scoring candidate titles without fetching any metadata.
 * A pinned `file` in the manifest short-circuits the whole search.
 */
async function discoverEntry(entry) {
  if (entry.file) return [{ title: entry.file, score: 99, pinned: true }];

  const titles = new Set();
  const via = new Map();

  // 1. Exact year+country category: curated, so titles are already on-topic.
  const cats = categoryNames(entry);
  for (const t of await categoryFiles(cats)) {
    titles.add(t);
    via.set(t, { catBonus: 3, via: `category:${cats[0]}` });
  }

  // 2. Free-text search, restricted to bitmaps so PDFs/DJVUs never appear.
  const q = entry.query || `${entry.name} stamp`;
  for (const t of await searchTitles(`${q} filetype:bitmap`)) {
    if (!titles.has(t)) via.set(t, { via: 'search' });
    titles.add(t);
  }

  return [...titles]
    .map((title) => ({
      title,
      score: scoreTitle(title, entry) + (via.get(title)?.catBonus || 0),
      via: via.get(title)?.via || 'search',
    }))
    .sort((a, b) => b.score - a.score);
}

/** Pull a plain-English summary from Wikipedia for the story/design note. */
async function wikiSummary(title) {
  if (!title) return null;
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const json = await api(url);
    if (json.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
    return { extract: json.extract || '', page: json.content_urls?.desktop?.page || '' };
  } catch {
    return null;
  }
}

function pickImage(info) {
  const raw = info?.thumburl || info?.url;
  if (!raw) return null;
  const clean = raw.split('?')[0];
  const ext = (path.extname(clean) || '.jpg').toLowerCase().replace('.jpeg', '.jpg');
  return { url: clean, filename: `stamp${ext}`, ext };
}

async function download(url, dest) {
  // upload.wikimedia.org rate-limits hard. Wait out the hint for a short while,
  // then give up so the run can move on: a later fetch run resumes this entry.
  let last = 'unknown';
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA } });
    } catch (e) {
      last = e.message;
      if (attempt === 3) break;
      await sleep(1000 * attempt);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      last = `HTTP ${res.status}`;
      if (attempt === 3) break;
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter ? Math.min(retryAfter, 90) * 1000 : 2500 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`download ${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return buf.length;
  }
  throw new Error(`download failed ${last} ${url}`);
}

/** Merge manifest prose with whatever Commons/Wikipedia gave us. */
function buildStamp(entry, source, wiki) {
  const meta = source?.imageinfo?.extmetadata || {};
  const commonsDesc = stripTags(meta.ImageDescription?.value || '');
  return {
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    theme: entry.theme,
    country: entry.country,
    year: Number(entry.year),
    series: entry.series || null,
    seriesNumber: entry.seriesNumber ?? null,
    denomination: entry.denomination || '',
    person: entry.person || '',
    description: entry.description || commonsDesc.slice(0, 320) || (wiki?.extract ? wiki.extract.slice(0, 320) : ''),
    story: entry.story || (wiki?.extract ? wiki.extract.trim() : ''),
    designNote: entry.designNote || commonsDesc.slice(0, 240),
    image: '',
    imageFile: '',
    source: 'Wikimedia Commons',
    sourceUrl: source?.page || '',
    credit: entry.credit || stripTags(meta.Artist?.value || ''),
    license: meta.LicenseShortName?.value || 'Public domain',
    licenseUrl: meta.LicenseUrl?.value || 'https://creativecommons.org/licenses/',
    wikipedia: wiki?.page || '',
  };
}

/** Manifest-owned fields, refreshed on every run so edits always land. */
function manifestFields(entry) {
  return {
    name: entry.name,
    category: entry.category,
    theme: entry.theme,
    country: entry.country,
    year: Number(entry.year),
    series: entry.series || null,
    seriesNumber: entry.seriesNumber ?? null,
    denomination: entry.denomination || '',
    person: entry.person || '',
    description: entry.description || '',
    story: entry.story || '',
    designNote: entry.designNote || '',
  };
}

async function runFetch() {
  if (!fs.existsSync(MANIFEST)) {
    console.error('Missing data/stamp-manifest.json');
    process.exit(1);
  }
  const manifest = readJson(MANIFEST);
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  // A previous run's output lets us skip finished entries entirely: their image
  // file is already on disk, so only the manifest fields are refreshed.
  const prior = new Map(
    (fs.existsSync(OUTPUT) ? readJson(OUTPUT) : [])
      .filter((s) => s.imageFile && fs.existsSync(path.join(IMAGE_DIR, s.imageFile)))
      .map((s) => [s.slug, s])
  );

  const stamps = [];
  let downloaded = 0;
  let reused = 0;
  const misses = [];

  for (const [i, entry] of manifest.entries()) {
    const label = `[${i + 1}/${manifest.length}] ${entry.slug}`;

    const cached = prior.get(entry.slug);
    if (cached) {
      stamps.push({ ...cached, ...manifestFields(entry) });
      reused++;
      continue;
    }
    let candidates;
    try {
      candidates = await discoverEntry(entry);
    } catch (e) {
      misses.push({ slug: entry.slug, query: entry.query, best: e.message });
      console.log(`${label}  ERROR  ${e.message}`);
      continue;
    }
    const best = candidates[0];
    await sleep(250);

    if (!best || best.score < (entry.minScore ?? 2)) {
      misses.push({ slug: entry.slug, query: entry.query, best: best ? `${best.score} ${best.title}` : 'none' });
      console.log(`${label}  MISS  ${best ? `${best.score} ${best.title}` : 'no results'}`);
      continue;
    }

    const [found] = await fileInfos([best.title]);
    if (!found) {
      misses.push({ slug: entry.slug, query: entry.query, best: `${best.score} ${best.title} (no metadata)` });
      console.log(`${label}  NO METADATA  ${best.title}`);
      continue;
    }
    const info = found.imageinfo;
    const picked = pickImage(info);
    if (!picked) {
      misses.push({ slug: entry.slug, query: entry.query, best: `${best.score} ${best.title} (no image)` });
      console.log(`${label}  NO IMAGE  ${best.title}`);
      continue;
    }

    const filename = `${entry.slug}${picked.ext}`;
    const dest = path.join(IMAGE_DIR, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      reused++;
    } else {
      try {
        const bytes = await download(picked.url, dest);
        downloaded++;
        console.log(`${label}  ok  ${bytes}B  ${best.title}`);
      } catch (e) {
        misses.push({ slug: entry.slug, query: entry.query, best: `${best.title} (${e.message})` });
        console.log(`${label}  DOWNLOAD FAILED  ${e.message}`);
        continue;
      }
      await sleep(5000);
    }

    const wiki = await wikiSummary(entry.wikipedia);
    if (wiki) await sleep(200);

    const source = {
      title: found.title,
      page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(found.title.replace(/ /g, '_'))}`,
      imageinfo: info,
    };
    const stamp = buildStamp(entry, source, wiki);
    stamp.imageFile = filename;
    stamp.image = `/api/stamps/files/${filename}`;
    stamps.push(stamp);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(stamps, null, 2)}\n`);

  console.log(`\n${stamps.length}/${manifest.length} stamps resolved -> data/stamps.json`);
  console.log(`images: ${downloaded} downloaded, ${reused} already present`);
  if (misses.length) {
    console.log(`\n${misses.length} unresolved - tighten the query or pin an exact "file":`);
    for (const m of misses) console.log(`  ${m.slug}\n      query=${m.query}\n      best=${m.best}`);
  }
  return misses.length === 0;
}

async function runDiscover() {
  const manifest = readJson(MANIFEST);
  const checkpoint = path.join(DATA_DIR, 'discover.txt');
  const lines = [];
  const say = (s) => {
    console.log(s);
    lines.push(s);
    fs.writeFileSync(checkpoint, `${lines.join('\n')}\n`);
  };
  for (const [i, entry] of manifest.entries()) {
    say(`\n[${i + 1}/${manifest.length}] ${entry.slug}   wants: ${entry.name}`);
    say(`  query: ${entry.query || `${entry.name} stamp`}`);
    try {
      const candidates = await discoverEntry(entry);
      for (const c of candidates.slice(0, 8)) say(`    ${c.score}\t${c.via}\t${c.title}`);
    } catch (e) {
      say(`    ERROR ${e.message}`);
    }
    await sleep(300);
  }
}

/** Contact sheet so a human can eyeball title/licence next to the artwork. */
async function runReview() {
  const stamps = readJson(OUTPUT);
  const rows = stamps
    .map(
      (s) => `
    <tr>
      <td><img src="/api/stamps/files/${s.imageFile}" loading="lazy"></td>
      <td>
        <b>${s.name}</b><br>${s.country} · ${s.year} · ${s.category} / ${s.theme}<br>
        <small>${s.series || 'no series'}${s.seriesNumber ? ` #${s.seriesNumber}` : ''} · ${s.denomination || '—'}</small>
        <p>${(s.description || '').slice(0, 240)}</p>
        <small>credit: ${s.credit || '—'}<br>licence: ${s.license} · <a href="${s.sourceUrl}">source</a> · <a href="${s.wikipedia}">wikipedia</a></small>
      </td>
    </tr>`
    )
    .join('\n');

  fs.writeFileSync(
    REVIEW,
    `<!doctype html><meta charset="utf-8"><title>Stamp review</title>
<style>body{font:14px system-ui;margin:24px;background:#f7f4ee}
table{border-collapse:collapse}td{border:1px solid #ddd;padding:10px;vertical-align:top;background:#fff}
img{width:170px;display:block}p{max-width:520px;color:#444}</style>
<h1>${stamps.length} stamps fetched — check every row matches the label</h1>
<table>${rows}</table>`
  );
  console.log(`wrote ${REVIEW}`);
}

/**
 * Check the fetched catalogue against the invariants e2e-test.js asserts, so a
 * bad story or a dropped stamp fails here instead of during the test run.
 */
function runValidate() {
  if (!fs.existsSync(OUTPUT)) {
    console.error('No data/stamps.json - run fetch first');
    process.exit(1);
  }
  const stamps = readJson(OUTPUT);
  const { CATEGORIES, THEMES } = require('../utils/taxonomy');
  const problems = [];
  const hit = (msg) => problems.push(msg);

  const countryOf = (s) => s.country;
  const haystack = (s) =>
    [s.name, s.person, s.theme, s.description, s.story, s.countryName || countryOf(s)]
      .join(' ')
      .toLowerCase();

  for (const s of stamps) {
    if (!CATEGORIES.includes(s.category)) hit(`${s.slug}: bad category "${s.category}"`);
    if (!THEMES.includes(s.theme)) hit(`${s.slug}: bad theme "${s.theme}"`);
    if (!fs.existsSync(path.join(IMAGE_DIR, s.imageFile || ''))) hit(`${s.slug}: image file missing`);
    if (!s.description) hit(`${s.slug}: empty description`);
    if (!s.story) hit(`${s.slug}: empty story`);
  }

  // GET /stamps?search=Gandhi must return only stamps whose person is Gandhi.
  for (const s of stamps) {
    const mentionsGandhi = haystack(s).includes('gandhi');
    const isGandhi = /gandhi/i.test(s.person || '');
    if (mentionsGandhi && !isGandhi) hit(`${s.slug}: mentions Gandhi but person is "${s.person}"`);
    const mentionsSpace = haystack(s).includes('space');
    if (mentionsSpace && s.theme !== 'Space') hit(`${s.slug}: mentions space but theme is "${s.theme}"`);
  }

  // GET /stamps?year=1947 must return exactly one stamp.
  const y1947 = stamps.filter((s) => Number(s.year) === 1947);
  if (y1947.length !== 1) hit(`year=1947 returns ${y1947.length} stamps, test expects 1`);

  const countries = new Set(stamps.map(countryOf));
  if (countries.size !== 12) hit(`${countries.size} countries present, expected 12`);
  for (const c of ['IN', 'GB', 'US', 'FR', 'DE', 'JP', 'CN', 'BR', 'AU', 'IT', 'EG', 'KE']) {
    if (!countries.has(c)) hit(`country ${c} has no stamps (passport would break)`);
  }

  const cats = new Set(stamps.map((s) => s.category));
  const ths = new Set(stamps.map((s) => s.theme));
  for (const c of CATEGORIES) if (!cats.has(c)) hit(`no stamp in category ${c}`);
  for (const t of THEMES) if (!ths.has(t)) hit(`no stamp with theme ${t}`);
  if (stamps.filter((s) => s.theme === 'Wildlife').length < 3) hit('fewer than 3 Wildlife stamps');

  const series = new Set(stamps.map((s) => s.series).filter(Boolean));
  if (series.size < 1) hit('no stamps belong to a series');

  const dupes = stamps.length - new Set(stamps.map((s) => s.slug)).size;
  if (dupes) hit(`${dupes} duplicate slugs`);

  if (problems.length) {
    console.log(`${problems.length} problem(s):`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log(`${stamps.length} stamps pass every invariant (countries=${countries.size}, categories=${cats.size}, themes=${ths.size}, series=${series.size})`);
}

/** Ad-hoc helper used while curating the manifest: `node fetch-stamps.js search "..." [n]`. */
async function runSearch(query, limit = 12) {
  const titles = await searchTitles(`${query} filetype:bitmap`, Number(limit) || 12);
  console.log(`query: ${query}`);
  if (!titles.length) console.log('  (no results)');
  for (const t of titles) console.log(`  ${t}`);
}

/** List a category's files and subcategories, for curating the manifest. */
async function runCategory(name) {
  const url =
    `${COMMONS}?action=query&format=json&list=categorymembers` +
    `&cmtitle=${encodeURIComponent('Category:' + name)}&cmlimit=500`;
  const json = await api(url);
  const members = json.query?.categorymembers || [];
  console.log(`category: ${name}  (${members.length} members)`);
  for (const m of members) console.log(`  ${m.ns === 14 ? '[cat] ' : ''}${m.title}`);
}

/** Find Commons categories: `node fetch-stamps.js cats "<text>"`. */
async function runCats(q) {
  const url =
    `${COMMONS}?action=query&format=json&list=search&srnamespace=14&srlimit=30` +
    `&srsearch=${encodeURIComponent(q)}`;
  const json = await api(url);
  for (const r of json.query?.search || []) console.log(`  ${r.title}`);
}

/** Print licence + description for candidate files, without downloading anything. */
async function runMeta(titles) {
  for (const info of await fileInfos(titles)) {
    const meta = info.imageinfo.extmetadata || {};
    console.log(`\n${info.title}`);
    console.log(`  size: ${info.imageinfo.width}x${info.imageinfo.height}  ${info.imageinfo.thumburl || info.imageinfo.url}`);
    console.log(`  licence: ${meta.LicenseShortName?.value || '?'}  artist: ${stripTags(meta.Artist?.value || '').slice(0, 80)}`);
    console.log(`  desc: ${stripTags(meta.ImageDescription?.value || '').slice(0, 400)}`);
  }
}

(async () => {
  const mode = process.argv[2] || 'fetch';
  if (mode === 'discover') await runDiscover();
  else if (mode === 'search') await runSearch(process.argv[3] || '', process.argv[4]);
  else if (mode === 'cat') await runCategory(process.argv[3] || '');
  else if (mode === 'cats') await runCats(process.argv.slice(3).join(' '));
  else if (mode === 'meta') await runMeta(process.argv.slice(3));
  else if (mode === 'validate') runValidate();
  else if (mode === 'review') await runReview();
  else {
    const clean = await runFetch();
    if (clean) {
      runValidate();
      await runReview();
    }
  }
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
