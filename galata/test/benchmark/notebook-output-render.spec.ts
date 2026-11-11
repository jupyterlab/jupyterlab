// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@playwright/test';
import { benchmark, galata } from '@jupyterlab/galata';
import type { Page } from '@playwright/test';
import type * as nbformat from '@jupyterlab/nbformat';

/**
 * This benchmark measures rendering of large textual outputs that contain many
 * auto-linked references, comparing the incremental (asynchronous) auto-linking
 * pipeline with the legacy synchronous one.
 *
 * For each render it records, relative to the moment the output starts being
 * produced:
 *
 * - `first-text`: time until *any* text is painted (time-to-first-paint).
 * - `all-text`: time until the *whole* text is painted (auto-linking may still
 *   be in progress - links are not waited for).
 * - `all-links`: time until every web link has been auto-linked.
 * - `longest-frame`: the longest gap between two animation frames while
 *   rendering - a jank proxy: a long gap means the main thread was blocked and
 *   the page was unresponsive for that long.
 *
 * The incremental pipeline paints all the plain text on its first frame and
 * defers only the auto-linking, so it is expected to reach these milestones
 * sooner than the synchronous pipeline, which blocks until the entire output
 * (text and links) has been rendered.
 *
 * Two output channels are covered, because they use different renderers with
 * different auto-linking work:
 *
 * - `stdout` (rendered by `RenderedText`) auto-links web URLs only, and steps
 *   the incremental linker at whitespace.
 * - `stderr` (rendered by `RenderedError`) additionally auto-links file paths
 *   (Python-traceback style, e.g. `File "…", line 12`), which runs a second
 *   linker per step and forces the linker to step at line breaks only (a path
 *   link may span spaces within a line). Its content here is realistic
 *   multi-line traceback blocks mixing URLs and file paths.
 *
 * The `all-links` gate counts web anchors only (`a[href^="http"]`): those are
 * stable, whereas `RenderedError` resolves file-path anchors asynchronously
 * *after* rendering (outside the measured window), which can rewrite or unwrap
 * them. Web-link completion coincides with the end of rendering, so it is the
 * robust cross-channel completion signal.
 *
 * Scenarios:
 *
 * - `stream` / `stream-stderr`: the output is produced by executing a cell, so
 *   `renderModel` is called repeatedly as chunks arrive.
 * - `baked` / `baked-stderr`: the same output is stored in the notebook, so
 *   opening it renders the whole output in a single `renderModel` call,
 *   isolating the rendering cost from kernel/streaming variability.
 * - `baked-many`: the `baked` output replicated into several cells rendering
 *   concurrently (windowing is disabled so all of them attach at once). This
 *   exercises the round-robin sharing of animation frames between outputs - in
 *   particular that concurrently rendering outputs do not inflate each other's
 *   per-frame time budgets (which would show up as a large `longest-frame`).
 */

const tmpPath = 'test-performance-output-render';

const SANITIZER_PLUGIN = '@jupyterlab/apputils-extension:sanitizer';

// Selector for web-link anchors, used as the channel-agnostic "all-links"
// completion gate (see the file doc).
const WEB_LINK_SELECTOR = 'a[href^="http"]';

// Number of stream chunks / baked link units. This is the dominating cost;
// reduce it (or set the BENCHMARK_OUTPUT_CHUNKS env var) if the benchmark takes
// too long on CI.
const N_CHUNKS = parseInt(process.env['BENCHMARK_OUTPUT_CHUNKS'] ?? '1000', 10);

// Padding to make the output sizeable while keeping the URLs sparse, matching
// the reproducer used during development.
const PADDING = 'X'.repeat(46);

/**
 * Build the full concatenated stdout text (chunks of the form
 * `example.com {i} ... www.`, with no separators, so `...www.` joins the next
 * `example.com...` into a `www.example.com` link split across chunks).
 */
function stdoutText(n: number): string {
  let text = '';
  for (let i = 0; i < n; i++) {
    text += `example.com ${i} ${PADDING} www.`;
  }
  return text;
}

/**
 * Build stderr text as `n` realistic Python-traceback blocks, each with one
 * file path carrying a line locator (a path link) and one web URL.
 */
