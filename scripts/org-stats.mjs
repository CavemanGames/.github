// org-stats.mjs — builds the organization stats cards shown on the CavemanGames profile.
//
// Reads every repository of the organization through the GitHub REST API and writes two SVGs:
//   profile/stats.svg      totals (repositories, public/private split, languages, first year)
//   profile/languages.svg  language share by bytes of code, top 8 + "Other"
//
// Privacy: private repositories only contribute to totals. Their names, descriptions and
// per-repository numbers never leave this script.
//
// Usage: GITHUB_TOKEN=... node scripts/org-stats.mjs [--org CavemanGames] [--fixture file.json]
// Node 20+, no dependencies. With a token that can read private repositories (fine-grained,
// "Metadata: read-only" on all repositories of the org), totals include private repositories;
// with the default Actions token, only public ones.

import { writeFileSync, readFileSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : fallback;
};
const ORG = arg('org', 'CavemanGames');
const FIXTURE = arg('fixture');
const OUT_DIR = arg('out', 'profile');

// Brand kit v1.1
const C = {
  cave: '#050705', panel: '#0B100C', line: '#16321D', bone: '#C8E6CE', muted: '#96B79F',
  label: '#4E7359', phosphor: '#3EE06A', deep: '#1D5C31',
};
// Language bar colors: brand greens first, then neutral tones (Phosphor stays an accent).
const BAR = ['#3EE06A', '#2BB352', '#1D8A3E', '#1D5C31', '#7FBF92', '#4E7359', '#A9CDB3', '#2E4434', '#16321D'];
const FONT = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

async function api(path) {
  const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path}`);
  return res.json();
}

async function loadRepos() {
  if (FIXTURE) return JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  for (const r of repos) {
    r.languages = r.fork ? {} : await api(`/repos/${ORG}/${r.name}/languages`);
  }
  return repos;
}

export function summarize(repos) {
  const own = repos.filter((r) => !r.fork && r.name !== '.github');
  const languages = {};
  for (const r of own) {
    for (const [lang, bytes] of Object.entries(r.languages || {})) languages[lang] = (languages[lang] || 0) + bytes;
  }
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 8);
  const other = sorted.slice(8).reduce((a, [, b]) => a + b, 0);
  if (other > 0) top.push(['Other', other]);
  const years = own.map((r) => new Date(r.created_at).getUTCFullYear()).filter(Boolean);
  return {
    repos: own.length,
    public: own.filter((r) => !r.private).length,
    private: own.filter((r) => r.private).length,
    languageCount: sorted.length,
    since: years.length ? Math.min(...years) : null,
    share: top.map(([name, bytes]) => ({ name, pct: total ? (bytes / total) * 100 : 0 })),
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const frame = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${C.panel}" stroke="${C.line}"/>
<text x="24" y="34" font-family="${FONT}" font-size="12" fill="${C.label}" letter-spacing="1.5">${esc(title)}</text>
${body}
</svg>
`;

export function statsSvg(s, updated) {
  const cells = [
    ['repositories', s.repos],
    ['public', s.public],
    ['private', s.private],
    ['languages', s.languageCount],
  ];
  const w = 480;
  const cellW = (w - 48) / cells.length;
  const body = cells.map(([label, value], i) => {
    const x = 24 + i * cellW;
    return `<text x="${x}" y="84" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.bone}">${esc(value)}</text>
<text x="${x}" y="106" font-family="${FONT}" font-size="11" fill="${C.muted}">${esc(label)}</text>`;
  }).join('\n');
  const foot = `<text x="24" y="146" font-family="${FONT}" font-size="11" fill="${C.label}">$ git log --since=2011 · updated ${esc(updated)}</text>`;
  return frame(w, 166, '~/cavemangames/stats', `${body}\n<line x1="24" y1="124" x2="${w - 24}" y2="124" stroke="${C.line}"/>\n${foot}`);
}

export function languagesSvg(s) {
  const w = 480;
  const barW = w - 48;
  let x = 24;
  const bar = s.share.map((l, i) => {
    const width = Math.max((l.pct / 100) * barW, l.pct > 0 ? 2 : 0);
    const rect = `<rect x="${x.toFixed(2)}" y="52" width="${width.toFixed(2)}" height="10" fill="${BAR[i % BAR.length]}"/>`;
    x += width;
    return rect;
  }).join('');
  const rows = Math.ceil(s.share.length / 2);
  const legend = s.share.map((l, i) => {
    const col = i < rows ? 0 : 1;
    const row = i % rows;
    const lx = 24 + col * (barW / 2);
    const ly = 92 + row * 22;
    return `<rect x="${lx}" y="${ly - 9}" width="10" height="10" rx="2" fill="${BAR[i % BAR.length]}"/>
<text x="${lx + 18}" y="${ly}" font-family="${FONT}" font-size="12" fill="${C.bone}">${esc(l.name)}</text>
<text x="${lx + barW / 2 - 16}" y="${ly}" font-family="${FONT}" font-size="12" fill="${C.muted}" text-anchor="end">${l.pct.toFixed(1)}%</text>`;
  }).join('\n');
  const h = 92 + rows * 22 + 8;
  const clip = `<clipPath id="r"><rect x="24" y="52" width="${barW}" height="10" rx="5"/></clipPath>`;
  return frame(w, h, '~/cavemangames/languages', `<defs>${clip}</defs><g clip-path="url(#r)">${bar}</g>\n${legend}`);
}

async function main() {
  const repos = await loadRepos();
  const s = summarize(repos);
  const updated = new Date().toISOString().slice(0, 10);
  writeFileSync(`${OUT_DIR}/stats.svg`, statsSvg(s, updated));
  writeFileSync(`${OUT_DIR}/languages.svg`, languagesSvg(s));
  // Totals only: safe to print in public Actions logs.
  console.log(JSON.stringify({ repos: s.repos, public: s.public, private: s.private, languages: s.languageCount }));
}

if (import.meta.url === `file://${argv[1]}`) {
  main().catch((e) => { console.error(e.message); exit(1); });
}
