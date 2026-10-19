# AGENT---

An early-stage React + Vite interface prototype for a tool-using AI agent.

## Current scope

- Responsive dashboard and chat workspace
- Tool catalog with demo-only interaction states
- Mock activity, model status, and run history
- No model API, Kaggle, or secret integration yet

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project structure

- `src/App.jsx` — app shell, navigation, chat and tool interactions
- `src/styles.css` — responsive visual system
- `src/data/mockData.js` — local demo data only

## Security note

Do not place provider API keys in this frontend. When real integrations are introduced, keep secrets in server-side environment variables and call providers through a backend or serverless functions.
