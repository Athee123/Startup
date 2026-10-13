'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const {DatabaseSync} = require('node:sqlite');
const M = require('./model.js');
const scrypt = promisify(crypto.scrypt);
const digest = token => crypto.createHash('sha256').update(token).digest('hex');
class HttpError extends Error { constructor(status,message) { super(message); this.status=status; } }
function requireThat(ok,status,message) { if(!ok) throw new HttpError(status,message); }

function createApp({dbPath=process.env.LOCALQUOTE_DB || path.join(__dirname,'.localquote/app.sqlite'),secureCookies=process.env.SECURE_COOKIES==='true'}={}) {
  if(dbPath!==':memory:') fs.mkdirSync(path.dirname(dbPath),{recursive:true,mode:0o700});
  const db = new DatabaseSync(dbPath);
  if(dbPath!==':memory:') fs.chmodSync(dbPath,0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,profile TEXT);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS alerts(job_id TEXT NOT NULL REFERENCES jobs(id),provider_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(job_id,provider_id));`);
  const attempts=new Map();
  const publicUser=u=>({id:u.id,name:u.name,role:u.role,profile:u.profile?JSON.parse(u.profile):null});
  const providers=()=>db.prepare("SELECT id,name,profile FROM users WHERE role='provider'").all().map(u=>({id:u.id,name:u.name,...JSON.parse(u.profile),sample:false}));
  const jobs=()=>db.prepare('SELECT id,owner_id,data FROM jobs').all().map(row=>({...JSON.parse(row.data),ownerId:row.owner_id}));
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
  function auth(req) {
    const token=(req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('localquote_session='))?.slice(19);
    if(!token)return null;
    return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires>?').get(digest(token),Date.now()) || null;
  }
  function session(res,user) {
    const token=crypto.randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+7*86400000);
    res.setHeader('Set-Cookie',`localquote_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secureCookies?'; Secure':''}`);
  }
  function stateFor(user) {
    const allProviders=providers(), allJobs=jobs(), me=allProviders.find(p=>p.id===user.id);
    const visible=allJobs.filter(j=>user.role==='homeowner'?j.ownerId===user.id:
      (j.status==='open' && M.matches({providers:allProviders},j).some(p=>p.id===user.id)) || j.quotes.some(q=>q.id===j.selectedQuoteId && q.providerId===user.id));
    const safeJobs=visible.map(j=>{ const {ownerId,...safe}=j; if(user.role==='provider') safe.quotes=j.quotes.filter(q=>q.providerId===user.id); return safe; });
    const referenced=new Set(safeJobs.flatMap(j=>j.quotes.map(q=>q.providerId))); if(me) referenced.add(me.id);
    const alerts=user.role==='provider'?db.prepare('SELECT job_id AS jobId,provider_id AS providerId FROM alerts WHERE provider_id=?').all(user.id).filter(a=>safeJobs.some(j=>j.id===a.jobId)):
      db.prepare('SELECT job_id AS jobId,provider_id AS providerId FROM alerts JOIN jobs ON jobs.id=alerts.job_id WHERE jobs.owner_id=?').all(user.id);
    return {version:1,jobs:safeJobs.reverse(),providers:allProviders.filter(p=>referenced.has(p.id)),alerts};
  }
  async function body(req) {
    requireThat(req.headers['content-type']?.split(';')[0]==='application/json',415,'Use a JSON request.');
    requireThat(req.headers['x-localquote-request']==='1',403,'Request verification failed.');
    const origin=req.headers.origin;
    requireThat(!origin || origin===`${secureCookies?'https':'http'}://${req.headers.host}`,403,'Request origin is not allowed.');
    requireThat(req.headers['sec-fetch-site']!=='cross-site',403,'Cross-site requests are not allowed.');
    let size=0, chunks=[];
    for await(const chunk of req) { size+=chunk.length; requireThat(size<=3*1024*1024,413,'Request is too large.'); chunks.push(chunk); }
    try { const value=JSON.parse(Buffer.concat(chunks)); requireThat(value && typeof value==='object' && !Array.isArray(value),400,'Invalid request.'); return value; }
    catch(e) { if(e instanceof HttpError)throw e; throw new HttpError(400,'Invalid JSON.'); }
  }
  function send(res,status,value) { res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }
  const staticFiles=new Map([['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],['/app.js','app.js'],['/model.js','model.js'],...['index.html','styles.css','model.js','app.js','favicon.svg'].map(f=>['/draft/dist/'+f,'draft/dist/'+f])]);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url=new URL(req.url,'http://localhost');
      if(!url.pathname.startsWith('/api/')) {
        const file=staticFiles.get(url.pathname);
        requireThat(req.method==='GET' && file,404,'Not found.');
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
        res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache'}); res.end(fs.readFileSync(path.join(__dirname,file))); return;
      }
      if(req.method==='GET' && url.pathname==='/api/health') return send(res,200,{ok:true});
      const user=auth(req);
      if(req.method==='GET' && url.pathname==='/api/session') return send(res,200,{user:user?publicUser(user):null});
      if(req.method==='GET' && url.pathname==='/api/state') { requireThat(user,401,'Please sign in.'); return send(res,200,stateFor(user)); }
      requireThat(req.method==='POST',405,'Method not allowed.');
      const input=await body(req);
      if(['/api/register','/api/login'].includes(url.pathname)) {
        const ip=req.socket.remoteAddress, now=Date.now(), old=attempts.get(ip), bucket=old && old.until>now?old:{count:0,until:now+900000};
        requireThat(bucket.count<30,429,'Too many sign-in attempts. Try again in 15 minutes.'); bucket.count++; attempts.set(ip,bucket);
        const email=String(input.email || '').trim().toLowerCase(), password=String(input.password || '');
        requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=200 && password.length>=12 && password.length<=128,400,'Use a valid email and a password of 12 to 128 characters.');
        if(url.pathname==='/api/register') {
          const name=String(input.name || '').trim();
          requireThat(name.length>=2 && name.length<=80 && ['homeowner','provider'].includes(input.role),400,'Enter your name and choose an account type.');
          let profile=null;
          if(input.role==='provider') {
            requireThat(M.categories.includes(input.category) && Array.isArray(input.areas) && input.areas.length>0 && input.areas.every(a=>M.areas.includes(a)),400,'Choose your main service and service areas.');
            requireThat(M.availability.includes(input.availability),400,'Choose your usual availability.');
            profile={category:input.category,areas:[...new Set(input.areas)],availability:input.availability,reviewStatus:'pending'};
          }
          const salt=crypto.randomBytes(16).toString('hex'), hash=await scrypt(password,salt,64), id=crypto.randomUUID();
          transaction(()=>{
            requireThat(!db.prepare('SELECT id FROM users WHERE email=?').get(email),409,'An account with this email already exists. Sign in instead.');
            db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id,email,name,input.role,salt,hash.toString('hex'),profile?JSON.stringify(profile):null);
            if(profile) for(const j of jobs()) if(j.status==='open' && profile.category===j.category && profile.areas.includes(j.area)) db.prepare('INSERT OR IGNORE INTO alerts VALUES(?,?)').run(j.id,id);
          });
          const created=db.prepare('SELECT * FROM users WHERE id=?').get(id); session(res,created); return send(res,201,{user:publicUser(created)});
        }
        const found=db.prepare('SELECT * FROM users WHERE email=?').get(email);
        const hash=await scrypt(password,found?.salt || 'localquote-missing-account',64);
        requireThat(found && crypto.timingSafeEqual(hash,Buffer.from(found.password_hash,'hex')),401,'Email or password is incorrect.');
        session(res,found); return send(res,200,{user:publicUser(found)});
      }
      requireThat(user,401,'Please sign in.');
      if(url.pathname==='/api/logout') {
        const token=(req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('localquote_session='))?.slice(19);
        if(token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
        res.setHeader('Set-Cookie',`localquote_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookies?'; Secure':''}`); return send(res,200,{ok:true});
      }
      if(url.pathname==='/api/jobs') {
        requireThat(user.role==='homeowner',403,'Only homeowners can post a request.');
        const result=transaction(()=>{
          const state={jobs:[],providers:providers(),alerts:[]}, job=M.request(state,input);
          db.prepare('INSERT INTO jobs VALUES(?,?,?)').run(job.id,user.id,JSON.stringify(job));
          for(const a of state.alerts) db.prepare('INSERT INTO alerts VALUES(?,?)').run(a.jobId,a.providerId);
          return {id:job.id,matchingProviders:state.alerts.length};
        }); return send(res,201,result);
      }
      const match=url.pathname.match(/^\/api\/jobs\/([a-z0-9-]+)\/(responses|choose)$/);
      requireThat(match,404,'Not found.');
      transaction(()=>{
        const row=db.prepare('SELECT * FROM jobs WHERE id=?').get(match[1]); requireThat(row,404,'Request not found.');
        const job=JSON.parse(row.data), state={jobs:[job],providers:providers(),alerts:[]};
        if(match[2]==='responses') { requireThat(user.role==='provider',403,'Only providers can respond.'); M.respond(state,job.id,user.id,input); }
        else { requireThat(user.role==='homeowner' && row.owner_id===user.id,403,'Only the request owner can choose a provider.'); M.choose(state,job.id,input.quoteId); }
        db.prepare('UPDATE jobs SET data=? WHERE id=?').run(JSON.stringify(job),job.id);
      });
      send(res,200,{ok:true});
    } catch(e) { send(res,e.status || (e.message?.startsWith('SQLITE')?500:400),e.message?.startsWith('SQLITE')?{error:'Could not save the change.'}:{error:e.message || 'Request failed.'}); }
  });
  server.on('close',()=>db.close());
  return server;
}
if(require.main===module) { const server=createApp(); server.listen(Number(process.env.PORT || 8000),'127.0.0.1',()=>console.log('LocalQuote private server listening on port '+server.address().port)); }
module.exports={createApp};
