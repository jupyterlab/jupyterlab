/**
 * Runs a number of benchmarks and saves the results to the
 */
import playwright from 'playwright';
import fs from 'fs';

const DATA_PATH = 'out.csv';

// number of points to plot in each graph
const N_PLOTLY_GRAPHS = 4;

const BROWSERS: Array<'firefox' | 'chromium'> = ['firefox', 'chromium'];
const TYPES = {
  /**
   * Create a notebook with many outputs
   */
  'many-outputs': {
    waitFor: async () => null,
    notebook: (n: number) =>
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
      ])
  },
  /**
   * Create a notebook with one long output
   */
  'long-output': {
    waitFor: async () => null,
    notebook: (n: number) =>
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
  },
  /**
   * Create a notebook with a couple of plotly plots, each with `n * 10` points
   */
  'big-plotly': {
    waitFor: waitForPlotly,
    notebook: (n: number) =>
      makeNotebook([
        {
          cell_type: 'code',
          execution_count: 1,
          metadata: {},
          outputs: [],
          source: [
            'import plotly.graph_objects as go\n',
            `data = list(range(${n}))\n`,
            'fig = go.Figure(data=go.Scatter(y=data, x=data))'
          ]
        },
        ...Array.from({ length: N_PLOTLY_GRAPHS }, () => ({
          cell_type: 'code',
          execution_count: 1,
          metadata: {},
          outputs: [
            {
              data: {
                'application/vnd.plotly.v1+json': {
                  config: {
                    plotlyServerURL: 'https://plot.ly'
                  },
                  data: [
                    (points => ({
                      type: 'scatter',
                      x: points,
                      y: points
                    }))(Array.from({ length: n * 10 }, (_, i) => i))
                  ],
                  layout: {
                    autosize: true
                  }
                }
              },
              metadata: {},
              output_type: 'display_data'
            }
          ],
          source: ['fig']
        }))
      ])
  },
  /**
   * Create a notebook with n / 100 plotly graphs, each with four points
   */
  'many-plotly': {
    waitFor: waitForPlotly,
    notebook: (n: number) =>
      makeNotebook([
        {
          cell_type: 'code',
          execution_count: 1,
          metadata: {},
          outputs: [],
          source: [
            'import plotly.graph_objects as go\n',
            `data = list(range(${n}))\n`,
            `fig = go.Figure(data=go.Scatter(y=data, x=data))`
          ]
        },
        ...Array.from({ length: Math.floor(n / 100) + 1 }, () => ({
          cell_type: 'code',
          execution_count: 1,
          metadata: {},
          outputs: [
            {
              data: {
                'application/vnd.plotly.v1+json': {
                  config: {
                    plotlyServerURL: 'https://plot.ly'
                  },
                  data: [
                    (points => ({
                      type: 'scatter',
                      x: points,
                      y: points
                    }))(Array.from({ length: 4 }, (_, i) => i))
                  ],
                  layout: {
                    autosize: true
                  }
                }
              },
              metadata: {},
              output_type: 'display_data'
            }
          ],
          source: ['fig']
        }))
      ])
  }
};

/**
 * Wait for width to be changed to greater than the default of 700px which happens after rendering is done.
 */
async function waitForPlotly({
  widgetID,
  page
}: {
  widgetID: string;
  page: playwright.Page;
}): Promise<void> {
  await page.waitForFunction(
    (widgetID: string) => {
      const selector = `#${widgetID} .svg-container`;
      console.log(`selector=${selector}`);
      const el = document.querySelector(selector);
      if (!el) {
        return false;
      }
      const width = (el as HTMLDivElement).style['width'];
      console.log(` width=${width}`);
      // It's 100px originally, then 700px, then finally is recieved to page width
      return width !== '700px' && width !== '100px';
    },
    {},
    widgetID
  );
}

type TYPES_TYPE = keyof typeof TYPES;

const MAX_N = 10000;
const NUMBER_SAMPLES = 20;
const SWITCHES = 5;

/**
 * Max time to stop testing if mean of previous sample was > this.
 */
const MAX_TIME = 2 * 1000;

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
    /**
     * List of types that are now too big for this browser.
     */
    const tooLong = new Set<TYPES_TYPE>();
    const browser = await playwright[browserName].launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({
      width: 1280,
      height: 960
    });
    page.on('console', (msg: playwright.ConsoleMessage) => {
      console.log(`browser type=${msg.type()} text=${msg.text()}`);
    });
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
      if (Object.keys(TYPES).length - tooLong.size < 2) {
        break;
      }
      console.log(` n=${n}/${MAX_N}`);
      // Open each notebook type we have for this n of samples
      // mapping from type to created id
      const widgets: Array<{ type: TYPES_TYPE; id: string }> = [];

      console.log(`  opening`);
      for (const [type, { notebook, waitFor }] of Object.entries(TYPES)) {
        const typeCast = type as TYPES_TYPE;
        if (tooLong.has(typeCast)) {
          continue;
        }
        console.log(`   type=${type}`);
        const path = `data/${type}-${n}.ipynb`;
        await fs.promises.writeFile(
          path,
          JSON.stringify(notebook(n), null, ' '),
          { flag: 'w' }
        );
        await page.evaluate('lab.restored');
        const id: string = await page.evaluate(`lab.commands.execute('docmanager:open', {
          path: ${JSON.stringify(`benchmarks/${path}`)}
        }).then(widget => widget.node.id)`);
        console.log(`    id=${id}`);
        await waitForWidget(id);
        await waitFor({ widgetID: id, page });
        widgets.push({ type: typeCast, id });
      }
      console.log(`  switching`);

      let totalTimes = new Map<TYPES_TYPE, number>();
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
          await waitForWidget(id);
          await TYPES[type].waitFor({ widgetID: id, page });
          await page.evaluate("performance.measure('duration', 'start')");
          const time: number = await page.evaluate(
            'performance.getEntriesByName("duration")[0].duration'
          );
          console.log(`     time=${time}`);
          totalTimes.set(type, (totalTimes.get(type) || 0) + time);
          await writeOutput({
            browser: browserName,
            type: type as TYPES_TYPE,
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
      // dipose directly instead of using `lab.shell.closeAll()` so that
      // no dialogues will pop up if notebooks are dirty
      await page.evaluate(`{
        const iter = lab.shell._dockPanel.widgets().iter();
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
