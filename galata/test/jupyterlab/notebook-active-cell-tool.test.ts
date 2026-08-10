// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, test } from '@jupyterlab/galata';

const TOOL = '.jp-ActiveCellTool';
const PROMPT = `${TOOL} .jp-InputPrompt`;
const PREVIEW = `${TOOL} .jp-ActiveCellTool-CellContent pre`;

/**
 * What the active cell field showed on a single animation frame.
 */
interface IPaintedFrame {
  /**
   * Whether the field was absent from the DOM, which happens while the
   * metadata form is being rebuilt.
   */
  absent: boolean;
  promptHidden: boolean | null;
  promptText: string | null;
  preview: string | null;
}

interface IRecording {
  frames: IPaintedFrame[];
  /**
   * Number of distinct `.jp-ActiveCellTool` nodes inserted into the document,
   * i.e. the number of widgets the field renderer created.
   */
  toolNodes: number;
}

interface IProbeState {
  frames: IPaintedFrame[];
  nodes: Set<Element>;
  recording: boolean;
}

interface IProbeWindow extends Window {
  __activeCellToolProbe?: IProbeState;
}

/**
 * Start sampling the active cell field once per animation frame.
 *
 * Sampling every frame is what makes this a test of the user-visible
 * behaviour: a transient blank state is a defect even though it always
 * resolves on its own, so no amount of waiting in the test can observe it.
 */
async function startRecording(page: IJupyterLabPageFixture): Promise<void> {
  await page.evaluate(
    ([toolSelector, promptSelector, previewSelector]) => {
      const state: IProbeState = {
        frames: [],
        nodes: new Set<Element>(),
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
        state.frames.push({
          absent: !prompt,
          promptHidden: prompt
            ? prompt.classList.contains('lm-mod-hidden')
            : null,
          promptText: prompt ? (prompt.textContent ?? '').trim() : null,
          preview: preview ? (preview.textContent ?? '') : null
        });
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
    return { frames: state.frames, toolNodes: state.nodes.size };
  });
}

test.describe('Notebook tools active cell field', () => {
  // First line of each cell, by index, as shown in the field preview.
  const sources = ['print("first")', 'Raw cell', 'print("second")'];

  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    await page.notebook.setCell(0, 'code', sources[0]);
    await page.notebook.addCell('raw', sources[1]);
    await page.notebook.addCell('code', sources[2]);
    // Give one cell an execution count, so the prompt differs between cells.
    await page.notebook.runCell(0, true);

    await page.click('[title="Property Inspector"]');
    await page.click('.jp-PropertyInspector >> text=Common Tools');
    await expect(page.locator(PROMPT)).not.toBeEmpty();
  });

  /**
   * Switch through every cell a few times, recording every painted frame.
   */
  async function cycleCells(page: IJupyterLabPageFixture): Promise<void> {
    const preview = page.locator(PREVIEW);
    for (let round = 0; round < 3; round++) {
      for (let index = 0; index < sources.length; index++) {
        await page.notebook.selectCells(index);
        // Also paces the loop: the next switch waits for this one to land.
        await expect(preview).toHaveText(sources[index]);
      }
    }
  }

  test('should not blank the prompt or the preview while switching cells', async ({
    page
  }) => {
    await startRecording(page);
    await cycleCells(page);
    const { frames } = await stopRecording(page);

    const painted = frames.filter(frame => !frame.absent);
    // Guard against a probe that silently recorded nothing meaningful.
    expect(painted.length).toBeGreaterThan(20);
    expect(
      painted.filter(frame => frame.preview === null).length,
      'the preview element was never found, so the assertions below are vacuous'
    ).toBe(0);

    const emptyPrompt = painted.filter(
      frame => frame.promptHidden === false && frame.promptText === ''
    );
    expect(
      emptyPrompt.length,
      `the prompt was shown but empty on ${emptyPrompt.length} of ${painted.length} painted frames`
    ).toBe(0);

    const blankPreview = painted.filter(frame => frame.preview === '');
    expect(
      blankPreview.length,
      `the preview was blank on ${blankPreview.length} of ${painted.length} painted frames`
    ).toBe(0);
  });

  test('should reuse a single active cell field across form rebuilds', async ({
    page
  }) => {
    await startRecording(page);
    await cycleCells(page);
    const { toolNodes } = await stopRecording(page);

    // The field renderer is a React component and runs on every rebuild of the
    // metadata form. Building a widget per render leaves the previous one
    // connected to its cell model for the lifetime of the document.
    expect(
      toolNodes,
      `${toolNodes} active cell field widgets were created while switching cells`
    ).toBe(1);
  });
});
