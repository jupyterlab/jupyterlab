/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorMimeTypeService,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { find } from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

import { TabPanel } from '@phosphor/widgets';

import { Callstack } from '../callstack';

import { Debugger } from '../debugger';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

export class DebuggerEditors extends TabPanel {
  constructor(options: DebuggerEditors.IOptions) {
    super();
    this.tabsMovable = true;
    this.tabBar.insertBehavior = 'select-tab';
    this.tabBar.tabCloseRequested.connect((_, tab) => {
      const widget = tab.title.owner;
      widget.dispose();
    });

    this.model = new DebuggerEditors.IModel();

    this.debuggerModel = options.model;
    this.debuggerService = options.service;
    this.editorFactory = options.editorServices.factoryService.newInlineEditor;
    this.mimeTypeService = options.editorServices.mimeTypeService;

    this.debuggerModel.callstackModel.currentFrameChanged.connect(
      async (_, frame) => {
        if (!frame) {
          return;
        }
        await this.fetchSource(frame);
        this.showCurrentLine(frame);
      }
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

  private showCurrentLine(frame: Callstack.IFrame) {
    const path = frame.source.path;
    const tab = find(this.tabBar.titles, title => title.label === path);
    if (!tab) {
      return;
    }
    this.tabBar.currentTitle = tab;
    const index = this.tabBar.currentIndex;
    const widget = this.widgets[index];
    const editor = (widget as CodeEditorWrapper).editor;
    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(editor, frame);
    });
  }

  private async fetchSource(frame: Callstack.IFrame) {
    const path = frame.source.path;
    const source = await this.debuggerService.getSource({
      sourceReference: 0,
      path
    });

    if (!source.success) {
      return;
    }

    const { content, mimeType } = source.body;
    this.model.addEditor({
      path,
      code: content,
      mimeType: mimeType || this.mimeTypeService.getMimeTypeByFilePath(path)
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

    const editorHandler = new EditorHandler({
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      editor: editor.editor
    });

    editor.disposed.connect(() => {
      editorHandler.dispose();
      this.model.removeEditor(editor.title.label);
    });

    this.addWidget(editor);
  }

  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private editorFactory: CodeEditor.Factory;
  private mimeTypeService: IEditorMimeTypeService;
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
    editorServices: IEditorServices;
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
