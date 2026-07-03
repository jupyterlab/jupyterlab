// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@playwright/test';
import { benchmark, galata } from '@jupyterlab/galata';
import type { Page } from '@playwright/test';
import type * as nbformat from '@jupyterlab/nbformat';

/**
 * This benchmark measures rendering of large textual outputs that contain many
 * auto-linked URLs, comparing the incremental (asynchronous) auto-linking
 * pipeline with the legacy synchronous one.
 *
 * For each render it records two timings, relative to the moment the output
 * starts being produced:
 *
 * - `first-text`: time until *any* text is painted (time-to-first-paint).
 * - `all-text`: time until the *whole* text is painted (auto-linking may still
 *   be in progress - links are not waited for).
 *
 * The incremental pipeline paints all the plain text on its first frame and
 * defers only the auto-linking, so it is expected to reach both milestones
 * sooner than the synchronous pipeline, which blocks until the entire output
 * (text and links) has been rendered.
 *
 * Two scenarios are covered:
 *
 * - `stream`: the output is produced by executing a cell, so `renderModel` is
 *   called repeatedly as chunks arrive. Each chunk ends with `www.` and the
 *   next starts with `example.com`, so links are split across chunks.
 * - `baked`: the same output is stored in the notebook, so opening it renders
 *   the whole output in a single `renderModel` call, isolating the rendering
 *   cost from kernel/streaming variability.
 */

const tmpPath = 'test-performance-output-render';
const streamNotebook = 'streamed_links.ipynb';
const bakedNotebook = 'baked_links.ipynb';

const SANITIZER_PLUGIN = '@jupyterlab/apputils-extension:sanitizer';

// Number of stream chunks. This is the dominating cost; reduce it (or set the
// BENCHMARK_OUTPUT_CHUNKS env var) if the benchmark takes too long on CI.
const N_CHUNKS = parseInt(process.env['BENCHMARK_OUTPUT_CHUNKS'] ?? '1000', 10);

// Padding to make the output sizeable while keeping the URLs sparse, matching
// the reproducer used during development.
const PADDING = 'X'.repeat(46);

/**
 * Build the full concatenated stream text, matching what the streamed notebook
 * produces when executed (chunks of the form `example.com {i} ... www.`, with
 * no separators, so `...www.` joins the next `example.com...` into a link).
 */
function streamText(n: number): string {
  let text = '';
  for (let i = 0; i < n; i++) {
    text += `example.com ${i} ${PADDING} www.`;
  }
  return text;
}

const FULL_TEXT = streamText(N_CHUNKS);
// The rendered text content equals the source regardless of auto-linking (links
// wrap text without changing `textContent`), so its length marks "all text".
const EXPECTED_TEXT_LENGTH = FULL_TEXT.length;
// Each chunk boundary (`...www.` + `example.com...`) forms one `www.example.com`
// link, so `N_CHUNKS - 1` links mark "all links".
const EXPECTED_LINKS = N_CHUNKS - 1;

const scenarios = ['stream', 'baked'] as const;
type Scenario = (typeof scenarios)[number];

// Incremental (new, asynchronous) vs synchronous (legacy) rendering pipelines.
const modes: Record<string, boolean> = {
  incremental: true,
  synchronous: false
};

const parameters: [Scenario, string, boolean, number][] = [];
for (const scenario of scenarios) {
  for (const [modeName, incremental] of Object.entries(modes)) {
    for (let sample = 0; sample < benchmark.nSamples; sample++) {
      parameters.push([scenario, modeName, incremental, sample]);
    }
  }
}

/**
 * Fire a command and record, relative to the moment just before the command is
 * issued, when the rendered output:
 *
 * - first shows any text (`first-text`),
 * - shows all of its text (`all-text`, auto-linking may still be in progress),
 * - has all of its URLs auto-linked (`all-links`).
 */
