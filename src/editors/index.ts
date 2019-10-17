/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { CodeEditorWrapper, CodeEditor } from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

import { TabPanel } from '@phosphor/widgets';

export class CodeEditors extends TabPanel {
  constructor(options: CodeEditors.IOptions) {
    super();

    this.tabsMovable = true;

    this.model = new CodeEditors.IModel();
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

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    Signal.clearData(this);
  }

  readonly model: CodeEditors.IModel;
}

export namespace CodeEditors {
  export interface IOptions {
    editorFactory: CodeEditor.Factory;
  }

  export interface IEditor {
    title: string;
    code: string;
    mimeType: string;
  }

  export interface IModel {}

  export class IModel implements IModel {
    get editorAdded(): ISignal<CodeEditors.IModel, CodeEditors.IEditor> {
      return this._editorAdded;
    }

    get editors() {
      return this._state;
    }

    addEditor(editor: CodeEditors.IEditor) {
      this._state.push(editor);
      this._editorAdded.emit(editor);
    }

    private _state: CodeEditors.IEditor[] = [];
    private _editorAdded = new Signal<this, CodeEditors.IEditor>(this);
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
