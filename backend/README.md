# Fastory backend

Elysia + Bun API using Prisma and PostgreSQL.

## Local SQL database

The backend is configured for a local PostgreSQL database by default.

Create a local database named `fastory` with user/password `postgres`/`postgres`, or start the Docker database:

`ash
docker compose up -d db
`$insert

Local `.env`:

```env
PORT=8080
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fastory?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/fastory?schema=public"
NODE_ENV=development
```

Apply the Prisma schema and generate the client:

```bash
bun run db:push
bun run db:generate
```

Optional seed data:

```bash
bun run seed
```

Run the API:

```bash
bun run dev
```

The API listens on `http://localhost:8080`.

