'use strict';
// Contador de visitas por país / Per-country visit counter.
// País: cabecera x-vercel-ip-country (Vercel). NO se guarda la IP: solo contadores por código de país y año.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const TZ = process.env.COUNTER_TZ || 'America/Bogota';
const SAMPLE = ['CO', 'MX', 'ES', 'US', 'AR', 'PE', 'CL']; // solo en modo prueba (sin Redis)
const mem = globalThis.__vmem || (globalThis.__vmem = {});

const year = () => new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric' }).format(new Date());

async function redis(cmds) {
  const r = await fetch(URL_ + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map(x => { if (x.error) throw new Error(x.error); return x.result; });
}

function sameOrigin(req) {
  const sf = req.headers['sec-fetch-site'];
  if (sf && sf !== 'same-origin') return false;
  const o = req.headers.origin;
  if (o) { try { return new URL(o).host === req.headers.host; } catch (e) { return false; } }
  return !!sf;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };

  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { error: 'method' }); }
  const persistent = !!(URL_ && TOKEN);
  if (!persistent && process.env.VERCEL_ENV === 'production') return send(503, { error: 'not-configured' });

  const y = year(), kc = `visits:${y}:c`, kt = `visits:${y}:t`; // clave por año: se "reinicia" cada año calendario
  try {
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(403, { error: 'origin' });
      const ua = String(req.headers['user-agent'] || '');
      if (!/bot|crawl|spider|slurp|headless/i.test(ua)) {
        let c = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
        if (!persistent && !c) c = SAMPLE[(Math.random() * SAMPLE.length) | 0];
        if (!/^[A-Z]{2}$/.test(c)) c = 'XX';
        if (persistent) await redis([['HINCRBY', kc, c, 1], ['INCR', kt]]);
        else { const m = mem[y] || (mem[y] = { t: 0, c: {} }); m.t++; m.c[c] = (m.c[c] || 0) + 1; }
      }
    }
    let total = 0, map = {};
    if (persistent) {
      const [h, t] = await redis([['HGETALL', kc], ['GET', kt]]);
      total = +t || 0;
      for (let i = 0; i < (h || []).length; i += 2) map[h[i]] = +h[i + 1];
    } else { const m = mem[y] || { t: 0, c: {} }; total = m.t; map = m.c; }
    const top = Object.entries(map).filter(([c]) => c !== 'XX').sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => ({ c, n }));
    send(200, { year: +y, total, top, mem: !persistent });
  } catch (e) { send(502, { error: 'store' }); }
};
