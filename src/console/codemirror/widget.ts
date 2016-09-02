// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  createPrompt(rendermime: RenderMime): CodeCellWidget {
    let widget = new CodeCellWidget({
      rendermime,
      renderer: CodeMirrorConsoleRenderer.defaultCodeCellRenderer
    });
    widget.model = new CodeCellModel();
    return widget;
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
      editor.editor.setOption('matchBrackets', false);
      editor.editor.setOption('autoCloseBrackets', false);
      editor.editor.setOption('extraKeys', {
        Enter: function() { /* no-op */ }
      });
    }
  });
}
