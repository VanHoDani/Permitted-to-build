const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const expected=require('./expected.json');
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('test-results',{recursive:true});
 try {
 await page.goto('http://127.0.0.1:4173');
 const f=page.frameLocator('iframe');
 await f.getByTestId('ledger-count').waitFor({timeout:60000});
 assert.equal(await f.locator('[data-record-id]').count(),34);
 assert(!(await f.getByTestId('known-origin-allocations').innerText()).includes('The Refuge'));
 const links=f.locator('[data-relationship-id]');assert.equal(await links.count(),9);
 for(let i=0;i<9;i++){
  const link=links.nth(i),id=await link.getAttribute('data-relationship-id');
  await link.locator('rect').first().click();
  await page.waitForTimeout(100);
  assert.equal(await f.getByTestId('selected-relationship').getAttribute('data-selected-id'),id);
 }
 assert.equal(await f.locator('.p2b-flow-reason').count(),2);
 assert((await f.locator('.p2b-flow').innerText()).includes('unknown listed-unit count'));
 for(const state of ['Verified','Conflicting','Candidate','Unresolved']){
  await f.getByLabel('Ledger evidence state',{exact:true}).selectOption(state);
  assert.equal(await f.locator('[data-record-id]').count(),expected.filter(r=>r.state===state).length);
 }
 await f.getByRole('button',{name:'Reset ledger',exact:true}).click();
 await f.getByLabel('Search ledger',{exact:true}).fill('P2B-T-001');
 assert.equal(await f.locator('[data-record-id]').count(),1);
 await f.getByRole('button',{name:'Reset ledger',exact:true}).click();
 const download=page.waitForEvent('download');
 await f.getByRole('button',{name:'Export ledger CSV',exact:true}).click();
 assert((await download).suggestedFilename().endsWith('.csv'));
 for(const name of ['Relationships','Geography','In-lieu fees','Evidence','Master ledger','Overview']){
  const tab=f.getByRole('tab',{name,exact:true});await tab.click();
  await f.getByRole('tab',{name,exact:true,selected:true}).waitFor();
  assert.equal(await tab.getAttribute('aria-selected'),'true');
  await page.waitForTimeout(100);
 }
 assert.equal(await f.locator('[data-record-id]').count(),34);
 assert((await f.locator('.p2b-footer').innerText()).includes('Method:'));
 for(const name of ['master-housing-ledger.xlsx','relationship-ledger.csv']){
  const response=await page.request.get('http://127.0.0.1:4173/downloads/'+name);assert.equal(response.status(),200);assert((await response.body()).length>1000);
 }
 await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 const inner=page.frames().find(x=>x!==page.mainFrame());
 const sizes=await inner.evaluate(()=>({page:document.documentElement.scrollWidth,view:innerWidth,flow:document.querySelector('.p2b-flow-scroll').scrollWidth,flowView:document.querySelector('.p2b-flow-scroll').clientWidth,ledger:document.querySelector('.p2b-ledger-scroll').scrollWidth,ledgerView:document.querySelector('.p2b-ledger-scroll').clientWidth}));
 assert(sizes.page<=sizes.view+2,JSON.stringify(sizes));assert(sizes.flow>sizes.flowView);assert(sizes.ledger>sizes.ledgerView);
 await page.screenshot({path:'test-results/phone.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: browser loading, nine flow selections, all tabs, 34 ledger rows, four filters, search, CSV, source files and phone overflow.');
 }catch(e){await page.screenshot({path:'test-results/failure.png',fullPage:true});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
