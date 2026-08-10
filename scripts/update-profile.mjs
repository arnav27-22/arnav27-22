import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN = process.env.GH_TOKEN || '';
const SEED_FILE = process.env.SEED_FILE || '';
const USER = 'arnav27-22';
const ROOT = process.cwd();
const README_PATH = join(ROOT, 'README.md');
const DATA_PATH = join(ROOT, 'generated', 'github-data.json');
const REGIONS = ['SYNC', 'STATS', 'STATS2', 'TECH', 'PROJECTS'];

const mono = "'JetBrains Mono',Consolas,monospace";
const C = {
  cyan: '#22d3ee', soft: '#7dd3fc', blue: '#60a5fa', purple: '#a78bfa',
  green: '#34d399', yellow: '#eab308',
  panel: '#0f1720', border: '#223148',
  a: '#f1f5f9', b: '#cbd5e1', c: '#a3b3c8', mute: '#6b7f96', dim: '#475569',
};

const SKILL = {
  TypeScript: 'ts', JavaScript: 'js', HTML: 'html', CSS: 'css', Dockerfile: 'docker',
  Python: 'python', Go: 'go', Shell: 'bash', Java: 'java', 'C++': 'cpp', C: 'c',
  PHP: 'php', Ruby: 'ruby', Rust: 'rust', Swift: 'swift', Kotlin: 'kotlin', 'C#': 'cs',
  Vue: 'vue', Svelte: 'svelte', Astro: 'astro', Dart: 'dart', Lua: 'lua',
  Markdown: 'md', JSON: 'json', YAML: 'yaml', MDX: 'mdx', Solidity: 'solidity', Zig: 'zig',
  Scala: 'scala', R: 'r', Elixir: 'elixir', Haskell: 'haskell', Nix: 'nix', Perl: 'perl',
};

const CURATED = {
  'arom-studio': 'Web design & development agency platform: marketing experience and admin dashboard in React 19 + Vite, backed by an Express 5 API with Prisma + PostgreSQL, Redis caching, S3 / Vercel Blob storage, email automation, JWT auth, document generation, analytics, CI/CD and Docker. Deployed on Vercel.',
  'Share-FIle': 'Secure file-sharing platform on Next.js 15 + React 19: password-protected links, expiration timers, custom aliases, AES-256 encryption, WebRTC peer-to-peer transfer, multi-cloud storage (S3 / R2 / B2) and QR download codes — glassmorphism UI with Framer Motion.',
};

const HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'profile-sync',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function tryGet(url) {
  try {
    const res = await fetch(url, { headers: { ...HEADERS, Accept: 'application/vnd.github.mercy-preview+json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCommits() {
  if (!TOKEN) return null;
  const query = `query { user(login: "${USER}") { contributionsCollection { totalCommitContributions } } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data?.user?.contributionsCollection?.totalCommitContributions ?? null;
}

function esc(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function humanSize(kb) {
  if (kb < 1) return '—';
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function score(r) {
  const ageDays = (Date.now() - Date.parse(r.pushed_at)) / 86400000;
  return (ageDays < 7 ? 60 : ageDays < 30 ? 50 : ageDays < 90 ? 35 : ageDays < 180 ? 20 : 10)
    + Math.min(r.size / 400, 20)
    + Math.min(r.stargazers_count * 4, 16)
    + (r.homepage ? 12 : 0)
    + (r.description ? 8 : 0)
    + 5;
}

function pill(status) {
  const map = {
    FLAGSHIP: [C.soft, C.cyan], 'IN DEVELOPMENT': [C.green, C.green],
    'EARLY STAGE': [C.yellow, C.yellow], EXPERIMENTAL: [C.purple, C.purple],
  };
  const [text, dot] = map[status] ?? [C.b, C.dim];
  return `<span style="display:inline-block;border-radius:999px;padding:3px 11px;font-size:10px;color:${text};letter-spacing:1.5px;font-family:${mono};"><span style="color:${dot};">●</span> ${status}</span>`;
}

function subtitle(p) {
  const raw = p.description || CURATED[p.name] || (p.name === 'arom-studio' ? 'a full-stack agency platform' : '');
  if (!raw) return 'public repository';
  const cut = raw.length > 48 ? raw.slice(0, 48).replace(/\s+\S*$/, '') + '…' : raw;
  return esc(cut);
}

function card(p, isTop) {
  const meta = [];
  if (p.stars > 0) meta.push(`${p.stars} ⭐`);
  meta.push(p.pushed.slice(0, 10));
  meta.push(humanSize(p.size));
  const techs = [...new Set([p.language, ...p.related].filter(Boolean))].slice(0, 6).join(' · ');
  return `<td style="width:50%;vertical-align:top;">
  <table role="presentation" width="100%">
    <tr>
      <td style="background-color:${C.panel};border:1px solid ${isTop ? C.cyan : C.border};border-radius:14px;padding:20px 20px;">
        ${pill(p.status)}
        <br><br>
        <span style="font-size:20px;font-weight:700;color:${C.a};">${p.name}</span>
        <br>
        <span style="font-size:12px;color:${C.soft};font-family:${mono};">${p.subtitle}</span>
        <br><br>
        <span style="font-size:13px;color:${C.c};line-height:1.6;display:inline-block;">${esc(p.desc)}</span>
        <br><br>
        <span style="font-size:11.5px;color:${C.mute};">${techs}</span>
        <br><br>
        <a href="${p.url}" style="display:inline-block;background-color:${isTop ? C.cyan : '#21262d'};color:${isTop ? '#062018' : C.b};text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;padding:7px 14px;">VIEW REPOSITORY ↗</a>
        ${p.homepage ? `&nbsp;
        <a href="${p.homepage}" style="display:inline-block;background-color:#21262d;color:#dbe4ee;text-decoration:none;font-size:12px;font-weight:600;border-radius:8px;padding:7px 14px;">LIVE DEMO ↗</a>` : ''}
        <br><br>
        <span style="font-size:11px;color:${C.dim};font-family:${mono};">${meta.join(' · ')}</span>
      </td>
    </tr>
  </table>
</td>`;
}

function renderProjects(featured, others, empties) {
  let out = '<span style="display:block;text-align:center;padding-bottom:10px;font-family:' + mono + ';font-size:12px;color:' + C.cyan + ';letter-spacing:2px;">$ featured_projects</span>\n<br>\n';
  for (let i = 0; i < featured.length; i += 2) {
    const left = card(featured[i], i === 0);
    const right = featured[i + 1] ? card(featured[i + 1], false) : '<td style="width:50%;"></td>';
    out += `<table role="presentation" width="100%" style="max-width:840px;margin:0 auto;">
  <tr>
    ${left}
    <td style="width:2%;"></td>
    ${right}
  </tr>
</table>
<br>
`;
  }
  const chips = [
    ...others.map((p) => ({ name: p.name, note: '(experimental)', url: p.url })),
    ...empties.map((p) => ({ name: p.name, note: '(empty)', url: p.url })),
  ];
  if (chips.length) {
    out += `<span style="display:block;text-align:center;font-family:${mono};font-size:12px;color:${C.cyan};letter-spacing:2px;">$ other_repos — placeholders &amp; experiments</span>\n<br>\n`;
    for (const c of chips) {
      const pillStyle = `display:inline-block;background-color:#101a28;border:1px solid ${C.border};border-radius:999px;padding:5px 14px;font-size:12px;color:${C.b};text-decoration:none;margin:3px;`;
      out += `<a href="${c.url}" style="${pillStyle}">${c.name} <span style="color:${C.mute};">${c.note}</span></a>\n`;
    }
    out += '<br>\n';
  }
  return out;
}

function renderStats(s) {
  const cells = [
    ['REPOSITORIES', String(s.repos), C.cyan],
    ['STARS', String(s.stars), C.soft],
    ['FOLLOWERS', String(s.followers), C.blue],
    ['FOLLOWING', String(s.following), C.purple],
    ['FORKS', String(s.forks), C.yellow],
  ];
  let out = '<table role="presentation" width="100%" style="max-width:840px;margin:0 auto;">\n  <tr>\n';
  for (let i = 0; i < cells.length; i++) {
    const [label, value, color] = cells[i];
    if (i > 0) out += '    <td style="width:1%;"></td>\n';
    out += `    <td style="background-color:${C.panel};border:1px solid ${C.border};border-radius:14px;padding:18px 10px;text-align:center;width:19%;">
      <span style="font-size:30px;font-weight:700;color:${color};font-family:${mono};">${value}</span><br>
      <span style="font-size:10.5px;color:${C.mute};letter-spacing:2px;">${label}</span>
    </td>
`;
  }
  out += '  </tr>\n</table>';
  return out;
}

function renderPanel(s, date) {
  return `<span style="font-size:13px;color:${C.b};line-height:2;display:inline-block;font-family:${mono};">
        repositories&nbsp;&nbsp;&nbsp;<span style="color:${C.soft};">${s.repos}</span><br>
        stars&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:${C.soft};">${s.stars}</span><br>
        forks&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:${C.soft};">${s.forks}</span><br>
        top_langs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:${C.soft};">${s.topLangs.join(' · ')}</span>
      </span>
      <br><br>
      <span style="font-size:10.5px;color:${C.dim};">auto-synced <span style="color:${C.mute};">${date}</span> · UTC · daily · github actions</span>`;
}

function renderSync(stats, date, commits, lastPush) {
  const badges = [
    `<img src="https://github.com/arnav27-22/arnav27-22/actions/workflows/update-profile.yml/badge.svg" alt="Profile sync workflow status" height="20">`,
    `<img src="https://github.com/arnav27-22/arnav27-22/actions/workflows/snake.yml/badge.svg" alt="Contribution snake workflow status" height="20">`,
  ];
  let line = `<span style="color:${C.green};">●</span> PROFILE SYNCED`;
  line += ` · last sync <span style="color:${C.soft};">${date}</span> UTC`;
  if (commits) line += ` · commits <span style="color:${C.soft};">${commits}</span>`;
  line += ` · latest_push <span style="color:${C.soft};">${lastPush}</span>`;
  return `<span style="display:block;text-align:center;color:${C.mute};font-size:12px;font-family:${mono};">${line}</span>
<span style="display:block;text-align:center;margin-top:8px;">${badges.join('&nbsp; ')}</span>`;
}

function renderTech(topLangs) {
  const icons = topLangs.map((l) => SKILL[l]).filter(Boolean).slice(0, 8);
  const iconsRow = icons.length
    ? `<img src="https://skillicons.dev/icons?i=${icons.join(',')}&theme=dark" alt="${topLangs.slice(0, 6).join(', ')}" height="34">`
    : '';
  return `<span style="display:block;text-align:center;color:${C.faint ?? C.dim};font-size:11px;font-family:${mono};">top languages by bytes → <span style="color:${C.mute};">${topLangs.join(' · ')}</span> · auto-detected</span>
      <br>
      ${iconsRow}`;
}

function setRegion(md, name, content) {
  const pattern = new RegExp(`<!-- AUTO:${name}_START -->[\\s\\S]*?<!-- AUTO:${name}_END -->`, 'g');
  const next = `<!-- AUTO:${name}_START -->\n\n${content}\n\n<!-- AUTO:${name}_END -->`;
  if (!pattern.test(md)) throw new Error(`region not found: ${name}`);
  return md.replace(pattern, next);
}

function validateSnippet(snippet, label) {
  for (const tag of ['table', 'tr', 'td', 'span', 'a']) {
    const open = (snippet.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const close = (snippet.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) throw new Error(`${label}: tag <${tag}> open=${open} close=${close}`);
  }
}

async function main() {
  let prev = null;
  try { prev = JSON.parse(readFileSync(DATA_PATH, 'utf8')); } catch { /* no cache yet */ }

  let user, repos;
  if (SEED_FILE) {
    const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
    user = seed.user;
    repos = seed.repos;
    console.log(`seeded from ${SEED_FILE} (${repos.length} repos)`);
  } else {
    try {
      [user, repos] = await Promise.all([
        getJson(`https://api.github.com/users/${USER}`),
        getJson(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated&type=public`),
      ]);
    } catch (err) {
      console.warn(`SYNC SKIPPED: GitHub API unreachable (${err.message}). Keeping previous working data.`);
      process.exit(0);
    }
  }

  const bytes = {};
  const featured = [];
  const others = [];
  const empties = [];

  for (const r of repos) {
    if (r.fork || r.archived) continue;
    if (r.name === USER) continue;
    if (r.size === 0) {
      empties.push({ name: r.name, url: r.html_url });
      continue;
    }
    const [langs, readme] = r.languages
      ? [r.languages, await tryGet(`https://api.github.com/repos/${USER}/${r.name}/readme`)]
      : await Promise.all([
          tryGet(`https://api.github.com/repos/${USER}/${r.name}/languages`),
          tryGet(`https://api.github.com/repos/${USER}/${r.name}/readme`),
        ]);
    if (langs) for (const [l, b] of Object.entries(langs)) bytes[l] = (bytes[l] || 0) + b;
    const p = {
      name: r.name,
      url: r.html_url,
      homepage: r.homepage || null,
      description: r.description || null,
      language: r.language,
      languages: langs,
      stars: r.stargazers_count,
      forks: r.forks_count,
      size: r.size,
      pushed: r.pushed_at,
      hasReadme: Boolean(readme),
      score: score(r) + (readme ? 1 : 0),
    };
    (score(r) + (readme ? 1 : 0) >= 20 ? featured : others).push(p);
  }

  const bytesList = Object.entries(bytes).sort((a, b) => b[1] - a[1]).map(([l]) => l);
  const topLangs = bytesList.length ? bytesList.slice(0, 5) : (prev?.stats?.topLangs ?? []);
  const related = bytesList.length ? bytesList.slice(0, 4) : (prev?.stats?.topLangs ?? []).slice(0, 4);

  const totalStars = repos.reduce((t, r) => t + r.stargazers_count, 0);
  const totalForks = repos.reduce((t, r) => t + r.forks_count, 0);

  featured.sort((a, b) => b.score - a.score);
  const selected = featured.slice(0, 3);
  const rest = [...featured.slice(3), ...others].sort((a, b) => b.score - a.score);

  const now = Date.now();
  selected.forEach((p, i) => {
    const ageDays = (now - Date.parse(p.pushed)) / 86400000;
    if (i === 0 && p.homepage) p.status = 'FLAGSHIP';
    else if (ageDays < 60) p.status = 'IN DEVELOPMENT';
    else if (p.homepage || p.description) p.status = 'EARLY STAGE';
    else p.status = 'EXPERIMENTAL';
    p.subtitle = subtitle(p);
    p.desc = p.description || CURATED[p.name] || (p.hasReadme ? 'Featured repository — README documents the project.' : 'Public repository — explore the code.');
    p.related = related;
  });
  rest.forEach((p) => (p.related = related));

  const newest = [...selected, ...rest].sort((a, b) => Date.parse(b.pushed) - Date.parse(a.pushed))[0];
  const lastPush = newest ? `${newest.name} · ${newest.pushed.slice(0, 10)}` : '—';

  const commits = await fetchCommits();
  const today = new Date().toISOString().slice(0, 10);

  const data = {
    generatedAt: new Date().toISOString(),
    source: 'github-api',
    user: {
      login: user.login, name: user.name, followers: user.followers,
      following: user.following, publicRepos: user.public_repos,
      avatarUrl: user.avatar_url, createdAt: user.created_at.slice(0, 10),
    },
    stats: { repos: repos.length, stars: totalStars, forks: totalForks, followers: user.followers, following: user.following, topLangs },
    commits,
    lastPush,
    empties,
    projects: [...selected, ...rest].map((p) => ({
      name: p.name, description: p.description, curated: p.description ? null : CURATED[p.name] ?? null,
      language: p.language, languages: p.languages ?? null, stars: p.stars, forks: p.forks, pushedAt: p.pushed,
      homepage: p.homepage, size: p.size, hasReadme: p.hasReadme, score: p.score, status: p.status ?? null,
    })),
  };

  const R = {
    SYNC: renderSync(data.stats, today, commits, lastPush),
    STATS: renderStats(data.stats),
    STATS2: renderPanel(data.stats, today),
    TECH: renderTech(topLangs),
    PROJECTS: renderProjects(selected, rest, empties),
  };

  for (const name of REGIONS) validateSnippet(R[name], name);

  let md = readFileSync(README_PATH, 'utf8');
  for (const name of REGIONS) md = setRegion(md, name, R[name]);
  const originalMd = readFileSync(README_PATH, 'utf8');
  const mdChanged = md !== originalMd;

  JSON.parse(JSON.stringify(data));
  const originalData = (() => {
    try { return readFileSync(DATA_PATH, 'utf8'); } catch { return null; }
  })();
  const stable = (obj) => {
    const copy = { ...obj };
    delete copy.generatedAt;
    return JSON.stringify(copy);
  };
  const dataChanged = originalData === null || stable(JSON.parse(originalData)) !== stable(data);

  if (!mdChanged && !dataChanged) {
    console.log('no changes to commit');
    return;
  }
  if (mdChanged) writeFileSync(README_PATH, md, 'utf8');
  if (dataChanged) {
    mkdirSync(join(ROOT, 'generated'), { recursive: true });
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  }
  console.log(`profile data synced (readme=${mdChanged}, data=${dataChanged}) · featured=${selected.length} · stats repos=${data.stats.repos} stars=${data.stats.stars}`);
}

main().catch((err) => {
  console.error('SYNC FAILED:', err.message);
  process.exit(1);
});