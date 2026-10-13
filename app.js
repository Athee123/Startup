(() => {
  'use strict';
  const M = window.LocalQuote, key = 'localquote-requests-v1', main = document.getElementById('main');
  let state = M.seed(), storageProblem = '', draft = blank(), step = 0, jobId = '', providerId = state.providers[3].id, quoteJobId = '', confirming = '', photoLoading = false, photoError = '';
  function blank(category = '') { return {category, title:'', description:'', area:'', timing:'', photos:[]}; }
  try { const raw = localStorage.getItem(key); if (raw) state = M.decode(raw); }
  catch { storageProblem = 'Saved demo data could not be loaded. Your stored data has been left untouched. Try another browser session to continue.'; }
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => new Intl.NumberFormat('en-CA', {style:'currency', currency:'CAD'}).format(v);
  const options = (values, current) => '<option value="">Choose an option</option>'+values.map(v => `<option ${v===current?'selected':''}>${esc(v)}</option>`).join('');
  const button = (label, action, attrs = '', cls = '') => `<button class="button ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
  const photos = job => `<div class="attachments">${job.photos.map(p=>`<img src="${esc(p)}" alt="Attached job photo">`).join('')}</div>`;
  function message(s) { document.getElementById('notice').textContent = s; }
  function mutation(fn) {
    if (storageProblem) throw new Error(storageProblem);
    const next = M.copy(state), result = fn(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { throw new Error('Could not save this change. Try fewer photos or free browser storage.'); }
    state = next; return result;
  }
  function route() { return location.hash.slice(1) || 'home'; }
  function navigate(to) { if (route() === to) render(); else location.hash = to; }
  function heading(title, sub) { return `<div class="page-title"><h1>${title}</h1><p>${sub}</p></div>`; }
  function render() {
    const r = route();
    document.querySelectorAll('[data-nav]').forEach(a => { if(a.dataset.nav === r) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    if (r === 'request') form(); else if (r === 'requests') requests(); else if (r === 'providers') providers(); else home();
    if (storageProblem) main.insertAdjacentHTML('afterbegin', `<p class="error wrap" role="alert">${esc(storageProblem)}</p>`);
  }
  function home() {
    const descriptions = ['Leaks & fixtures', 'Lights & outlets', 'Repairs & assembly', 'Yards & gardens', 'A fresh start'];
    main.innerHTML = `<section class="simple-hero wrap"><p class="eyebrow">HELP FOR YOUR HOME</p><h1>Need something<br><span>taken care of?</span></h1><p class="intro">Post the job. Hear from matching local professionals.<br>Choose the price and time that work for you.</p>${button('Request a service', 'start')}<p class="hero-note">You choose who gets the job.</p></section><section class="services-section"><div class="wrap"><h2>What do you need help with?</h2><div class="service-choices">${M.categories.map((c,i) => `<button data-action="start" data-category="${c}"><span class="service-number">0${i+1}</span><strong>${c}</strong><span>${descriptions[i]}</span><span class="service-go" aria-hidden="true">→</span></button>`).join('')}</div></div></section><section class="how-section wrap"><h2>From request to the right professional.</h2><ol class="steps"><li><span>01 / REQUEST</span><h3>Tell us what needs doing.</h3><p>Add details, photos, your area, and preferred timing.</p></li><li><span>02 / HEAR BACK</span><h3>Matching pros respond.</h3><p>Professionals who serve your area can offer a price and availability.</p></li><li><span>03 / CHOOSE</span><h3>You decide who to hire.</h3><p>Compare responses and choose your provider. No automatic assignment.</p></li></ol></section>`;
  }
  function collect() { for(const field of ['category','title','description','area','timing']) { const el=document.getElementById(field); if(el) draft[field]=el.value; } }
  function form() {
    let content = '';
    if(step===0) content=`<label for="category">Service</label><select id="category" required>${options(M.categories,draft.category)}</select><label for="title">What needs doing?</label><input id="title" minlength="8" maxlength="100" required placeholder="e.g. Clean up my backyard" value="${esc(draft.title)}"><label for="description">Describe the work</label><textarea id="description" minlength="25" maxlength="2000" required placeholder="What needs doing? How big is the job?">${esc(draft.description)}</textarea><label for="photos">Photos (optional)</label><input id="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple><p class="field-note">Up to 2 photos, 1 MB each. Use demo photos, without personal details.</p>${photos(draft)}${draft.photos.length?'<button type="button" class="quiet-link" data-action="remove-photos">Remove photos</button>':''}`;
    if(step===1) content=`<label for="area">Where is the job?</label><select id="area" required>${options(M.areas,draft.area)}</select><p class="field-note">An area is enough for now. Don't enter your full address.</p><label for="timing">When would you like the work done?</label><select id="timing" required>${options(M.timings,draft.timing)}</select>`;
    if(step===2) content=`<div class="request-summary"><span class="mini-label">${esc(draft.category)}</span><h2>${esc(draft.title)}</h2><p class="description">${esc(draft.description)}</p><p>${esc(draft.area)} · ${esc(draft.timing)}</p>${photos(draft)}</div><div class="info-note">${M.matches(state,draft).length} sample providers match this service and area. Posting adds simulated alerts to their provider inboxes. No real professionals are contacted.</div>`;
    main.innerHTML=`<section class="flow wrap">${heading(['Describe your job.','Location & timing.','Ready to request help?'][step], `Step ${step+1} of 3`)}<form id="request-form" class="panel"><div class="progress" aria-label="Step ${step+1} of 3">${[0,1,2].map(i=>`<span class="${i<=step?'on':''}"></span>`).join('')}</div>${content}<p id="form-error" class="error" role="alert">${esc(photoError)}</p><div class="form-actions">${button(step?'Back':'Cancel',step?'back':'cancel','type="button"','secondary')}<button class="button" type="submit" ${photoLoading?'disabled':''}>${photoLoading?'Loading photos…':step===2?'Post request':'Continue'}</button></div></form></section>`;
  }
  function requests() {
    const job = state.jobs.find(j=>j.id===jobId) || state.jobs[0]; if(job) jobId = job.id;
    main.innerHTML=`<section class="workspace-page wrap">${heading('My requests.', 'See responses and choose who gets the job.')}<div class="workspace-actions">${button('Request another service','start')}</div>${state.jobs.length?`<div class="requests-layout"><aside aria-label="Your requests">${state.jobs.map(j=>`<button class="request-tab ${j.id===jobId?'active':''}" data-action="job" data-id="${j.id}" aria-pressed="${j.id===jobId}"><strong>${esc(j.title)}</strong><span>${j.status==='selected'?'Provider chosen':j.quotes.length+' responses'}</span></button>`).join('')}</aside><div>${jobView(job)}</div></div>`:'<div class="panel empty"><h2>No requests yet.</h2><p>Start with the job you need help with.</p></div>'}</section>`;
  }
  function jobView(job) {
    const count = state.alerts.filter(a=>a.jobId===job.id).length, selected = job.quotes.find(q=>q.id===job.selectedQuoteId);
    let status = `<div class="info-note"><strong>Waiting for responses</strong><p>${count} matching sample providers have an alert in their demo inbox. ${count?'You can test their responses below.':'There are no matching providers in this demo yet.'}</p><a class="quiet-link" href="#providers">Try the provider demo →</a></div>`;
    if(job.quotes.length) status=`<div class="info-note"><strong>${job.quotes.length} ${job.quotes.length===1?'provider has':'providers have'} responded.</strong><p>Compare price, what's included, and availability. The first response does not get the job automatically.</p></div>`;
    if(selected) { const p=state.providers.find(p=>p.id===selected.providerId); status=`<div class="selection-note"><strong>You chose ${esc(p.name)}.</strong><p>${money(selected.amount)} · ${esc(selected.availability)}</p><p>Demo selection saved. No real booking or provider contact was made.</p></div>`; }
    return `<article class="panel"><span class="mini-label">${esc(job.category)}</span><h2>${esc(job.title)}</h2><p>${esc(job.area)} · ${esc(job.timing)}</p><p class="description">${esc(job.description)}</p>${photos(job)}${status}${job.quotes.length?'<h3 class="responses-heading">Provider responses</h3><p class="field-note">Fictional providers · Unverified profiles · Prices in CAD</p>':''}${job.quotes.slice().sort((a,b)=>a.amount-b.amount).map(q=>responseCard(job,q)).join('')}</article>`;
  }
  function responseCard(job,q) {
    const p=state.providers.find(p=>p.id===q.providerId);
    return `<article class="response-card"><div class="response-top"><h3>${esc(p.name)}</h3><strong>${money(q.amount)}</strong></div><p class="availability">${esc(q.availability)} · Total including applicable tax</p><p class="description">${esc(q.scope)}</p>${job.status==='open'?(confirming===q.id?`<div class="confirm-selection"><p>Choose ${esc(p.name)} for this demo request?</p>${button('Confirm choice','confirm',`data-id="${q.id}"`)} ${button('Keep comparing','keep','','secondary')}</div>`:button('Choose this provider','choose',`data-id="${q.id}"`)):(job.selectedQuoteId===q.id?'<strong class="chosen-label">Your chosen provider</strong>':'')}</article>`;
  }
  function providers() {
    const p=state.providers.find(p=>p.id===providerId), jobs=M.inbox(state,providerId);
    const quoting=jobs.find(j=>j.id===quoteJobId && !j.quotes.some(q=>q.providerId===providerId));
    main.innerHTML=`<section class="workspace-page wrap">${heading('Provider inbox.', 'Simulated alerts for jobs matching your service and area.')}<label for="provider">Viewing as a fictional provider</label><select id="provider">${state.providers.map(p=>`<option value="${p.id}" ${p.id===providerId?'selected':''}>${esc(p.name)} · ${p.category}</option>`).join('')}</select><p class="field-note">${esc(p.category)} · ${jobs.filter(j=>!j.quotes.some(q=>q.providerId===p.id)).length} requests awaiting your response · No real notifications</p>${quoting?`<form id="response-form" class="panel response-form"><h2>Respond to ${esc(quoting.title)}</h2><p>${esc(quoting.description)}</p><label for="amount">Total price (CAD)</label><input id="amount" name="amount" type="number" min="0.01" max="100000" step="0.01" required><p class="field-note">Include applicable tax in your total.</p><label for="availability">When are you available?</label><select id="availability" name="availability" required>${options(M.availability,'')}</select><label for="scope">What's included and excluded?</label><textarea id="scope" name="scope" minlength="25" maxlength="1500" required></textarea><p id="form-error" class="error" role="alert"></p><div class="form-actions">${button('Cancel','cancel-response','type="button"','secondary')}<button type="submit" class="button">Send response</button></div></form>`:jobs.length?jobs.map(j=>`<article class="panel inbox-card"><span class="mini-label">SIMULATED JOB ALERT</span><h2>${esc(j.title)}</h2><p>${esc(j.area)} · ${esc(j.timing)}</p><p class="description">${esc(j.description)}</p>${photos(j)}${j.quotes.some(q=>q.providerId===p.id)?'<p class="sent-label">Response sent · Waiting for homeowner choice</p>':button('Respond to request','respond',`data-id="${j.id}"`)}</article>`).join(''):'<div class="panel empty"><h2>No matching requests right now.</h2><p>Post a homeowner request to test a provider alert.</p><a class="quiet-link" href="#home">Back to homeowner view →</a></div>'}</section>`;
  }
  function error(e) { const el=document.getElementById('form-error'); if(el) el.textContent=e.message; else message(e.message); }
  document.addEventListener('click', e => {
    const target=e.target.closest('[data-action]'); if(!target)return;
    const action=target.dataset.action;
    try {
      if(action==='start') { draft=blank(target.dataset.category); step=0; photoError=''; photoLoading=false; navigate('request'); }
      if(action==='back') { collect(); step--; form(); }
      if(action==='cancel') navigate('home');
      if(action==='remove-photos') { collect(); draft.photos=[]; form(); }
      if(action==='job') { jobId=target.dataset.id; confirming=''; requests(); }
      if(action==='respond') { quoteJobId=target.dataset.id; providers(); }
      if(action==='cancel-response') { quoteJobId=''; providers(); }
      if(action==='choose') { confirming=target.dataset.id; requests(); }
      if(action==='keep') { confirming=''; requests(); }
      if(action==='confirm') { mutation(s=>M.choose(s,jobId,target.dataset.id)); confirming=''; requests(); message('Your demo provider choice is saved.'); }
    } catch(e) { error(e); }
  });
  document.addEventListener('submit', e => {
    if(!['request-form','response-form'].includes(e.target.id))return;
    e.preventDefault();
    try {
      if(e.target.id==='request-form') {
        if(photoLoading)return;
        collect(); if(photoError) throw new Error(photoError);
        if(step===0) M.validate({...draft,area:M.areas[0],timing:M.timings[0]}); else M.validate(draft);
        if(step<2) { step++; form(); }
        else { const job=mutation(s=>M.request(s,draft)); jobId=job.id; navigate('requests'); message('Request saved. Matching sample providers have simulated alerts.'); }
      } else { mutation(s=>M.respond(s,quoteJobId,providerId,Object.fromEntries(new FormData(e.target)))); quoteJobId=''; providers(); message('Response sent. The homeowner can now choose.'); }
    } catch(e) { error(e); }
  });
  document.addEventListener('change', async e => {
    if(e.target.id==='provider') { providerId=e.target.value; quoteJobId=''; providers(); }
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
  render();
})();
