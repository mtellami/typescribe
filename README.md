# Gloomtype

A typing practice app that uses YouTube video captions. Type along with the video as captions appear line-by-line with WPM/accuracy tracking.

## Features

- **Three practice modes**: Type (type everything), Fill (blank words only), Write (masked listening)
- **YouTube import**: Paste any public YouTube URL to fetch captions automatically
- **Real-time stats**: WPM, accuracy, errors, and hints per segment
- **Keyboard shortcuts**: Tab (replay), Enter (next), Ctrl+H (hint), Shift+Tab (previous)
- **Multiple densities**: 100%, ~55%, ~35%, First letters
- **Local database**: PostgreSQL with Drizzle ORM for video/caption storage

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Database**: PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 12+
- PostgreSQL 17 (Docker recommended)

### Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd gloomtype
pnpm install

# Start PostgreSQL
docker run -d --name gloomtype-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gloomtype \
  -p 5432:5432 postgres:17

# Copy environment and configure
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and other settings

# Run migrations and seed
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gloomtype
IMPORT_RATE_LIMIT_PER_HOUR=10
IMPORT_MAX_DURATION_SECONDS=3600
TRANSCRIPT_USER_AGENT=Mozilla/5.0...
SUPADATA_API_KEY=your-server-only-key
NEXT_PUBLIC_PLAYER_MODE=youtube  # use 'fake' only for tests
```

The default seed imports a real captioned TED video and features it in the library. It needs access to YouTube. For isolated tests, use `pnpm db:seed -- --fixture src/data/fixtures/transcript-sample.json`; that fixture contains synthetic captions and a placeholder video ID, so it cannot play on YouTube.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript check
pnpm test             # Run Vitest unit tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm format           # Format with Prettier
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Drizzle Studio
```

## Hosting on Vercel with Neon

Gloomtype uses the `gloomtype` database in the existing Neon project. The other project's `neondb` database is separate. Vercel functions run in `cle1` (Ohio), next to Neon, and connect through Neon's pooled endpoint as the scoped `gloomtype_app` role. Drizzle migrations use a direct connection as the database owner.

Credentials stay outside Git:

- `.env.local`: local development and test database.
- `.env.neon.local`: pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` for the Gloomtype Neon database.
- Vercel production environment: the scoped, pooled `DATABASE_URL` as a secret, plus player and import settings. The database-owner URL is kept local.

Run migrations before deploying a schema change:

```bash
pnpm exec dotenv -e .env.neon.local -- tsx src/db/migrate.ts
pnpm dlx vercel deploy --prod
```

To seed a new database, run:

```bash
pnpm exec dotenv -e .env.neon.local -- tsx src/db/seed.ts
```

The Vercel project is linked through the ignored `.vercel/` directory. On a new checkout, sign in with `pnpm dlx vercel login`, then run `pnpm dlx vercel link`. Configure the production environment before the first deployment. Build artifacts and local environment files are excluded by `.vercelignore`.

Migrations are an explicit step rather than part of the build, so ordinary deployments do not change database structure. The in-memory import rate limit applies per function instance. Cloud imports use Supadata because YouTube blocks direct requests from Vercel. Add `SUPADATA_API_KEY` as a sensitive production environment variable before deploying. Local development uses the same provider when the key is present, and otherwise keeps direct YouTube fetching. The key is never sent to the browser.

Imports fetch metadata first to enforce the video length limit, then request timestamped captions with `mode=native`; AI generation is disabled. A new import uses one metadata request and one transcript request. Successful imports are stored in Neon and reused, so reopening or reimporting the same video/language does not call Supadata again. Provider authentication, quota, and timeout failures are reported as service failures rather than “no captions.”

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── videos/featured/    # GET featured videos
│   │   ├── videos/[id]/        # GET video detail
│   │   └── videos/import/      # POST import YouTube URL
│   └── page.tsx                # Main watch page
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── watch/                # Watch page components
│       ├── TypingCanvas.tsx    # Caption rendering
│       ├── TypingInput.tsx     # Hidden typing input
│       ├── VideoPanel.tsx      # YouTube player
│       ├── StatsBar.tsx        # WPM/accuracy display
│       ├── VideoLibrary.tsx    # Searchable featured/recent videos
│       ├── ImportVideoForm.tsx # Shared YouTube import flow
│       ├── SettingsDialog.tsx  # Saved practice preferences
│       ├── PracticeToolbar.tsx # Mode, density, speed, layout
│       └── SelectVideoDialog.tsx
├── db/                       # Database layer
│   ├── schema.ts             # Drizzle schema
│   ├── client.ts             # pg Pool + Drizzle
│   ├── queries.ts            # Query functions
│   └── seed.ts               # Seed script
├── hooks/
│   ├── useTypingSession.ts   # Typing engine orchestration
│   └── useYouTubePlayer.ts   # Player adapter
├── lib/
│   ├── typing/               # Typing engine (core)
│   │   ├── engine.ts         # State machine
│   │   ├── tokenize.ts       # Grapheme segmentation
│   │   └── prng.ts           # Deterministic PRNG
│   ├── youtube/              # YouTube integration
│   │   ├── url.ts            # URL parser
│   │   ├── transcript-client.ts
│   │   └── import-service.ts
│   ├── transcript/
│   │   └── segment.ts        # Caption normalization + grouping
│   ├── player/               # Player adapters
│   ├── contracts.ts          # Zod schemas
│   ├── errors.ts             # AppError class
│   └── rate-limit.ts
├── store/
│   └── session.ts            # Zustand session store
└── data/fixtures/            # Test fixtures
```

## License

MIT
