// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  RenderMime
} from '../../rendermime';

import {
  CodeCellModel, RawCellModel
} from '../../notebook/cells/model';

import {
  CodeCellWidget, RawCellWidget
} from '../../notebook/cells/widget';

import {
  defaultCodeMirrorCodeCellRenderer, defaultCodeMirrorRawCellRenderer
} from '../../notebook/codemirror/notebook/widget';

import {
  ConsoleWidget
} from '../widget';

/**
 * A code mirror renderer for a console.
 */
export
class CodeMirrorConsoleRenderer implements ConsoleWidget.IRenderer {

  /**
   * Create a new banner widget.
   */
  createBanner(): RawCellWidget {
    let widget = new RawCellWidget({
      renderer: defaultCodeMirrorRawCellRenderer
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
      renderer: defaultCodeMirrorCodeCellRenderer
    });
    widget.model = new CodeCellModel();
    return widget;
  }

}

/**
 * A default code mirror renderer for a console.
 */
export
const defaultCodeMirrorConsoleRenderer = new CodeMirrorConsoleRenderer();