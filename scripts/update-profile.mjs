import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TOKEN = process.env.GH_TOKEN || '';
const SEED_FILE = process.env.SEED_FILE || '';
const USER = 'arnav27-22';
const ROOT = process.cwd();
const README_PATH = join(ROOT, 'README.md');
const DATA_PATH = join(ROOT, 'generated', 'github-data.json');
const TECH_DATA_PATH = join(ROOT, 'generated', 'tech.json');
const AVATAR_PATH = join(ROOT, 'assets', 'avatar.png');
const CONTRIB_PATH = join(ROOT, 'assets', 'contribution.svg');
const TECH_DIR = join(ROOT, 'assets', 'tech');
const REGIONS = ['SYNC', 'TECH', 'TECH2', 'PROJECTS', 'LIVE', 'CONTRIB'];
const mono = "'JetBrains Mono',Consolas,monospace";

const C = {
  cyan: '#caff3c', soft: '#8aff57', blue: '#7dff9a', purple: '#b8ffd0',
  green: '#39ff14', yellow: '#eaff3c',
  panel: '#0a0f08', border: '#1a2b1a',
  a: '#e8f5e1', b: '#c8e6b5', c: '#a8c99a', mute: '#6f9c6f', dim: '#44633f',
};

const CURATED = {
  'arom-studio': 'Web design & development agency platform: marketing experience and admin dashboard in React 19 + Vite, backed by an Express 5 API with Prisma + PostgreSQL, Redis caching, S3 / Vercel Blob storage, email automation, JWT auth, document generation, analytics, CI/CD and Docker. Deployed on Vercel.',
  'Share-FIle': 'Secure file-sharing platform on Next.js 15 + React 19: password-protected links, expiration timers, custom aliases, AES-256 encryption, WebRTC peer-to-peer transfer, multi-cloud storage (S3 / R2 / B2) and QR download codes — glassmorphism UI with Framer Motion.',
};

const TECH_META = {
  typescript: { label: 'TypeScript', logo: 'typescript.svg', cat: 'core' },
  javascript: { label: 'JavaScript', logo: 'javascript.svg', cat: 'core' },
  html: { label: 'HTML', logo: 'html5.svg', cat: 'core' },
  css: { label: 'CSS', logo: 'css3.svg', cat: 'core' },
  react: { label: 'React', logo: 'react.svg', cat: 'ui' },
  'next.js': { label: 'Next.js', logo: 'nextdotjs.svg', cat: 'ui' },
  vite: { label: 'Vite', logo: 'vite.svg', cat: 'ui' },
  tailwind: { label: 'Tailwind CSS', logo: 'tailwindcss.svg', cat: 'ui' },
  framer: { label: 'Framer Motion', logo: 'framer.svg', cat: 'ui' },
  node: { label: 'Node.js', logo: 'nodedotjs.svg', cat: 'backend' },
  express: { label: 'Express', logo: 'express.svg', cat: 'backend' },
  prisma: { label: 'Prisma', logo: 'prisma.svg', cat: 'backend' },
  postgresql: { label: 'PostgreSQL', logo: 'postgresql.svg', cat: 'backend' },
  redis: { label: 'Redis', logo: 'redis.svg', cat: 'backend' },
  aws: { label: 'AWS', logo: 'amazonaws.svg', cat: 'cloud' },
  docker: { label: 'Docker', logo: 'docker.svg', cat: 'cloud' },
  vercel: { label: 'Vercel', logo: 'vercel.svg', cat: 'cloud' },
};
const LANG_TO_TECH = { TypeScript: 'typescript', JavaScript: 'javascript', HTML: 'html', CSS: 'css', Dockerfile: 'docker', Python: 'python', Go: 'go', Shell: 'bash' };
const DEP2TECH = [
  [/^@prisma|^prisma$/, 'prisma'],
  [/^@tailwindcss|^tailwindcss|^tailwind-merge$/, 'tailwind'],
  [/^framer-motion$/, 'framer'],
  [/^next$/, 'next.js'],
  [/^vite$|^@vitejs/, 'vite'],
  [/^react/, 'react'],
  [/^express$|^@types\/express/, 'express'],
  [/^ioredis$|^redis/, 'redis'],
  [/^pg$|^@neondatabase/, 'postgresql'],
  [/^@aws-sdk/, 'aws'],
  [/^@vercel/, 'vercel'],
  [/^nodemailer|^sharp$|^zod$|^qrcode$|^jsone?|^bcryptjs|^zustand$|^@tanstack|^recharts|lucide-|^gsap|^ws$|^vitest$|^uuid$/, 'node'],
];
const CAT_ORDER = ['core', 'ui', 'backend', 'cloud'];
const CAT_LABEL = { core: 'LANGUAGES', ui: 'FRAMEWORKS & UI', backend: 'BACKEND & DATA', cloud: 'CLOUD & TOOLS' };

