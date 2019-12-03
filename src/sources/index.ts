/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorMimeTypeService,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

import { Panel, PanelLayout, Widget } from '@phosphor/widgets';

import { Callstack } from '../callstack';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

export class Sources extends Panel {
  constructor(options: Sources.IOptions) {
    super();
    this.model = options.model;
    this.debuggerService = options.service;
    this.editorFactory = options.editorServices.factoryService.newInlineEditor;
    this.mimeTypeService = options.editorServices.mimeTypeService;

    this.node.setAttribute('data-jp-debugger', 'true');

    const header = new SourcesHeader('Source');
    header.toolbar.addItem(
      'open',
      new ToolbarButton({
        iconClassName: 'jp-LauncherIcon',
        onClick: () => {
          console.log('open file in the main area');
        },
        tooltip: 'Open File'
      })
    );

    this.editor = new CodeEditorWrapper({
      model: new CodeEditor.Model({
        value: '',
        mimeType: ''
      }),
      factory: this.editorFactory,
      config: {
        readOnly: true,
        lineNumbers: true
      }
    });

    this.model.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this.editor.hide();
        return;
      }

      this.editor.show();
      void this.showSource(frame);
    });

    this.addWidget(header);
    this.addWidget(this.editor);
    this.addClass('jp-DebuggerEditors');
  }

  /**
   * The debugger sources model.
   */
  readonly model: Sources.Model;

  /**
   * Dispose the debug sources.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.editorHandler.dispose();
    Signal.clearData(this);
  }

  private async showSource(frame: Callstack.IFrame) {
    const path = frame.source.path;
    const source = await this.debuggerService.getSource({
      sourceReference: 0,
      path
    });

    if (!source.success) {
      return;
    }

    if (this.editorHandler) {
      this.editorHandler.dispose();
    }

    const { content, mimeType } = source.body;
    this.editor.model.value.text = content;
    this.editor.model.mimeType =
      mimeType || this.mimeTypeService.getMimeTypeByFilePath(path);

    this.editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
      editor: this.editor.editor
    });

    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(this.editor.editor, frame.line);
    });
  }

  private debuggerService: IDebugger;
  private editorFactory: CodeEditor.Factory;
  private mimeTypeService: IEditorMimeTypeService;
  private editor: CodeEditorWrapper;
  private editorHandler: EditorHandler;
}

class SourcesHeader extends Widget {
  constructor(title: string) {
    super({ node: document.createElement('header') });

    const layout = new PanelLayout();
    const span = new Widget({ node: document.createElement('span') });

    this.layout = layout;
    span.node.textContent = title;
    layout.addWidget(span);
    layout.addWidget(this.toolbar);
  }

  readonly toolbar = new Toolbar();
}

/**
 * A namespace for `DebuggerEditors` statics.
 */
export namespace Sources {
  /**
   * The options used to create a DebuggerEditors.
   */
  export interface IOptions {
    service: IDebugger;
    model: Sources.Model;
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

  export class Model {
    constructor(options: Sources.Model.IOptions) {
      this.currentFrameChanged = options.currentFrameChanged;
    }

    currentFrameChanged: ISignal<Callstack.Model, Callstack.IFrame>;
  }

  export namespace Model {
    export interface IOptions {
      currentFrameChanged: ISignal<Callstack.Model, Callstack.IFrame>;
    }
  }
}
