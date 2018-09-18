const puppeteer = require('puppeteer');
const inspect = require('util').inspect;
const URL = process.argv[2];

async function main() {
  console.info('Starting Chrome Headless');

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.info('Navigating to page:', URL);
  await page.goto(URL);
  console.info('Waiting for application to start...');

  const head = await page.waitForSelector('head');
  const html = await head.getProperty('innerHTML');
  if (inspect(html).indexOf('jupyter-config-data') === -1) {
    const content = await page.content();
    console.error(content);
  }

  const res = await page.waitForSelector('#browserResult');
  const textContent = await res.getProperty('textContent');
  const errors = JSON.parse(await textContent.jsonValue());

  for (let error of errors) {
    console.error(`Parsed an error from text content: ${error.message}`, error);
  }

  await browser.close();

  console.info('Chrome test complete');
}

// Stop the process if an error is raised in the async function.
process.on('unhandledRejection', up => {
  throw up;
});

main();
