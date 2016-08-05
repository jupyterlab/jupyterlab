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

import * as cells
from '../cells/widget';

export const defaultCodeCellRenderer = new cells.CodeMirrorRenderer({
  editorInitializer: (editor) => {
    editor.editor.setOption('matchBrackets', true);
    editor.editor.setOption('autoCloseBrackets', true);
  }
});

export const defaultMarkdownCellRenderer = new cells.CodeMirrorRenderer({
  editorInitializer: (editor) => {
    // Turn on line wrapping for markdown cells.
    editor.editor.setOption('lineWrapping', true);
  }
});

export const defaultRawCellRenderer = new cells.CodeMirrorRenderer({
  editorInitializer: (editor) => {
    // Turn on line wrapping for markdown cells.
    editor.editor.setOption('lineWrapping', true);
  }
});

export class CodeMirrorRenderer extends Notebook.Renderer {

  createCodeCell(model: ICodeCellModel, rendermime: RenderMime): CodeCellWidget {
    const widget = new CodeCellWidget({
      rendermime,
      renderer: defaultCodeCellRenderer
    });
    widget.model = model;
    return widget;
  }

  createMarkdownCell(model: IMarkdownCellModel, rendermime: RenderMime): MarkdownCellWidget {
    const widget = new MarkdownCellWidget({
      rendermime,
      renderer: defaultMarkdownCellRenderer
    });
    widget.model = model;
    return widget;
  }

  createRawCell(model: IRawCellModel): RawCellWidget {
    const widget = new RawCellWidget({
      renderer: defaultRawCellRenderer
    });
    widget.model = model;
    return widget;
  }

}

export const defaultCodeMirrorRenderer = new CodeMirrorRenderer();