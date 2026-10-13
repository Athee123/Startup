# LocalQuote — private account and matching development

A home-services marketplace where homeowners request work, matching providers respond with price and availability, and the homeowner chooses. The white-and-navy interface keeps one clear starting point: request a service.

## What works now

- Homeowner and provider registration, password sign-in, and sign-out.
- Provider main service, service areas, usual availability, and a pending-review profile.
- Shared SQLite requests, photos, responses, and homeowner selections.
- Provider inbox matching by service category and Brampton area. Open inboxes and homeowner responses refresh every five seconds.
- Only a request's owner can choose its provider. Selection is atomic; the chosen provider sees the assignment, and other providers no longer see that closed job.
- Homeowners see only their requests; providers see matching jobs and their own quotes, never competitors' prices. Emails and password hashes are not exposed in workspace responses.

No sample providers are seeded in the current app. Create separate test accounts to try matching. Provider profiles are not verified. Email/SMS/push delivery, email verification, password recovery, payments, and public hosting are not connected. In-app updates work while the signed-in page is open; this is not background push delivery.

## Run privately

Use **Node.js 24 or newer** (Node 24.19 tested). The app uses built-in HTTP, crypto and SQLite modules with no third-party server dependencies and no build or dependency-install step.

```sh
cd /workspace/Startup
npm start
```

The server binds only to loopback on port 8000. It serves the UI and authenticated APIs together. Python's static server cannot run the current app. Do not expose this development server publicly. Live processes must restart in a new task.

Optional settings: `PORT` changes the port; `LOCALQUOTE_DB` selects the database file (default `.localquote/app.sqlite`). `SECURE_COOKIES=true` requires HTTPS and is for a future TLS deployment, not the current loopback HTTP workflow.

Accounts, salted scrypt password hashes, hashed session tokens, requests, photo data and quotes are stored in the SQLite file. Sessions expire after seven days and are revoked on sign-out. Cookies use HttpOnly and SameSite=Strict. Mutating APIs require JSON, the application request header, and a matching browser origin. Sign-in and registration are limited per connection address. SQLite writes use transactions. Static serving explicitly allows only application assets, protecting source and database files.

The ignored `.localquote/` directory contains private application data: do not commit it, put credentials in code, or use production personal data for development. Data survives process restarts; new machines need the retained database or a deliberate backup. Back up through SQLite's backup API while running, or stop the server before copying the database and any journal files. Backups, deployment TLS, account recovery, and credential review are needed before a live pilot.

## Try the workflow

1. In one browser session create a provider account offering Landscaping in Bramalea.
2. In another session create a second matching provider account.
3. In a separate session create a homeowner account and post a landscaping request in Bramalea, optionally with photos.
4. Both provider inboxes receive the shared request. Respond with different prices, availability, and scope.
5. The homeowner sees both responses and confirms one choice. The chosen provider sees the assignment; the other inbox closes that request.

No account switching dropdown or fabricated notifications are used. Use separate browser profiles or isolated test contexts.

## Validate

```sh
npm test
node --check server.cjs
node --check app.js
npm run test:browser
```

`npm test` executes ten model/API tests, including role and owner isolation, matching, quote privacy, invalid input, request-origin checks, duplicate responses, concurrent selection, persistence across server restart, and session revocation. Test databases are temporary and removed afterward.

The browser checks require Playwright and Chromium, available in the current cloud image. They launch their own ephemeral backend and independent homeowner/provider sessions, exercise signup, photo posting, automatic inbox updates, two quotes, confirmation, sign-out/in, and reload at 1440px and 390px, and check the account form at 320px. Set `CHROMIUM_PATH` if needed. The tests regenerate review screenshots and never add accounts to the development database.

[Desktop home](docs/landing-desktop.png) · [Phone home](docs/landing-mobile.png) · [Phone responses](docs/responses-mobile.png)

## Original handoff and next stage

[START_HERE.md](START_HERE.md) records the original brief. LocalQuote remains a working name and Brampton a proposed pilot location. `draft/` preserves the supplied localStorage prototype as reference; its browser data has not been imported or overwritten. Its optional tests are `node draft/tests/workflows.cjs` and `node tests/reference-browser.cjs`, with a separate Python static server for the reference app.

Next: account recovery and email verification, editable provider profiles, reviewed credentials, production photo storage, email/SMS/push delivery, and a private hosted test environment. Keep hosting private until the user explicitly authorizes public launch.
