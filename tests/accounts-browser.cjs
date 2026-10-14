const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../server.cjs');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'localquote-browser-'));
  const server=createApp({dbPath:path.join(dir,'test.sqlite')});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const errors=[];
  try {
    for(const width of [1440,390]) {
      const context=()=>browser.newContext({viewport:{width,height:900}});
      const hc=await context(),c1=await context(),c2=await context();
      const home=await hc.newPage(),p1=await c1.newPage(),p2=await c2.newPage();
      for(const page of [home,p1,p2]) {
        page.on('pageerror',e=>errors.push(e.message));
        page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
      }
      async function register(page,name,role) {
        await page.goto(base+'/#account');
        await page.locator('.skip').focus();
        await page.keyboard.press('Enter');
        assert.ok(page.url().endsWith('#account'), 'Skip link must preserve the account page');
        assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
        await page.getByLabel('Your name or business name').fill(name);
        await page.getByLabel('Email',{exact:true}).fill(`${name.toLowerCase()}-${width}@example.com`);
        await page.getByLabel('Password',{exact:true}).fill('browser-test-password-123');
        if(role==='provider') {
          await page.getByLabel('I want to').selectOption('provider');
          await page.getByLabel('Main service').selectOption('Landscaping');
          await page.getByLabel('Bramalea',{exact:true}).check();
          await page.getByLabel('Usual availability').selectOption('Within 2 days');
        }
        await page.getByRole('button',{name:'Show password',exact:true}).click();
        assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
        await page.getByRole('button',{name:'Hide password',exact:true}).click();
        assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');
        if(role==='homeowner') await page.screenshot({path:path.resolve(__dirname,`../docs/account-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Account overflow');
        await page.getByRole('button',{name:'Create account',exact:true}).click();
        await page.getByRole('heading',{name:role==='provider'?'My inbox.':'My requests.'}).waitFor();
      }
      await register(p1,'GardenOne','provider');await register(p2,'GardenTwo','provider');
      await home.goto(base);
      await home.getByRole('heading',{name:'Need something taken care of?'}).waitFor();
      await home.screenshot({path:path.resolve(__dirname,`../docs/landing-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
      await register(home,'Homeowner','homeowner');
      await home.getByRole('link',{name:'Home',exact:true}).click();
      await home.getByRole('button',{name:/Landscaping/}).click();
      await home.getByLabel('What needs doing?').fill('Clean up the backyard');
      await home.getByLabel('Describe the work').fill('Remove weeds and bag garden debris. Include labour, cleanup and tax.');
      await home.getByLabel('Photos (optional)').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9V8AAAAASUVORK5CYII=','base64')});
      await home.locator('.attachments img').waitFor();
      await home.getByRole('button',{name:'Continue',exact:true}).click();
      assert.equal(await home.evaluate(()=>document.activeElement.tagName),'H1');
      await home.getByLabel('Where is the job?').selectOption('Bramalea');
      await home.getByLabel('When would you like the work done?').selectOption('This week');
      await home.getByRole('button',{name:'Continue',exact:true}).click();
      assert.equal(await home.locator('[aria-current="step"]').innerText(),'3\nReview');
      await home.screenshot({path:path.resolve(__dirname,`../docs/request-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
      assert.ok(await home.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Request overflow');
      await home.getByRole('button',{name:'Post request',exact:true}).click();
      await home.getByText('Waiting for responses',{exact:true}).waitFor();
      // Providers learn about the homeowner's request in independent sessions via automatic refresh.
      for(const [page,amount] of [[p1,'180'],[p2,'160']]) {
        await page.getByRole('button',{name:'Respond to request',exact:true}).first().waitFor({timeout:15000});
        await page.getByRole('button',{name:'Respond to request',exact:true}).first().click();
        await page.getByLabel('Total price (CAD)').fill(amount);
        await page.getByLabel('When are you available?').selectOption('Within 2 days');
        await page.getByLabel("What's included and excluded?").fill('Weeding, bagging garden debris, labour and tax. Tree removal excluded.');
        await page.getByRole('button',{name:'Send response',exact:true}).click();
        await page.getByText('Response sent · Waiting for homeowner choice',{exact:true}).first().waitFor();
      }
      await p1.screenshot({path:path.resolve(__dirname,`../docs/inbox-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
      await home.getByText('2 providers have responded.',{exact:true}).waitFor({timeout:15000});
      assert.equal(await home.locator('.response-card').count(),2);
      await home.screenshot({path:path.resolve(__dirname,`../docs/responses-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
      await home.getByRole('button',{name:'Choose this provider',exact:true}).first().click();
      await home.getByRole('button',{name:'Confirm choice',exact:true}).click();
      await home.getByText('You chose GardenTwo.',{exact:true}).waitFor();
      await p2.getByText('The homeowner chose you.',{exact:true}).waitFor({timeout:15000});
      await p1.getByRole('heading',{name:'No matching requests right now.'}).waitFor({timeout:15000});
      await home.getByRole('button',{name:'Sign out',exact:true}).click();
      await home.getByRole('link',{name:'Sign in',exact:true}).click();
      await home.getByRole('heading',{name:'Welcome back.'}).waitFor();
      await home.getByLabel('Email',{exact:true}).fill(`homeowner-${width}@example.com`);
      await home.getByLabel('Password',{exact:true}).fill('browser-test-password-123');
      await home.getByRole('button',{name:'Sign in',exact:true}).click();
      await home.getByText('You chose GardenTwo.',{exact:true}).waitFor();
      await home.reload();await home.getByText('You chose GardenTwo.',{exact:true}).waitFor();
      for(const page of [home,p1,p2]) assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
      console.log(`Separate homeowner and provider accounts: signup, automatic inbox updates, two quotes, choice, sign-out/in and reload passed at ${width}px`);
      await hc.close();await c1.close();await c2.close();
    }
    const page=await browser.newPage({viewport:{width:320,height:900}});
    await page.goto(base);
    await page.getByRole('heading',{name:'Need something taken care of?'}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:/Join as a professional/}).click();
    await page.getByLabel('Your name or business name').waitFor();
    assert.equal(await page.getByLabel('I want to').inputValue(),'provider');
    await page.getByLabel('I want to').selectOption('provider');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('320px account form fits; no browser errors');
  } finally {await browser.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
