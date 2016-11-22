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
  MonacoCodeCellWidgetRenderer
} from '../cells/widget';


/**
 * A Monaco renderer for a notebook.
 */
export
class MonacoNotebookRenderer extends Notebook.Renderer {
  /**
   * Create a code cell editor.
   */
  createCodeCell(model: ICodeCellModel, rendermime: RenderMime): CodeCellWidget {
    const widget = new CodeCellWidget({
      rendermime,
      renderer: MonacoNotebookRenderer.defaultCodeCellRenderer
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
      renderer: MonacoNotebookRenderer.defaultMarkdownCellRenderer
    });
    widget.model = model;
    return widget;
  }

  /**
   * Create a raw cell editor.
   */
  createRawCell(model: IRawCellModel): RawCellWidget {
    const widget = new RawCellWidget({
      renderer: MonacoNotebookRenderer.defaultRawCellRenderer
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
 * A namespace for `MonacoNotebookRenderer` statics.
 */
export
namespace MonacoNotebookRenderer {
  /**
   * A default Monaco renderer for a code cell editor.
   */
  export
  const defaultCodeCellRenderer = new MonacoCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      // editor.setOption('matchBrackets', true);
      // editor.setOption('autoCloseBrackets', true);
    }
  });

  /**
   * A default Monaco renderer for a markdown cell editor.
   */
  export
  const defaultMarkdownCellRenderer = new MonacoCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      // // Turn on line wrapping for markdown cells.
      // editor.setOption('lineWrapping', true);
    }
  });

  /**
   * A default Monaco renderer for a raw cell editor.
   */
  export
  const defaultRawCellRenderer = new MonacoCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      // // Turn on line wrapping for markdown cells.
      // editor.setOption('lineWrapping', true);
    }
  });

  /**
   * A default Monaco renderer for a notebook.
   */
  export
  const defaultRenderer = new MonacoNotebookRenderer();
}