function techFromDeps(pkg) {
  const keys = new Set();
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  for (const [re, tech] of DEP2TECH) {
    if (Object.keys(deps).some((d) => re.test(d))) keys.add(tech);
  }
  if (pkg?.dependencies?.typescript || pkg?.devDependencies?.typescript) keys.add('typescript');
  return [...keys];
}

async function fetchRepoDeps(name) {
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${USER}/${name}/${branch}/package.json`, { headers: HEADERS });
      if (!res.ok) continue;
      const pkg = await res.json();
      return techFromDeps(pkg);
    } catch { /* try next branch */ }
  }
  return [];
}

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
        <a href="${p.url}" style="display:inline-block;background-color:${isTop ? C.cyan : '#1a2b1a'};color:${isTop ? '#0a0f08' : C.b};text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;padding:7px 14px;">VIEW REPOSITORY ↗</a>${p.homepage ? `
        <a href="${p.homepage}" style="display:inline-block;background-color:#1a2b1a;color:#c8e6b5;text-decoration:none;font-size:12px;font-weight:600;border-radius:8px;padding:7px 14px;">LIVE DEMO ↗</a>` : ''}
        <br><br>
        <span style="font-size:11px;color:${C.dim};font-family:${mono};">${meta.join(' · ')}</span>
      </td>
    </tr>
  </table>
</td>`;
}

function renderProjects(featured) {
  if (!featured.length) return `<div style="font-size:11.5px;color:${C.mute};font-family:${mono};text-align:center;">no featured repositories yet</div>`;
  let out = '';
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
  return out;
}

function liveCard(p) {
  const desc = (p.description || CURATED[p.name] || 'public repository').length > 64
    ? (p.description || CURATED[p.name] || 'public repository').slice(0, 64).replace(/\s+\S*$/, '') + '…'
    : (p.description || CURATED[p.name] || 'public repository');
  return `<td style="width:50%;vertical-align:top;">
  <table role="presentation" width="100%">
    <tr>
      <td style="background-color:${C.panel};border:1px solid ${C.border};border-radius:14px;padding:18px 20px;">
        <span style="font-size:16px;font-weight:700;color:${C.a};">${esc(p.name)}</span>
        <br>
        <span style="font-size:12.5px;color:${C.c};line-height:1.6;display:inline-block;">${esc(desc)}</span>
        <br><br>
        <a href="${esc(p.homepage)}" style="display:inline-block;background-color:${C.cyan};color:#0a0f08;text-decoration:none;font-size:12px;font-weight:700;border-radius:8px;padding:7px 14px;">LIVE DEMO ↗</a>
        &nbsp;
        <a href="${p.url}" style="display:inline-block;background-color:#1a2b1a;color:${C.b};text-decoration:none;font-size:12px;font-weight:600;border-radius:8px;padding:7px 14px;">GITHUB</a>
      </td>
    </tr>
  </table>
</td>`;
}

