const puppeteer = require('puppeteer');

const URL = process.argv[2];

async function main() {
  console.info('Starting Chrome Headless');

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  console.info('Navigating to page:', URL);

  await page.goto(URL);
  console.info('Waiting for application to start...');
  const res = await page.waitForSelector('#browserResult');
  const textContent = await res.getProperty('textContent');
  const errors = JSON.parse(await textContent.jsonValue());
  await browser.close();

  for (let error of errors) {
    console.error('got error', error);
  }
  if (errors.length !== 0) {
    throw 'Got some errors';
  }

  console.info('Chrome test complete');
}

// stop process if we raise an error in the async fynction
process.on('unhandledRejection', up => {
  throw up;
});

main();
