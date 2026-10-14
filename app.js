(() => {
  'use strict';
  const M = window.LocalQuote, main = document.getElementById('main');
  let state = {version:1,jobs:[],providers:[],alerts:[]}, user=null, loading=true, loadProblem='', authMode='register', afterAuth='', draft = blank(), step = 0, jobId = '', providerId = '', quoteJobId = '', confirming = '', photoLoading = false, photoError = '', busy=false, accountRole='homeowner', noticeTimer;
  function blank(category = '') { return {category, title:'', description:'', area:'', timing:'', photos:[]}; }
  async function api(url, data) {
    const response=await fetch(url, data===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-LocalQuote-Request':'1'},body:JSON.stringify(data)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }
  async function refresh() { if(user) state=await api('/api/state'); }
  async function initialize() {
    try { ({user}=await api('/api/session')); if(user) { providerId=user.id; await refresh(); } }
    catch(e) { loadProblem='Could not connect to the server. '+e.message; }
    loading=false; render();
  }
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => new Intl.NumberFormat('en-CA', {style:'currency', currency:'CAD'}).format(v);
  const options = (values, current) => '<option value="">Choose an option</option>'+values.map(v => `<option ${v===current?'selected':''}>${esc(v)}</option>`).join('');
  const button = (label, action, attrs = '', cls = '') => `<button class="button ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
  const icons = {
    Plumbing:'<path d="M6 3v7a3 3 0 0 0 3 3h6v8M3 3h6m3 18h6M12 7h6a3 3 0 0 1 3 3v3M12 4v6m6 3h6"/>',
    Electrical:'<path d="m13 2-8 12h6l-1 8 9-13h-6V2Z"/>',
    Handyman:'<path d="m14 6-8 8a3 3 0 1 0 4 4l8-8M14 6l4-4 4 4-4 4-4-4ZM5 17l2 2"/>',
    Landscaping:'<path d="M12 22V11M12 14C4 14 3 7 4 3c6 0 11 4 8 11Zm0 4c6 0 10-5 9-10-6 0-10 4-9 10Z"/>',
    Cleaning:'<path d="m15 2-7 10M7 11l7 5-4 6-8-5 5-6Zm10-2h6m-3-3v6M4 2v5M2 4h4"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    home:'<path d="m3 10 9-7 9 7v11H3V10Zm6 11v-8h6v8"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    location:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    inbox:'<path d="M3 4h18v16H3V4Zm0 10h5l2 3h4l2-3h5"/>',
    photo:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-4 4 3 4-6 5 7"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.home}</svg>`;
  const initials = name => esc(name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase());
  const photos = job => `<div class="attachments">${job.photos.map((p,i)=>`<img src="${esc(p)}" alt="Job photo ${i+1}" loading="lazy">`).join('')}</div>`;
  function message(s) { clearTimeout(noticeTimer); document.getElementById('notice').textContent=s; if(s) noticeTimer=setTimeout(()=>document.getElementById('notice').textContent='',6500); }
  function focusHeading() { const h=main.querySelector('h1'); if(h) {h.tabIndex=-1; h.focus({preventScroll:true});} window.scrollTo(0,0); }
  function route() { return location.hash.slice(1) || 'home'; }
  function navigate(to) { if (route() === to) render(); else location.hash = to; }
  function heading(title, sub) { return `<div class="page-title"><h1>${title}</h1><p>${sub}</p></div>`; }
  function render() {
    const r = route();
    document.querySelectorAll('[data-nav]').forEach(a => { if(a.dataset.nav === r) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    const nav=document.querySelector('nav');
    document.body.dataset.page=r;
    nav.innerHTML='<a href="#home">Home</a>'+(user?(user.role==='homeowner'?'<a href="#requests">My requests</a>':'<a href="#providers">My inbox</a>')+`<button class="quiet-link nav-account" data-action="logout">Sign out</button>`:'<button class="quiet-link pro-link" data-action="join-pro">For professionals</button><a class="nav-account" href="#account" data-action="login">Sign in</a>');
    nav.querySelectorAll('a').forEach(a=>{if(a.hash==='#'+r)a.setAttribute('aria-current','page');});
    if(loading) { main.innerHTML='<section class="flow wrap loading-state" role="status"><span class="spinner"></span><p>Getting things ready…</p></section>'; return; }
    if(loadProblem) { main.innerHTML=`<section class="flow wrap"><p class="error" role="alert">${esc(loadProblem)}</p>${button('Retry connection','retry')}</section>`; return; }
    if(['request','requests','providers'].includes(r) && !user) { account(); return; }
    if(r==='account') account();
    else if(user?.role==='provider' && ['request','requests','providers'].includes(r)) providers();
    else if(user?.role==='homeowner' && r==='providers') requests();
    else if (r === 'request') form(); else if (r === 'requests') requests(); else if (r === 'providers') providers(); else home();
  }
  function account() {
    if(user) { main.innerHTML=`<section class="flow wrap">${heading('You are signed in.',esc(user.name))}<a class="button" href="#${user.role==='provider'?'providers':'requests'}">Open your workspace</a></section>`; return; }
    const register=authMode==='register';
    main.innerHTML=`<section class="account-layout wrap"><aside class="account-story"><span class="eyebrow">GOOD WORK. CLOSE TO HOME.</span><h2>A little help.<br>A better home.</h2><p>One place to request the work you need and find the right person for it.</p><ul><li>${icon('home')} Describe your project</li><li>${icon('inbox')} Hear from local professionals</li><li>${icon('check')} Choose with a clear picture</li></ul><div class="account-story-bottom">Your home, your choice.</div></aside><div class="account-main">${heading(register?'Let’s get you started.':'Welcome back.', register?'A few details, then you’re on your way.':'Sign in to pick up where you left off.')}<form id="account-form" class="panel">
      ${register?'<label for="name">Your name or business name</label><input id="name" name="name" minlength="2" maxlength="80" autocomplete="name" required>':''}
      <label for="email">Email</label><input id="email" name="email" type="email" maxlength="200" autocomplete="email" required>
      <label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" minlength="12" maxlength="128" autocomplete="${register?'new-password':'current-password'}" required><button type="button" class="password-toggle" data-action="password" aria-label="Show password" aria-pressed="false">Show</button></div><p class="field-note">At least 12 characters.</p>
      ${register?`<label for="role">I want to</label><select id="role" name="role"><option value="homeowner" ${accountRole==='homeowner'?'selected':''}>Request work for my home</option><option value="provider" ${accountRole==='provider'?'selected':''}>Offer my services</option></select><fieldset id="provider-fields" ${accountRole==='provider'?'':'hidden'}><legend>Your services</legend><label for="provider-category">Main service</label><select id="provider-category" name="category">${options(M.categories,'')}</select><span class="field-label">Service areas</span><div class="area-choices">${M.areas.map(a=>`<label><input type="checkbox" name="areas" value="${esc(a)}">${esc(a)}</label>`).join('')}</div><label for="provider-availability">Usual availability</label><select id="provider-availability" name="availability">${options(M.availability,'')}</select><p class="field-note">Your profile remains pending review. Creating an account does not verify credentials or insurance.</p></fieldset>`:''}
      <p id="form-error" class="error" role="alert"></p><div class="form-actions"><button class="button" type="submit">${register?'Create account':'Sign in'}</button></div></form><button class="quiet-link auth-switch" data-action="auth-mode">${register?'Already have an account? Sign in':'New here? Create an account'}</button></div></section>`;
  }
  function home() {
    const descriptions = ['Leaks & fixtures', 'Lights & outlets', 'Repairs & assembly', 'Yards & gardens', 'A fresh start'];
    const house = `<svg viewBox="0 0 560 490" class="home-art" fill="none" aria-hidden="true">
      <defs><linearGradient id="sky" x1="280" y1="20" x2="280" y2="490" gradientUnits="userSpaceOnUse"><stop stop-color="#dce9f1"/><stop offset="1" stop-color="#f4f2eb"/></linearGradient><linearGradient id="wall" x1="156" y1="180" x2="425" y2="340" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef9"/><stop offset="1" stop-color="#e6e5dc"/></linearGradient></defs>
      <rect x="36" y="15" width="488" height="458" rx="230" fill="url(#sky)"/>
      <circle cx="418" cy="103" r="39" fill="#fff9de"/>
      <path d="M61 368c105-52 251-58 437-8v64H61v-56Z" fill="#b8c9bd"/>
      <path d="M52 402c137-31 313-13 459 30" stroke="#879f90" stroke-width="2"/>
      <ellipse cx="282" cy="383" rx="199" ry="27" fill="#718c801f"/>
      <path d="M147 218 266 125l128 91v150H147V218Z" fill="url(#wall)"/>
      <path d="m126 219 140-111 148 108-14 16-133-98-129 99-12-14Z" fill="#273f55"/>
      <path d="m276 147 110 80v139H276V147Z" fill="#e7e8e1"/>
      <path d="M168 238h79v74h-79z" fill="#aec5cf" stroke="#fffef9" stroke-width="9"/>
      <path d="M207 240v70m-38-35h77" stroke="#fffef9" stroke-width="5"/>
      <path d="M297 258h52v108h-52z" fill="#2e5268"/>
      <path d="M307 269h32v38h-32z" fill="#92b2bc"/>
      <circle cx="338" cy="326" r="3" fill="#d9c083"/>
      <path d="M287 367h73v8h-73zM278 375h91v8h-91z" fill="#e4ddd1"/>
      <path d="M185 354h50v13h-50z" fill="#d4be9d"/>
      <path d="M188 353c-8-23 0-33 13-20 0-35 15-33 20-6 18-18 29 5 9 26" fill="#688a73"/>
      <path d="M350 144v-35h25v53" fill="#3a5364"/>
      <path d="M432 365V221" stroke="#587567" stroke-width="8"/>
      <ellipse cx="432" cy="228" rx="40" ry="69" fill="#749381"/>
      <path d="m432 289-19-35m20 10 18-28" stroke="#587567" stroke-width="3"/>
      <path d="M109 374v-69" stroke="#6f8676" stroke-width="5"/><ellipse cx="109" cy="307" rx="26" ry="41" fill="#91ab90"/>
      <path d="m303 384-32 67h78l-8-67" fill="#e9e3d5"/>
      <path d="M114 403h-9m29 4h-9m313-2h-9m25 8h-9" stroke="#708c78" stroke-width="3" stroke-linecap="round"/>
      <path d="M96 130c12-8 22-8 33 0m7-20c10-6 20-6 29 0" stroke="#8aa6b6" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    main.innerHTML = `<section class="hero wrap"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-line"></span>YOUR HOME. YOUR NEXT PROJECT.</p><h1>Need something<br><span>taken care of?</span></h1><p class="intro">From a leaky tap to a backyard refresh.<br>Tell us what needs doing, hear from local pros,<br class="desktop-break"> and choose the right fit for your home.</p><div class="hero-actions">${button('Request a service '+icon('arrow'),'start')}<button class="quiet-link" data-action="how">How it works <span aria-hidden="true">↓</span></button></div><p class="hero-note">${icon('check')} One request. Clear quotes. Your choice.</p></div><div class="hero-visual">${house}<div class="art-caption"><span class="caption-icon">${icon('home')}</span><div><strong>Good work starts at home.</strong><span>A little help for the place you love.</span></div></div><span class="art-tag">A home worth caring for</span></div></section>
      <section class="services-section" id="services"><div class="wrap"><div class="section-heading"><div><p class="eyebrow">LET’S START HERE</p><h2>What needs doing?</h2></div><p>Every project starts with a little help.</p></div><div class="service-choices">${M.categories.map((c,i)=>`<button data-action="start" data-category="${c}"><span class="service-icon">${icon(c)}</span><strong>${c}</strong><span>${descriptions[i]}</span><span class="service-go">${icon('arrow')}</span></button>`).join('')}</div></div></section>
      <section class="how-section wrap" id="how-it-works"><div class="section-heading"><div><p class="eyebrow">SIMPLE FROM THE START</p><h2>A request. A few options.<br>The right person.</h2></div><p>A clearer way to get things done,<br>with you in control at every step.</p></div><ol class="steps"><li><span class="step-number">01</span><h3>Tell us about the job.</h3><p>Add a few details, photos, your area, and when you’d like the work done.</p></li><li><span class="step-number">02</span><h3>Hear from local pros.</h3><p>Matching professionals respond with their price, what’s included, and availability.</p></li><li><span class="step-number">03</span><h3>Choose your right fit.</h3><p>Compare the options and pick your provider. The choice is always yours.</p></li></ol></section>
      <section class="pro-invitation wrap"><div><p class="eyebrow">FOR THE PEOPLE WHO DO GOOD WORK</p><h2>Your next job could<br>be around the corner.</h2><p>Find requests that match your service and area.<br>Send a clear quote. Build your local business.</p></div>${button('Join as a professional '+icon('arrow'),'join-pro','','light')}</section>`;
  }
  function collect() { for(const field of ['category','title','description','area','timing']) { const el=document.getElementById(field); if(el) draft[field]=el.value; } }
  function form() {
    let content = '';
    if(step===0) content=`<label for="category">Service</label><select id="category" required>${options(M.categories,draft.category)}</select><label for="title">What needs doing?</label><input id="title" minlength="8" maxlength="100" required placeholder="e.g. Clean up my backyard" value="${esc(draft.title)}"><label for="description">Describe the work</label><textarea id="description" minlength="25" maxlength="2000" required placeholder="What needs doing? How big is the job?">${esc(draft.description)}</textarea><label for="photos">Photos (optional)</label><div class="upload-field">${icon('photo')}<input id="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple></div><p class="field-note">Up to 2 photos, 1 MB each. Include photos of the work, without personal details.</p>${photos(draft)}${draft.photos.length?'<button type="button" class="quiet-link" data-action="remove-photos">Remove photos</button>':''}`;
    if(step===1) content=`<label for="area">Where is the job?</label><select id="area" required>${options(M.areas,draft.area)}</select><p class="field-note">An area is enough for now. Don't enter your full address.</p><label for="timing">When would you like the work done?</label><select id="timing" required>${options(M.timings,draft.timing)}</select>`;
    if(step===2) content=`<div class="request-summary"><span class="mini-label">${esc(draft.category)}</span><h2>${esc(draft.title)}</h2><p class="description">${esc(draft.description)}</p><p>${esc(draft.area)} · ${esc(draft.timing)}</p>${photos(draft)}</div><div class="info-note">Your request will appear in the inboxes of providers who offer this service in your area. You choose a provider after they respond.</div>`;
    main.innerHTML=`<section class="flow wrap">${heading(['Describe your job.','Location & timing.','Ready to request help?'][step], ['A few details help professionals understand the work.','Let’s find help in your neighbourhood.','Take a moment to check everything looks right.'][step])}<form id="request-form" class="panel"><ol class="progress" aria-label="Request progress">${['Job details','Location & timing','Review'].map((label,i)=>`<li class="${i<=step?'on':''}" ${i===step?'aria-current="step"':''}><span>${i<step?icon('check'):i+1}</span><strong>${label}</strong></li>`).join('')}</ol>${content}<p id="form-error" class="error" role="alert">${esc(photoError)}</p><div class="form-actions">${button(step?'Back':'Cancel',step?'back':'cancel','type="button"','secondary')}<button class="button" type="submit" ${photoLoading?'disabled':''}>${photoLoading?'Loading photos…':step===2?'Post request':'Continue'}</button></div></form></section>`;
  }
  function requests() {
    const job = state.jobs.find(j=>j.id===jobId) || state.jobs[0]; if(job) jobId = job.id;
    main.innerHTML=`<section class="workspace-page wrap">${heading('My requests.', 'See responses and choose who gets the job.')}<div class="workspace-actions"><div class="workspace-counts"><span><strong>${state.jobs.filter(j=>j.status==='open').length}</strong> Open requests</span><span><strong>${state.jobs.reduce((n,j)=>n+j.quotes.length,0)}</strong> Responses</span></div>${button('Request another service ' + icon('arrow'),'start')}</div>${state.jobs.length?`<div class="requests-layout"><aside aria-label="Your requests">${state.jobs.map(j=>`<button class="request-tab ${j.id===jobId?'active':''}" data-action="job" data-id="${j.id}" aria-pressed="${j.id===jobId}"><span class="tab-category">${icon(j.category)} ${esc(j.category)}</span><strong>${esc(j.title)}</strong><span>${j.status==='selected'?'Provider chosen':j.quotes.length+' responses'}</span></button>`).join('')}</aside><div>${jobView(job)}</div></div>`:`<div class="panel empty"><span class="empty-icon">${icon('inbox')}</span><h2>No requests yet.</h2><p>Start with the job you need help with.</p></div>`}</section>`;
  }
  function jobView(job) {
    const count = state.alerts.filter(a=>a.jobId===job.id).length, selected = job.quotes.find(q=>q.id===job.selectedQuoteId);
    let status = `<div class="info-note"><strong>Waiting for responses</strong><p>${count} matching providers have this request in their inbox. ${count?'Responses will appear here as they arrive.':'There are no matching providers yet. New providers who serve your area can still respond.'}</p><p class="field-note">Keep this page open to see new responses.</p></div>`;
    if(job.quotes.length) status=`<div class="info-note"><strong>${job.quotes.length} ${job.quotes.length===1?'provider has':'providers have'} responded.</strong><p>Compare price, what's included, and availability. The first response does not get the job automatically.</p></div>`;
    if(selected) { const p=state.providers.find(p=>p.id===selected.providerId); status=`<div class="selection-note"><strong>You chose ${esc(p.name)}.</strong><p>${money(selected.amount)} · ${esc(selected.availability)}</p><p>Your choice is saved and visible to this provider. Agree on the final schedule and scope directly before work begins.</p></div>`; }
    return `<article class="panel"><span class="category-pill">${icon(job.category)} ${esc(job.category)}</span><h2>${esc(job.title)}</h2><div class="job-meta"><span>${icon('location')}${esc(job.area)}</span><span>${icon('clock')}${esc(job.timing)}</span></div><p class="description">${esc(job.description)}</p>${photos(job)}${status}${job.quotes.length?'<h3 class="responses-heading">Provider responses</h3><p class="field-note">Profiles pending review · Prices in CAD</p>':''}${job.quotes.slice().sort((a,b)=>a.amount-b.amount).map(q=>responseCard(job,q)).join('')}</article>`;
  }
  function responseCard(job,q) {
    const p=state.providers.find(p=>p.id===q.providerId);
    return `<article class="response-card"><div class="response-top"><div class="response-provider"><span class="avatar">${initials(p.name)}</span><div><h3>${esc(p.name)}</h3><span class="field-note">Profile pending review</span></div></div><div class="response-price"><strong>${money(q.amount)}</strong><span>Total · incl. applicable tax</span></div></div><p class="availability">${icon('clock')}${esc(q.availability)}</p><span class="scope-heading">WHAT’S INCLUDED & EXCLUDED</span><p class="description">${esc(q.scope)}</p>${job.status==='open'?(confirming===q.id?`<div class="confirm-selection"><p>Choose ${esc(p.name)} for this request?</p>${button('Confirm choice','confirm',`data-id="${q.id}"`)} ${button('Keep comparing','keep','','secondary')}</div>`:button('Choose this provider','choose',`data-id="${q.id}"`)):(job.selectedQuoteId===q.id?'<strong class="chosen-label">Your chosen provider</strong>':'')}</article>`;
  }
  function providers() {
    const p=state.providers.find(p=>p.id===providerId), jobs=state.jobs;
    const quoting=jobs.find(j=>j.id===quoteJobId && !j.quotes.some(q=>q.providerId===providerId));
    main.innerHTML=`<section class="workspace-page wrap">${heading('My inbox.', 'Jobs matching your service and area.')}<div class="provider-details"><span class="avatar">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><span>${esc(p.category)} · ${esc(p.availability)}</span><span>${p.areas.map(esc).join(', ')}</span></div></div><p class="field-note">Profile pending review · ${jobs.filter(j=>j.status==='open' && !j.quotes.some(q=>q.providerId===p.id)).length} requests awaiting your response</p>${quoting?`<form id="response-form" class="panel response-form"><h2>Respond to ${esc(quoting.title)}</h2><p>${esc(quoting.description)}</p><label for="amount">Total price (CAD)</label><input id="amount" name="amount" type="number" min="0.01" max="100000" step="0.01" required><p class="field-note">Include applicable tax in your total.</p><label for="availability">When are you available?</label><select id="availability" name="availability" required>${options(M.availability,'')}</select><label for="scope">What's included and excluded?</label><textarea id="scope" name="scope" minlength="25" maxlength="1500" required></textarea><p id="form-error" class="error" role="alert"></p><div class="form-actions">${button('Cancel','cancel-response','type="button"','secondary')}<button type="submit" class="button">Send response</button></div></form>`:jobs.length?jobs.map(j=>`<article class="panel inbox-card"><span class="mini-label">MATCHED JOB</span><h2>${esc(j.title)}</h2><p>${esc(j.area)} · ${esc(j.timing)}</p><p class="description">${esc(j.description)}</p>${photos(j)}${j.status==='selected'?'<div class="selection-note"><strong>The homeowner chose you.</strong><p>Agree on the final schedule and scope before work begins.</p></div>':j.quotes.some(q=>q.providerId===p.id)?'<p class="sent-label">Response sent · Waiting for homeowner choice</p>':button('Respond to request','respond',`data-id="${j.id}"`)}</article>`).join(''):`<div class="panel empty"><span class="empty-icon">${icon('inbox')}</span><h2>No matching requests right now.</h2><p>New matching requests will appear here as homeowners post them.</p><p class="field-note">Your inbox updates automatically while you are signed in.</p></div>`}</section>`;
  }
  function error(e) { const el=document.getElementById('form-error'); if(el) el.textContent=e.message; else message(e.message); }
  document.addEventListener('click', async e => {
    const target=e.target.closest('[data-action]'); if(!target)return;
    const action=target.dataset.action;
    if(busy)return;
    try {
      if(action==='skip') { e.preventDefault(); main.focus(); }
      if(action==='how') document.getElementById('how-it-works')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      if(action==='login') { e.preventDefault(); authMode='login'; navigate('account'); }
      if(action==='join-pro') { authMode='register'; accountRole='provider'; afterAuth=''; navigate(user?'providers':'account'); }
      if(action==='password') { const input=document.getElementById('password'); const show=input.type==='password'; input.type=show?'text':'password'; target.textContent=show?'Hide':'Show'; target.setAttribute('aria-label',show?'Hide password':'Show password'); target.setAttribute('aria-pressed',String(show)); }
      if(action==='retry') { loadProblem=''; loading=true; render(); await initialize(); }
      if(action==='auth-mode') { authMode=authMode==='register'?'login':'register'; account(); }
      if(action==='logout') { busy=true; await api('/api/logout',{}); user=null; state={jobs:[],providers:[],alerts:[]}; draft=blank(); quoteJobId=''; afterAuth=''; navigate('home'); render(); }
      if(action==='start') { draft=blank(target.dataset.category); step=0; photoError=''; photoLoading=false; accountRole='homeowner'; authMode='register'; afterAuth='request'; navigate(user?'request':'account'); }
      if(action==='back') { collect(); step--; form(); focusHeading(); }
      if(action==='cancel') navigate('home');
      if(action==='remove-photos') { collect(); draft.photos=[]; form(); }
      if(action==='job') { jobId=target.dataset.id; confirming=''; requests(); }
      if(action==='respond') { quoteJobId=target.dataset.id; providers(); }
      if(action==='cancel-response') { quoteJobId=''; providers(); }
      if(action==='choose') { confirming=target.dataset.id; requests(); }
      if(action==='keep') { confirming=''; requests(); }
      if(action==='confirm') { busy=true; target.disabled=true; await api(`/api/jobs/${jobId}/choose`,{quoteId:target.dataset.id}); await refresh(); confirming=''; requests(); message('Your provider choice is saved.'); }
    } catch(e) { error(e); } finally {busy=false; target.disabled=false;}
  });
  document.addEventListener('submit', async e => {
    if(!['request-form','response-form','account-form'].includes(e.target.id))return;
    e.preventDefault(); if(busy)return; busy=true;
    const submit=e.target.querySelector('[type="submit"]'); submit.disabled=true;
    try {
      if(e.target.id==='account-form') {
        const values=Object.fromEntries(new FormData(e.target));
        if(values.role==='provider') values.areas=Array.from(e.target.querySelectorAll('[name="areas"]:checked')).map(el=>el.value);
        ({user}=await api(authMode==='register'?'/api/register':'/api/login',values)); providerId=user.id; await refresh();
        navigate(user.role==='provider'?'providers':afterAuth || 'requests'); render(); return;
      }
      if(e.target.id==='request-form') {
        if(photoLoading)return;
        collect(); if(photoError) throw new Error(photoError);
        if(step===0) M.validate({...draft,area:M.areas[0],timing:M.timings[0]}); else M.validate(draft);
        if(step<2) { step++; form(); focusHeading(); }
        else { const job=await api('/api/jobs',draft); jobId=job.id; await refresh(); navigate('requests'); message('Request saved. Matching providers can now respond.'); }
      } else { await api(`/api/jobs/${quoteJobId}/responses`,Object.fromEntries(new FormData(e.target))); await refresh(); quoteJobId=''; providers(); message('Response sent. The homeowner can now choose.'); }
    } catch(e) { error(e); } finally { busy=false; submit.disabled=false; }
  });
  document.addEventListener('change', async e => {
    if(e.target.name==='role') { accountRole=e.target.value; const fields=document.getElementById('provider-fields'); fields.hidden=e.target.value!=='provider'; fields.querySelectorAll('select').forEach(el=>el.required=!fields.hidden); }
    if(e.target.id!=='photos')return;
    collect(); const currentDraft=draft;
    photoLoading=true; photoError='';
    const submit=document.querySelector('#request-form [type="submit"]'); submit.disabled=true; submit.textContent='Loading photos…';
    try {
      const files=Array.from(e.target.files);
      if(files.length>2 || files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type) || f.size>1048576)) throw new Error('Use up to two JPG, PNG, or WebP photos of 1 MB or smaller.');
      const loaded=await Promise.all(files.map(file=>new Promise((resolve,reject)=> { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('Photo could not be read.')); r.readAsDataURL(file); })));
      if(currentDraft===draft) draft.photos=loaded;
    } catch(e) { if(currentDraft===draft) { photoError=e.message; draft.photos=[]; } }
    finally { if(currentDraft===draft) { photoLoading=false; if(route()==='request' && step===0) { collect(); form(); } } }
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0,0); main.focus({preventScroll:true}); message(''); });
  render(); initialize();
  setInterval(async()=>{ if(!user || busy || loading || quoteJobId || !['requests','providers'].includes(route()))return; try { const before=JSON.stringify(state); await refresh(); if(JSON.stringify(state)!==before) render(); } catch(e) { message('Could not refresh updates. '+e.message); } },5000);
})();
