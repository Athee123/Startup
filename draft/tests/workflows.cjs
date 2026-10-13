'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../dist/model.js');

const jobInput = {
  category: 'Plumbing', title: 'Repair the bathroom tap',
  description: 'The bathroom tap drips. Include labour, standard parts, and tax.',
  area: 'Bramalea', timing: 'This week', budget: 'Under $250', photos: []
};
const quoteInput = {
  amount: 175.25, availability: 'Within 2 days',
  scope: 'Labour, standard cartridge, cleanup, and tax included; new tap excluded.'
};

test('seeded content is fictional and covers all five service categories', () => {
  const state = M.seed();
  assert.equal(M.categories.length, 5);
  for (const category of M.categories) {
    assert.ok(state.providers.some(p => p.category === category));
  }
  assert.ok(state.providers.every(p => p.sample && !p.verified));
  assert.ok(state.jobs.every(j => j.sample));
});

test('posting, matching, quoting, selection, completion, and reopening', () => {
  const state = M.seed();
  const job = M.addJob(state, jobInput);
  assert.equal(job.sample, false);
  assert.ok(M.matchedJobs(state, 'pro-1').includes(job));
  assert.ok(!M.matchedJobs(state, 'pro-4').includes(job));
  const quote = M.addQuote(state, job.id, 'pro-1', quoteInput);
  assert.equal(quote.amount, 175.25);
  M.selectQuote(state, job.id, quote.id);
  assert.equal(job.status, 'selected');
  assert.equal(job.selectedQuoteId, quote.id);
  assert.ok(!M.matchedJobs(state, 'pro-1').includes(job));
  M.completeJob(state, job.id);
  assert.equal(M.summary(state).completed, 1);
  M.reopenJob(state, job.id);
  assert.equal(job.status, 'open');
  assert.equal(job.selectedQuoteId, null);
});

test('invalid job fields and photo types are rejected without adding jobs', () => {
  const state = M.seed();
  for (const patch of [
    { category: 'Roofing' }, { title: 'Tap' }, { description: 'Drips' },
    { area: 'Unknown' }, { timing: 'Yesterday' }, { budget: 'Free' },
    { photos: ['data:text/html;base64,SGVsbG8='] },
    { photos: Array(3).fill('data:image/png;base64,SGVsbG8=') }
  ]) assert.throws(() => M.addJob(state, { ...jobInput, ...patch }));
  assert.equal(state.jobs.length, 2);
});

test('quotes reject category mismatches, duplicates, and invalid input', () => {
  const state = M.seed();
  const job = M.addJob(state, jobInput);
  assert.throws(() => M.addQuote(state, job.id, 'pro-4', quoteInput), /category/);
  for (const patch of [{amount: 0}, {amount: -1}, {amount: Infinity},
    {amount: 100001}, {availability: 'Tomorrow'}, {scope: 'Repair'}]) {
    assert.throws(() => M.addQuote(state, job.id, 'pro-1', {...quoteInput, ...patch}));
  }
  assert.equal(job.quotes.length, 0);
  M.addQuote(state, job.id, 'pro-1', quoteInput);
  assert.throws(() => M.addQuote(state, job.id, 'pro-1', quoteInput), /already/);
});

test('closed jobs reject quotes and completion requires a selection', () => {
  const state = M.seed();
  assert.throws(() => M.completeJob(state, 'job-1'), /Select/);
  assert.throws(() => M.selectQuote(state, 'job-1', 'missing'), /not be found/);
  M.selectQuote(state, 'job-1', 'quote-1');
  assert.throws(() => M.selectQuote(state, 'job-1', 'quote-2'), /already/);
  assert.throws(() => M.addQuote(state, 'job-1', 'pro-1', quoteInput), /no longer/);
});

test('new provider profiles remain pending and match their category', () => {
  const state = M.seed();
  const input = {company: 'Example Cleaning', email: 'demo@example.com',
    category: 'Cleaning', area: 'Bramalea', years: 2,
    bio: 'Example profile offering one-time household cleaning.', consent: true};
  assert.throws(() => M.addProvider(state, {...input, consent: false}), /Confirm/);
  const provider = M.addProvider(state, input);
  assert.equal(provider.reviewStatus, 'pending');
  assert.equal(provider.sample, false);
  assert.ok(!provider.verified);
  const job = M.addJob(state, {...jobInput, category: 'Cleaning'});
  assert.deepEqual(M.matchedJobs(state, provider.id), [job]);
});

test('quote sorting respects price and availability without mutating stored order', () => {
  const job = M.seed().jobs[0];
  const ids = job.quotes.map(q => q.id);
  assert.deepEqual(M.sortedQuotes(job, 'price').map(q => q.amount), [160, 185, 210]);
  assert.deepEqual(M.sortedQuotes(job, 'availability').map(q => q.availability),
    ['Within 2 days', 'Within 2 days', 'Within 4 days']);
  assert.equal(M.sortedQuotes(job, 'recent')[0].id, 'quote-3');
  assert.deepEqual(job.quotes.map(q => q.id), ids);
});

test('local persistence round-trip preserves jobs, quotes, photos, and checklist', () => {
  const state = M.seed();
  const job = M.addJob(state, {...jobInput, photos: ['data:image/png;base64,SGVsbG8=']});
  M.addQuote(state, job.id, 'pro-1', quoteInput);
  state.pilot.interviews = true;
  assert.deepEqual(M.decode(JSON.stringify(state)), state);
  assert.throws(() => M.decode('{broken'));
  assert.throws(() => M.decode(JSON.stringify({...state, version: 2})), /Unsupported/);
});
