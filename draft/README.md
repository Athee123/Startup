# LocalQuote

Private first version of a Brampton home-services marketplace. LocalQuote is a working name, not a registered business or a cleared trademark.

The prototype includes job posting with photos, five service categories, category-matched provider job feeds, provider onboarding, quotes with scope and availability, sorting, comparison, demo selection and completion, local persistence, export, and a manual pilot checklist.

All seeded jobs, providers, experience, credentials, and prices are fictional and visibly marked as sample data. Provider profiles are not verified. New profiles remain review-pending. No communications, real bookings, payments, authentication, or multi-user backend are connected. Data lives in browser localStorage; private hosting restricts access to the owner.

## Files

`dist/index.html`, `dist/styles.css`, `dist/model.js`, and `dist/app.js` run without a build step. `model.js` also exposes its core workflow functions through CommonJS for Node checks.

## Pilot hypothesis

Start in Brampton with small plumbing repairs, recruit five providers, interview ten customers about recent home-service experiences, and coordinate five actual requests manually. Review provider evidence before real introductions. Measure useful quotes, response time, selections, completed jobs, and repeat interest. These are targets and hypotheses, not evidence of traction.

## Validation

Run `node tests/workflows.cjs` for model workflows and `node --check dist/app.js` for application syntax. Browser visual QA is unavailable when the control-browser skill is not installed; do not claim visual or end-to-end browser testing.
