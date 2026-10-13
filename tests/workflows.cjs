const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');
const input = {category:'Landscaping', title:'Clean up the backyard', description:'Remove weeds and bag garden debris. Include cleanup, labour, and tax.', area:'Bramalea', timing:'This week', photos:[]};
const offer = {amount:180, availability:'Within 2 days', scope:'Weeding, bagging garden debris, labour and tax. Tree removal excluded.'};

test('a request alerts every matching provider and excludes other services/areas', () => {
  const s=M.seed(), j=M.request(s,input);
  assert.equal(s.alerts.length, 3);
  assert.equal(M.inbox(s,'provider-0').length, 0);
  assert.equal(M.inbox(s,'garden-3')[0].id, j.id);
  const other=M.request(s,{...input,area:'Heart Lake'});
  assert.equal(M.matches(s,other).length, 2);
  assert.equal(M.inbox(s,'garden-3').length, 1);
});
test('multiple providers can respond; the homeowner chooses, closing other inboxes', () => {
  const s=M.seed(), j=M.request(s,input);
  M.respond(s,j.id,'provider-3',offer);
  const chosen=M.respond(s,j.id,'garden-2',{...offer,amount:160});
  assert.equal(j.status,'open');
  assert.equal(j.selectedQuoteId,null);
  M.choose(s,j.id,chosen.id);
  assert.equal(j.selectedQuoteId,chosen.id);
  assert.equal(M.inbox(s,'garden-3').length,0);
  assert.throws(()=>M.respond(s,j.id,'garden-3',offer),/no longer/);
  assert.throws(()=>M.choose(s,j.id,chosen.id),/already/);
});
test('mismatched and duplicate responses are blocked', () => {
  const s=M.seed(), j=M.request(s,input);
  assert.throws(()=>M.respond(s,j.id,'provider-0',offer),/does not serve/);
  M.respond(s,j.id,'garden-2',offer);
  assert.throws(()=>M.respond(s,j.id,'garden-2',offer),/already/);
  assert.throws(()=>M.choose(s,j.id,'missing'),/not found/);
});
test('invalid requests and offers leave state untouched', () => {
  const s=M.seed();
  for (const patch of [{category:'Unknown'},{title:'Short'},{description:'Short'},{area:'Unknown'},{timing:'Yesterday'},{photos:['data:text/html;base64,AAAA']}]) {
    assert.throws(()=>M.request(s,{...input,...patch}));
  }
  assert.equal(s.jobs.length,0); assert.equal(s.alerts.length,0);
  const j=M.request(s,input);
  for (const patch of [{amount:0},{amount:.001},{amount:Infinity},{amount:100001},{scope:'Short'},{availability:'Yesterday'}]) assert.throws(()=>M.respond(s,j.id,'garden-2',{...offer,...patch}));
  assert.equal(j.quotes.length,0);
});
test('saved requests, alerts, quotes and homeowner selection survive reload', () => {
  const s=M.seed(), j=M.request(s,{...input,photos:['data:image/png;base64,AAAA']});
  const q=M.respond(s,j.id,'garden-2',offer); M.choose(s,j.id,q.id);
  assert.deepEqual(M.decode(JSON.stringify(s)),s);
  assert.throws(()=>M.decode('{broken'));
  assert.throws(()=>M.decode(JSON.stringify({...s,alerts:[{jobId:'missing',providerId:'garden-2'}]})));
});
