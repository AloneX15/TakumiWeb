# Takumi Launcher integration

How [Takumi Launcher](https://github.com/AloneX15/TakumiLauncher) and this website work together. Keep this document
in sync with `apps/launcher/src-tauri/src/session.rs` and `.github/workflows/release.yml` in the launcher repository.

```
                 ┌──────────────────── takumilabs.org (this repo) ────────────────────┐
  Browser ──────▶│ /registro  /login  /cuenta  /descargas  /noticias  /admin           │
                 │                                                                     │
  Launcher ─────▶│ POST /api/launcher/login   GET /api/launcher/me                     │
  (Rust, Tauri)  │ POST /api/launcher/logout  GET /api/news   GET /api/releases/latest │
                 │                                                                     │
  GitHub ───────▶│ POST /api/releases  (Bearer RELEASE_API_TOKEN)                      │
  Actions        └─────────────────────────────────────────────────────────────────────┘
```

## 1. Accounts and sign-in

### What the user sees

1. On start the launcher shows a mandatory sign-in screen. Nothing else is reachable without a Takumi session.
2. **"¿No tienes cuenta? Regístrate"** opens `{web}/registro` in the browser. Accounts are only created on the
   website.
3. The user signs in with their **username or e-mail** and password. Errors come from the server and are shown
   as-is (wrong password, suspended account with its reason, too many attempts…).
4. The sidebar shows the Takumi username (a link to `{web}/cuenta`) and a **"Cerrar sesión"** button.
5. The **"Iniciar sesión con Microsoft"** button is a placeholder for now: it only shows a "coming soon" notice.

The Takumi account is the launcher's own identity. Minecraft accounts (offline profiles and Microsoft accounts in
the launcher's *Cuentas* view) are separate and unchanged.

### How it works

| Step | Launcher | Website |
| --- | --- | --- |
| Sign in | `POST /api/launcher/login` with `{ user, password, device }` | Checks the password, creates a session of kind `launcher` (90 days) and returns a token |
| Store | Token → OS credential store (Windows Credential Manager, service `TakumiLauncher`, entry `takumi-session`). Public profile → `session.json` in the app data folder | — |
| Every start | `GET /api/launcher/me` with `Authorization: Bearer <token>` | Validates the token and renews it once less than half its lifetime remains |
| Token rejected (401) | Deletes the token and `session.json`, shows the sign-in screen | — |
| Server unreachable | Keeps the cached profile so the launcher still works offline | — |
| Sign out | `POST /api/launcher/logout` (best effort), then deletes the token and `session.json` | Deletes the session |

The password is never stored by the launcher. The token is never written to disk in plain text.

### Ways a launcher session ends

- The user presses "Cerrar sesión" in the launcher.
- The user closes it in **Mi cuenta → Sesiones abiertas** (each launcher shows as *Launcher* with its device label,
  e.g. `TakumiLauncher 0.2.0 (windows)`), or with "Cerrar las demás".
- The user changes their password (all other sessions are closed).
- An admin uses **Cerrar todas** / **Cerrar** on the user's page, resets the password with "Cerrar todas sus
  sesiones", suspends the account or deletes it.
- 90 days without use.

The launcher notices on its next start (or reload) and returns to the sign-in screen.

## 2. News in the launcher

The launcher has a **Noticias** tab that calls `GET /api/news?limit=20` and lists the published posts (category,
date, title, summary). Clicking a post opens its page on the website; "Abrir en la web" opens `/noticias`.

Write posts in **Admin → Noticias**. The *Resumen* field is what the launcher shows, so keep it short. Only posts
marked *Publicada* appear. Category labels: `news` → Noticia, `update` → Actualización, `blog` → Blog.

## 3. Launcher updates

### Update notice

On start the launcher calls `GET /api/releases/latest` (stable channel) and compares the version with its own
(semver; pre-releases such as `1.0.0-beta.1` sort before `1.0.0`). When the website has a newer one, a
**"Nueva versión X"** box appears in the sidebar; clicking it opens the download link. Network errors are ignored
silently.

There is no automatic self-update yet (the launcher is not code-signed): the user downloads and runs the new
installer.

### Publishing a release (GitHub Actions)

The launcher repository has a `Release` workflow (`.github/workflows/release.yml`) that runs when a `v*` tag is
pushed:

1. Checks that the tag matches the version in `tauri.conf.json` and `Cargo.toml`.
2. Builds the Windows NSIS installer (`TakumiLauncher_<version>_x64-setup.exe`).
3. Creates the GitHub release with the installer. The **tag message** becomes the release notes (or GitHub
   generates them if the tag has no message). Tags with a `-` (e.g. `v0.3.0-beta.1`) are marked as pre-release.
4. Calls `POST {TAKUMI_WEB_URL}/api/releases` with the version, notes, GitHub download URL, file name, size,
   SHA-256 and release URL. Tags with a `-` go to the **beta** channel, others to **stable**.

To release version 0.2.0:

```bash
# in the launcher repo, after bumping the version in Cargo.toml ([workspace.package]) and tauri.conf.json
git tag -a v0.2.0 -m "- Inicio de sesión con cuenta Takumi
- Noticias dentro del launcher"
git push origin v0.2.0
```

Within a few minutes the version appears in `/descargas`, in **Admin → Versiones** (origin "GitHub Actions"), and
launchers on older versions show the update notice.

**One-time setup** in the launcher repository → *Settings → Secrets and variables → Actions*:

| Secret | Value |
| --- | --- |
| `TAKUMI_WEB_URL` | `https://takumilabs.org` |
| `TAKUMI_RELEASE_TOKEN` | Same value as `RELEASE_API_TOKEN` on the web server |

Without these secrets the GitHub release is still created and the website step is skipped with a warning; the
release can then be added by hand in **Admin → Versiones → Nueva versión**.

Re-running the workflow for the same tag updates the existing release on the website instead of duplicating it.
Unpublishing a release in the admin panel hides it from the downloads page and from the update check. Its GitHub
release is not touched.

## 4. API reference

All bodies are JSON. Errors always look like `{ "error": "Mensaje en español" }` and are meant to be shown to the
user.

### `POST /api/launcher/login`

```json
{ "user": "steve or steve@example.com", "password": "…", "device": "TakumiLauncher 0.2.0 (windows)" }
```

| Status | Body |
| --- | --- |
| 200 | `{ "token": "…", "expires_at": "2027-02-13T00:00:00.000Z", "user": { "id", "username", "email", "role" } }` |
| 400 | Missing user or password |
| 401 | `Usuario o contraseña incorrectos.` |
| 403 | `Esta cuenta está suspendida. Motivo: …` |
| 429 | Too many attempts (10 per 10 minutes per IP and user) |

### `GET /api/launcher/me`

Header `Authorization: Bearer <token>`. `200 { "user": { … } }` or `401` when the token is missing, expired, revoked
or the user is suspended.

### `POST /api/launcher/logout`

Header `Authorization: Bearer <token>`. Always `204`; it is idempotent.

### `GET /api/news?limit=10&category=news`

`limit` 1–50 (default 10); `category` is optional (`news`, `update`, `blog`). Cached for 60 seconds.

```json
{
  "posts": [
    {
      "slug": "nueva-version-0-2-0",
      "title": "Nueva versión 0.2.0",
      "excerpt": "Inicio de sesión con cuenta Takumi y noticias en el launcher.",
      "category": "update",
      "cover_url": null,
      "published_at": "2026-11-15T00:00:00.000Z",
      "url": "https://takumilabs.org/noticias/nueva-version-0-2-0"
    }
  ]
}
```

### `GET /api/releases/latest?channel=stable`

`channel=beta` returns the newest release of any channel. `404` when nothing is published. Cached for 60 seconds.

```json
{
  "version": "0.2.0",
  "channel": "stable",
  "notes": "- Inicio de sesión con cuenta Takumi\n- Noticias dentro del launcher",
  "published_at": "2026-11-15T00:00:00.000Z",
  "download_url": "https://takumilabs.org/descargas/0.2.0/descargar",
  "page_url": "https://takumilabs.org/descargas",
  "sha256": "…",
  "file_size": 4200000
}
```

`download_url` goes through the website so the download is counted, then redirects to the GitHub asset.

### `POST /api/releases`

Header `Authorization: Bearer <RELEASE_API_TOKEN>`. Used by GitHub Actions; it creates the release or updates the
one with the same version.

```json
{
  "version": "0.2.0",
  "channel": "stable",
  "notes": "Markdown",
  "download_url": "https://github.com/AloneX15/TakumiLauncher/releases/download/v0.2.0/TakumiLauncher_0.2.0_x64-setup.exe",
  "file_name": "TakumiLauncher_0.2.0_x64-setup.exe",
  "file_size": 4200000,
  "sha256": "64 hex characters",
  "github_url": "https://github.com/AloneX15/TakumiLauncher/releases/tag/v0.2.0",
  "publish": true
}
```

Only `version` (`1.2.3` or `1.2.3-beta.1`; a leading `v` is accepted) and `download_url` are required. Answers
`201` when created, `200` when updated, `401` with a wrong token and `503` when the server has no
`RELEASE_API_TOKEN`.

### `GET /api/health`

`200 { "ok": true }` or `503`.

## 5. Pointing the launcher at another server

The launcher picks the website URL in this order. It is used for the API calls and the links it opens
(registration, account, news, downloads).

1. `TAKUMI_WEB_URL` environment variable when the launcher starts
2. `TAKUMI_WEB_URL` when the launcher was **compiled** (the `Release` workflow sets it to the `TAKUMI_WEB_URL`
   secret, or `https://takumilabs.org` if the secret is missing)
3. `http://localhost:5173`, the `pnpm dev` server of this repo

So a local build of the launcher works against a local `pnpm dev` with no configuration. The dev server is pinned
to port 5173 (`strictPort`) for that reason. If it cannot be reached, the launcher asks you to start it with
`pnpm dev`.

```powershell
# Local launcher build against another server
$env:TAKUMI_WEB_URL = "https://staging.takumilabs.org"
cargo tauri dev
```

## 6. Shared rules

| Rule | Value |
| --- | --- |
| Username | 3–16 characters: letters, numbers, `_` (case-insensitive unique) |
| Password | 8–128 characters |
| E-mail | Stored lower-case, unique |
| Versions | Semver `MAJOR.MINOR.PATCH[-pre]`; pre-releases sort before the release |
| Web session | 30 days, renewed while in use |
| Launcher session | 90 days, renewed while in use |
