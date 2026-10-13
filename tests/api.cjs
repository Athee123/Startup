const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../server.cjs');
let server,base,home,other,p1,p2,p3,job;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'localquote-api-')),dbPath=path.join(dir,'test.sqlite');
const input={category:'Landscaping',title:'Clean up the backyard',description:'Remove weeds and bag garden debris, including cleanup, labour and tax.',area:'Bramalea',timing:'This week',photos:['data:image/png;base64,AAAA']};
const offer={amount:175,availability:'Within 2 days',scope:'Weeding, bagging garden debris, labour and tax. Tree removal excluded.'};
const client=()=>({cookie:''});
async function start() {server=createApp({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
async function request(c,url,data,headers={}) {
  const res=await fetch(base+url,{method:data===undefined?'GET':'POST',headers:{cookie:c.cookie,...(data===undefined?{}:{'content-type':'application/json','x-localquote-request':'1'}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
  if(res.headers.get('set-cookie'))c.cookie=res.headers.get('set-cookie').split(';')[0];
  return {status:res.status,body:await res.json(),headers:res.headers};
}
async function register(name,role,category='Landscaping',areas=['Bramalea']) {
  const c=client(),res=await request(c,'/api/register',{name,email:name.toLowerCase()+'@example.com',password:'test-password-12345',role,category,areas,availability:'Within 2 days'});
  assert.equal(res.status,201,JSON.stringify(res.body));return c;
}
before(async()=>{await start();home=await register('Homeowner','homeowner');other=await register('Other','homeowner');p1=await register('GardenerOne','provider');p2=await register('GardenerTwo','provider');p3=await register('Cleaner','provider','Cleaning');});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
test('accounts use private sessions; unauthenticated and cross-site requests are rejected',async()=>{
  assert.equal((await request(client(),'/api/state')).status,401);
  const res=await request(home,'/api/session');assert.equal(res.body.user.role,'homeowner');assert.ok(!JSON.stringify(res.body).includes('password_hash'));
  assert.equal((await request(home,'/api/jobs',input,{origin:'https://unrelated.example'})).status,403);
  assert.equal((await request(home,'/api/jobs',input,{'x-localquote-request':'0'})).status,403);
  const login=await request(client(),'/api/login',{email:'homeowner@example.com',password:'incorrect-password'});assert.equal(login.status,401);
  const registered=await request(client(),'/api/register',{name:'Short',email:'short@example.com',password:'short',role:'homeowner'});assert.equal(registered.status,400);
  assert.equal((await fetch(base+'/.localquote/app.sqlite')).status,404);
  assert.equal((await fetch(base+'/server.cjs')).status,404);
});
test('requests are shared with matched providers and isolated from unrelated accounts',async()=>{
  const posted=await request(home,'/api/jobs',input);assert.equal(posted.status,201);assert.equal(posted.body.matchingProviders,2);job=posted.body.id;
  assert.equal((await request(other,'/api/state')).body.jobs.length,0);
  assert.equal((await request(p1,'/api/state')).body.jobs[0].id,job);
  assert.equal((await request(p3,'/api/state')).body.jobs.length,0);
  assert.equal((await request(p3,`/api/jobs/${job}/responses`,offer)).status,400);
  assert.equal((await request(p1,'/api/jobs',input)).status,403);
  assert.equal((await request(home,`/api/jobs/${job}/responses`,offer)).status,403);
  const outside=await register('Outside','provider','Landscaping',['Heart Lake']);assert.equal((await request(outside,'/api/state')).body.jobs.length,0);
  const late=await register('Late','provider');assert.equal((await request(late,'/api/state')).body.alerts.length,1);
});
test('responses use the authenticated provider; competitors cannot read each other’s quotes',async()=>{
  assert.equal((await request(p1,`/api/jobs/${job}/responses`,{...offer,providerId:'forged'})).status,200);
  assert.equal((await request(p1,`/api/jobs/${job}/responses`,offer)).status,400);
  assert.equal((await request(p2,`/api/jobs/${job}/responses`,{...offer,amount:160})).status,200);
  const homeowner=(await request(home,'/api/state')).body;
  assert.equal(homeowner.jobs[0].quotes.length,2);assert.equal(homeowner.jobs[0].status,'open');
  const provider=(await request(p1,'/api/state')).body;
  assert.equal(provider.jobs[0].quotes.length,1);assert.equal(provider.jobs[0].quotes[0].amount,175);
  assert.equal(provider.providers.length,1);assert.ok(!JSON.stringify(provider).includes('example.com'));
  assert.equal((await request(other,`/api/jobs/${job}/choose`,{quoteId:homeowner.jobs[0].quotes[0].id})).status,403);
});
test('competing selections are atomic, losing inboxes close and the winner sees assignment',async()=>{
  const quotes=(await request(home,'/api/state')).body.jobs[0].quotes;
  const results=await Promise.all(quotes.map(q=>request(home,`/api/jobs/${job}/choose`,{quoteId:q.id})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  const winner=(await request(home,'/api/state')).body.jobs[0].selectedQuoteId;
  const firstWins=winner===quotes[0].id;
  assert.equal((await request(firstWins?p1:p2,'/api/state')).body.jobs[0].status,'selected');
  assert.equal((await request(firstWins?p2:p1,'/api/state')).body.jobs.length,0);
  assert.equal((await request(p2,`/api/jobs/${job}/responses`,offer)).status,400);
});
test('accounts, hashed sessions, photos and assignments survive server restart; sign-out revokes access',async()=>{
  await new Promise(r=>server.close(r));await start();
  assert.equal((await request(home,'/api/state')).body.jobs[0].status,'selected');
  assert.equal((await request(home,'/api/state')).body.jobs[0].photos[0],input.photos[0]);
  const fresh=client();const login=await request(fresh,'/api/login',{email:'homeowner@example.com',password:'test-password-12345'});
  assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const savedCookie=fresh.cookie;await request(fresh,'/api/logout',{});fresh.cookie=savedCookie;
  assert.equal((await request(fresh,'/api/state')).status,401);
  assert.ok(!fs.readFileSync(dbPath).includes(Buffer.from('test-password-12345')));
});
