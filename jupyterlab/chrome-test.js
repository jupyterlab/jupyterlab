const puppeteer = require('puppeteer');
const inspect = require('util').inspect;
const URL = process.argv[2];

async function main() {
  /* eslint-disable no-console */
  console.info('Starting Chrome Headless');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

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
  const textContent = await el.getProperty('textContent');
  const errors = JSON.parse(await textContent.jsonValue());

  for (let error of errors) {
    console.error(`Parsed an error from text content: ${error.message}`, error);
  }

  function delay(duration) {
    return function() {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve();
        }, duration);
      });
    };
  }

  const w1Id = await page.evaluate(async () => {
    const jlab = window.jupyterlab;
    const w1 = await jlab.commands.execute('fileeditor:create-new');
    const w2 = await jlab.commands.execute('fileeditor:create-new');
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
    w1.content._ensureFocus();
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
    // jlab.shell.activateById(w1.id);
    // w2.activate();
    // jlab._pluginMap['@jupyterlab/docmanager-extension:plugin'].service.mode;
    return w1.id;
  });

  // foundId = await page.evaluate(async (w1Id) => {
  //   const jlab = window.jupyterlab;
  //   jlab.shell.activateById(w1Id);
  //   return jlab.shell.currentWidget.id;
  // }, w1Id);

  // const sel = "#" + w1Id + " .CodeMirror";
  // console.log(sel);
  // // await page.focus(sel);

  // console.log(foundId);

  await page.waitFor(2000);
  console.log(page.url());

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
