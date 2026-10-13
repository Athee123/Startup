# LocalQuote — design handoff

A proposed home-services marketplace for posting jobs and comparing local providers' quotes by price, scope, and availability. LocalQuote is a working name; Brampton and a plumbing-first pilot remain hypotheses.

Read [START_HERE.md](START_HERE.md) for the supplied product brief. The first landing-page design at `index.html` implements the selected clean professional direction: white, navy, and clear quote cards. The imported [draft](draft/README.md) is optional reference material, not an approved design or production architecture. It uses browser localStorage and fictional sample providers. There are no real accounts, bookings, notifications, payments, or shared data.

## Run the reference prototype privately

From this repository, using Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

The root page is the new landing-page design. Its demo links open the supplied prototype under `draft/dist/`. The loopback server has no authentication and is only for local development. Do not expose it publicly. Processes must be restarted in a new task.

## Check the supplied workflows

With Node.js installed (validated with Node 24):

```sh
node draft/tests/workflows.cjs
node --check draft/dist/model.js
node --check draft/dist/app.js
```

There is no build step or package installation. Browser checks additionally require Playwright and Chromium; they are available in the current cloud environment.

With the local server above running, execute `node tests/browser.cjs`. This checks the new page at 320px, 390px, and 1440px, then exercises the reference prototype's photo-backed job posting, persistence after reload, two provider quotes, comparison, selection, completion, and reopening. It checks the prototype's four routes at phone and desktop widths and regenerates the review screenshots. Set `CHROMIUM_PATH` if Chromium is installed elsewhere. Browser data is isolated to the test session.

Validated: all eight model tests, JavaScript syntax checks, and the browser checks above passed. The first page is ready for design review; this does not validate a backend or real bookings.

## Next stage

Review the implemented white-and-navy first page before implementing more of the application. [Desktop](docs/landing-desktop.png) and [phone](docs/landing-mobile.png) screenshots are included for review. Keep fictional content explicitly labelled and never present providers as verified without reviewed evidence.

The five-category scope is plumbing, electrical, handyman, landscaping, and cleaning. After the first-page review, develop in small stages: landing page, customer job flow, provider flow, quote comparison, then a backend for real users. Choose the production architecture once the first-page direction is confirmed. Keep hosting private until public launch is explicitly authorized.
