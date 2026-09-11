// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
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
        line(n: number): { from: number };
        lineAt(pos: number): { number: number };
      };
    };
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
    await openEditorAndPreview(page, `${tmpPath}/${MARKDOWN_FILE}`);

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
    await expect
      .poll(() => editorTopLine(page, path))
      .toBeCloseTo(lineOf(AFTER_TABLE), 1);

    await scrollPreviewToBlock(page, AFTER_IMAGE);
    await expect
      .poll(() => editorTopLine(page, path))
      .toBeCloseTo(lineOf(AFTER_IMAGE), 1);
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
});

async function openEditorAndPreview(page: Page, path: string): Promise<void> {
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
  }, path);

  await page.locator('.jp-FileEditor .cm-scroller').waitFor();
  await page.locator(PREVIEW_SELECTOR).getByText(AFTER_TABLE).waitFor();
  // The image only gets its height once loaded.
  await page.waitForFunction(selector => {
    const image = document.querySelector<HTMLImageElement>(`${selector} img`);
    return image?.complete && image.naturalHeight > 0;
  }, PREVIEW_SELECTOR);
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
  // Reveal the line first so that CodeMirror measures it, then remove the
  // small margin it leaves above the line, until CodeMirror stops adjusting
  // the scroll position.
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
      await page.evaluate(
        () => new Promise(resolve => requestAnimationFrame(resolve))
      );
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
 * Expect a rendered paragraph to be aligned with the top of the preview.
 *
 * The editor scroll offset is a whole number of pixels, so the source line at
 * its top is off by up to a few hundredths of a line, which the tall image
 * block amplifies to a few pixels.
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
