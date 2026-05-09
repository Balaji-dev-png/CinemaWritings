const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Intercept requests to see if the export triggers a fetch
  page.on('request', request => {
    if (request.url().includes('export/pdf')) {
      console.log('Intercepted export request:', request.url(), request.method());
    }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:3000/editor/c87113f4-05f6-4970-96ec-0ee7e8375d29');
  
  // Wait for load
  await page.waitForTimeout(2000);
  
  // Click the download options menu
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const downloadMenuBtn = buttons.find(b => b.textContent.includes('Download Options') || b.innerHTML.includes('Download Options') || b.querySelector('svg'));
    // Actually, in the EditorPage, let's just find the Export PDF button.
    // The button might be inside a dropdown. Let's find the trigger.
  });
  
  await browser.close();
})();