function stderrText(n: number): string {
  let text = '';
  for (let i = 0; i < n; i++) {
    text +=
      'Traceback (most recent call last):\n' +
      `  File "/tmp/session/cell_${i}.py", line ${i}, in <module>\n` +
      `    raise RuntimeError("details at https://example.com/errors/${i}")\n`;
  }
  return text;
}

const STDOUT_TEXT = stdoutText(N_CHUNKS);
// The rendered text content equals the source regardless of auto-linking (links
// wrap text without changing `textContent`), so its length marks "all text".
const STDOUT_TEXT_LENGTH = STDOUT_TEXT.length;
// Each chunk boundary (`...www.` + `example.com...`) forms one `www.example.com`
// web link, so `N_CHUNKS - 1` web links mark "all links".
const STDOUT_WEB_LINKS = N_CHUNKS - 1;

// Size the stderr output to roughly match the stdout output, so the two
// channels are compared at a comparable total size (rendering cost scales with
// size). Link density differs and is reported alongside. Overridable
// (BENCHMARK_STDERR_BLOCKS) to scan the output-size axis in round steps.
const STDERR_BLOCKS = parseInt(
  process.env['BENCHMARK_STDERR_BLOCKS'] ??
    String(Math.max(2, Math.round(STDOUT_TEXT.length / stderrText(1).length))),
  10
);
const STDERR_TEXT = stderrText(STDERR_BLOCKS);
const STDERR_TEXT_LENGTH = STDERR_TEXT.length;
// One web URL per traceback block.
const STDERR_WEB_LINKS = STDERR_BLOCKS;

// The `baked-many` scenarios render the full `baked` output in each of this
// many concurrently rendering cells. Each output must be large enough to keep
// rendering across many frames - that is what exercises the frame sharing;
// outputs small enough to finish in a frame or two would not overlap.
// Overridable (BENCHMARK_OUTPUT_CELLS) to scan the number-of-outputs axis.
const N_OUTPUTS = parseInt(process.env['BENCHMARK_OUTPUT_CELLS'] ?? '8', 10);

type Channel = 'stdout' | 'stderr';
type Delivery = 'stream' | 'open';

interface IScenario {
  /** Scenario name; also the benchmark attachment file key. */
  name: string;
  channel: Channel;
  /** Whether the output streams from a running cell or is opened baked-in. */
  delivery: Delivery;
  /** Notebook filename created in `beforeAll`. */
  notebook: string;
  /** Expected total rendered text length across all outputs. */
  expectedLength: number;
  /** Expected total web-link count across all outputs. */
  expectedLinks: number;
  /** Disable notebook windowing (for the concurrent many-outputs scenario). */
  disableWindowing?: boolean;
}

const SCENARIOS: IScenario[] = [
  {
    name: 'stream',
    channel: 'stdout',
    delivery: 'stream',
    notebook: 'streamed_stdout.ipynb',
    expectedLength: STDOUT_TEXT_LENGTH,
    expectedLinks: STDOUT_WEB_LINKS
  },
  {
    name: 'baked',
    channel: 'stdout',
    delivery: 'open',
    notebook: 'baked_stdout.ipynb',
    expectedLength: STDOUT_TEXT_LENGTH,
    expectedLinks: STDOUT_WEB_LINKS
  },
  {
    name: 'baked-many',
    channel: 'stdout',
    delivery: 'open',
    notebook: 'baked_stdout_many.ipynb',
    expectedLength: STDOUT_TEXT_LENGTH * N_OUTPUTS,
    expectedLinks: STDOUT_WEB_LINKS * N_OUTPUTS,
    disableWindowing: true
  },
  {
    name: 'stream-stderr',
    channel: 'stderr',
    delivery: 'stream',
    notebook: 'streamed_stderr.ipynb',
    expectedLength: STDERR_TEXT_LENGTH,
    expectedLinks: STDERR_WEB_LINKS
  },
  {
    name: 'baked-stderr',
    channel: 'stderr',
    delivery: 'open',
    notebook: 'baked_stderr.ipynb',
    expectedLength: STDERR_TEXT_LENGTH,
    expectedLinks: STDERR_WEB_LINKS
  },
  {
    name: 'baked-many-stderr',
    channel: 'stderr',
    delivery: 'open',
    notebook: 'baked_stderr_many.ipynb',
    expectedLength: STDERR_TEXT_LENGTH * N_OUTPUTS,
    expectedLinks: STDERR_WEB_LINKS * N_OUTPUTS,
    disableWindowing: true
  }
];

