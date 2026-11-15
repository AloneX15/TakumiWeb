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

The Takumi account is the launcher's own identity. It also names the player's **offline profile**: the launcher
creates exactly one, named after `user.username` (registration enforces the Minecraft name rules and usernames are
unique, case-insensitive), with the vanilla offline-mode UUID. Players cannot create other offline names. A Microsoft
(premium) account added in *Cuentas* takes priority and is selected by default. If an admin renames a user, the
launcher picks up the new name the next time it checks the session (`/api/launcher/me`).

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

Re-running the workflow for the same tag updates the existing release on the website instead of duplicating it, as
long as the installer is the same. Once a version is published its installer cannot be swapped through the API
(`409`): builds are not byte-for-byte reproducible, so a rebuilt installer needs a new version number. An editor can
still correct the link by hand in **Admin → Versiones**.

The release job runs in the GitHub environment `release`. Add required reviewers to it (*Settings → Environments →
release*) so that pushing a tag alone cannot publish an update to every launcher.

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
| 429 | Too many attempts: 10 per 10 minutes per address and account, 50 per hour per account, 60 per 10 minutes per address |

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

Only `version` (`1.2.3` or `1.2.3-beta.1`; a leading `v` is accepted) and `download_url` are required. URLs must be
`https`. Answers `201` when created, `200` when updated, `400` for invalid data, `401` with a wrong token, `409` when
the version is already published with a different `download_url` or `sha256`, and `503` when the server has no
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

Only `https://` URLs are accepted, plus plain `http://` to `localhost`, `127.0.0.1` or `[::1]`. Anything else is
ignored, because passwords and the session token are sent to this URL. The launcher can also only open `https` links,
or `http` links to this machine, in the browser.

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

## 7. Private instances

Event instances that only invited members can play. The organizer manages the whole game folder on the website;
the launcher keeps every member's copy identical to the published version.

### Roles

| Level | Role | Can do |
| --- | --- | --- |
| Site | `editor`, `admin` | Create private instances. An `admin` can also open and manage every instance (moderation) |
| Instance | `owner` | Everything, including deleting the instance and adding or removing managers/owners |
| Instance | `manager` | Files, members (plain members only), invite links, publishing |
| Instance | `member` | Download and play |

An instance always keeps at least one owner. Users without access get a 404 for its pages and API, so instance
ids cannot be probed.

### Members

- **Manually:** *Miembros → Añadir miembro* with a Takumi username or e-mail.
- **Invite link:** *Miembros → Enlace de invitación* creates `{web}/i/<token>` with a role, an optional use limit and an
  expiry. Only the SHA-256 of the token is stored, so the link is shown once. Opening it asks the user to sign in and
  confirm. The launcher's *Unirse con un enlace* accepts the same link through the API.
- Removing a member (or revoking a link) takes effect at once: the API stops serving the manifest and files.

### Files, drafts and publishing

- *Archivos* is a file manager for the instance's game folder: upload files or whole folders (drag and drop), create
  folders, rename/move, delete, download, and edit text files (`.json`, `.toml`, `.properties`, `.txt`…) in the
  browser. Paths are checked with the same rules as the launcher (`src/lib/instance-paths.ts`); executables
  (`.exe`, `.bat`…) are refused.
- Uploads stream to `STORAGE_DIR`, stored once per SHA-256. Each instance has a quota (4 GB by default) and files are
  limited to 512 MB.
- Changes go to a **draft**. *Publicar* writes a new numbered version: a manifest listing every file with its SHA-256,
  size and policy, signed with Ed25519 (`MANIFEST_SIGNING_KEY`). Members only ever see published versions.
- Per-file policy: **Sobrescribir** (`enforced`, default) keeps the file identical to the instance; **Solo si falta**
  (`default`, default for `options.txt`) is copied once so players keep their own settings.
- **Locked folders** (`mods/` by default; also `resourcepacks/`, `shaderpacks/`, `config/`, `datapacks/`): the launcher
  removes anything in them that is not in the manifest, so players cannot add their own mods.
- Each version records whether it needs a game restart (anything beyond resource packs changed) and a grace period;
  both are used by the in-game update notice (planned).

### In the launcher

- *Instancias → Instancias privadas* lists the instances the user belongs to, with *Descargar*, *Actualizar
  (obligatorio)* or *Jugar*.
- **Every launch updates first.** The launcher fetches the manifest, verifies its signature with the public key it was
  built with (`TAKUMI_MANIFEST_PUBKEY`), downloads missing or modified files (SHA-256 checked), deletes files the
  organizer removed and moves anything extra in locked folders to `instances/<id>/quarantine/`. An outdated version
  cannot be played, and a private instance cannot start offline.
- Private instances cannot be changed from the launcher: content install/remove/disable, *Abrir carpeta* and
  *Duplicar* are refused. Memory, Java and window settings stay editable.
- When the instance has a server address, the game joins it directly (quick play on 1.20+, `--server` before).
- **Encrypted storage (vault).** Enforced files under `mods/`, `resourcepacks/` and `shaderpacks/` are stored only
  encrypted (AES-256-GCM) in `instances/<id>/vault/objects/<sha256>.tkv`, with a per-member key from
  `/vault-key` that the launcher keeps in memory. They are decrypted into the game folder right before the game starts
  and deleted when it exits (and on the next start after a crash). Each decrypted `.jar`/`.zip` carries
  "copia de <usuario>" in its zip comment. The instance folder is hidden (hidden + system attributes on Windows).
