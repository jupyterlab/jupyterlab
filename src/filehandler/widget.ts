// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  Message
} from 'phosphor-messaging';


/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';


/**
 * A Jupyter-specific code mirror widget.
 */
export
class JupyterCodeMirrorWidget extends CodeMirrorWidget {
  /**
   * Construct a new jupyter code mirror widget.
   */
  constructor() {
    super();
    this.addClass(EDITOR_CLASS);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.editor.focus();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.editor.focus();
  }
}
