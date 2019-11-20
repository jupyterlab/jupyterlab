/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { find } from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

import { TabPanel } from '@phosphor/widgets';

import { Callstack } from '../callstack';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

export class DebuggerEditors extends TabPanel {
  constructor(options: DebuggerEditors.IOptions) {
    super();

    this.tabsMovable = true;
    this.tabBar.insertBehavior = 'select-tab';

    this.model = new DebuggerEditors.IModel();

    this.debuggerModel = options.model;
    this.debuggerService = options.service;
    this.editorFactory = options.editorFactory;

    this.debuggerModel.callstackModel.currentFrameChanged.connect(
      this.onCurrentFrameChanged,
      this
    );

    this.model.editorAdded.connect((sender, data) => {
      this.openEditor(data);
    });

    this.model.editors.forEach(editor => this.openEditor(editor));

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

  private async onCurrentFrameChanged(
    callstackModel: Callstack.Model,
    frame: Callstack.IFrame
  ) {
    if (!frame) {
      return;
    }

    const path = frame.source.path;
    const content = await this.debuggerService.getSource({
      sourceReference: 0,
      path
    });

    this.model.addEditor({
      path,
      code: content,
      mimeType: 'text/x-python'
    });
  }

  private openEditor(data: DebuggerEditors.IEditor) {
    const { path, mimeType, code } = data;

    const tab = find(this.tabBar.titles, title => title.label === path);
    if (tab) {
      this.tabBar.currentTitle = tab;
      return;
    }

    let editor = new CodeEditorWrapper({
      model: new CodeEditor.Model({
        value: code,
        mimeType: mimeType
      }),
      factory: this.editorFactory,
      config: {
        readOnly: true,
        lineNumbers: true
      }
    });

    editor.title.label = path;
    editor.title.caption = path;
    editor.title.closable = true;

    this.tabBar.tabCloseRequested.connect((_, tab) => {
      const widget = tab.title.owner;
      widget.dispose();
      this.model.removeEditor(tab.title.label);
    });

    this.addWidget(editor);
  }

  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private editorFactory: CodeEditor.Factory;
}

/**
 * A namespace for `DebuggerEditors` statics.
 */
export namespace DebuggerEditors {
  /**
   * The options used to create a DebuggerEditors.
   */
  export interface IOptions {
    service: IDebugger;
    model: Debugger.Model;
    editorFactory: CodeEditor.Factory;
  }

  /**
   * An interface for read only editors.
   */
  export interface IEditor {
    path: string;
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
      this._state.set(editor.path, editor);
      this._editorAdded.emit(editor);
    }

    /**
     * Remove an editor from the TabPanel.
     * @param path The path for the editor.
     */
    removeEditor(path: string) {
      this._state.delete(path);
    }

    private _state = new Map<string, DebuggerEditors.IEditor>();
    private _editorAdded = new Signal<this, DebuggerEditors.IEditor>(this);
  }
}
