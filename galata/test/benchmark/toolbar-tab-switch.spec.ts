// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@playwright/test';
import { benchmark, galata } from '@jupyterlab/galata';

/**
 * Benchmark for the cost of re-rendering notebook toolbars when switching tabs.
 *
 * Switching the active tab notifies (almost) every notebook command, which in
 * turn asks each `CommandToolbarButton` - across *all* open notebooks, including
 * the hidden ones whose React roots stay mounted - to re-render. This benchmark
 * opens several notebooks and measures the time it takes React to flush the
 * toolbar re-renders triggered by cycling the active tab.
 */

const tmpPath = 'test-performance-toolbar';

// Number of notebooks to open simultaneously. More notebooks means more mounted
// toolbars (hence more buttons to re-render on every tab switch).
const N_NOTEBOOKS = 8;

// Number of tab activations to perform inside a single measurement. Cycling
// through distinct notebooks guarantees the current-widget actually changes
// (and therefore that the command notifications fire) on every iteration. A
// large number amplifies the toolbar re-render cost above the background noise.
const N_ROUNDS = 100;

const notebookNames = Array.from(
  { length: N_NOTEBOOKS },
  (_, i) => `toolbar_bench_${i}.ipynb`
);

const parameters: number[] = new Array<number>(benchmark.nSamples)
  .fill(0)
  .map((_, i) => i);

test.describe('Benchmark - Toolbar tab switch', () => {
  test.beforeAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    // Tiny notebooks: we want the toolbars to dominate the cost, not the cells.
    const nb = galata.Notebook.generateNotebook(1, 'code', ['']);
    for (const name of notebookNames) {
      await content.uploadContent(
        JSON.stringify(nb),
        'text',
        `${tmpPath}/${name}`
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    await galata.Mock.mockSettings(page, [], galata.DEFAULT_SETTINGS);
  });

  test.afterAll(async ({ request }) => {
    const content = galata.newContentsHelper(request);
    await content.deleteDirectory(tmpPath);
  });

  for (const sample of parameters) {
    test(`measure tab switch with ${N_NOTEBOOKS} notebooks - ${
      sample + 1
    }`, async ({ baseURL, browserName, page }, testInfo) => {
      test.setTimeout(300_000);

      const attachmentCommon = {
        nSamples: benchmark.nSamples,
        browser: browserName,
        file: `toolbar-tab-switch-${N_NOTEBOOKS}-notebooks`,
        project: testInfo.project.name
      };

      await page.goto(baseURL + '?reset');

      // Wait for the JupyterLab application to be ready.
      await page.waitForFunction(
        () => !!(window as any).jupyterapp?.commands,
        undefined,
        { timeout: 60_000 }
      );
      await page.evaluate(() => (window as any).jupyterapp.restored);

      // Open all the notebooks as tabs in the main area.
      await page.evaluate(
        async ([paths]) => {
          const app = (window as any).jupyterapp;
          for (const path of paths) {
            await app.commands.execute('docmanager:open', {
              path,
              factory: 'Notebook'
            });
          }
        },
        [notebookNames.map(name => `${tmpPath}/${name}`)]
      );

      // Wait for all the notebook panels to be mounted.
      await expect(page.locator('[role="main"] .jp-NotebookPanel')).toHaveCount(
        N_NOTEBOOKS
      );
      await page
        .locator('[role="main"] >> .jp-SpinnerContent')
        .waitFor({ state: 'hidden' });

      // Shut the kernels down so that kernel status changes do not add noise to
      // the measurement (the command notifications we want to measure are
      // triggered by the tab switch, not by the kernels).
      await page.evaluate(async () => {
        const app = (window as any).jupyterapp;
        await app.serviceManager.sessions.shutdownAll();
      });

      // Let the UI (and any asynchronous kernel-shutdown work) settle before
      // measuring, so it does not leak into the measurement window.
      await page.waitForTimeout(2500);

      // A tab switch reconciles the button subtrees but usually produces *no*
      // DOM change (the rendered output is identical). The cost is therefore
      // not just JS - re-rendering the button also re-runs the web-component
      // property setters, which can trigger style recalculation independently
      // of any DOM mutation. We thus capture, via the Chrome DevTools Protocol,
      // the main-thread breakdown (script, style recalc, layout) rather than
      // wall-clock, which would be dominated by the shell's per-activation work.
      const METRICS = [
        'TaskDuration',
        'ScriptDuration',
        'RecalcStyleDuration',
        'LayoutDuration',
        'RecalcStyleCount',
        'LayoutCount'
      ];
      const client = await page.context().newCDPSession(page);
      await client.send('Performance.enable');
      const snapshot = async (): Promise<Record<string, number>> => {
        const { metrics } = await client.send('Performance.getMetrics');
        const result: Record<string, number> = {};
        for (const name of METRICS) {
          result[name] = metrics.find(m => m.name === name)?.value ?? 0;
        }
        return result;
      };

      // Run `rounds` iterations of: optionally switch the active tab, then flush
      // React. When `activate` is false this is an idle baseline of the exact
      // same shape, used to cancel out the constant background JS (pollers etc.)
      // that runs regardless of tab switches.
      const runLoop = (rounds: number, activate: boolean) =>
        page.evaluate(
          async ([nRounds, doActivate]) => {
            const app = (window as any).jupyterapp;
            const shell = app.shell;
            const ids = (Array.from(shell.widgets('main')) as any[])
              .filter(widget =>
                widget.node.classList.contains('jp-NotebookPanel')
              )
              .map(widget => widget.id);

            // Wait for two animation frames so that React reliably commits the
            // renders scheduled by the command notifications before the next
            // iteration. The idle time spent waiting for frames is NOT counted
            // by ScriptDuration (which only measures JS execution), so - unlike
            // a wall-clock measurement - this does not introduce a frame-budget
            // floor; it only guarantees the renders land inside the window.
            const tick = () =>
              new Promise<void>(resolve =>
                requestAnimationFrame(() => resolve())
              );
            const flush = async () => {
              await tick();
              await tick();
            };

            await flush();
            for (let i = 0; i < (nRounds as number); i++) {
              if (doActivate) {
                // Cycle through the notebooks so the current widget changes.
                shell.activateById(ids[i % ids.length]);
              }
              await flush();
            }
          },
          [rounds, activate] as [number, boolean]
        );

      // Idle baseline (no tab switches) of the exact same shape, to cancel the
      // constant background work (pollers etc.).
      const idle0 = await snapshot();
      await runLoop(N_ROUNDS, false);
      const idle1 = await snapshot();

      // Tab switches.
      const switch0 = await snapshot();
      await runLoop(N_ROUNDS, true);
      const switch1 = await snapshot();

      await client.detach();

      // Per-metric delta attributable to the tab switches (idle-subtracted).
      const delta: Record<string, number> = {};
      for (const name of METRICS) {
        const idleDelta = idle1[name] - idle0[name];
        const switchDelta = switch1[name] - switch0[name];
        // Durations are in seconds; convert to ms. Counts stay as-is.
        const scale = name.endsWith('Count') ? 1 : 1000;
        delta[name] = (switchDelta - idleDelta) * scale;
      }

      console.log(`TAB_SWITCH_METRICS=${JSON.stringify(delta)}`);

      // Record total main-thread time (script + style + layout + everything
      // else on the thread) attributable to the switches as the headline metric.
      testInfo.attachments.push(
        benchmark.addAttachment({
          ...attachmentCommon,
          test: 'tab-switch',
          time: Math.max(0, delta.TaskDuration)
        })
      );
    });
  }
});
