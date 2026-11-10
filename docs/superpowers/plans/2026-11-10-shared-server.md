# Shared server implementation plan

> Execute inline with executing-plans; preserve the approved UI and data behavior.

**Goal:** Run the current surprise shop with shared persistent data on the user's Ubuntu server.

**Architecture:** Native Node HTTP + SQLite behind Nginx, running in Docker Compose. Select local/shared adapters via an explicit runtime configuration; reuse validation and ordering rules.

**Tech stack:** JavaScript ES modules, node:test, Node 24, SQLite, Docker Compose, Nginx, systemd.

- [x] Inspect server and repository; establish a passing 36-test baseline on `codex/shared-server`.
- [x] Bootstrap signed Ubuntu packages, Docker log limits and UFW rules retaining SSH.
- [x] Add failing tests in `tests/shared-server.test.mjs` for 35 unchecked defaults, 64 entries, recency, production-disabled room creation, all static resources, import validation and private access.
- [x] Update `src/store.mjs`, `src/domain.mjs` and `src/server.mjs` to pass those tests while retaining legacy migration tests.
- [x] Add `public/shared-store.js`, `public/runtime-config.js` and select the adapter in `public/app.js`; await reads, poll shared state and show accurate save status.
- [x] Add validated snapshot export/import with explicit confirmation in `public/index.html` and handlers in `public/app.js`; protect all existing browser data.
- [x] Run `npm test`, `npm run check`, `npm run build` and `git diff --check`.
- [x] Add `deploy/compose.yml`, `deploy/nginx.conf`, provisioning and online-backup scripts. Bind test ports to localhost, mount database data separately and disable production HTTP room creation.
- [x] Deploy source without secrets or browser data; create one private room via an administrative CLI and save its token in a mode-600 server file.
- [x] Exercise two real API clients, stale edits, a draw, redemption and restart persistence on a disposable QA room; restore a backup copy and run `PRAGMA integrity_check`.
- [x] Open an SSH tunnel and use the UI to confirm shared behavior, assets, dialogs, empty notes and mobile layout. Keep the real room's initial list unmodified.
- [x] Review changes, record verification and commit. Provide private preview instructions and domain/filing steps; do not describe the site as publicly launched.

## Remaining release checks

- [ ] User adds cloud firewall TCP 443 rule; verify HTTPS externally.
- [ ] Push the reviewed change to main and verify GitHub Pages deployment and actual cross-origin UI.
