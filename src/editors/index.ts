/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { CodeEditorWrapper, CodeEditor } from '@jupyterlab/codeeditor';

import { TabPanel } from '@phosphor/widgets';

export class CodeEditors extends TabPanel {
  constructor(options: CodeEditors.IOptions) {
    super();

    this.tabsMovable = true;

    this.model = new CodeEditors.IModel(MOCK_EDITORS);
    this.model.editors.forEach(data => {
      let editor = new CodeEditorWrapper({
        model: new CodeEditor.Model(),
        factory: options.editorFactory,
        config: { lineNumbers: true }
      });
      editor.editor.model.value.text = data.code;
      editor.editor.model.mimeType = data.mimeType;
      editor.title.label = data.title;
      editor.editor.setOption('readOnly', true);
      editor.title.closable = true;

      this.addWidget(editor);
    });

    this.addClass('jp-DebuggerEditors');
  }

  readonly model: CodeEditors.IModel;
}

export namespace CodeEditors {
  export interface IOptions {
    editorFactory?: CodeEditor.Factory;
  }

  export interface IEditor {
    title: string;
    code: string;
    mimeType: string;
  }

  export interface IModel {}

  export class IModel implements IModel {
    constructor(model: CodeEditors.IEditor[]) {
      this._state = model;
    }

    addFile(title: string, mimeType: string, code: string) {
      this._state.push({ title, mimeType, code });
    }

    get editors() {
      return this._state;
    }

    private _state: CodeEditors.IEditor[];
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