// Incremental (new, asynchronous) vs synchronous (legacy) rendering pipelines.
const modes: Record<string, boolean> = {
  incremental: true,
  synchronous: false
};

const parameters: [IScenario, string, boolean, number][] = [];
for (const scenario of SCENARIOS) {
  for (const [modeName, incremental] of Object.entries(modes)) {
    for (let sample = 0; sample < benchmark.nSamples; sample++) {
      parameters.push([scenario, modeName, incremental, sample]);
    }
  }
}

/**
 * Source of a cell that streams `text` to the given channel, one line-block per
 * iteration (matching the baked text of the same channel).
 */
function streamCellSource(channel: Channel): string[] {
  if (channel === 'stdout') {
    return [
      'import sys\n',
      `for i in range(${N_CHUNKS}):\n`,
      `    print(f"example.com {i} ${PADDING} www.", end="")\n`,
      '    sys.stdout.flush()'
    ];
  }
  return [
    'import sys\n',
    `for i in range(${STDERR_BLOCKS}):\n`,
    '    sys.stderr.write(\n',
    "        f'Traceback (most recent call last):\\n'\n",
    '        f\'  File "/tmp/session/cell_{i}.py", line {i}, in <module>\\n\'\n',
    '        f\'    raise RuntimeError("details at https://example.com/errors/{i}")\\n\'\n',
    '    )\n',
    '    sys.stderr.flush()'
  ];
}

/** The baked text (full output) for a channel. */
function bakedText(channel: Channel): string {
  return channel === 'stdout' ? STDOUT_TEXT : STDERR_TEXT;
}

/**
 * Fire a command and record, relative to the moment just before the command is
 * issued, when the rendered output(s) - aggregated over every text output in
 * the notebook:
 *
 * - first show any text (`first-text`),
 * - show all of their text (`all-text`, auto-linking may still be in progress),
 * - have all of their web URLs auto-linked (`all-links`; see the file doc for
 *   why the gate is web links only).
 *
 * Additionally records the longest gap between two animation frames observed
 * until `all-links` (`longestFrame`) - a jank proxy.
 */
async function measureRenderTimings(
  page: Page,
  expectedLength: number,
  expectedLinks: number,
  command: string,
  args?: Record<string, unknown>
): Promise<{
  firstText: number;
  allText: number;
  allLinks: number;
  longestFrame: number;
  medianFrame: number;
}> {
  await page.evaluate(
    ({ expectedLength, expectedLinks, linkSelector, command, args }) => {
      const w = window as any;
      w.__bench = {
        firstText: null as number | null,
        allText: null as number | null,
        allLinks: null as number | null,
        longestFrame: 0,
        frameDeltas: [] as number[]
      };
      const selector = '[role="main"] .jp-NotebookPanel .jp-RenderedText';
      const start = performance.now();
      const poll = () => {
        const els = document.querySelectorAll(selector);
        let len = 0;
        let links = 0;
        for (const el of els) {
          len += (el.textContent ?? '').length;
          links += el.querySelectorAll(linkSelector).length;
        }
        const now = performance.now() - start;
        if (len > 0 && w.__bench.firstText === null) {
          w.__bench.firstText = now;
        }
        if (len >= expectedLength && w.__bench.allText === null) {
          w.__bench.allText = now;
        }
        if (w.__bench.allLinks === null && links >= expectedLinks) {
          w.__bench.allLinks = now;
          clearInterval(w.__benchTimer);
        }
      };
      w.__benchTimer = setInterval(poll, 4);
      // Track the longest inter-frame gap for as long as links are pending.
      let lastFrame: number | null = null;
      const trackFrame = (timestamp: number) => {
        if (lastFrame !== null) {
          const delta = timestamp - lastFrame;
          w.__bench.frameDeltas.push(delta);
          w.__bench.longestFrame = Math.max(w.__bench.longestFrame, delta);
        }
        lastFrame = timestamp;
        if (w.__bench.allLinks === null) {
          requestAnimationFrame(trackFrame);
        }
      };
      requestAnimationFrame(trackFrame);
      // Start the clock and issue the measured action atomically.
      void w.jupyterapp.commands.execute(command, args);
      poll();
    },
    {
      expectedLength,
      expectedLinks,
      linkSelector: WEB_LINK_SELECTOR,
      command,
      args: args ?? {}
    }
  );

  await page.waitForFunction(
    () => (window as any).__bench?.allLinks !== null,
    undefined,
    { timeout: 280_000 }
  );

  return page.evaluate(() => {
    const w = window as any;
    clearInterval(w.__benchTimer);
    const deltas: number[] = [...w.__bench.frameDeltas].sort(
      (a: number, b: number) => a - b
    );
    const medianFrame = deltas.length
      ? deltas[Math.floor((deltas.length - 1) / 2)]
      : 0;
    return {
      firstText: w.__bench.firstText,
      allText: w.__bench.allText,
      allLinks: w.__bench.allLinks,
      longestFrame: w.__bench.longestFrame,
      medianFrame
    };
  });
}

