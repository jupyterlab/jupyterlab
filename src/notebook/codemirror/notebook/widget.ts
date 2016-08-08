// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  RenderMime
} from '../../../rendermime';

import {
  ICellModel, ICodeCellModel, IMarkdownCellModel, IRawCellModel
} from '../../cells/model';

import {
  CodeCellWidget, MarkdownCellWidget, RawCellWidget
} from '../../cells/widget';

import {
  Notebook
} from '../../notebook/widget';

import {
  CodeMirrorCodeCellWidgetRenderer, defaultCodeMirrorCodeCellWidgetRenderer
} from '../cells/widget';

export const defaultCodeMirrorCodeCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
  editorInitializer: (editor) => {
    editor.editor.setOption('matchBrackets', true);
    editor.editor.setOption('autoCloseBrackets', true);
  }
});

export const defaultCodeMirrorMarkdownCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
  editorInitializer: (editor) => {
    // Turn on line wrapping for markdown cells.
    editor.editor.setOption('lineWrapping', true);
  }
});

export const defaultCodeMirrorRawCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
  editorInitializer: (editor) => {
    // Turn on line wrapping for markdown cells.
    editor.editor.setOption('lineWrapping', true);
  }
});

export class CodeMirrorNotebookRenderer extends Notebook.Renderer {

  createCodeCell(model: ICodeCellModel, rendermime: RenderMime): CodeCellWidget {
    const widget = new CodeCellWidget({
      rendermime,
      renderer: defaultCodeMirrorCodeCellRenderer
    });
    widget.model = model;
    return widget;
  }

  createMarkdownCell(model: IMarkdownCellModel, rendermime: RenderMime): MarkdownCellWidget {
    const widget = new MarkdownCellWidget({
      rendermime,
      renderer: defaultCodeMirrorMarkdownCellRenderer
    });
    widget.model = model;
    return widget;
  }

  createRawCell(model: IRawCellModel): RawCellWidget {
    const widget = new RawCellWidget({
      renderer: defaultCodeMirrorRawCellRenderer
    });
    widget.model = model;
    return widget;
  }

}

export const defaultCodeMirrorNotebookRenderer = new CodeMirrorNotebookRenderer();