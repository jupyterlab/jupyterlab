// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { JSHandle, Page } from '@playwright/test';

const MARKDOWN_FILE = 'markdown-scroll-sync.md';
const TALL_IMAGE_FILE = 'markdown-scroll-sync-tall.svg';
const AFTER_IMAGE = 'After tall image marker';
const AFTER_TABLE = 'After table marker';
const PREVIEW_SELECTOR = '.jp-MarkdownViewer .jp-RenderedMarkdown';
const SYNC_BUTTON_SELECTOR = '.jp-MarkdownViewer-syncButton';

/**
 * The subset of the file editor API used by the tests.
 */
interface IEditor {
  revealPosition(
    position: { line: number; column: number },
    options: { block: 'start' }
  ): void;
  editor: {
    documentTop: number;
    scrollDOM: HTMLElement;
    state: {
      doc: {
        length: number;
        line(n: number): { from: number; to: number };
        lineAt(pos: number): { number: number };
      };
    };
    dispatch(spec: { changes: { from: number; insert: string } }): void;
    lineBlockAt(pos: number): { top: number; bottom: number; height: number };
    lineBlockAtHeight(height: number): {
      from: number;
      top: number;
      height: number;
    };
  };
}

test.describe('Markdown preview scroll sync', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await openEditorAndPreview(page, tmpPath);

    const syncButton = page.locator(SYNC_BUTTON_SELECTOR);
    await syncButton.click();
    await expect(syncButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('scrolls the preview to follow the editor', async ({
    page,
    tmpPath
  }) => {
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    // Go past the tall image first, then back up to it, so that each check
    // needs the preview to move.
    await scrollEditorToLine(page, path, lineOf(AFTER_TABLE));
    await expectPreviewBlockAtTop(page, AFTER_TABLE);

    await scrollEditorToLine(page, path, lineOf(AFTER_IMAGE));
    await expectPreviewBlockAtTop(page, AFTER_IMAGE);
  });

  test('scrolls the editor to follow the preview', async ({
    page,
    tmpPath
  }) => {
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    await scrollPreviewToBlock(page, AFTER_TABLE);
    await expectEditorLineAtTop(page, path, lineOf(AFTER_TABLE));

    await scrollPreviewToBlock(page, AFTER_IMAGE);
    await expectEditorLineAtTop(page, path, lineOf(AFTER_IMAGE));
  });

  test('scrolls the preview with the keyboard', async ({ page, tmpPath }) => {
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    await page.locator(PREVIEW_SELECTOR).getByText('Intro paragraph.').click();
    await page.keyboard.press('PageDown');
    await expect.poll(() => previewScrollTop(page)).toBeGreaterThan(0);
    await expect.poll(() => editorTopLine(page, path)).toBeGreaterThan(0);
  });

  test('reaches the end of both panes together', async ({ page, tmpPath }) => {
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    await page.evaluate(selector => {
      const preview = document.querySelector(selector)!;
      preview.scrollTop = preview.scrollHeight;
    }, PREVIEW_SELECTOR);
    // The last line sits at the bottom of the editor, not at its top.
    await expect
      .poll(() => editorLastLineBottomOffset(page, path))
      .toBeCloseTo(0, -1);
  });

  test('keeps the editor in place when the preview re-renders', async ({
    page,
    tmpPath
  }) => {
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    // Near the end, so that the shorter render clamps the preview offset.
    const line = lineOf('Filler paragraph 60.');
    await scrollEditorToLine(page, path, line);
    const editor = await fileEditor(page, path);
    await editor.evaluate(({ editor: view }, line) => {
      const { to } = view.state.doc.line(line + 1);
      view.dispatch({ changes: { from: to, insert: ' Edited.' } });
    }, line);
    // The render reloads the image, which has no height until it is loaded.
    await page.locator(PREVIEW_SELECTOR).getByText('Edited.').waitFor();
    await waitForImage(page);
    await nextFrames(page);
    expect(await editorTopLine(page, path)).toBeCloseTo(line, 1);
  });

  test('keeps the editor in place when the preview is shown again', async ({
    page,
    tmpPath
  }) => {
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    // Below the image, so that scroll anchoring would shift the preview.
    await scrollEditorToLine(page, path, lineOf(AFTER_TABLE));
    await expectPreviewBlockAtTop(page, AFTER_TABLE);
    // Hide the preview behind another tab while the editor scrolls.
    const previewId = await page.evaluate(async image => {
      const app = window.jupyterapp;
      const preview = Array.from(app.shell.widgets('main')).find(widget =>
        widget.node.querySelector('.jp-MarkdownViewer')
      )!;
      await app.commands.execute('docmanager:open', {
        path: image,
        factory: 'Image',
        options: { mode: 'tab-after', ref: preview.id }
      });
      return preview.id;
    }, `${tmpPath}/${TALL_IMAGE_FILE}`);
    await expect(page.locator(PREVIEW_SELECTOR)).toBeHidden();
    await scrollEditorToLine(page, path, lineOf(AFTER_IMAGE));

    await page.evaluate(
      id => window.jupyterapp.shell.activateById(id),
      previewId
    );
    await expect(page.locator(PREVIEW_SELECTOR)).toBeVisible();
    await nextFrames(page);
    expect(await editorTopLine(page, path)).toBeCloseTo(lineOf(AFTER_IMAGE), 1);
  });

  test('stops following the editor once turned off', async ({
    page,
    tmpPath
  }) => {
    const syncButton = page.locator(SYNC_BUTTON_SELECTOR);
    await syncButton.click();
    await expect(syncButton).toHaveAttribute('aria-pressed', 'false');
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    await scrollEditorToLine(page, path, lineOf(AFTER_TABLE));
    expect(await previewScrollTop(page)).toBe(0);
    await expect(page.locator(PREVIEW_SELECTOR)).toHaveCSS(
      'overflow-anchor',
      'auto'
    );
  });
});

