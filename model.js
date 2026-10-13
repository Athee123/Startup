(function (root) {
  'use strict';
  const categories = ['Plumbing', 'Electrical', 'Handyman', 'Landscaping', 'Cleaning'];
  const areas = ['Downtown Brampton', 'Bramalea', 'Mount Pleasant', 'Springdale', 'Heart Lake', 'Other Brampton area'];
  const timings = ['This week', 'Next week', 'Flexible'];
  const availability = ['Within 2 days', 'Within 4 days', 'Within 7 days', 'To be agreed'];
  const id = () => globalThis.crypto.randomUUID();
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = value => String(value ?? '').trim();
  function check(ok, message) { if (!ok) throw new Error(message); }
  function seed() {
    const names = ['Cedar Plumbing', 'Bright Home Electrical', 'Oak Home Repairs', 'Greenway Gardens', 'Fresh Start Cleaning'];
    const providers = categories.map((category, i) => ({id:'provider-'+i, name:names[i], category, areas:areas.slice(), sample:true}));
    providers.push({id:'garden-2', name:'Neighbourhood Landscapes', category:'Landscaping', areas:areas.slice(), sample:true},
      {id:'garden-3', name:'Maple Yard Care', category:'Landscaping', areas:['Bramalea', 'Springdale'], sample:true});
    return {version:1, jobs:[], providers, alerts:[]};
  }
  function matches(state, job) { return state.providers.filter(p => p.category === job.category && p.areas.includes(job.area)); }
  function validate(input) {
    check(categories.includes(input.category), 'Choose a service.');
    check(text(input.title).length >= 8 && text(input.title).length <= 100, 'Use a title between 8 and 100 characters.');
    check(text(input.description).length >= 25 && text(input.description).length <= 2000, 'Describe the work in 25 to 2,000 characters.');
    check(areas.includes(input.area), 'Choose a service area.');
    check(timings.includes(input.timing), 'Choose your preferred timing.');
    check(Array.isArray(input.photos) && input.photos.length <= 2 && input.photos.every(p => typeof p === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p) && p.length <= 1400000), 'Use up to two JPG, PNG, or WebP photos of 1 MB or smaller.');
  }
  function request(state, input) {
    validate(input);
    const job = {category:input.category, area:input.area, timing:input.timing, title:text(input.title), description:text(input.description), photos:input.photos.slice(), id:id(), status:'open', quotes:[], selectedQuoteId:null};
    state.jobs.unshift(job);
    for (const p of matches(state, job)) state.alerts.push({jobId:job.id, providerId:p.id});
    return job;
  }
  function getJob(state, jobId) { const job = state.jobs.find(j => j.id === jobId); check(job, 'Request not found.'); return job; }
  function respond(state, jobId, providerId, input) {
    const job = getJob(state, jobId);
    check(job.status === 'open', 'This request is no longer accepting responses.');
    check(matches(state, job).some(p => p.id === providerId), 'This provider does not serve this request.');
    check(!job.quotes.some(q => q.providerId === providerId), 'This provider has already responded.');
    const amount = Number(input.amount);
    check(Number.isFinite(amount) && amount >= 0.01 && amount <= 100000, 'Enter a price from $0.01 to $100,000.');
    check(availability.includes(input.availability), 'Choose availability.');
    check(text(input.scope).length >= 25 && text(input.scope).length <= 1500, 'Describe inclusions and exclusions in 25 to 1,500 characters.');
    const quote = {id:id(), providerId, amount:Math.round(amount*100)/100, availability:input.availability, scope:text(input.scope)};
    job.quotes.push(quote); return quote;
  }
  function choose(state, jobId, quoteId) {
    const job = getJob(state, jobId);
    check(job.status === 'open', 'A provider has already been chosen.');
    check(job.quotes.some(q => q.id === quoteId), 'Response not found.');
    job.status = 'selected'; job.selectedQuoteId = quoteId;
  }
  function inbox(state, providerId) {
    return state.alerts.filter(a => a.providerId === providerId).map(a => getJob(state, a.jobId)).filter(j => j.status === 'open');
  }
  function decode(raw) {
    const state = JSON.parse(raw);
    check(state?.version === 1 && Array.isArray(state.jobs) && Array.isArray(state.providers) && Array.isArray(state.alerts), 'Saved demo data is unreadable.');
    check(state.providers.every(p => typeof p.id === 'string' && typeof p.name === 'string' && categories.includes(p.category) && Array.isArray(p.areas)), 'Saved provider data is unreadable.');
    for (const job of state.jobs) {
      validate(job);
      check(typeof job.id === 'string' && ['open','selected'].includes(job.status) && Array.isArray(job.quotes), 'Saved request data is unreadable.');
      check(job.quotes.every(q => typeof q.id === 'string' && state.providers.some(p => p.id === q.providerId) && Number.isFinite(q.amount) && q.amount >= .01 && availability.includes(q.availability) && typeof q.scope === 'string'), 'Saved quote data is unreadable.');
      check(job.status !== 'selected' || job.quotes.some(q => q.id === job.selectedQuoteId), 'Saved selection is unreadable.');
    }
    check(state.alerts.every(a => state.jobs.some(j => j.id === a.jobId) && state.providers.some(p => p.id === a.providerId)), 'Saved alerts are unreadable.');
    return state;
  }
  const api = {categories, areas, timings, availability, copy, seed, matches, validate, request, respond, choose, getJob, inbox, decode};
  if (typeof module !== 'undefined') module.exports = api; else root.LocalQuote = api;
})(globalThis);
