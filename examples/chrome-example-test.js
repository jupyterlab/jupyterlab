/**
 * A puppeteer test that launches an example app and makes sure
 * there are no console errors or uncaught errors prior to a sentinal
 * string being printed.
 */
const puppeteer = require('puppeteer');
const inspect = require('util').inspect;
const URL = process.argv[2];

async function main() {
  /* eslint-disable no-console */
  console.info('Starting Chrome Headless');

  const browser = await puppeteer.launch({
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  let errored = false;

  const handleMessage = async msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.log(`ERROR>> ${text}`);
      errored = true;
    } else {
      console.log(`>> ${text}`);
    }
    const lower = text.toLowerCase();
    if (lower === 'example started!' || lower === 'test complete!') {
      await browser.close();
      if (errored) {
        console.error('\n\n***\nExample test failed!\n***\n\n');
        process.exit(1);
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

  console.info('Navigating to page:', URL);
  await page.goto(URL);
  console.info('Waiting for page to load...');

  // Wait for the local file to redirect on notebook >= 6.0. Refs:
  // https://jupyter-notebook.readthedocs.io/en/stable/changelog.html?highlight=redirect
  // https://stackoverflow.com/q/46948489/425458
  await page.waitForNavigation();

  const html = await page.content();
  if (inspect(html).indexOf('jupyter-config-data') === -1) {
    console.error('Error loading JupyterLab page:');
    console.error(html);
  }
  console.info('Page loaded');
}

// Stop the process if an error is raised in the async function.
process.on('unhandledRejection', up => {
  if (String(up).indexOf('Target closed') === -1) {
    throw up;
  }
});

main();
