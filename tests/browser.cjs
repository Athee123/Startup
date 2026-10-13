const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    for(const width of [1440,390,320]) {
      const context=await browser.newContext({viewport:{width,height:900}}), page=await context.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
      await page.goto('http://127.0.0.1:8000/');
      await page.getByRole('heading',{name:'Need something taken care of?'}).waitFor();
      assert.equal(await page.locator('.response-card').count(),0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(width!==320) await page.screenshot({path:path.resolve(__dirname,`../docs/landing-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
      await page.getByRole('button',{name:/Landscaping/}).click();
      assert.equal(await page.getByLabel('Service',{exact:true}).inputValue(),'Landscaping');
      await page.getByLabel('What needs doing?').fill('Clean up the backyard');
      await page.getByLabel('Describe the work').fill('Remove weeds and bag garden debris. Include labour, cleanup and tax.');
      await page.getByLabel('Photos (optional)').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9V8AAAAASUVORK5CYII=','base64')});
      await page.locator('.attachments img').waitFor();
      await page.getByRole('button',{name:'Continue',exact:true}).click();
      await page.getByLabel('Where is the job?').selectOption('Bramalea');
      await page.getByLabel('When would you like the work done?').selectOption('This week');
      await page.getByRole('button',{name:'Continue',exact:true}).click();
      await page.getByText(/3 sample providers match/).waitFor();
      await page.getByRole('button',{name:'Back',exact:true}).click();
      assert.equal(await page.getByLabel('Where is the job?').inputValue(),'Bramalea');
      await page.getByRole('button',{name:'Continue',exact:true}).click();
      await page.getByRole('button',{name:'Post request',exact:true}).click();
      await page.getByText('Waiting for responses',{exact:true}).waitFor();
      await page.reload();
      await page.getByText('Waiting for responses',{exact:true}).waitFor();
      assert.equal(await page.locator('.attachments img').count(),1);
      await page.getByRole('link',{name:'Provider demo',exact:true}).click();
      await page.getByLabel('Viewing as a fictional provider').selectOption('provider-0');
      await page.getByRole('heading',{name:'No matching requests right now.'}).waitFor();
      for(const [provider,price] of [['provider-3','180'],['garden-2','160']]) {
        await page.getByLabel('Viewing as a fictional provider').selectOption(provider);
        await page.getByRole('button',{name:'Respond to request',exact:true}).click();
        await page.getByLabel('Total price (CAD)').fill(price);
        await page.getByLabel('When are you available?').selectOption('Within 2 days');
        await page.getByLabel("What's included and excluded?").fill('Weeding, bagging garden debris, labour and tax. Tree removal excluded.');
        await page.getByRole('button',{name:'Send response',exact:true}).click();
        await page.getByText('Response sent · Waiting for homeowner choice',{exact:true}).waitFor();
      }
      await page.getByRole('link',{name:'My requests',exact:true}).click();
      await page.getByText('2 providers have responded.',{exact:true}).waitFor();
      assert.equal(await page.locator('.response-card').count(),2);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('localquote-requests-v1')).jobs[0].status),'open');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(width!==320) await page.screenshot({path:path.resolve(__dirname,`../docs/responses-${width===1440?'desktop':'mobile'}.png`),fullPage:true});
      await page.getByRole('button',{name:'Choose this provider',exact:true}).first().click();
      await page.getByRole('button',{name:'Keep comparing',exact:true}).click();
      await page.getByRole('button',{name:'Choose this provider',exact:true}).first().click();
      await page.getByRole('button',{name:'Confirm choice',exact:true}).click();
      await page.getByText('You chose Neighbourhood Landscapes.',{exact:true}).waitFor();
      await page.reload();
      await page.getByText('You chose Neighbourhood Landscapes.',{exact:true}).waitFor();
      await page.getByRole('link',{name:'Provider demo',exact:true}).click();
      await page.getByLabel('Viewing as a fictional provider').selectOption('garden-3');
      await page.getByRole('heading',{name:'No matching requests right now.'}).waitFor();
      assert.deepEqual(errors,[]);
      console.log(`Request/alert/two responses/homeowner selection/reload/closed inbox passed at ${width}px`);
      await context.close();
    }
    // A storage write failure must not display a successful request or create alerts.
    const page=await browser.newPage();
    await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('quota');};});
    await page.goto('http://127.0.0.1:8000/');
    await page.getByRole('button',{name:'Request a service',exact:true}).click();
    await page.getByLabel('Service',{exact:true}).selectOption('Cleaning');
    await page.getByLabel('What needs doing?').fill('Clean the living room');
    await page.getByLabel('Describe the work').fill('Clean the floor and surfaces in the living room, including supplies and tax.');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('Where is the job?').selectOption('Bramalea');
    await page.getByLabel('When would you like the work done?').selectOption('Flexible');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('button',{name:'Post request',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Could not save this change'}).waitFor();
    assert.ok(page.url().endsWith('#request'));
    await page.getByRole('link',{name:'My requests',exact:true}).click();
    await page.getByRole('heading',{name:'No requests yet.'}).waitFor();
    console.log('Storage failure leaves request and alerts unsaved; no false success');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
