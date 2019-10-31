/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

import { TabPanel } from '@phosphor/widgets';

export class DebuggerEditors extends TabPanel {
  constructor(options: DebuggerEditors.IOptions) {
    super();

    this.tabsMovable = true;

    this.model = new DebuggerEditors.IModel();
    this.model.editorAdded.connect((sender, data) => {
      let editor = new CodeEditorWrapper({
        model: new CodeEditor.Model({
          value: data.code,
          mimeType: data.mimeType
        }),
        factory: options.editorFactory,
        config: {
          readOnly: true,
          lineNumbers: true
        }
      });

      editor.title.label = data.title;
      editor.title.closable = true;

      this.addWidget(editor);
    });

    MOCK_EDITORS.forEach(editor => this.model.addEditor(editor));

    this.addClass('jp-DebuggerEditors');
  }

  /**
   * The debugger editors model.
   */
  model: DebuggerEditors.IModel;

  /**
   * Dispose the debug editors.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    Signal.clearData(this);
  }
}

/**
 * A namespace for `DebuggerEditors` statics.
 */
export namespace DebuggerEditors {
  /**
   * The options used to create a DebuggerEditors.
   */
  export interface IOptions {
    editorFactory: CodeEditor.Factory;
  }

  /**
   * An interface for read only editors.
   */
  export interface IEditor {
    title: string;
    code: string;
    mimeType: string;
  }

  export interface IModel {}

  export class IModel implements IModel {
    /**
     * A signal emitted when a new editor is added.
     */
    get editorAdded(): ISignal<
      DebuggerEditors.IModel,
      DebuggerEditors.IEditor
    > {
      return this._editorAdded;
    }

    /**
     * Get all the editors currently opened.
     */
    get editors() {
      return this._state;
    }

    /**
     * Add a new editor to the editor TabPanel.
     * @param editor The read-only editor info to add.
     */
    addEditor(editor: DebuggerEditors.IEditor) {
      this._state.push(editor);
      this._editorAdded.emit(editor);
    }

    private _state: DebuggerEditors.IEditor[] = [];
    private _editorAdded = new Signal<this, DebuggerEditors.IEditor>(this);
  }
}

const MOCK_EDITORS = [
  {
    title: 'untitled.py',
    mimeType: 'text/x-ipython',
    code: 'import math\nprint(math.pi)'
  },
  {
    title: 'test.py',
    mimeType: 'text/x-ipython',
    code: 'import sys\nprint(sys.version)'
  }
];
