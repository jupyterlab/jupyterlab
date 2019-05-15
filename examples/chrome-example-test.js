/**
 * A puppeteer test that launches an example app and makes sure
 * there are no console errors or uncaught errors prior to a sentinal
 * string being printed.
 */
const puppeteer = require('puppeteer');
const inspect = require('util').inspect;
const URL = process.argv[2];

async function main() {
  console.info('Starting Chrome Headless');

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.info('Navigating to page:', URL);
  await page.goto(URL);
  console.info('Waiting for page to load...');

  errored = false;

  const handleMessage = async msg => {
    const text = msg.text();
    console.log(`>> ${text}`);
    if (msg.type === 'error') {
      errored = true;
    }
    const lower = text.toLowerCase();
    if (lower === 'example started!' || lower === 'test complete!') {
      await browser.close();
      if (errored) {
        throw Error('Example test failed!');
      }
      console.info('Example test complete!');
      return;
    }
  };

  function handleError(err) {
    console.error(err);
    errored = true;
  }

  page.on('console', handleMessage);
  page.on('error', handleError);

  const html = await page.content();
  if (inspect(html).indexOf('jupyter-config-data') === -1) {
    console.error('Error loading JupyterLab page:');
    console.error(html);
  }
  console.info('Page loaded');
}

// Stop the process if an error is raised in the async function.
process.on('unhandledRejection', up => {
  throw up;
});

main();