function renderLive(deployed) {
  if (!deployed.length) return `<div style="font-size:11.5px;color:${C.mute};font-family:${mono};text-align:center;">no deployments detected</div>`;
  let out = `<div style="font-size:11.5px;color:${C.mute};font-family:${mono};text-align:center;letter-spacing:1px;">${deployed.length} verified deployment${deployed.length === 1 ? '' : 's'}</div>\n<br>\n`;
  for (let i = 0; i < deployed.length; i += 2) {
    const left = liveCard(deployed[i]);
    const right = deployed[i + 1] ? liveCard(deployed[i + 1]) : '<td style="width:50%;"></td>';
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

function renderProfile(s, date) {
  return `<div style="text-align:center;">
  <div style="font-size:12px;color:${C.green};font-family:${mono};letter-spacing:1px;line-height:2;"><span style="color:${C.green};">●</span> <strong>ONLINE</strong> · SYNCED</div>
  <br>
  <div style="font-size:30px;font-weight:700;color:${C.soft};font-family:${mono};line-height:1.1;">${s.stars}</div>
  <div style="font-size:10.5px;color:${C.mute};letter-spacing:2px;padding-bottom:10px;">STARS</div>
  <div style="font-size:12px;color:${C.b};font-family:${mono};">followers <span style="color:${C.soft};">${s.followers}</span> · following <span style="color:${C.soft};">${s.following}</span></div>
  <br>
  <div style="font-size:10.5px;color:${C.dim};font-family:${mono};">signal ${s.repos}.${s.stars}.${s.forks} · sync ${date}</div>
</div>`;
}

function renderSync(stats, date, commits, lastPush) {
  const cmd = lastPush ? ` · latest_repo <span style="color:${C.soft};">${esc(lastPush)}</span>` : '';
  return `<div style="text-align:center;font-family:${mono};font-size:12px;color:${C.mute};letter-spacing:1px;"><span style="color:${C.green};">●</span> <span style="color:${C.b};">PROFILE DATA SYNCED</span> · <span style="color:${C.soft};">${date}</span> UTC${commits ? ` · commits <span style="color:${C.soft};">${commits}</span>` : ''}${cmd}</div>`;
}

function localLogos() {
  try { return new Set(readdirSync(TECH_DIR).filter((f) => f.endsWith('.svg'))); } catch { return new Set(); }
}

const LOGOS = localLogos();

function techImg(key, height) {
  const m = TECH_META[key];
  if (!m || !LOGOS.has(m.logo)) return null;
  return `<img src="./assets/tech/${m.logo}" alt="${m.label}" title="${m.label}" height="${height}">`;
}

function renderPills(techKeys) {
  const pills = techKeys.map((k) => {
    const m = TECH_META[k];
    if (!m || !LOGOS.has(m.logo)) return null;
    return `<span style="display:inline-block;background-color:#0d1508;border:1px solid #1a2b1a;border-radius:999px;padding:4px 12px;margin:2px 3px;"><img src="./assets/tech/${m.logo}" width="15" height="15" alt="${m.label}" style="vertical-align:-2px;"> <span style="font-size:12px;color:${m.cat === 'core' ? C.soft : C.b};">${m.label}</span></span>`;
  }).filter(Boolean);
  return `<div>${pills.join('\n      ')}</div>`;
}

function renderTechTable(techKeys) {
  const groups = CAT_ORDER.map((cat) => {
    const techs = techKeys.filter((k) => TECH_META[k]?.cat === cat);
    const imgs = techs.map((k) => techImg(k, 26)).filter(Boolean);
    if (!imgs.length) return null;
    return [
      `<tr>`,
      `  <td style="width:22%;text-align:left;font-size:11px;color:${C.mute};letter-spacing:2px;vertical-align:middle;">${CAT_LABEL[cat]}</td>`,
      `  <td style="text-align:left;">${imgs.join('&nbsp;&nbsp; ')}</td>`,
      `</tr>`,
      ...(techs.length ? [`<tr><td colspan="2" style="padding-top:12px;font-size:11px;color:${C.dim};">${techs.map((k) => TECH_META[k].label).join(' · ')}</td></tr>`] : []),
    ].join('\n');
  }).filter(Boolean);
  return `<table role="presentation" width="100%">\n${groups.join('\n')}\n</table>`;
}

async function renderContributionSvg() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, { headers: { 'User-Agent': 'profile-sync' } });
  if (!res.ok) throw new Error(`contributions fetch -> ${res.status}`);
  const html = await res.text();
  const cells = [...html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([0-4])"/g)]
    .map((m) => ({ date: m[1], level: Number(m[2]) }));
  if (!cells.length) throw new Error('contributions parse failed');
  const totalMatch = html.match(/([\d,]+)\s*contributions?\s*in the last year/);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : null;
  const dates = cells.map((c) => c.date).sort();
  if (!dates.length) throw new Error('no contribution dates');
  const first = new Date(dates[0]);
  const PAL = { 0: '#141c27', 1: '#1a3c1f', 2: '#2c6b2e', 3: '#3f9e3f', 4: '#39ff14' };
  const CELL = 9, PITCH = 12, X0 = 34, Y0 = 22;
  const maxLvl = Math.max(...cells.map((c) => c.level));
  const months = new Map();
  let maxWeek = 0;
  const rects = cells.map((c) => {
    const d = new Date(c.date);
    const wi = Math.floor((d - first) / 86400000 / 7);
    const ri = Math.floor(((d - first) / 86400000) % 7);
    maxWeek = Math.max(maxWeek, wi);
    if (d.getDate() <= 2 && !months.has(wi)) months.set(wi, d.toLocaleString('en', { month: 'short' }));
    return { x: X0 + wi * PITCH, y: Y0 + ri * PITCH, fill: PAL[c.level], level: c.level };
  });
  const W = X0 + (maxWeek + 1) * PITCH + 16;
  const H = Y0 + 7 * PITCH + 46;
  const monthsHtml = [...months.entries()].map(([wi, m]) => `<text x="${X0 + wi * PITCH}" y="${Y0 - 8}" font-family="'JetBrains Mono',Consolas,monospace" font-size="9" fill="${C.mute}">${m}</text>`).join('\n');
  const rectsHtml = rects.map((r) =>
    `<rect x="${r.x}" y="${r.y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${r.fill}"${r.level === maxLvl && maxLvl > 0 ? ' class="hot"' : ''}/>`).join('\n');
  const dayLbl = ['sun', 'mon', 'wed', 'fri'].map((l, i) => `<text x="14" y="${Y0 + [0, 1, 3, 5][i] * PITCH + 7}" font-family="'JetBrains Mono',Consolas,monospace" font-size="9" fill="${C.dim}">${l}</text>`).join('\n');
  return {
    total,
    from: dates[0],
    to: dates[dates.length - 1],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="cg1 cg2">
  <title id="cg1">Contribution activity — arnav27-22</title>
  <desc id="cg2">Real GitHub contribution calendar for ARNAV PAGARE (@arnav27-22): ${total} contributions from ${dates[0]} to ${dates[dates.length - 1]}. Regenerated daily.</desc>
  <style>
    @keyframes cgpulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
    .hot { animation: cgpulse 3.4s ease-in-out infinite }
  </style>
  <rect width="${W}" height="${H}" rx="14" fill="${C.panel}"/>
  ${dayLbl}
  ${monthsHtml}
  ${rectsHtml}
</svg>`,
  };
}

async function writeIfChanged(path, content) {
  const next = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  let same = false;
  try { same = existsSync(path) && readFileSync(path).equals(next); } catch { /* missing */ }
  if (!same) writeFileSync(path, next);
  return !same;
}

async function syncAvatar(avatarUrl) {
  const sources = [avatarUrl, `https://github.com/${USER}.png?size=460`];
  for (const url of sources) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'profile-sync' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return await writeIfChanged(AVATAR_PATH, buf);
      }
    } catch { /* try next source */ }
  }
  console.warn('avatar: no PNG source available — keeping current avatar');
  return false;
}

