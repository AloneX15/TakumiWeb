# TakumiWeb

Website, account system and API for **[Takumi Launcher](https://github.com/AloneX15/TakumiLauncher)**, served at
**takumilabs.org**.

One SvelteKit app covers three things:

| Part | What it does | Where |
| --- | --- | --- |
| Public site | Home page, news/blog, launcher downloads, sign-up and sign-in | `/`, `/noticias`, `/descargas`, `/registro`, `/login`, `/cuenta` |
| Admin panel | Publish news, manage launcher releases, manage users | `/admin` |
| API | Launcher sign-in, news feed, update check, release publishing from CI | `/api/*` |

Every Takumi Launcher user needs a Takumi account. Accounts are created **only on this website**: the launcher's
"Regístrate" button opens `/registro`, and the launcher signs in against this API. See
**[docs/launcher-integration.md](docs/launcher-integration.md)** for the full contract between the two projects.

---

## Stack

- **SvelteKit 2** (Svelte 5) with `@sveltejs/adapter-node`: server-rendered pages, form actions, JSON endpoints
- **PostgreSQL** via **Drizzle ORM**; SQL migrations live in [`drizzle/`](drizzle/) and run automatically on startup
- **PGlite** (embedded Postgres) when `DATABASE_URL` is empty, so local development needs no database server
- **Argon2id** password hashing (`@node-rs/argon2`)
- **Markdown** for posts and release notes (`marked` + `sanitize-html`)
- Same dark/crimson palette and fox logo as the launcher

The app is stateless apart from the database, so it can run as several instances behind a load balancer.

## Features

**Public site**
- Home page with a download button for the latest stable launcher release and the latest news
- News section with three categories (news, launcher updates, blog), filters and pagination; each post has its own page
- Downloads page: latest release, beta channel, full version history with notes, SHA-256 and file size;
  downloads are counted and redirected to the installer on GitHub Releases
- Sign-up, sign-in, sign-out
- "Mi cuenta": change e-mail and password, list of open sessions (browsers **and launchers**) with the option to
  close them

**Admin panel** (`/admin`, roles `editor` and `admin`)
- Dashboard: registered users, users active in the launcher (last 7 days), total downloads, published posts,
  current launcher version
- News: create, edit, publish/unpublish and delete posts with a Markdown editor and live preview
- Releases: list with download counts, add/edit manually, publish/unpublish, delete. Releases created by
  GitHub Actions show up here automatically
- Users (admin only): search and filter, create users with a role, edit username/e-mail/role, reset password,
  suspend with a reason, close sessions, delete. The last active administrator cannot be demoted, suspended or deleted

**Roles**

| Role | Can do |
| --- | --- |
| `user` | Use the launcher and the account pages |
| `editor` | + news and releases in the admin panel |
| `admin` | + user management |

## Getting started

Requirements: **Node.js 22+** and **pnpm** (`npm install -g pnpm`).

```bash
pnpm install
cp .env.example .env     # set ADMIN_PASSWORD (8+ characters) at least
pnpm dev                 # http://localhost:5173
```

With `DATABASE_URL` empty the data is stored in `./data/pglite`. On first start the administrator from
`ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` is created (only while no admin exists). Delete `./data` to start
over.

Local launcher builds talk to `http://localhost:5173` by default, so they work against `pnpm dev` with no extra
configuration (see [docs/launcher-integration.md](docs/launcher-integration.md#5-pointing-the-launcher-at-another-server)).

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build into `build/` |
| `pnpm start` | Run the production build (`node build`) |
| `pnpm check` | Type-check Svelte and TypeScript |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm db:generate` | Create a new SQL migration after editing `src/lib/server/db/schema.ts` |

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Production | `postgres://user:pass@host:5432/db`. Empty → embedded PGlite in `./data/pglite` |
| `PGLITE_DIR` | No | Folder for the embedded database (default `./data/pglite`) |
| `DATABASE_POOL_SIZE` | No | PostgreSQL connections per instance (default 10) |
| `ORIGIN` | Production | Public URL, e.g. `https://takumilabs.org`. adapter-node uses it for form CSRF checks |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First start | First administrator; ignored once an admin exists |
| `RELEASE_API_TOKEN` | For CI releases | Shared secret the launcher's GitHub Actions uses to publish releases. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `ADDRESS_HEADER`, `XFF_DEPTH` | Behind a proxy | Real client IP for rate limiting, e.g. `X-Forwarded-For` and `1` |
| `PORT`, `HOST` | No | Listening address of the production server (default `0.0.0.0:3000`) |

## Deployment

### Docker Compose (web + PostgreSQL)

```bash
cat > .env <<'EOF'
POSTGRES_PASSWORD=change-me
ORIGIN=https://takumilabs.org
ADMIN_PASSWORD=change-me-too
RELEASE_API_TOKEN=generate-a-long-random-value
EOF
docker compose up -d --build
```

The site listens on port 3000. Put a reverse proxy with HTTPS in front of it (Caddy, Nginx, Traefik, Cloudflare…).
HTTPS is required in production: session cookies are `Secure` and the launcher talks to `https://takumilabs.org`.

### Without Docker

```bash
pnpm install --frozen-lockfile
pnpm build
DATABASE_URL=postgres://… ORIGIN=https://takumilabs.org node build
```

Copy `build/`, `drizzle/`, `static/`, `package.json` and production `node_modules` to the server. Migrations run on
startup.

### Health check

`GET /api/health` → `200 {"ok":true}` when the app and the database respond, `503` otherwise.

### Scaling notes

- Run as many instances as needed against the same PostgreSQL; sessions live in the database.
- Login/registration rate limiting is in memory, per instance. With several instances, add rate limiting at the
  proxy as well.
- Expired sessions are purged on startup and every 6 hours.
- Public content (posts, releases, rendered Markdown) is cached in memory for 15 seconds
  (`src/lib/server/cache.ts`). The instance that handles an edit shows it at once; other instances within 15 seconds.

### Measured capacity

One Node process and PostgreSQL 17 on the same 8-core desktop (Ryzen 7 5800X), database seeded with **10,000 users**,
10,000 launcher sessions, 40 posts and 20 releases; 100 concurrent connections, load generator on the same machine.
No request failed in any scenario.

| Scenario | Requests/s | p50 | p99 |
| --- | --- | --- | --- |
| `GET /api/releases/latest` (launcher update check) | 7,850 | 11 ms | 21 ms |
| `GET /api/news` (launcher news) | 5,460 | 17 ms | 31 ms |
| `GET /api/launcher/me` (session check, 10,000 different tokens) | 1,980 | 48 ms | 78 ms |
| `GET /` home page | 3,070 | 31 ms | 56 ms |
| `GET /descargas` | 2,150 | 45 ms | 78 ms |
| `GET /noticias/<slug>` | 1,710 | 55 ms | 103 ms |
| `POST /api/launcher/login` (Argon2, 64 connections) | 140 | 444 ms | 511 ms |
| All 10,000 launchers starting at once (session + update + news = 30,000 requests) | 3,330 | 3 ms | 206 ms |

The last scenario completes in about 9 seconds. Sign-in is deliberately expensive (password hashing) and tops out
around 140–150 per second on this machine regardless of thread-pool size; launchers only sign in once every 90 days,
so it is not on the hot path. Admin pages take 10–20 ms with 10,000 users. The process used about 460 MB of RAM
after the whole run.

To repeat the test (needs Docker for a throwaway database; **never** seed a real one):

```bash
docker run -d --name takumi-pg-bench -e POSTGRES_PASSWORD=bench -e POSTGRES_DB=takumi -p 55432:5432 postgres:17-alpine
export DATABASE_URL=postgres://postgres:bench@localhost:55432/takumi
pnpm build && PORT=3001 ORIGIN=http://localhost:3001 ADMIN_PASSWORD=benchadmin1 node build &
pnpm bench:seed                      # 10,000 users, sessions, posts, releases
pnpm bench:load http://localhost:3001
docker rm -f takumi-pg-bench
```

## Project structure

```
src/
  hooks.server.ts            # startup (migrations, first admin) + session cookie → locals.user
  lib/
    validation.ts            # shared rules: usernames, e-mails, passwords, slugs, version ordering
    format.ts                # dates, sizes, Spanish labels
    components/              # Logo, PostCard, MarkdownEditor, PostForm, ReleaseForm, AuthCard
    server/
      db/schema.ts           # users, sessions, posts, releases
      db/index.ts            # PostgreSQL or PGlite connection + migrator
      auth.ts                # Argon2, web/launcher sessions, roles
      guards.ts              # page/API guards and helpers
      content.ts             # published posts and releases
      posts.ts, releases.ts, users.ts, markdown.ts, rate-limit.ts, bootstrap.ts
  routes/
    +page.svelte             # home
    noticias/, descargas/    # public news and downloads
    registro/, login/, logout/, cuenta/
    admin/                   # dashboard, noticias, versiones, usuarios
    api/                     # launcher, news, releases, health
drizzle/                     # SQL migrations (committed)
docs/launcher-integration.md # contract with Takumi Launcher
```

## Security

- Passwords are hashed with Argon2id; unknown users take the same time to reject as wrong passwords.
- Session tokens are 256-bit random values; only their SHA-256 is stored. Web sessions last 30 days and launcher
  sessions 90 days, both renewed while in use.
- Cookies are `HttpOnly`, `SameSite=Lax` and `Secure` in production; SvelteKit rejects cross-site form posts.
- Changing the password closes every other session. Suspending a user closes all of their sessions, launchers
  included.
- Markdown is sanitized before rendering; external links get `rel="noopener noreferrer"`.
- Responses carry `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and a strict referrer policy.

Takumi Launcher is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.
