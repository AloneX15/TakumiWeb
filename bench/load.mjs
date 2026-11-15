// Load test for TakumiWeb. Usage: node load.mjs [baseUrl] [only-substring]
import autocannon from 'autocannon';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3001';
const only = process.argv[3];
const tokens = JSON.parse(readFileSync(new URL('./tokens.json', import.meta.url)));
let t = 0;
const nextToken = () => tokens[t++ % tokens.length];
let u = 0;

const auth = (req) => ({ ...req, headers: { ...req.headers, authorization: `Bearer ${nextToken()}` } });

const scenarios = [
  { name: 'GET /api/health', requests: [{ path: '/api/health' }] },
  { name: 'GET /api/releases/latest', requests: [{ path: '/api/releases/latest' }] },
  { name: 'GET /api/news?limit=20', requests: [{ path: '/api/news?limit=20' }] },
  { name: 'GET /api/launcher/me (10k tokens)', requests: [{ path: '/api/launcher/me', setupRequest: auth }] },
  { name: 'GET / (inicio)', requests: [{ path: '/' }] },
  { name: 'GET /noticias', requests: [{ path: '/noticias' }] },
  { name: 'GET /descargas', requests: [{ path: '/descargas' }] },
  { name: 'GET /noticias/noticia-0', requests: [{ path: '/noticias/noticia-0' }] },
  {
    name: 'POST /api/launcher/login (argon2)',
    connections: 64,
    requests: [
      {
        method: 'POST',
        path: '/api/launcher/login',
        headers: { 'content-type': 'application/json' },
        setupRequest: (req) => ({
          ...req,
          body: JSON.stringify({ user: `bench${u++ % 10000}`, password: 'bench12345', device: 'bench' }),
        }),
      },
    ],
  },
  {
    // Every one of the 10,000 launchers starts at once: session check + update check + news.
    name: '10.000 launchers arrancando (me + latest + news)',
    amount: 30000,
    connections: 200,
    requests: [
      { path: '/api/launcher/me', setupRequest: auth },
      { path: '/api/releases/latest' },
      { path: '/api/news?limit=20' },
    ],
  },
];

const rows = [];
for (const s of scenarios) {
  if (only && !s.name.includes(only)) continue;
  const options = { url: BASE, connections: s.connections ?? 100, requests: s.requests };
  if (s.amount) options.amount = s.amount;
  else options.duration = 12;
  const r = await autocannon(options);
  const ok = r['2xx'];
  rows.push({
    escenario: s.name,
    'req/s': Math.round(r.requests.average),
    'p50 ms': r.latency.p50,
    'p99 ms': r.latency.p99,
    'max ms': r.latency.max,
    ok,
    'no-2xx': r.non2xx,
    errores: r.errors + r.timeouts,
    ...(s.amount ? { 'total s': ((r.finish - r.start) / 1000).toFixed(1) } : {}),
  });
  console.error('done', s.name);
}
console.table(rows);
