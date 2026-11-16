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
YTDLP_PATH=/usr/local/bin/yt-dlp
NEXT_PUBLIC_PLAYER_MODE=fake  # or 'youtube' for real IFrame API
```

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
│       ├── PracticeToolbar.tsx # Mode/density/video selector
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

## Architecture

Follows the implementation plan in `IMPLEMENTATION.md` with milestones:

- **M1**: Scaffold (Next.js, shadcn, Drizzle, configs)
- **M2**: Domain & seed (video/track/segment schema, fixtures)
- **M3**: Typing engine (Type mode, 25 tests)
- **M4**: Player sync (YouTube + Fake adapters, SegmentPlayer)
- **M5**: Watch UI (Toolbar, Canvas, Stats, Keyboard shortcuts)
- **M6**: Import pipeline (URL parse, transcript client, segmentation, rate limit)
- **M7**: Fill & Write modes (deterministic blanks, first-letter hints)
- **M8**: Polish (settings persistence, display modes, sounds)
- **M9**: Verification (E2E, performance, lint)

## License

MIT
