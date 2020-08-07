/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 * Runs a number of benchmarks and saves the results to the
 */
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as playwright from 'playwright';
import * as util from 'util';
import NotebookType from './notebookType';

const DATA_PATH = process.env['BENCHMARK_OUTPUT'] || 'out.csv';

const BROWSERS: Array<'firefox' | 'chromium'> = ['firefox', 'chromium'];

// The maximum N
const MAX_N = 100;
// The number of different n's to try out
const NUMBER_SAMPLES = 20;
// How many times to switch between each notebook
const SWITCHES = 10;
// Max time to stop testing if mean of previous sample was > this
const MAX_TIME = 5 * 1000;
// Selector timeout in milliseconds
const TIME_OUT = 200 * 1000;

const notebookEnv = process.env.BENCHMARK_NOTEBOOKS;
const NOTEBOOK_PACKAGES: Array<string> = notebookEnv
  ? JSON.parse(notebookEnv)
  : ['largePlotly', 'longOutput', 'manyPlotly', 'manyOutputs', 'errorOutputs'];

type OUTPUT_TYPE = {
  browser: typeof BROWSERS[number];
  time: number;
  type: string;
  n: number;
  mode: 'switch' | 'open';
};

const stream = fs.createWriteStream(DATA_PATH);

function writeLine(line: string): Promise<void> {
  return new Promise(function(resolve, reject) {
    stream.write(line + '\n', error => (error ? reject(error) : resolve()));
  });
}
function writeOutput({
  mode,
  browser,
  n,
  type,
  time
}: OUTPUT_TYPE): Promise<void> {
  return writeLine(`${mode},${browser},${n},${type},${time}`);
}

(async () => {
  const notebooks: Array<NotebookType> = (
    await Promise.all(
      NOTEBOOK_PACKAGES.map(path => import('./notebooks/' + path))
    )
  ).map(pkg => pkg.default);
  await writeLine('mode,browser,n,type,time');
  await fs.promises.mkdir('data', { recursive: true });

  for (const browserName of BROWSERS) {
    console.log(`browser=${browserName}`);
    /**
     * List of types that are now too big for this browser.
     */
    const tooLong = new Set<string>();
    const browser = await playwright[browserName].launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({
      width: 1280,
      height: 960
    });
    /*
    page.on('console', (msg: playwright.ConsoleMessage) => {
      console.log(`browser type=${msg.type()} text=${msg.text()}`);
    });
    */
    /**
     * Wait for a widget to be visible.
     */
    async function waitForNotebook(id: string): Promise<void> {
      await page.waitForSelector(`#${id}`, {
        visibility: 'visible',
        timeout: TIME_OUT
      });
      await page.waitForSelector(`#${id} .jp-Notebook-cell`, {
        visibility: 'visible',
        timeout: TIME_OUT
      });
      await page.waitForSelector(`#${id} .jp-Spinner`, {
        visibility: 'hidden',
        timeout: TIME_OUT
      });
    }

    function startTime(): Promise<void> {
      return page.evaluate(`{
        performance.clearMeasures();
        performance.mark('start');
      }`);
    }

    async function endTime(): Promise<number> {
      await page.evaluate("performance.measure('duration', 'start')");
      const time: number = await page.evaluate(
        'performance.getEntriesByName("duration")[0].duration'
      );
      return time;
    }

    const waitForLaunch = () =>
      page.waitForSelector('.jp-Launcher', { visibility: 'visible' });
    // Go to reset for a new workspace
    await page.goto('http://localhost:9999/lab?reset');

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
    await page.waitForLoadState();

    await waitForLaunch();

    for (let n = 0; n <= MAX_N; n += MAX_N / (NUMBER_SAMPLES - 1)) {
      // stop testing if we don't have atleast two tests to keep running
      if (notebooks.length - tooLong.size < 2) {
        break;
      }
      console.log(` n=${n}/${MAX_N}`);
      // Open each notebook type we have for this n of samples
      // mapping from type to created id
      const widgets: Array<{ type: string; id: string }> = [];

      console.log(`  opening`);

      let totalTimes = new Map<string, number>();
      function checkTimes() {
        for (const [type, totalTime] of totalTimes.entries()) {
          const meanTime = totalTime / SWITCHES;
          if (meanTime > MAX_TIME) {
            console.log(`  stopped test type=${type}`);
            tooLong.add(type);
          }
        }
        totalTimes = new Map<string, number>();
      }
      for (const { notebook, waitFor, label } of notebooks) {
        if (tooLong.has(label)) {
          continue;
        }
        // Open each notebook SWITCHES times
        console.log(`   type=${label}`);
        const path = `data/${label}-${n}.ipynb`;

        await fs.promises.writeFile(
          path,
          JSON.stringify(notebook(n), null, ' '),
          { flag: 'w' }
        );
        await util.promisify(child_process.exec)(`jupyter trust "${path}"`);
        await page.evaluate('jupyterlab.restored');

        let id: string;
        for (let i = 0; i < SWITCHES; i++) {
          console.log(`    i=${i}/${SWITCHES}`);
          await page.evaluate(
            'window.currentWidget ? window.currentWidget.dispose() : null'
          );
          await startTime();
          id = await page.evaluate(`
            jupyterlab.commands.execute('docmanager:open', {
              path: ${JSON.stringify(`benchmarks/${path}`)}
            }).then(widget => {
              window.currentWidget = widget;
              return widget.node.id;
            })
          `);
          await waitForNotebook(id);
          await waitFor({ widgetID: id, page });
          const time = await endTime();
          console.log(`     time=${time}`);
          await writeOutput({
            mode: 'open',
            browser: browserName,
            type: label,
            n,
            time
          });
          totalTimes.set(label, (totalTimes.get(label) || 0) + time);
        }
        widgets.push({ type: label, id: id! });
        await page.evaluate('window.currentWidget = undefined');
      }
      checkTimes();
      console.log(`  switching`);

      // Then switch between them repeatedly
      for (let i = 0; i < SWITCHES; i++) {
        console.log(`   i=${i}/${SWITCHES}`);
        for (const { type, id } of widgets) {
          console.log(`    type=${type}`);
          await startTime();
          // mark before we activate, then wait for the widget to display, then get duration
          await page.evaluate(`{
            jupyterlab.shell.activateById(${JSON.stringify(id)});
          }`);
          await waitForNotebook(id);
          await notebooks
            .find(n => n.label === type)!
            .waitFor({
              widgetID: id,
              page
            });
          const time = await endTime();
          console.log(`     time=${time}`);
          totalTimes.set(type, (totalTimes.get(type) || 0) + time);
          await writeOutput({
            mode: 'switch',
            browser: browserName,
            type,
            n,
            time
          });
        }
      }
      checkTimes();
      console.log(`  cleaning`);
      // dipose directly instead of using `jupyterlab.shell.closeAll()` so that
      // no dialogues will pop up if notebooks are dirty
      await page.evaluate(`{
        const iter = jupyterlab.shell._dockPanel.widgets().iter();
        const widgets = [];
        for (let w = iter.next(); w; w = iter.next()) {
          widgets.push(w);
        }
        widgets.map(w => w.dispose());
      }`);
      await waitForLaunch();
    }
    await browser.close();
  }
})()
  .then(() => stream.close())
  .catch(reason => {
    throw reason;
  });
