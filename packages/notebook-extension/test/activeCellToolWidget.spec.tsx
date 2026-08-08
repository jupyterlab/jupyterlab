/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { FieldProps } from '@rjsf/utils';
import type {
  IEditorLanguage,
  IEditorLanguageRegistry
} from '@jupyterlab/codemirror';
import type { Cell, ICellModel } from '@jupyterlab/cells';
import { CodeCellModel, RawCellModel } from '@jupyterlab/cells';
import type { INotebookTracker } from '@jupyterlab/notebook';
import { Widget } from '@lumino/widgets';

import { ActiveCellTool } from '../src/tool-widgets/activeCellToolWidget';

const DEBOUNCER_DELAY = 150;

interface IActiveCellToolPrivate {
  _cellModel: ICellModel | null;
  refresh(): Promise<void>;
}

async function flushDebouncer(): Promise<void> {
  await Promise.resolve();
  jest.advanceTimersByTime(DEBOUNCER_DELAY + 1);
  await Promise.resolve();
}

describe('ActiveCellTool', () => {
  let activeCell: Cell | null;
  let tool: ActiveCellTool;

  const languages = {
    findByMIME: (_mime: string | readonly string[]) => null,
    highlight: async (
      code: string,
      _language: IEditorLanguage | null,
      el: HTMLElement
    ): Promise<void> => {
      el.textContent = code;
    }
  } as Partial<IEditorLanguageRegistry> as IEditorLanguageRegistry;

  const tracker = {
    get activeCell(): Cell | null {
      return activeCell;
    }
  } as Partial<INotebookTracker> as INotebookTracker;

  function renderTool(): void {
    tool.render({} as FieldProps);
  }

  function promptNode(): HTMLElement {
    const prompt = tool.node.querySelector<HTMLElement>('.jp-InputPrompt');
    if (!prompt) {
      throw new Error('Expected the active cell prompt to be rendered.');
    }
    return prompt;
  }

  function previewNode(): HTMLElement {
    const preview = tool.node.querySelector<HTMLElement>(
      '.jp-ActiveCellTool-CellContent pre'
    );
    if (!preview) {
      throw new Error('Expected the active cell preview to be rendered.');
    }
    return preview;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    activeCell = null;
    tool = new ActiveCellTool({ tracker, languages });
    Widget.attach(tool, document.body);
  });

  afterEach(() => {
    tool.dispose();
    jest.useRealTimers();
  });

  it('updates the input prompt before the debounced source preview', async () => {
    const rawModel = new RawCellModel();
    rawModel.sharedModel.setSource('Raw cell');
    const codeModel = new CodeCellModel();
    codeModel.sharedModel.setSource('print("test")');

    activeCell = { model: rawModel } as unknown as Cell;
    renderTool();
    await flushDebouncer();
    expect(promptNode().classList.contains('lm-mod-hidden')).toBe(true);

    activeCell = { model: codeModel } as unknown as Cell;
    renderTool();

    const prompt = promptNode();
    expect(prompt.classList.contains('lm-mod-hidden')).toBe(false);
    expect(prompt.textContent?.trim()).toBe('[ ]:');
  });

  it('preserves the display while the current cell model is temporarily unavailable', async () => {
    const codeModel = new CodeCellModel();
    codeModel.sharedModel.setSource('print("test")');

    activeCell = { model: codeModel } as unknown as Cell;
    renderTool();
    await flushDebouncer();

    const prompt = promptNode();
    const preview = previewNode();
    expect(prompt.classList.contains('lm-mod-hidden')).toBe(false);
    expect(prompt.textContent?.trim()).toBe('[ ]:');
    expect(preview.textContent).toBe('print("test")');

    const toolPrivate = tool as unknown as IActiveCellToolPrivate;
    toolPrivate._cellModel = null;
    await toolPrivate.refresh();

    expect(prompt.classList.contains('lm-mod-hidden')).toBe(false);
    expect(prompt.textContent?.trim()).toBe('[ ]:');
    expect(preview.textContent).toBe('print("test")');

    toolPrivate._cellModel = codeModel;
    const pendingRefresh = toolPrivate.refresh();
    toolPrivate._cellModel = null;
    await flushDebouncer();
    await pendingRefresh;

    expect(prompt.classList.contains('lm-mod-hidden')).toBe(false);
    expect(prompt.textContent?.trim()).toBe('[ ]:');
    expect(preview.textContent).toBe('print("test")');
  });
});
