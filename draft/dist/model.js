(function (root) {
  'use strict';
  const categories = ['Plumbing', 'Electrical', 'Handyman', 'Landscaping', 'Cleaning'];
  const areas = ['Downtown Brampton', 'Bramalea', 'Mount Pleasant', 'Springdale', 'Heart Lake', 'Other Brampton area'];
  const budgets = ['Under $250', '$250–$500', '$500–$1,000', '$1,000+', 'Need advice'];
  const timings = ['As soon as possible', 'This week', 'Next week', 'Flexible'];
  const slots = ['Within 2 days', 'Within 4 days', 'Within 7 days', 'Within 14 days', 'To be agreed'];
  const pilotTasks = [
    { id: 'interviews', title: 'Talk to 10 Brampton homeowners', detail: 'Ask about their last repair: how they found someone, what went wrong, and how long it took. Record what happened, rather than asking if they like the idea.' },
    { id: 'providers', title: 'Recruit 5 providers in one category', detail: 'Start with small plumbing repairs as a pilot hypothesis. Ask how they find jobs, what makes a lead useful, and whether they would quote on a photo-backed request.' },
    { id: 'review', title: 'Review each provider before a real introduction', detail: 'Record identity, relevant trade credentials, insurance evidence, service area, and references. Demo profiles are not evidence of verification.' },
    { id: 'jobs', title: 'Collect 5 real job requests', detail: 'Gather the problem, photos, area, timing, and budget. With permission, introduce suitable providers and coordinate quotes manually.' },
    { id: 'compare', title: 'Help customers compare scope as well as price', detail: 'Ask providers to state labour, materials, exclusions, tax, availability, and any conditions. Confirm the actual work directly before anyone proceeds.' },
    { id: 'followup', title: 'Follow up after the first completed jobs', detail: 'Ask customers and providers what worked, what slowed them down, and whether they would use the service again.' },
    { id: 'pricing', title: 'Test willingness to pay after showing value', detail: 'Ask providers whether a fee for a useful introduction would make sense. Choose a pricing model from that evidence; this prototype does not charge anyone.' }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const text = value => String(value ?? '').trim();
  const id = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  function requireThat(ok, message) { if (!ok) throw new Error(message); }
  function seed() {
    return {
      version: 1, pilot: {},
      providers: [
        {id:'pro-1',company:'Cedar Plumbing',initials:'CP',category:'Plumbing',years:8,area:'Bramalea',bio:'Illustrative profile for small household plumbing repairs. This fictional provider shows the details customers would need before choosing a professional.',credential:'Sample trade credential; not checked',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-2',company:'Northside Plumbing',initials:'NP',category:'Plumbing',years:11,area:'Downtown Brampton',bio:'Illustrative profile for tap repairs, leaking fixtures, and small replacement jobs. All experience and credentials in this profile are fictional.',credential:'Sample trade credential; not checked',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-3',company:'Maple Home Plumbing',initials:'MP',category:'Plumbing',years:5,area:'Springdale',bio:'Illustrative local plumbing profile for testing the quote comparison. This is not a real company or an endorsed professional.',credential:'Sample trade credential; not checked',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-4',company:'Oak & Home Repairs',initials:'OH',category:'Handyman',years:6,area:'Mount Pleasant',bio:'Illustrative handyman profile for shelves, furniture assembly, and small household repairs. All profile details are sample data.',credential:'General home repairs; sample profile',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-5',company:'Neighbourhood Fix',initials:'NF',category:'Handyman',years:4,area:'Heart Lake',bio:'Illustrative handyman profile used to test quote and selection workflows. No credentials or past jobs have been verified.',credential:'General home repairs; sample profile',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-6',company:'Bright Home Electrical',initials:'BE',category:'Electrical',years:7,area:'Springdale',bio:'Fictional electrical provider for testing category matching. Trade authorizations and insurance have not been checked.',credential:'Sample electrical credential; not checked',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-7',company:'Greenway Gardens',initials:'GG',category:'Landscaping',years:5,area:'Mount Pleasant',bio:'Fictional landscaping provider for testing garden cleanup requests and job-specific quotes.',credential:'Sample landscaping experience; not checked',insurance:'Sample insurance entry; not checked',sample:true},
        {id:'pro-8',company:'Fresh Start Cleaning',initials:'FC',category:'Cleaning',years:3,area:'Bramalea',bio:'Fictional cleaning provider for testing one-time household cleaning requests and quote submissions.',credential:'Sample cleaning experience; not checked',insurance:'Sample insurance entry; not checked',sample:true}
      ],
      jobs: [
        {id:'job-1',title:'Fix a leaking kitchen tap',category:'Plumbing',description:'The kitchen tap drips continuously even when it is fully turned off. Looking for someone to inspect the cartridge and repair the leak. Please include labour and common replacement parts in the quote, and explain any exclusions.',area:'Bramalea',timing:'This week',budget:'Under $250',photos:[],status:'open',selectedQuoteId:null,sample:true,createdAt:'2026-10-11T16:30:00-04:00',quotes:[
          {id:'quote-1',providerId:'pro-1',amount:185,availability:'Within 2 days',scope:'Inspect and replace a standard tap cartridge; labour, one standard cartridge, cleanup, and tax included. A full tap replacement is excluded and would need a revised quote.',createdAt:'2026-10-11T17:00:00-04:00'},
          {id:'quote-2',providerId:'pro-2',amount:160,availability:'Within 4 days',scope:'Leak diagnosis and cartridge replacement, including labour, a standard cartridge, and tax. Special-order parts or replacement of the entire tap are excluded.',createdAt:'2026-10-11T17:25:00-04:00'},
          {id:'quote-3',providerId:'pro-3',amount:210,availability:'Within 2 days',scope:'Repair the dripping tap with a standard cartridge, including labour, materials, cleanup, and tax. If the tap body is damaged, a new price must be agreed before extra work.',createdAt:'2026-10-11T18:10:00-04:00'}]},
        {id:'job-2',title:'Mount two floating shelves',category:'Handyman',description:'Two wooden floating shelves need to be installed in the living room. Shelves and brackets are already purchased. Please include suitable fixings, checking wall suitability, installation, and cleanup in the quote.',area:'Mount Pleasant',timing:'Next week',budget:'Under $250',photos:[],status:'open',selectedQuoteId:null,sample:true,createdAt:'2026-10-11T15:00:00-04:00',quotes:[
          {id:'quote-4',providerId:'pro-4',amount:130,availability:'Within 7 days',scope:'Install both supplied shelves on a suitable interior wall, including standard fixings, labour, cleanup, and tax. Masonry walls or unusual mounting systems require a revised quote.',createdAt:'2026-10-11T16:40:00-04:00'},
          {id:'quote-5',providerId:'pro-5',amount:115,availability:'Within 4 days',scope:'Install two customer-supplied shelves, including standard wall anchors, labour, and tax. Excludes wall repairs, painting, and any new shelves or brackets.',createdAt:'2026-10-11T17:40:00-04:00'}]}
      ]
    };
  }
  function validateJob(input) {
    requireThat(categories.includes(input.category),'Choose a service category.');
    requireThat(text(input.title).length >= 8 && text(input.title).length <= 100,'Use a job title between 8 and 100 characters.');
    requireThat(text(input.description).length >= 25 && text(input.description).length <= 2000,'Describe the job in 25 to 2,000 characters.');
    requireThat(areas.includes(input.area),'Choose an area in Brampton.');
    requireThat(timings.includes(input.timing),'Choose when you need the work.');
    requireThat(budgets.includes(input.budget),'Choose a budget range, or “Need advice”.');
    requireThat(!input.photos || (Array.isArray(input.photos) && input.photos.length <= 2 && input.photos.every(p => typeof p === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) && p.length < 1500000)),'Use up to two JPG, PNG, or WebP photos, each smaller than 1 MB.');
  }
  function addJob(state, input) {
    validateJob(input);
    const job = {id:id('job'),category:input.category,title:text(input.title),description:text(input.description),area:input.area,timing:input.timing,budget:input.budget,photos:input.photos || [],status:'open',selectedQuoteId:null,sample:false,createdAt:new Date().toISOString(),quotes:[]};
    state.jobs.unshift(job); return job;
  }
  function addProvider(state, input) {
    requireThat(text(input.company).length >= 3 && text(input.company).length <= 80,'Enter a business name between 3 and 80 characters.');
    requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(input.email)) && text(input.email).length <= 200,'Enter a valid email address.');
    requireThat(categories.includes(input.category),'Choose your main service category.');
    requireThat(areas.includes(input.area),'Choose your main Brampton service area.');
    requireThat(Number.isInteger(Number(input.years)) && Number(input.years) >= 0 && Number(input.years) <= 60,'Enter experience between 0 and 60 years.');
    requireThat(text(input.bio).length >= 25 && text(input.bio).length <= 1000,'Describe your work in 25 to 1,000 characters.');
    requireThat(input.consent === true,'Confirm that this is a local demo profile.');
    const provider = {id:id('pro'),company:text(input.company),email:text(input.email),initials:text(input.company).split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join(''),category:input.category,area:input.area,years:Number(input.years),bio:text(input.bio),credential:text(input.credential).slice(0,200) || 'Not provided',insurance:text(input.insurance).slice(0,200) || 'Not provided',reviewStatus:'pending',sample:false};
    state.providers.push(provider); return provider;
  }
  function getJob(state, jobId) { const job = state.jobs.find(j => j.id === jobId); requireThat(job,'This job could not be found.'); return job; }
  function getProvider(state, providerId) { const provider = state.providers.find(p => p.id === providerId); requireThat(provider,'Choose a provider profile.'); return provider; }
  function addQuote(state, jobId, providerId, input) {
    const job = getJob(state,jobId), provider = getProvider(state,providerId);
    requireThat(job.status === 'open','This job is no longer accepting quotes.');
    requireThat(provider.category === job.category,'Your service category must match this job.');
    requireThat(!job.quotes.some(q=>q.providerId === providerId),'This provider already has a quote on this job.');
    const amount = Number(input.amount);
    requireThat(Number.isFinite(amount) && amount > 0 && amount <= 100000,'Enter a total quote greater than $0 and no more than $100,000.');
    requireThat(slots.includes(input.availability),'Choose your earliest availability.');
    requireThat(text(input.scope).length >= 25 && text(input.scope).length <= 1500,'Explain inclusions, exclusions, and conditions in 25 to 1,500 characters.');
    const quote = {id:id('quote'),providerId,amount:Math.round(amount*100)/100,availability:input.availability,scope:text(input.scope),createdAt:new Date().toISOString()};
    job.quotes.push(quote); return quote;
  }
  function selectQuote(state, jobId, quoteId) {
    const job = getJob(state,jobId);
    requireThat(job.status === 'open','This job already has a selection. Reopen it before changing providers.');
    requireThat(job.quotes.some(q=>q.id === quoteId),'This quote could not be found.');
    job.selectedQuoteId = quoteId; job.status = 'selected'; return job;
  }
  function completeJob(state, jobId) { const job=getJob(state,jobId);requireThat(job.status === 'selected','Select a provider before completing the demo job.');job.status='completed';return job; }
  function reopenJob(state, jobId) { const job=getJob(state,jobId);requireThat(job.status !== 'open','This job is already open.');job.status='open';job.selectedQuoteId=null;return job; }
  function sortedQuotes(job, order) {
    const quotes = job.quotes.slice();
    if (order === 'price') quotes.sort((a,b)=>a.amount-b.amount);
    if (order === 'availability') quotes.sort((a,b)=>slots.indexOf(a.availability)-slots.indexOf(b.availability));
    if (order === 'recent') quotes.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
    return quotes;
  }
  function matchedJobs(state,providerId) { const provider=getProvider(state,providerId);return state.jobs.filter(j=>j.status==='open' && j.category===provider.category); }
  function summary(state) { return {open:state.jobs.filter(j=>j.status==='open').length,quotes:state.jobs.reduce((n,j)=>n+j.quotes.length,0),completed:state.jobs.filter(j=>j.status==='completed').length}; }
  function decode(raw) {
    const state=JSON.parse(raw);
    requireThat(state && state.version===1 && Array.isArray(state.jobs) && Array.isArray(state.providers) && typeof state.pilot==='object' && state.pilot!==null,'Unsupported demo data.');
    requireThat(state.jobs.every(j=>Array.isArray(j.quotes) && ['open','selected','completed'].includes(j.status) && categories.includes(j.category) && Array.isArray(j.photos)),'Demo job data is invalid.');
    return state;
  }
  const api={categories,areas,budgets,timings,slots,pilotTasks,clone,seed,validateJob,addJob,addProvider,getJob,getProvider,addQuote,selectQuote,completeJob,reopenJob,sortedQuotes,matchedJobs,summary,decode};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.LocalQuoteModel=api;
})(typeof window !== 'undefined' ? window : globalThis);