function setRegion(md, name, content) {
  const pattern = new RegExp(`<!-- AUTO:${name}_START -->[\\s\\S]*?<!-- AUTO:${name}_END -->`, 'g');
  const next = `<!-- AUTO:${name}_START -->\n${content.trim()}\n<!-- AUTO:${name}_END -->`;
  if (!pattern.test(md)) throw new Error(`region not found: ${name}`);
  return md.replace(pattern, next);
}

function validateSnippet(snippet, label) {
  for (const tag of ['table', 'tr', 'td', 'span', 'a']) {
    const open = (snippet.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const close = (snippet.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) throw new Error(`${label}: tag <${tag}> open=${open} close=${close}`);
  }
  const first = snippet.split('\n').find((l) => l.trim());
  if (!first || !/^<(table|div|tbody|thead|p)/.test(first)) {
    throw new Error(`${label}: first line must be a block-level tag to survive GitHub's HTML blocks: ${String(first).slice(0, 60)}`);
  }
  if (snippet.split('\n').slice(0, -1).some((l) => !l.trim())) {
    throw new Error(`${label}: region content must not contain blank lines (they break GitHub's HTML blocks)`);
  }
}

function renderContrib(contrib) {
  if (!contrib?.total) return `<div style="font-size:11px;color:${C.mute};font-family:${mono};">activity · last 12 months</div>`;
  return `<div style="font-size:11px;color:${C.mute};font-family:${mono};">${contrib.total} contributions · ${contrib.from} → ${contrib.to}</div>`;
}

function deployedProjects(projects) {
  return projects.filter((p) => {
    try {
      const u = new URL(p.homepage);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
  }).map((p) => ({ ...p, homepage: new URL(p.homepage).toString().replace(/\/$/, '') }));
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

  let contrib = null;
  let contribSvg = null;
  try {
    const c = await renderContributionSvg();
    contribSvg = c.svg;
    contrib = { total: c.total ?? 0, from: c.from, to: c.to };
  } catch (err) {
    console.warn('contribution fetch failed — keeping previous asset —', err.message);
  }

  const repoDeps = {};
  const depTechs = new Set();
  for (const r of repos) {
    if (r.fork || r.archived || r.name === USER || r.size === 0) continue;
    const deps = await fetchRepoDeps(r.name);
    repoDeps[r.name] = deps;
    deps.forEach((t) => depTechs.add(t));
  }
  const langTechs = topLangs.map((l) => LANG_TO_TECH[l]).filter(Boolean);
  const depList = [...depTechs];
  const techKeys = [...new Set([
    ...langTechs,
    ...CAT_ORDER.flatMap((c) => depList.filter((k) => TECH_META[k]?.cat === c)),
  ])];
  const techData = {
    generatedAt: new Date().toISOString(),
    topLangs,
    repos: repoDeps,
    stack: techKeys.map((k) => ({ key: k, label: TECH_META[k]?.label ?? k, logo: TECH_META[k]?.logo ?? null, cat: TECH_META[k]?.cat ?? 'other' })),
  };

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
    contrib,
    empties,
    projects: [...selected, ...rest].map((p) => ({
      name: p.name, description: p.description, curated: p.description ? null : CURATED[p.name] ?? null,
      language: p.language, languages: p.languages ?? null, stars: p.stars, forks: p.forks, pushedAt: p.pushed,
      homepage: p.homepage, size: p.size, hasReadme: p.hasReadme, score: p.score, status: p.status ?? null,
    })),
  };

  const R = {
    SYNC: renderSync(data.stats, today, commits, lastPush),
    TECH: renderTechTable(techKeys),
    TECH2: renderPills(techKeys),
    PROJECTS: renderProjects(selected),
    LIVE: renderLive(deployedProjects([...selected, ...rest])),
    CONTRIB: renderContrib(data.contrib),
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

  let techChanged = false;
  try {
    const prevTech = (() => { try { return JSON.parse(readFileSync(TECH_DATA_PATH, 'utf8')); } catch { return null; } })();
    techChanged = prevTech === null || stable(prevTech) !== stable(techData);
    if (techChanged) {
      mkdirSync(join(ROOT, 'generated'), { recursive: true });
      writeFileSync(TECH_DATA_PATH, JSON.stringify(techData, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('tech.json: kept previous —', err.message);
  }

  let contribChanged = false;
  if (contribSvg) {
    try {
      contribChanged = await writeIfChanged(CONTRIB_PATH, contribSvg);
    } catch (err) {
      console.warn('contribution.svg: kept previous asset —', err.message);
    }
  }
  const avatarChanged = await syncAvatar(user.avatar_url);

  if (!mdChanged && !dataChanged && !techChanged && !contribChanged && !avatarChanged) {
    console.log('no changes to commit');
    return;
  }
  if (mdChanged) writeFileSync(README_PATH, md, 'utf8');
  if (dataChanged) {
    mkdirSync(join(ROOT, 'generated'), { recursive: true });
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  }
  console.log(`profile data synced (readme=${mdChanged}, data=${dataChanged}, tech=${techChanged}, contrib=${contribChanged}, avatar=${avatarChanged}) · featured=${selected.length} · stats repos=${data.stats.repos} stars=${data.stats.stars}`);
}

main().catch((err) => {
  console.error('SYNC FAILED:', err.message);
  process.exit(1);
});