// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  RenderMime
} from '../../../rendermime';

import {
  ICodeCellModel, IMarkdownCellModel, IRawCellModel
} from '../../cells/model';

import {
  CodeCellWidget, MarkdownCellWidget, RawCellWidget
} from '../../cells/widget';

import {
  mimetypeForLanguage
  } from '../../common/mimetype';

import {
  Notebook
} from '../../notebook/widget';

import {
  CodeMirrorCodeCellWidgetRenderer
} from '../cells/widget';


/**
 * A code mirror renderer for a notebook.
 */
export
class CodeMirrorNotebookRenderer extends Notebook.Renderer {
  /**
   * Create a code cell editor.
   */
  createCodeCell(model: ICodeCellModel, rendermime: RenderMime): CodeCellWidget {
    const widget = new CodeCellWidget({
      rendermime,
      renderer: CodeMirrorNotebookRenderer.defaultCodeCellRenderer
    });
    widget.model = model;
    return widget;
  }

  /**
   * Create a markdown cell editor.
   */
  createMarkdownCell(model: IMarkdownCellModel, rendermime: RenderMime): MarkdownCellWidget {
    const widget = new MarkdownCellWidget({
      rendermime,
      renderer: CodeMirrorNotebookRenderer.defaultMarkdownCellRenderer
    });
    widget.model = model;
    return widget;
  }

  /**
   * Create a raw cell editor.
   */
  createRawCell(model: IRawCellModel): RawCellWidget {
    const widget = new RawCellWidget({
      renderer: CodeMirrorNotebookRenderer.defaultRawCellRenderer
    });
    widget.model = model;
    return widget;
  }

  /**
   * Get the preferred mimetype given language info.
   */
  getCodeMimetype(info: nbformat.ILanguageInfoMetadata): string {
    return mimetypeForLanguage(info);
  }
}


/**
 * A namespace for `CodeMirrorNotebookRenderer` statics.
 */
export
namespace CodeMirrorNotebookRenderer {
  /**
   * A default code mirror renderer for a code cell editor.
   */
  export
  const defaultCodeCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      editor.setOption('matchBrackets', true);
      editor.setOption('autoCloseBrackets', true);
    }
  });

  /**
   * A default code mirror renderer for a markdown cell editor.
   */
  export
  const defaultMarkdownCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      // Turn on line wrapping for markdown cells.
      editor.setOption('lineWrapping', true);
    }
  });

  /**
   * A default code mirror renderer for a raw cell editor.
   */
  export
  const defaultRawCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      // Turn on line wrapping for markdown cells.
      editor.setOption('lineWrapping', true);
    }
  });

  /**
   * A default code mirror renderer for a notebook.
   */
  export
  const defaultRenderer = new CodeMirrorNotebookRenderer();
}
