# Codex project brief: Home-services startup

I want to build this startup website collaboratively with AI. Work with me on the product, design, and implementation in stages. I care about design quality and want to review the first screens before the rest of the app is built.

## The idea

Connect homeowners and tenants with local plumbers, electricians, handymen, landscapers, and cleaners. Customers post a job; matching providers submit job-specific quotes; the customer compares price, scope, and availability and chooses a provider.

The proposed focus is professional home repairs and improvements, with a process for reviewing appropriate trade credentials and insurance. Never label a provider verified without reviewed evidence.

## Current assumptions to discuss

- LocalQuote is only a working name. It has not been checked for availability or registered.
- Brampton is a proposed first launch area, inferred from where I live. It is not a confirmed business decision.
- A first live pilot focused on small plumbing repairs is a hypothesis, not an agreed restriction. The initial prototype includes five service categories.

## Agreed initial MVP scope

- A mobile-friendly website.
- Five categories: plumbing, electrical, handyman, landscaping, and cleaning.
- Customers post a description, photos, location, and preferred timing.
- Providers see matched jobs and submit quotes.
- Customers compare quotes and choose a provider.
- Keep AI features, live tracking, chat, subscriptions, native apps, and complex scheduling/payment flows out of the first MVP.

## How to work with me

1. Start by discussing the visual direction and reviewing a concrete first-screen design with me. Ask for a reference or offer a few distinct directions if useful. Do not build the entire site before I have seen the direction.
2. Explain major product and technical choices in plain language. Help me understand what we are building.
3. Establish the repository and architecture suited to the confirmed scope.
4. Implement in small, reviewable stages: landing page, customer job flow, provider flow, quote comparison, then the backend needed for real users.
5. Test the core workflows and inspect the design at phone and desktop sizes when browser tooling is available. Report any verification that cannot be completed.
6. Keep hosting private until I explicitly authorize a public launch.

## Existing draft in this bundle

`draft/` contains a buildless HTML/CSS/JavaScript prototype created before I asked to move to a collaborative Codex workflow. It is optional reference material, not an approved design or production architecture.

The draft includes browser-local job posting, local photo attachments, fictional provider profiles, category matching, quotes, sorting, comparison, demo selection/completion, and a pilot checklist. It uses localStorage only. It does not support real accounts, cross-device data, provider notifications, real bookings, or payments.

All seeded businesses, experience, credentials, jobs, and prices are fictional sample content. New profiles are marked review-pending. No business or provider has been verified.

Implementation stopped before validation and deployment. No browser, workflow, or syntax checks have been completed. The draft README references a planned workflow test file that does not yet exist. Assess the draft before relying on it.

## Suggested first real-world experiment

After agreeing on the product direction, interview 10 local homeowners about recent repairs, recruit 5 suitable providers, and coordinate 5 real requests manually with permission. Track useful quotes, response time, selections, completed jobs, and repeat interest. These numbers are proposed targets, not traction.

## First instruction for Codex

Read this brief and inspect the optional draft. Summarize the startup and current limitations, then help me choose the design direction for the first page. Do not deploy or build the rest of the application yet.
