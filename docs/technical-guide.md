# Tango Technical Guide

This document contains technical and operational notes for developing and deploying Tango.

## Stack

- Next.js (App Router)
- TypeScript
- Prisma
- Neon Postgres
- Vercel deployment target

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env` (at minimum `DATABASE_URL`).

3. Push Prisma schema to database:

```bash
npm run db:push
```

4. Start the dev server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Deployment (Vercel + Neon)

1. Create a Neon project at `https://neon.tech` and copy a Postgres connection string (with `sslmode=require`).
2. Set `DATABASE_URL` in Vercel Project Settings -> Environment Variables.
3. Use the same `DATABASE_URL` locally for schema sync and testing.
4. Deploy to Vercel.

Notes:

- Prisma schema targets Postgres.
- If Prisma schema changes, run `npm run db:push` to sync.

## Journey Set Admin Operations

Journey mode uses a versioned active set (`JourneySet`) to safely audit and regenerate curated levels.

### Required env

- `JOURNEY_ADMIN_TOKEN=your-strong-token`

### Audit current active set

- Method: `GET`
- Endpoint: `/api/admin/journey`
- Header: `x-admin-token: <token>`

### Dry-run new set

- Method: `POST`
- Endpoint: `/api/admin/journey`
- Header: `x-admin-token: <token>`
- Body example:

```json
{ "dryRun": true, "totalLevels": 200 }
```

### Rebuild and activate set

- Method: `POST`
- Endpoint: `/api/admin/journey`
- Header: `x-admin-token: <token>`
- Body example:

```json
{ "dryRun": false, "force": true, "totalLevels": 200 }
```

### Safety options

- `purgePreviousSets`: remove previous sets after new activation.
- `resetPreviousProgress`: when purging, also delete old journey results.
