# Deployment Guide

## Vercel Projects

| What | Domain | Vercel Project |
|------|--------|----------------|
| **Frontend** | `premierauto.ai` | [autoai-dash](https://vercel.com/petes-projects-268bdd55/autoai-dash) |
| **Backend** | `www.alignedai.dev` | [autoai](https://vercel.com/petes-projects-268bdd55/autoai) |

## Quick Deploy Commands

### Deploy Frontend
```bash
cd /Users/petercross/Downloads/auto-service-booking
vercel link --project autoai-dash --yes
vercel deploy --prod --yes
```

### Deploy Backend
```bash
cd /Users/petercross/Downloads/auto-service-booking
vercel link --project autoai --yes
vercel deploy --prod --yes
```

### Deploy Both (after linking correctly)
```bash
# Frontend
cd /Users/petercross/Downloads/auto-service-booking
vercel link --project autoai-dash --yes && vercel deploy --prod --yes

# Then Backend
vercel link --project autoai --yes && vercel deploy --prod --yes
```

## ⚠️ Common Mistakes to Avoid

1. **DO NOT** run `vercel deploy` without linking first - it creates a new project
2. **DO NOT** deploy from `/backend` subfolder - deploy from root with correct project linked
3. **DO NOT** deploy from `/frontend` subfolder - deploy from root with correct project linked

## GitHub Auto-Deploy

Both projects are connected to `peterthehammer1/autoai` repo and auto-deploy on push to `main`.

## Retell Agent

Update the AI agent prompt:
```bash
cd /Users/petercross/Downloads/auto-service-booking/backend
source .env.local
node scripts/retell-update-agent.js
```