async function measureRenderTimings(
  page: Page,
  expectedLength: number,
  expectedLinks: number,
  command: string,
  args?: Record<string, unknown>
): Promise<{ firstText: number; allText: number; allLinks: number }> {
  await page.evaluate(
    ({ expectedLength, expectedLinks, command, args }) => {
      const w = window as any;
      w.__bench = {
        firstText: null as number | null,
        allText: null as number | null,
        allLinks: null as number | null
      };
      const selector = '[role="main"] .jp-NotebookPanel .jp-RenderedText';
      const start = performance.now();
      const poll = () => {
        const el = document.querySelector(selector);
        const len = el ? (el.textContent ?? '').length : 0;
        const now = performance.now() - start;
        if (len > 0 && w.__bench.firstText === null) {
          w.__bench.firstText = now;
        }
        if (len >= expectedLength && w.__bench.allText === null) {
          w.__bench.allText = now;
        }
        if (
          w.__bench.allLinks === null &&
          el &&
          el.querySelectorAll('a').length >= expectedLinks
        ) {
          w.__bench.allLinks = now;
          clearInterval(w.__benchTimer);
        }
      };
      w.__benchTimer = setInterval(poll, 4);
      // Start the clock and issue the measured action atomically.
      void w.jupyterapp.commands.execute(command, args);
      poll();
    },
    { expectedLength, expectedLinks, command, args: args ?? {} }
  );

  await page.waitForFunction(
    () => (window as any).__bench?.allLinks !== null,
    undefined,
    { timeout: 280_000 }
  );

  return page.evaluate(() => {
    const w = window as any;
    clearInterval(w.__benchTimer);
    return {
      firstText: w.__bench.firstText,
      allText: w.__bench.allText,
      allLinks: w.__bench.allLinks
    };
  });
}

test.describe('Benchmark - Output rendering', () => {
  test.beforeAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);

    // Notebook whose single cell streams the output when executed.
    const streamContent = galata.Notebook.generateNotebook(1, 'code', [
      'import sys\n',
      `for i in range(${N_CHUNKS}):\n`,
      `    print(f"example.com {i} ${PADDING} www.", end="")\n`,
      '    sys.stdout.flush()'
    ]);
    await content.uploadContent(
      JSON.stringify(streamContent),
      'text',
      `${tmpPath}/${streamNotebook}`
    );

    // Notebook whose single cell already has the full output baked in.
    const bakedOutput: nbformat.IOutput[] = [
      { output_type: 'stream', name: 'stdout', text: FULL_TEXT }
    ];
    const bakedContent = galata.Notebook.generateNotebook(
      1,
      'code',
      [`# Pre-computed output (${N_CHUNKS} chunks)`],
      bakedOutput
    );
    await content.uploadContent(
      JSON.stringify(bakedContent),
      'text',
      `${tmpPath}/${bakedNotebook}`
    );
  });

  test.afterAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    await content.deleteDirectory(tmpPath);
  });

  for (const [scenario, modeName, incremental, sample] of parameters) {
    test(`measure ${scenario} ${modeName} - ${sample + 1}`, async ({
      baseURL,
      browserName,
      page
    }, testInfo) => {
      test.setTimeout(300_000);

      // Toggle the incremental (asynchronous) auto-linking pipeline for this run.
      await galata.Mock.mockSettings(page, [], {
        ...galata.DEFAULT_SETTINGS,
        [SANITIZER_PLUGIN]: { incrementalAutolink: incremental }
      });

      const attachmentCommon = {
        nSamples: benchmark.nSamples,
        browser: browserName,
        file: `output-render-${scenario}`,
        project: testInfo.project.name
      };

      await page.goto(baseURL + '?reset');
      // Wait until the application can open documents (plugins register lazily).
      await page.waitForFunction(
        () =>
          !!(window as any).jupyterapp?.commands?.hasCommand('docmanager:open')
      );

      let timings: { firstText: number; allText: number; allLinks: number };
      if (scenario === 'stream') {
        // Open the notebook and wait for the kernel to be ready to execute.
        await page.evaluate(
          path =>
            (window as any).jupyterapp.commands.execute('docmanager:open', {
              path,
              factory: 'Notebook'
            }),
          `${tmpPath}/${streamNotebook}`
        );
        await page.locator('[role="main"] .jp-NotebookPanel').waitFor();
        await page.waitForFunction(() => {
          const text =
            document.querySelector('#jp-main-statusbar')?.textContent ?? '';
          return !['Connecting', 'Initializing', 'Starting'].some(s =>
            text.includes(s)
          );
        });

        timings = await measureRenderTimings(
          page,
          EXPECTED_TEXT_LENGTH,
          EXPECTED_LINKS,
          'notebook:run-all-cells'
        );
      } else {
        timings = await measureRenderTimings(
          page,
          EXPECTED_TEXT_LENGTH,
          EXPECTED_LINKS,
          'docmanager:open',
          { path: `${tmpPath}/${bakedNotebook}`, factory: 'Notebook' }
        );
      }

      for (const [metric, time] of [
        [`${modeName}-first-text`, timings.firstText],
        [`${modeName}-all-text`, timings.allText],
        [`${modeName}-all-links`, timings.allLinks]
      ] as const) {
        testInfo.attachments.push(
          benchmark.addAttachment({
            ...attachmentCommon,
            test: metric,
            time
          })
        );
      }
    });
  }
});
