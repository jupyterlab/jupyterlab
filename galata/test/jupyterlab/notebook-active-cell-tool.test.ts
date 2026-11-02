// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, test } from '@jupyterlab/galata';

const TOOL = '.jp-ActiveCellTool';
const PROMPT = `${TOOL} .jp-InputPrompt`;
const PREVIEW = `${TOOL} .jp-ActiveCellTool-Content pre`;

/**
 * What the active cell field showed on a single animation frame.
 *
 * `mounted: false` means the field was not in the document at all, which is
 * what the metadata form does to it while rebuilding.
 */
type PaintedFrame =
  | { mounted: false }
  | {
      mounted: true;
      promptHidden: boolean;
      promptText: string;
      preview: string;
    };

interface IRecording {
  frames: PaintedFrame[];
  /**
   * Distinct `.jp-ActiveCellTool` nodes inserted into the document, i.e. how
   * many widgets the field renderer built.
   */
  distinctTools: number;
  /**
   * How many times any such node was inserted, including reinsertions of the
   * same one. Zero means the form was never rebuilt and any conclusion drawn
   * from `distinctTools` would be vacuous.
   */
  insertions: number;
}

interface IProbeState {
  frames: PaintedFrame[];
  nodes: Set<Element>;
  insertions: number;
  recording: boolean;
}

interface IProbeWindow extends Window {
  __activeCellToolProbe?: IProbeState;
}

/**
 * Start sampling the active cell field once per animation frame.
 *
 * Sampling every frame is what makes this a test of the user-visible
 * behaviour: a transient blank or mismatched state is a defect even though it
 * always resolves on its own, so no amount of waiting in the test can observe
 * it after the fact.
 */
async function startRecording(page: IJupyterLabPageFixture): Promise<void> {
  await page.evaluate(
    ([toolSelector, promptSelector, previewSelector]) => {
      const state: IProbeState = {
        frames: [],
        nodes: new Set<Element>(),
        insertions: 0,
        recording: true
      };
      (window as IProbeWindow).__activeCellToolProbe = state;

      const current = document.querySelector(toolSelector);
      if (current) {
        state.nodes.add(current);
      }

      const observer = new MutationObserver(records => {
        for (const record of records) {
          record.addedNodes.forEach(node => {
            if (!(node instanceof Element)) {
              return;
            }
            const tool = node.matches(toolSelector)
              ? node
              : node.querySelector(toolSelector);
            if (tool) {
              state.nodes.add(tool);
              state.insertions++;
            }
          });
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const sample = () => {
        if (!state.recording) {
          observer.disconnect();
          return;
        }
        const prompt = document.querySelector(promptSelector);
        const preview = document.querySelector(previewSelector);
        state.frames.push(
          prompt && preview
            ? {
                mounted: true,
                promptHidden: prompt.classList.contains('lm-mod-hidden'),
                promptText: (prompt.textContent ?? '').trim(),
                preview: preview.textContent ?? ''
              }
            : { mounted: false }
        );
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    },
    [TOOL, PROMPT, PREVIEW]
  );
}

async function stopRecording(
  page: IJupyterLabPageFixture
): Promise<IRecording> {
  return await page.evaluate(() => {
    const state = (window as IProbeWindow).__activeCellToolProbe;
    if (!state) {
      throw new Error('The active cell field probe was not started.');
    }
    state.recording = false;
    return {
      frames: state.frames,
      distinctTools: state.nodes.size,
      insertions: state.insertions
    };
  });
}

test.describe('Notebook tools active cell field', () => {
  // Each cell, by index: the first source line the field previews, and the
  // prompt that belongs with it. Cell 0 is executed so that the three cells
  // have three distinguishable prompts.
  const cells = [
    { type: 'code', source: 'print("first")', prompt: '[1]:', hidden: false },
    { type: 'raw', source: 'Raw cell', prompt: '', hidden: true },
    { type: 'code', source: 'print("second")', prompt: '[ ]:', hidden: false }
  ] as const;

  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    await page.notebook.setCell(0, 'code', cells[0].source);
    await page.notebook.addCell(cells[1].type, cells[1].source);
    await page.notebook.addCell(cells[2].type, cells[2].source);
    await page.notebook.runCell(0, true);

    await page.sidebar.openTab('jp-property-inspector');
    await page.click('.jp-PropertyInspector >> text=Common Tools');
    // A positive assertion: `not.toBeEmpty()` would also pass if the field
    // never appeared at all.
    await expect(page.locator(PROMPT)).toHaveText(cells[0].prompt);
    await expect(page.locator(PREVIEW)).toHaveText(cells[0].source);
  });

  /**
   * Switch through every cell a few times while the probe records.
   */
  async function cycleCells(page: IJupyterLabPageFixture): Promise<void> {
    const preview = page.locator(PREVIEW);
    for (let round = 0; round < 3; round++) {
      for (let index = 0; index < cells.length; index++) {
        await page.notebook.selectCells(index);
        // Also paces the loop: the next switch waits for this one to land.
        await expect(preview).toHaveText(cells[index].source);
      }
    }
  }

  test('should always show a prompt and a source line of the same cell', async ({
    page
  }) => {
    await startRecording(page);
    await cycleCells(page);
    const { frames } = await stopRecording(page);

    expect(frames.length, 'the probe did not sample any frame').toBeGreaterThan(
      20
    );

    // The field must not disappear either, so unmounted frames are asserted
    // rather than filtered out.
    const unmounted = frames.filter(frame => !frame.mounted);
    expect(
      unmounted.length,
      `the field was missing from the document on ${unmounted.length} of ${frames.length} frames`
    ).toBe(0);

    // Every painted frame has to match one of the cells exactly: a blank
    // preview, an empty prompt, or the prompt of one cell beside the source
    // line of another are all states no cell can explain.
    const explained = new Set(
      cells.map(cell => `${cell.hidden}|${cell.prompt}|${cell.source}`)
    );
    const unexplained = new Map<string, number>();
    for (const frame of frames) {
      if (!frame.mounted) {
        continue;
      }
      const state = `${frame.promptHidden}|${frame.promptText}|${frame.preview}`;
      if (!explained.has(state)) {
        unexplained.set(state, (unexplained.get(state) ?? 0) + 1);
      }
    }

    expect(
      [...unexplained].map(
        ([state, count]) => `${count}x hidden|prompt|preview = ${state}`
      ),
      'the field painted states that do not describe any of the cells'
    ).toEqual([]);
  });

  test('should reuse a single active cell field across form rebuilds', async ({
    page
  }) => {
    await startRecording(page);
    await cycleCells(page);
    const { distinctTools, insertions } = await stopRecording(page);

    expect(
      insertions,
      'the metadata form was never rebuilt, so this test proves nothing'
    ).toBeGreaterThan(5);

    // The field renderer is a React component and runs on every rebuild of the
    // metadata form. Building a widget per render leaves the previous one
    // connected to its cell model for the lifetime of the document.
    expect(
      distinctTools,
      `${distinctTools} active cell field widgets were built while switching cells`
    ).toBe(1);
  });
});
