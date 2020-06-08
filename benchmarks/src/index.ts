/**
 * Runs a number of benchmarks and saves the results to the
 */
import child_process from 'child_process';
import fs from 'fs';
import playwright from 'playwright';
import util from 'util';
import NotebookType from './notebookType';

const DATA_PATH = 'out.csv';

const BROWSERS: Array<'firefox' | 'chromium'> = ['firefox', 'chromium'];
// The maximium N
const MAX_N = 100;
// The number of different n's to try out
const NUMBER_SAMPLES = 20;
// How many times to switch between each notebook
const SWITCHES = 5;

/**
 * Max time to stop testing if mean of previous sample was > this.
 */
const MAX_TIME = 2 * 1000;

const notebookEnv = process.env.BENCHMARK_NOTEBOOKS;
const NOTEBOOK_PACKAGES: Array<string> = notebookEnv
  ? JSON.parse(notebookEnv)
  : ['./largePlotly', './longOutput', './manyPlotly', './manyOutputs'];

type OUTPUT_TYPE = {
  browser: typeof BROWSERS[number];
  time: number;
  type: string;
  n: number;
};

const stream = fs.createWriteStream(DATA_PATH);

function writeLine(line: string): Promise<void> {
  return new Promise(function(resolve, reject) {
    stream.write(line + '\n', error => (error ? reject(error) : resolve()));
  });
}
function writeOutput({ browser, n, type, time }: OUTPUT_TYPE): Promise<void> {
  return writeLine(`${browser},${n},${type},${time}`);
}

(async () => {
  const notebooks: Array<NotebookType> = (
    await Promise.all(NOTEBOOK_PACKAGES.map(path => import(path)))
  ).map(pkg => pkg.default);
  await writeLine('browser,n,type,time');
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
    // page.on('console', (msg: playwright.ConsoleMessage) => {
    //   console.log(`browser type=${msg.type()} text=${msg.text()}`);
    // });
    /**
     * Wait for a widget to be visible.
     */
    async function waitForWidget(id: string): Promise<void> {
      await page.waitForSelector(`#${id}`, { visibility: 'visible' });
    }
    const waitForLaunch = () =>
      page.waitForSelector('.jp-Launcher', { visibility: 'visible' });
    // Go to reset for a new workspace
    await page.goto('http://localhost:9999/lab?reset');

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
    await page.waitForLoadState();
    await waitForLaunch();
    for (let n = 0; n <= MAX_N; n += MAX_N / NUMBER_SAMPLES) {
      // stop testing if we don't have atleast two tests to keep running
      if (notebooks.length - tooLong.size < 2) {
        break;
      }
      console.log(` n=${n}/${MAX_N}`);
      // Open each notebook type we have for this n of samples
      // mapping from type to created id
      const widgets: Array<{ type: string; id: string }> = [];

      console.log(`  opening`);
      for (const { notebook, waitFor, label } of notebooks) {
        if (tooLong.has(label)) {
          continue;
        }
        console.log(`   type=${label}`);
        const path = `data/${label}-${n}.ipynb`;

        await fs.promises.writeFile(
          path,
          JSON.stringify(notebook(n), null, ' '),
          { flag: 'w' }
        );
        await util.promisify(child_process.exec)(`jupyter trust "${path}"`);
        await page.evaluate('jupyterlab.restored');
        const id: string = await page.evaluate(`jupyterlab.commands.execute('docmanager:open', {
          path: ${JSON.stringify(`benchmarks/${path}`)}
        }).then(widget => widget.node.id)`);
        console.log(`    id=${id}`);
        await waitForWidget(id);
        await waitFor({ widgetID: id, page });
        widgets.push({ type: label, id });
      }
      console.log(`  switching`);

      let totalTimes = new Map<string, number>();
      // Then switch between them repeatedly
      for (let i = 0; i < SWITCHES; i++) {
        console.log(`   i=${i}/${SWITCHES}`);
        for (const { type, id } of widgets) {
          console.log(`    type=${type}`);
          // mark before we activate, then wait for the widget to display, then get duration
          await page.evaluate(`{
            performance.clearMeasures();
            performance.mark('start');
            jupyterlab.shell.activateById(${JSON.stringify(id)});
          }`);
          await waitForWidget(id);
          await notebooks
            .find(n => n.label === type)!
            .waitFor({
              widgetID: id,
              page
            });
          await page.evaluate("performance.measure('duration', 'start')");
          const time: number = await page.evaluate(
            'performance.getEntriesByName("duration")[0].duration'
          );
          console.log(`     time=${time}`);
          totalTimes.set(type, (totalTimes.get(type) || 0) + time);
          await writeOutput({
            browser: browserName,
            type,
            n,
            time
          });
        }
      }
      for (const [type, totalTime] of totalTimes.entries()) {
        const meanTime = totalTime / SWITCHES;
        if (meanTime > MAX_TIME) {
          console.log(`  stopped test type=${type}`);
          tooLong.add(type);
        }
      }
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
