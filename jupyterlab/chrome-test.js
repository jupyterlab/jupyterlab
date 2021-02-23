const puppeteer = require('puppeteer');
const inspect = require('util').inspect;
const path = require('path');
const fs = require('fs');

const URL = process.argv[2];
const OUTPUT_VAR = 'JLAB_BROWSER_CHECK_OUTPUT';
const OUTPUT = process.env[OUTPUT_VAR];

let nextScreenshot = 0;
const screenshotStem = `screenshot-${+new Date()}`;

if (OUTPUT) {
  console.log(`Screenshots will be saved in ${OUTPUT}...`);
  if (!fs.existsSync(OUTPUT)) {
    console.log(`Creating ${OUTPUT}...`);
    fs.mkdirSync(OUTPUT, { recursive: true });
  }
}

async function main() {
  /* eslint-disable no-console */
  console.info('Starting Chrome Headless');

  const browser = await puppeteer.launch({
    headless: true,
    dumpio: !!OUTPUT,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  async function screenshot() {
    if (!OUTPUT) {
      return;
    }
    const screenshotPath = path.join(
      OUTPUT,
      `${screenshotStem}-${++nextScreenshot}.png`
    );
    console.log(`Capturing screenshot ${screenshotPath}...`);
    await page.screenshot({
      type: 'png',
      path: screenshotPath
    });
  }

  console.info('Navigating to page:', URL);
  await page.goto(URL);
  console.info('Waiting for page to load...');

  // Wait for the local file to redirect on notebook >= 6.0
  await page.waitForNavigation();

  const html = await page.content();
  if (inspect(html).indexOf('jupyter-config-data') === -1) {
    console.error('Error loading JupyterLab page:');
    console.error(html);
  }

  const el = await page.waitForSelector('#browserTest', { timeout: 100000 });
  console.log('Waiting for application to start...');
  let testError = null;

  try {
    await page.waitForSelector('.completed');
  } catch (e) {
    testError = e;
  }

  await screenshot();

  const textContent = await el.getProperty('textContent');
  const errors = JSON.parse(await textContent.jsonValue());

  for (let error of errors) {
    console.error(`Parsed an error from text content: ${error.message}`, error);
    testError = true;
  }

  await browser.close();

  if (testError) {
    throw testError;
  }
  console.info('Chrome test complete');
}

// Stop the process if an error is raised in the async function.
process.on('unhandledRejection', up => {
  throw up;
});

main();
