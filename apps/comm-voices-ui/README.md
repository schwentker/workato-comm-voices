# Workato Community Voices UI

Static Cloudflare Pages frontend for the `workato-comm-voices` MCP demo.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run cf:dev
```

## Local development

For direct Vite development without Cloudflare Pages functions:

```bash
VITE_COMM_VOICES_PROXY_DISABLED=true \
VITE_COMM_VOICES_API_BASE_URL=https://workato-comm-voices.fly.dev \
VITE_COMM_VOICES_API_TOKEN=your_comm_voices_api_token \
npm run dev
```

For local Pages-style development, copy `.dev.vars.example` to `.dev.vars` and run:

```bash
npm run build
npm run cf:dev
```

## Cloudflare Pages

Set the Pages project root to `apps/comm-voices-ui` and configure:

- Build command: `npm install && npm run build`
- Build output directory: `dist`

Pages environment variables:

- `COMM_VOICES_API_BASE_URL=https://workato-comm-voices.fly.dev`
- `COMM_VOICES_API_TOKEN=<bearer token for /community-posts>`
- `WORKATO_ROUTE_TO_PRODUCT_WEBHOOK=<workato recipe webhook>`
