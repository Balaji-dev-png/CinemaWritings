const puppeteer = require('puppeteer');
const fs = require('fs');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const downloadPath = '/home/balaji/Documents/VibeWriting/downloads_test';
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    if (interceptedRequest.url().includes('supabase.co/rest/v1/scripts')) {
      interceptedRequest.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'c87113f4-05f6-4970-96ec-0ee7e8375d29',
          title: 'Puppeteer Test Script',
          content: '<p>Mock Content</p>',
          paperColor: '#ffffff',
          fontFamily: 'Courier Prime',
          fontSize: 12,
        })
      });
    } else {
      interceptedRequest.continue();
    }
  });

  page.on('response', response => {
    if (response.url().includes('export/pdf')) {
      console.log(`Backend Export PDF Response: ${response.status()}`);
    }
  });

  console.log("Navigating...");
  await page.goto('http://localhost:3000/editor/c87113f4-05f6-4970-96ec-0ee7e8375d29');
  
  await wait(2000);
  
  console.log("Clicking Download Options...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const downloadBtn = btns.find(b => b.title === 'Download Options' || (b.textContent && b.textContent.includes('Download')));
    if (downloadBtn) downloadBtn.click();
  });
  
  await wait(1000);

  console.log("Clicking Download PDF...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const pdfBtn = btns.find(b => b.textContent && b.textContent.includes('Download PDF'));
    if (pdfBtn) pdfBtn.click();
  });

  await wait(5000);

  const files = fs.readdirSync(downloadPath);
  console.log("Downloaded files:", files);

  await browser.close();
})();
