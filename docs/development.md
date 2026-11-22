# Development guide

Practice typing with YouTube captions, with live WPM and accuracy tracking. Includes Type, Fill, Write, and Watch modes, video imports, a shared video library, keyboard shortcuts, and saved browser preferences.

Typescribe uses Next.js 15, React 19, Tailwind CSS 4, Drizzle ORM, PostgreSQL 17, and [Better Auth](https://better-auth.com/docs/integrations/next) for email/password and Google accounts.

Run all commands below from the repository root.

## Run locally with Docker

Install Docker with Compose and Make, then run:

```sh
make up
```

Open http://localhost:3000. This creates a local `infra/.env` with a random authentication secret, starts PostgreSQL, installs dependencies in the app image, applies migrations, and starts Next.js with hot reload. The database persists in a Docker volume. Signup is available at `/signup`; no email provider is needed.

```sh
make logs       # Follow logs
make down       # Stop containers and keep database data
make up         # Rebuild after dependency or configuration changes
```

The library starts empty. Import a captioned YouTube video after signing in, or seed the database:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml exec app pnpm db:seed
```

Seeding real videos requires internet access. `docker compose --env-file infra/.env -f infra/compose.yaml exec app pnpm db:seed --fixture src/data/fixtures/transcript-sample.json` loads synthetic captions for tests; its placeholder video cannot play on YouTube.

If ports 3000 or 5432 are occupied, edit `APP_PORT` / `POSTGRES_PORT` in the `infra/.env`. Set `BETTER_AUTH_URL` to match the browser URL, including the app port.

## Develop on the host

Install Node.js 24+, pnpm 12.21.0, Docker Compose, and Make:

```sh
make init
make install
make db-up
make migrate
make dev
```

The Makefile reads the `infra/.env` and configures the local PostgreSQL URL. `make dev` runs Next.js on the host; stop a containerized app before using the same port.

Make runs package commands inside `app/`. For direct pnpm commands, use
`pnpm --dir app dev`, `pnpm --dir app db:migrate`, and so on. Copy
`app/.env.example` to `app/.env.local` and configure the database URL and
authentication secret for direct pnpm development. Compose and Make read
`infra/.env`.

The application is a standalone pnpm project. `app/pnpm-workspace.yaml` contains
only pnpm's dependency build policy; it does not define workspace packages.

```sh
make check         # ESLint + TypeScript
make test          # Vitest, including database integration tests (migrate first)
make build         # Production build
make seed          # Seed real videos from the host
make seed-fixture  # Seed synthetic captions
make db-generate   # Generate a migration after schema changes
make db-studio     # Browse local database
make help          # All targets
```

## Accounts

The video picker previews valid YouTube links before importing. Click **Add this video** to fetch captions and open practice. Empty or unavailable links show **Recent** and **Library** tabs, with Recent selected by default. Library includes both curated and imported videos.

- Email/password and optional Google signup/login, plus logout, with persistent database sessions.
- `/library` and `/settings` require a valid server-checked session. Settings includes profile/password changes and practice preferences; `/account` redirects to `/settings`. Video selections open shareable `/?video=…` practice links.
- Password changes require the current password and revoke other sessions.
- Video browsing and practice are public. Video imports require authentication and are rate limited per user. Imported videos remain shared.
- Better Auth handles password hashing, cookies, origin checks, and authentication rate limits. Passwords must be 8–128 characters.

This initial setup does not include an admin panel, email verification, or password recovery. Those require additional configuration, including an email delivery service for email flows.

## Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen and create an OAuth client ID with application type **Web application**. If the consent screen is in testing mode, add your Google account as a test user.
2. Add an authorized redirect URI: `http://localhost:3000/api/auth/callback/google`. For production, also add `https://your-domain.com/api/auth/callback/google`. The scheme, host, and port must match `BETTER_AUTH_URL` exactly.
3. Add the credentials to the `infra/.env` for Compose / Make, or `app/.env.local` for direct pnpm development:

   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

4. Run `make up` to recreate the app container with the new variables, or restart the host dev server. Both login and signup pages show **Continue with Google** when both credentials are configured. Configure the same variables in your production hosting environment.

Google-only users manage their password through Google; Typescribe hides its password-change form for those accounts. Existing authentication tables already support Google accounts, so no additional database migration is needed. The client secret stays on the server. See [Better Auth's Google setup guide](https://better-auth.com/docs/authentication/google).

## Structure

```text
app/
  src/
    app/                 Next.js pages and API routes
    components/          Practice UI and account forms
    db/                  Video/auth schemas, queries, migrations runner, seed
    hooks/               Typing session and video playback hooks
    lib/                 Better Auth, typing engine, YouTube integration
    store/               Browser practice state and preferences
    data/                Seed videos and test fixtures
  drizzle/               Versioned SQL migrations
  .dockerignore          Docker build exclusions
  .env.example           Host / deployment configuration reference
  package.json           App dependencies and scripts
  pnpm-lock.yaml         Locked app dependencies
  pnpm-workspace.yaml    pnpm dependency build policy
infra/
  compose.yaml           App + PostgreSQL
  Dockerfile             Local development image
  .env.example           Compose / Make settings reference
docs/
  development.md         Development and deployment guide
  assets/                README images and branding
Makefile                 Local development commands
```

## Configuration and deployment

`BETTER_AUTH_SECRET` must be a random secret (generate with `openssl rand -base64 32`); use a separate production value. `BETTER_AUTH_URL` must be the public site origin. Configure `DATABASE_URL` for requests and optionally `DATABASE_URL_UNPOOLED` for migrations. Do not expose credentials through `NEXT_PUBLIC_` variables.

Optional import settings include `IMPORT_RATE_LIMIT_PER_HOUR` (10), `IMPORT_MAX_DURATION_SECONDS` (3600), `TRANSCRIPT_USER_AGENT`, and server-only `SUPADATA_API_KEY`. Cloud imports use Supadata when configured, fetching native captions without AI generation. Existing imported videos are reused. Authentication and import rate limits use process memory, so limits apply per instance.

For Vercel, set the project Root Directory to `app`, configure the environment variables above, and run migrations explicitly before deploying. The app's Vercel configuration remains in `app/vercel.json`. The GitHub repository and Vercel project are named `typescribe`. Production is hosted at https://typescribe-type.vercel.app. Existing database and role names are preserved; existing database URLs continue to work.

```sh
pnpm --dir app exec dotenv -e .env.neon.local -- tsx src/db/migrate.ts
pnpm dlx vercel deploy --prod
```

Apply the new authentication migration to each deployment database before enabling accounts. Builds do not run migrations. The Docker image and Compose file are intended for local development.

## License

Application code uses the [MIT License](../LICENSE).
