// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  CodeCellModel, RawCellModel
} from '../../notebook/cells/model';

import {
  CodeCellWidget, RawCellWidget
} from '../../notebook/cells/widget';

import {
  CodeMirrorCodeCellWidgetRenderer
} from '../../notebook/codemirror/cells/widget';

import {
  CodeMirrorNotebookRenderer
} from '../../notebook/codemirror/notebook/widget';

import {
  mimetypeForLanguage
} from '../../notebook/common/mimetype';

import {
  RenderMime
} from '../../rendermime';

import {
  ConsoleContent
} from '../content';


/**
 * A code mirror renderer for a console.
 */
export
class CodeMirrorConsoleRenderer implements ConsoleContent.IRenderer {
  /**
   * Create a new banner widget.
   */
  createBanner(): RawCellWidget {
    let widget = new RawCellWidget({
      renderer: CodeMirrorNotebookRenderer.defaultRawCellRenderer
    });
    widget.model = new RawCellModel();
    return widget;
  }

  /**
   * Create a new prompt widget.
   */
  createPrompt(rendermime: RenderMime, context: ConsoleContent): CodeCellWidget {
    let widget = new CodeCellWidget({
      rendermime,
      renderer: CodeMirrorConsoleRenderer.defaultCodeCellRenderer
    });
    widget.model = new CodeCellModel();
    return widget;
  }

  /**
   * Create a new code cell widget for an input from a foreign session.
   */
  createForeignCell(rendermime: RenderMime, context: ConsoleContent): CodeCellWidget {
    let widget = new CodeCellWidget({
      rendermime,
      renderer: CodeMirrorConsoleRenderer.defaultCodeCellRenderer
    });
    widget.model = new CodeCellModel();
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
 * A namespace for `CodeMirrorConsoleRenderer` statics.
 */
export
namespace CodeMirrorConsoleRenderer {
  /**
   * A default code mirror renderer for a console.
   */
  export
  const defaultRenderer = new CodeMirrorConsoleRenderer();


  /**
   * A default code mirror renderer for a code cell editor.
   */
  export
  const defaultCodeCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    editorInitializer: (editor) => {
      editor.setOption('matchBrackets', false);
      editor.setOption('autoCloseBrackets', false);
      editor.setOption('extraKeys', {
        Enter: function() { /* no-op */ }
      });
    }
  });
}