- **Locked while playing.** Once the game reaches the title screen, Takumi Gate opens every mod jar and writes
  `.takumi/loaded.json`; the launcher then denies read access to `mods/` and `.fabric/processedMods/` (the jars Fabric
  extracts from other jars) for everybody. The running game keeps its open files; copying or listing them fails. Access
  is restored and everything deleted when the game exits. Without Takumi Gate in the instance there is no lock.
- **Join ticket.** Before starting, the launcher asks for a ticket for the Minecraft account and passes it to the game
  in `TAKUMI_GATE_TICKET`; the Takumi Gate mod presents it to the event server.
- **While playing.** The launcher checks `/status` every 30 s. A version that only changes resource packs is
  downloaded, decrypted and enabled in the running game. Any other version shows a notice in the launcher and in the
  game; *Reiniciar y actualizar* (or `/takumi reiniciar` in game) closes the game and starts it again updated.

### Takumi Gate (event server)

[Takumi Gate](https://github.com/AloneX15/TakumiGate) is a Fabric mod for the event server and the players (upload the
same jar to the instance's `mods/`). In *Ajustes → Servidor del evento* a manager generates a **server key**
(`tgk_…`, shown once, only its SHA-256 is stored; generating a new one revokes the old one) and pastes the shown
config into the server's `config/takumi_gate.json`. Then the server:

- asks every joining client for its ticket during login and checks it with `/api/gate/verify` against the profile
  Minecraft authenticated: non-members, expelled members (their tickets are deleted at once), other Minecraft accounts
  and players without Takumi Launcher are refused before entering the world;
- polls `/api/gate/status` and, for players on a version older than one that needs a restart, shows a title and chat
  notice, reminds them at 10, 5 and 1 minutes and disconnects them when the grace period ends.

Tickets last 12 hours and are bound to the Takumi user, the instance, the Minecraft account and the installed version.
Prefer `online-mode=true`: the ticket is then checked against the id Mojang authenticated. On offline-mode servers
(non-premium accounts) it is checked by name, so a stolen ticket would let someone join under that name.

### API

All need `Authorization: Bearer <launcher token>`.

| Endpoint | Result |
| --- | --- |
| `GET /api/launcher/instances` | `{ instances: [{ id, name, description, minecraft, loader, loader_version, server, version, role }] }`; `version` 0 = nothing published |
| `GET /api/launcher/instances/:id/manifest` | `{ version, manifest, signature }`; `manifest` is the exact signed JSON text. 404 if not a member or nothing published |
| `GET /api/launcher/instances/:id/files/:sha256` | The file bytes, only for hashes in the latest published manifest |
| `POST /api/launcher/invites/:token/accept` | `{ instance_id, already_member }` or 400 `{ error }` |
| `GET /api/launcher/manifest-key` (no auth) | `{ public_key }`: raw Ed25519 key, base64. Used by local development builds only |
| `GET /api/launcher/instances/:id/status?since=<v>` | `{ version, restart_required, grace_minutes, notes, published_at }`; `restart_required` is true when a release after `v` changed anything but resource packs |
| `GET /api/launcher/instances/:id/vault-key` | `{ id, key }`: base64 AES-256 key of this member's vault (HMAC of the signing key, instance and user; never stored). `id` changes if the signing key changes |
| `POST /api/launcher/instances/:id/ticket` | Body `{ uuid, name, version }` → `{ ticket, expires_at }`. 400 for a bad account or a version that is not published |

Takumi Gate endpoints take `Authorization: Bearer <server key>` instead:

| Endpoint | Result |
| --- | --- |
| `POST /api/gate/verify` | Body `{ ticket, uuid }` (online-mode server) or `{ ticket, name }` (offline-mode server, where ids are derived from names) → `200 { ok: true, username, version, current_version, restart_required }`, `403 { ok: false, error }` (refuse the player with `error`), `401` unknown key |
| `GET /api/gate/status` | `{ instance, name, version, releases: [{ version, restart_required, grace_minutes, notes, published_at }] }`, newest first |

Manifest format (`format: 1`, keep in sync with `packages/manifest-system` in the launcher):

```json
{
  "format": 1, "instance": "<uuid>", "name": "Evento", "version": 3,
  "minecraft": "1.21.1", "loader": "fabric", "loader_version": null, "server": "play.example.com",
  "locked_dirs": ["mods"], "restart_required": true, "grace_minutes": 5,
  "published_at": "2026-11-15T12:00:00.000Z",
  "files": [{ "path": "mods/event.jar", "sha256": "…", "size": 12345, "policy": "enforced" }]
}
```

### Setting up the key

1. Generate `MANIFEST_SIGNING_KEY` (command in `.env.example`) and set it on the server. Keep it secret.
2. Read the public key from `GET /api/launcher/manifest-key` and store it as the `TAKUMI_MANIFEST_PUBKEY` secret of the
   launcher repository; the release workflow embeds it.
3. Changing the key later requires a new launcher release.

In development no key is needed: the website creates one in `./data/manifest-signing-key.der` and launcher builds
pointing at `localhost` fetch the public key.

### What this does not protect against

Files that run on the player's computer can always be copied by someone determined: while the game runs, the decrypted
mods are in the game folder (Fabric loads them from there) and in memory. The vault only protects them while the game
is closed, and the watermark says whose copy leaked unless someone strips the zip comment. Keep the valuable parts on
the server (server-side mods, plugins, datapacks). The vault key is derived from `MANIFEST_SIGNING_KEY`: changing that
key makes every launcher download the event files again.
