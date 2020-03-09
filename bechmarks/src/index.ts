import playwright from 'playwright';

(async () => {
  const browser = await playwright['firefox'].launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:9999/lab/');
  await page.waitForSelector('#main');
  await page.screenshot({ path: `example.png` });
  await browser.close();
})();
