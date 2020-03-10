/**
 * Runs a number of benchmarks and saves the results to the
 */
import playwright from 'playwright';
import fs from 'fs';

/**
 * Exit on any unhandled promise rejections
 */
process.on('unhandledRejection', up => {
  throw up;
});

const DATA_PATH = 'out.csv';

const BROWSERS: Array<'firefox' | 'chromium'> = ['firefox', 'chromium'];
const TYPES = {
  /**
   * Create a notebook with many outputs
   */
  'many-outputs': (n: number) =>
    makeNotebook([
      {
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: Array.from({ length: n }, (_, i) => ({
          data: {
            'text/plain': [
              `'I am a long string which is repeatedly added to the dom: ${i}'`
            ]
          },
          metadata: {},
          output_type: 'display_data'
        })),
        source: [
          'from IPython.display import display\n',
          '\n',
          `for i in range(${n}):\n`,
          "    display('I am a long string which is repeatedly added to the dom: %d' % i)"
        ]
      }
    ]),
  /**
   * Create a notebook with one long output
   */
  'long-output': (n: number) =>
    makeNotebook([
      {
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: [
          {
            data: {
              'text/html': [
                `<div>${Array.from(
                  { length: n },
                  (_, i) =>
                    `<div>I am a long string which is repeatedly added to the dom: ${i}</div>`
                ).join('')}</div>`
              ],
              'text/plain': ['<IPython.core.display.HTML object>']
            },
            execution_count: 1,
            metadata: {},
            output_type: 'execute_result'
          }
        ],
        source: [
          'from IPython.display import HTML\n',
          '\n',
          `HTML(f\'<div>{"".join("<div>I am a long string which is repeatedly added to the dom: %d</div>" % i for i in range(${n}))}</div>\')`
        ]
      }
    ])
};
type TYPES_TYPE = keyof typeof TYPES;

const MAX_N = 10000;
const NUMBER_SAMPLES = 20;
const SWITCHES = 3;

type OUTPUT_TYPE = {
  browser: typeof BROWSERS[number];
  time: number;
  type: TYPES_TYPE;
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
  await writeLine('browser,n,type,time');
  await fs.promises.mkdir('data', { recursive: true });

  for (const browserName of BROWSERS) {
    console.log(`browser=${browserName}`);
    const browser = await playwright[browserName].launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

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
      // Skip larger tests on firefox because they are too slow
      if (n > 4000 && browserName === 'firefox') {
        continue;
      }
      console.log(` n=${n}/${MAX_N}`);
      // Open each notebook type we have for this n of samples
      // mapping from type to created id
      const widgets: Array<{ type: TYPES_TYPE; id: string }> = [];

      console.log(`  opening`);
      for (const [type, createNB] of Object.entries(TYPES)) {
        console.log(`   type=${type}`);
        const path = `data/${type}-${n}.ipynb`;
        await fs.promises.writeFile(
          path,
          JSON.stringify(createNB(n), null, ' '),
          { flag: 'w' }
        );
        await page.evaluate('lab.restored');
        const id: string = await page.evaluate(`lab.commands.execute('docmanager:open', {
          path: ${JSON.stringify(`benchmarks/${path}`)}
        }).then(widget => widget.node.id)`);
        console.log(`    id=${id}`);
        waitForWidget(id);
        widgets.push({ type: type as TYPES_TYPE, id });
      }
      console.log(`  switching`);

      // Then switch between them repeatedly
      for (let i = 0; i < SWITCHES; i++) {
        console.log(`   i=${i}/${SWITCHES}`);
        for (const { type, id } of widgets) {
          console.log(`    type=${type}`);
          // mark before we activate, then wait for the widget to display, then get duration
          await page.evaluate(`{
            performance.clearMeasures();
            performance.mark('start');
            lab.shell.activateById(${JSON.stringify(id)});
          }`);
          waitForWidget(id);
          await page.evaluate("performance.measure('duration', 'start')");
          const time: number = await page.evaluate(
            'performance.getEntriesByName("duration")[0].duration'
          );
          console.log(`     time=${time}`);
          await writeOutput({
            browser: browserName,
            type: type as TYPES_TYPE,
            n,
            time
          });
        }
      }
      console.log(`  cleaning`);
      await page.evaluate('lab.shell.closeAll()');
      await waitForLaunch();
    }
    await browser.close();
  }
})().then(() => stream.close());

function makeNotebook(cells: Array<object>): object {
  return {
    cells,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3'
      },
      language_info: {
        codemirror_mode: {
          name: 'ipython',
          version: 3
        },
        file_extension: '.py',
        mimetype: 'text/x-python',
        name: 'python',
        nbconvert_exporter: 'python',
        pygments_lexer: 'ipython3',
        version: '3.8.0'
      }
    },
    nbformat: 4,
    nbformat_minor: 4
  };
}
