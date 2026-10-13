# LocalQuote — request and match prototype

A proposed home-services marketplace for posting jobs and comparing local providers' quotes by price, scope, and availability. LocalQuote is a working name; Brampton and a plumbing-first pilot remain hypotheses.

Read [START_HERE.md](START_HERE.md) for the original product brief. The current prototype keeps the selected white-and-navy theme with a simpler purpose: request a service, hear from matching providers, and let the homeowner choose. It implements a three-step job form with photos, service-and-area matching, simulated provider inbox alerts, multiple price/availability/scope responses, and confirmation of the homeowner's choice. The first provider response does not automatically get the job.

All providers are fictional and unverified. Data and simulated alerts live in this browser only, under the `localquote-requests-v1` localStorage key. No accounts, real notifications, bookings, payments, or shared data are connected. The previous [draft](draft/README.md) remains reference material with separate storage; its data is not migrated or overwritten.

## Run the reference prototype privately

From this repository, using Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

The root page is the current request-and-match prototype. Choose a service (try Landscaping), fill in the request, then use **Provider demo** to see simulated alerts and respond as different sample providers. Return to **My requests** to compare responses and choose one. Matching uses service category and explicitly listed Brampton areas, not GPS or distance. The loopback server has no authentication and is only for local development. Do not expose it publicly. Processes must be restarted in a new task.

## Validate

With Node.js installed (validated with Node 24):

```sh
node tests/workflows.cjs
node --check model.js
node --check app.js
```

There is no build step or package installation. Browser checks additionally require Playwright and Chromium; they are available in the current cloud environment.

With the local server above running, execute `node tests/browser.cjs`. This checks the current flow at 320px, 390px, and 1440px: service selection, photo-backed request, back-navigation, reload persistence, matching provider inboxes, two independent responses, homeowner confirmation, and removal from other providers' inboxes after selection. It also verifies that a storage failure does not create requests or alerts or display a false success. It regenerates the home and response screenshots. Set `CHROMIUM_PATH` if Chromium is installed elsewhere. Browser data is isolated to the test session.

Validated: five current model tests, JavaScript syntax checks, and the browser checks above passed. Optional reference checks remain available as `node draft/tests/workflows.cjs` and `node tests/reference-browser.cjs`. This does not validate a backend or real bookings.

## Next stage

Review the simpler [desktop home](docs/landing-desktop.png), [phone home](docs/landing-mobile.png), and [phone responses](docs/responses-mobile.png). Keep fictional content explicitly labelled and never present providers as verified without reviewed evidence.

The next production stage needs authenticated homeowner/provider accounts, a shared database, photo storage, provider service-area settings, and real notification delivery. Selection must be atomic on the backend so two providers cannot be assigned to the same job. Keep hosting private until public launch is explicitly authorized.
