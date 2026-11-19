# Corazón humano 3D · Human Heart 3D

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · Models: CC BY 4.0

## English

Interactive 3D human heart for any browser, from tiny 2.5" screens to 50" displays.

- **Exterior view** — closed heart with a realistic "lub-dub" beat.
- **Longitudinal cut** — animated heart cut by a fixed plane; 16 labelled parts in 4 filterable groups (chambers, valves, great vessels, structures); chambers and valves are anchored to the model's own skeleton, vessels/structures are estimated from its geometry, plus blood-flow particles (blue = deoxygenated, red = oxygenated).
- Gold/silver/navy gradient background, soft projected shadows, BPM slider (40–180), pause.
- Synthesized heartbeat and pumping sound (Web Audio, off by default; toggle with the ♪ button or `M`).
- Buttons: rotate, tilt, zoom in/out, reset. Keys: arrows, `+`/`-`, `0`, Space, Esc.
- Layout never overlaps the model; the camera always fits the viewport, so the image is never stretched.

**Visit counter (bottom-left)**: shows the current year's total and the top 4 countries. It runs on a Vercel serverless function (`api/visits.js`) + free Upstash Redis. Setup: Vercel project → *Storage / Marketplace* → add *Upstash Redis* (free) → connect it to the project → redeploy (or set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, see `.env.example`; optional `COUNTER_TZ`). Counters are keyed by year, so they restart every calendar year. **Privacy**: IPs are not stored — only counts per country code; every page load counts as one visit (not de-duplicated by IP or browser). Design preview without backend: open `/?demo`.

**Run locally** (a server is required; `file://` cannot load `.glb`): `npx serve .` or `python3 -m http.server`

**Deploy for free (no build step, no env vars)**
1. Push to GitHub. 2. On [vercel.com](https://vercel.com) → *Add New Project* → import the repo → Framework *Other* → Deploy. `vercel.json` adds the security headers. Alternatives: Cloudflare Pages, Netlify, GitHub Pages (the CSP `<meta>` in `index.html` still applies).

**Security**: static site, no backend, no secrets, no third-party requests; strict CSP (no inline scripts/styles), HSTS, `nosniff`, no framing. Before publishing run `git grep -iE "key|token|secret|password"`, keep `.env` out of git (see `.gitignore`), enable 2FA and GitHub secret scanning/Dependabot. three.js r128 is vendored; consider upgrading it.

**Tuning**: if the cut plane needs adjusting, change `CUT_OFFSET` in `js/app.js`. Textures are large (~19 MB total); the cut model loads only on demand.

**License**: code under [MIT](LICENSE). The 3D models are **not** MIT: they are CC BY 4.0 by *neshallads* and *jalmer* (Sketchfab) — keep the attribution.

## Español

Corazón humano 3D interactivo para cualquier navegador, desde pantallas de 2,5" hasta 50".

- **Vista exterior** — corazón cerrado con latido realista «lub-dub».
- **Corte longitudinal** — corazón animado cortado por un plano fijo; 16 partes rotuladas en 4 grupos filtrables (cámaras, válvulas, grandes vasos, estructuras); cámaras y válvulas están ancladas al esqueleto del modelo, vasos y estructuras se estiman a partir de su geometría, más partículas de flujo sanguíneo (azul = desoxigenada, rojo = oxigenada).
- Fondo degradado azul marino/plateado/dorado, sombras proyectadas suaves, control de lpm (40–180) y pausa.
- Sonido sintetizado de latido y bombeo (Web Audio, desactivado por defecto; botón ♪ o tecla `M`).
- Botones: girar, inclinar, ampliar/reducir, restablecer. Teclas: flechas, `+`/`-`, `0`, Espacio, Esc.
- Los paneles nunca tapan el modelo; la cámara se ajusta siempre a la pantalla, por lo que la imagen no se deforma.

**Contador de visitas (abajo a la izquierda)**: muestra el total del año en curso y el top 4 de países. Usa una función serverless de Vercel (`api/visits.js`) + Upstash Redis gratuito. Configuración: proyecto en Vercel → *Storage / Marketplace* → añadir *Upstash Redis* (gratis) → conectarlo al proyecto → volver a desplegar (o definir `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, ver `.env.example`; opcional `COUNTER_TZ`). Los contadores se guardan por año, así que se reinician cada año calendario. **Privacidad**: no se guardan IP, solo conteos por código de país; cada carga de la página cuenta como una visita (sin deduplicar por IP ni navegador). Vista previa del diseño sin backend: abre `/?demo`.

**Ejecutar en local** (requiere servidor; con `file://` no cargan los `.glb`): `npx serve .` o `python3 -m http.server`

**Despliegue gratuito (sin compilación ni variables de entorno)**
1. Sube a GitHub. 2. En [vercel.com](https://vercel.com) → *Add New Project* → importa el repositorio → Framework *Other* → Deploy. `vercel.json` añade las cabeceras de seguridad. Alternativas: Cloudflare Pages, Netlify, GitHub Pages (la CSP del `<meta>` en `index.html` sigue aplicando).

**Seguridad**: sitio estático, sin backend, sin secretos ni peticiones a terceros; CSP estricta (sin scripts/estilos en línea), HSTS, `nosniff`, sin incrustación en iframes. Antes de publicar ejecuta `git grep -iE "key|token|secret|password"`, no subas `.env` (ver `.gitignore`), activa 2FA y el escaneo de secretos/Dependabot en GitHub. three.js r128 va incluido localmente; conviene actualizarlo.

**Ajuste**: si el plano de corte necesita ajuste, cambia `CUT_OFFSET` en `js/app.js`. Las texturas son pesadas (~19 MB); el modelo de corte se carga solo bajo demanda.

**Licencia**: código bajo [MIT](LICENSE). Los modelos 3D **no** son MIT: son CC BY 4.0 de *neshallads* y *jalmer* (Sketchfab) — conserva la atribución.