test.describe('Markdown preview scroll sync setting', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/markdownviewer-extension:plugin': { syncScrolling: true }
    }
  });

  test('synchronizes new previews', async ({ page, tmpPath }) => {
    await openEditorAndPreview(page, tmpPath);
    await expect(page.locator(SYNC_BUTTON_SELECTOR)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const path = `${tmpPath}/${MARKDOWN_FILE}`;
    await scrollEditorToLine(page, path, lineOf(AFTER_TABLE));
    await expectPreviewBlockAtTop(page, AFTER_TABLE);
  });
});

/**
 * Upload the test files and open the editor with its preview on the right.
 */
async function openEditorAndPreview(
  page: Page,
  tmpPath: string
): Promise<void> {
  await page.contents.uploadContent(
    tallSvg(),
    'text',
    `${tmpPath}/${TALL_IMAGE_FILE}`
  );
  await page.contents.uploadContent(
    markdownSource(),
    'text',
    `${tmpPath}/${MARKDOWN_FILE}`
  );
  await page.evaluate(async path => {
    const app = window.jupyterapp;
    await app.commands.execute('docmanager:open', {
      path,
      factory: 'Editor'
    });
    await app.commands.execute('docmanager:open', {
      path,
      factory: 'Markdown Preview',
      options: {
        mode: 'split-right'
      }
    });
  }, `${tmpPath}/${MARKDOWN_FILE}`);

  await page.locator('.jp-FileEditor .cm-scroller').waitFor();
  await page.locator(PREVIEW_SELECTOR).getByText(AFTER_TABLE).waitFor();
  await waitForImage(page);
}

/**
 * Wait for the image of the preview to be loaded, which gives it its height.
 */
async function waitForImage(page: Page): Promise<void> {
  await page.waitForFunction(selector => {
    const image = document.querySelector<HTMLImageElement>(`${selector} img`);
    return image?.complete && image.naturalHeight > 0;
  }, PREVIEW_SELECTOR);
}

/**
 * Wait for the pending scroll events to be handled.
 */
async function nextFrames(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await page.evaluate(
      () => new Promise(resolve => requestAnimationFrame(resolve))
    );
  }
}

/**
 * The 0-based source line of a paragraph of the test document.
 */
function lineOf(text: string): number {
  return markdownSource().split('\n').indexOf(text);
}

async function fileEditor(
  page: Page,
  path: string
): Promise<JSHandle<IEditor>> {
  return page.evaluateHandle(path => {
    type EditorWidget = {
      context?: { path?: string };
      content?: { editor?: unknown };
    };
    const widgets = Array.from(
      window.jupyterapp.shell.widgets('main')
    ) as EditorWidget[];
    const widget = widgets.find(
      widget => widget.context?.path === path && widget.content?.editor
    );
    if (!widget?.content?.editor) {
      throw new Error(`Could not find an editor for ${path}`);
    }
    return widget.content.editor as IEditor;
  }, path);
}

/**
 * Align the top of the editor viewport with a source line.
 */
async function scrollEditorToLine(
  page: Page,
  path: string,
  line: number
): Promise<void> {
  const editor = await fileEditor(page, path);
  // Reveal the line so that CodeMirror measures it, then remove the small
  // margin it leaves above the line.
  await editor.evaluate((editor, line) => {
    editor.revealPosition({ line, column: 0 }, { block: 'start' });
  }, line);
  await expect.poll(() => editorTopLine(page, path)).toBeCloseTo(line, 0);
  await expect
    .poll(async () => {
      await editor.evaluate(({ editor: view }, line) => {
        const block = view.lineBlockAt(view.state.doc.line(line + 1).from);
        view.scrollDOM.scrollTop +=
          view.documentTop +
          block.top -
          view.scrollDOM.getBoundingClientRect().top;
      }, line);
      await nextFrames(page);
      return editorTopLine(page, path);
    })
    .toBeCloseTo(line, 1);
}

