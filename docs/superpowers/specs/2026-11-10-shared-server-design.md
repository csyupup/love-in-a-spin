# Shared server deployment

The user approved proceeding with Ubuntu, Docker Compose, Nginx and server-side shared wishes on 2026-11-10. No domain or ICP filing exists. The user subsequently selected GitHub Pages for the frontend and an authenticated HTTPS IP endpoint for testing; no domain purchase or account real-name change is performed.

## Decisions

- Reuse the native Node HTTP and SQLite backend. PostgreSQL adds operational cost without helping two users; a managed database would introduce another service. SQLite is the chosen persistent store.
- Preserve the current UI, 35 initial wishes, 64-wish capacity, official brand assets, blank notes, all-participant draw ordering and immutable history. New rooms start unchecked with no history.
- Keep the frontend on GitHub Pages. Its build selects the shared HTTPS endpoint through SHARED_API_BASE; ordinary local builds retain browser-local mode. The Node server also serves shared runtime configuration for local testing. Never silently fall back to local storage on shared connection failures.
- Two users open the same capability link with a random token in its fragment. Send it only in Authorization headers, persist only its hash on the server, and do not expose room creation on production HTTP. No share button is added.
- Poll every three seconds, refresh on visibility changes, and queue updates during forms or animations. Revision conflicts refresh state and preserve unsaved form fields. Do not retry uncertain writes or draws with a new request ID.
- Add export/import for deliberate migration. Export is available in both modes. Import requires confirmation, validates the full snapshot, uses revision checking and leaves the source browser data intact. No automatic merging or replacement.
- Bind the container to loopback and expose only the Nginx HTTPS API. Use Docker restart policies, an owned persistent data directory, bounded logs, SQLite online backups and a daily systemd timer. Cloud firewall port 443 is opened only after the user confirms or performs the change.

## Verification

Run the existing tests, integration tests with two independently authenticated clients, 64-item draws, concurrent revision conflicts, snapshot import validation, source asset requests and restart persistence. Verify UI in separate browser contexts through the SSH tunnel, then test an online backup by opening the restored copy. Confirm the public interface has no application port before domain setup.

## Domain handoff

No purchased domain is required for the selected IP certificate architecture. Automatic certificate renewal is mandatory and is tested with Certbot dry-run. Formal operation and filing requirements for the Mainland backend remain subject to Tencent Cloud and local regulations. Old localStorage data remains available for deliberate export; it is never automatically uploaded or cleared.
