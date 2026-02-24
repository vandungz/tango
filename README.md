This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel with Neon (Postgres)

1. Create a Neon project at https://neon.tech and grab the Postgres connection string (ensure `sslmode=require`).
2. Set `DATABASE_URL` in Vercel Project Settings → Environment Variables to that string.
3. Locally, add the same `DATABASE_URL` to your `.env` and run:
	- `npm install`
	- `npm run db:push` (creates tables on Neon)
	- `npm run dev`
4. Deploy on Vercel (build uses `prisma generate`; DB schema already pushed).

Notes:
- Prisma schema now targets Postgres; no SQLite adapter needed.
- If you change the Prisma schema, rerun `npm run db:push` to sync Neon.