/**
 * The fractional source line aligned with the top of the editor viewport.
 */
async function editorTopLine(page: Page, path: string): Promise<number> {
  const editor = await fileEditor(page, path);
  return editor.evaluate(({ editor: view }) => {
    const height =
      view.scrollDOM.getBoundingClientRect().top - view.documentTop;
    const block = view.lineBlockAtHeight(height);
    return (
      view.state.doc.lineAt(block.from).number -
      1 +
      (height - block.top) / block.height
    );
  });
}

/**
 * Expect a source line at the top of the editor. Both scroll offsets are whole
 * numbers of pixels, and one pixel of a short block is up to about 0.06 lines.
 */
async function expectEditorLineAtTop(
  page: Page,
  path: string,
  line: number
): Promise<void> {
  await expect
    .poll(async () => Math.abs((await editorTopLine(page, path)) - line))
    .toBeLessThan(0.15);
}

/**
 * The offset of the bottom of the last source line from the bottom of the
 * editor viewport.
 */
async function editorLastLineBottomOffset(
  page: Page,
  path: string
): Promise<number> {
  const editor = await fileEditor(page, path);
  return editor.evaluate(({ editor: view }) => {
    const block = view.lineBlockAt(view.state.doc.length);
    const scroller = view.scrollDOM.getBoundingClientRect();
    return (
      view.documentTop +
      block.bottom -
      (scroller.top + view.scrollDOM.clientHeight)
    );
  });
}

async function previewScrollTop(page: Page): Promise<number> {
  return page.evaluate(
    selector => document.querySelector(selector)!.scrollTop,
    PREVIEW_SELECTOR
  );
}

/**
 * Align the top of the preview viewport with a rendered paragraph.
 */
async function scrollPreviewToBlock(page: Page, text: string): Promise<void> {
  const offset = await previewBlockOffset(page, text);
  await page.evaluate(
    ({ selector, offset }) => {
      document.querySelector(selector)!.scrollTop += offset;
    },
    { selector: PREVIEW_SELECTOR, offset }
  );
}

/**
 * Expect a rendered paragraph at the top of the preview. The editor offset is
 * a whole number of pixels, so its top line can be off by a few hundredths of
 * a line, which the tall image block amplifies to a few pixels.
 */
async function expectPreviewBlockAtTop(
  page: Page,
  text: string
): Promise<void> {
  await expect
    .poll(async () => Math.abs(await previewBlockOffset(page, text)))
    .toBeLessThan(10);
}

/**
 * The offset of a rendered paragraph from the top of the preview viewport.
 */
async function previewBlockOffset(page: Page, text: string): Promise<number> {
  return page.evaluate(
    ({ selector, text }) => {
      const preview = document.querySelector(selector)!;
      const block = Array.from(preview.querySelectorAll('p')).find(element =>
        element.textContent?.includes(text)
      )!;
      return (
        block.getBoundingClientRect().top - preview.getBoundingClientRect().top
      );
    },
    { selector: PREVIEW_SELECTOR, text }
  );
}

function markdownSource(): string {
  const beforeImage = Array.from(
    { length: 40 },
    (_, index) => `Before image paragraph ${index + 1}.`
  ).join('\n\n');
  const filler = Array.from(
    { length: 80 },
    (_, index) => `Filler paragraph ${index + 1}.`
  ).join('\n\n');

  return [
    '---',
    'title: Scroll sync',
    '---',
    '# Start',
    '',
    'Intro paragraph.',
    '',
    beforeImage,
    '',
    `![Tall scroll-sync image](${TALL_IMAGE_FILE})`,
    '',
    AFTER_IMAGE,
    '',
    '| Column | Value |',
    '| ------ | ----- |',
    '| A | 1 |',
    '| B | 2 |',
    '',
    AFTER_TABLE,
    '',
    filler,
    '',
    '# End'
  ].join('\n');
}

function tallSvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1200" viewBox="0 0 640 1200">',
    '<rect width="640" height="1200" fill="#f2f5f8"/>',
    '<rect x="40" y="40" width="560" height="1120" fill="#dbe7f3" stroke="#52789e" stroke-width="8"/>',
    '<text x="320" y="600" text-anchor="middle" font-family="sans-serif" font-size="42" fill="#25435f">Tall image</text>',
    '</svg>'
  ].join('');
}