test.describe('Benchmark - Output rendering', () => {
  test.beforeAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);

    for (const scenario of SCENARIOS) {
      let notebookContent: nbformat.INotebookContent;
      if (scenario.delivery === 'stream') {
        notebookContent = galata.Notebook.generateNotebook(
          1,
          'code',
          streamCellSource(scenario.channel)
        );
      } else {
        const nCells = scenario.disableWindowing ? N_OUTPUTS : 1;
        const output: nbformat.IOutput[] = [
          {
            output_type: 'stream',
            name: scenario.channel,
            text: bakedText(scenario.channel)
          }
        ];
        notebookContent = galata.Notebook.generateNotebook(
          nCells,
          'code',
          [`# Pre-computed ${scenario.channel} output`],
          output
        );
      }
      await content.uploadContent(
        JSON.stringify(notebookContent),
        'text',
        `${tmpPath}/${scenario.notebook}`
      );
    }
  });

  test.afterAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    await content.deleteDirectory(tmpPath);
  });

  for (const [scenario, modeName, incremental, sample] of parameters) {
    test(`measure ${scenario.name} ${modeName} - ${sample + 1}`, async ({
      baseURL,
      browserName,
      page
    }, testInfo) => {
      test.setTimeout(300_000);

      // Toggle the incremental (asynchronous) auto-linking pipeline for this
      // run. The many-outputs scenario disables notebook windowing so that
      // all of its outputs attach - and render - concurrently.
      await galata.Mock.mockSettings(page, [], {
        ...galata.DEFAULT_SETTINGS,
        [SANITIZER_PLUGIN]: { incrementalAutolink: incremental },
        ...(scenario.disableWindowing
          ? {
              '@jupyterlab/notebook-extension:tracker': {
                windowingMode: 'none'
              }
            }
          : {})
      });

      const attachmentCommon = {
        nSamples: benchmark.nSamples,
        browser: browserName,
        file: `output-render-${scenario.name}`,
        project: testInfo.project.name
      };

      await page.goto(baseURL + '?reset');
      // Wait until the application can open documents (plugins register lazily).
      await page.waitForFunction(
        () =>
          !!(window as any).jupyterapp?.commands?.hasCommand('docmanager:open')
      );

      let timings: {
        firstText: number;
        allText: number;
        allLinks: number;
        longestFrame: number;
        medianFrame: number;
      };
      if (scenario.delivery === 'stream') {
        // Open the notebook and wait for the kernel to be ready to execute.
        await page.evaluate(
          path =>
            (window as any).jupyterapp.commands.execute('docmanager:open', {
              path,
              factory: 'Notebook'
            }),
          `${tmpPath}/${scenario.notebook}`
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
          scenario.expectedLength,
          scenario.expectedLinks,
          'notebook:run-all-cells'
        );
      } else {
        timings = await measureRenderTimings(
          page,
          scenario.expectedLength,
          scenario.expectedLinks,
          'docmanager:open',
          { path: `${tmpPath}/${scenario.notebook}`, factory: 'Notebook' }
        );
      }

      for (const [metric, time] of [
        [`${modeName}-first-text`, timings.firstText],
        [`${modeName}-all-text`, timings.allText],
        [`${modeName}-all-links`, timings.allLinks],
        [`${modeName}-longest-frame`, timings.longestFrame],
        [`${modeName}-median-frame`, timings.medianFrame]
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
