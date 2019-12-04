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
    this.mimeTypeService = options.editorServices.mimeTypeService;

    const header = new SourcesHeader('Source');
    header.toolbar.addItem(
      'open',
      new ToolbarButton({
        iconClassName: 'jp-LauncherIcon',
        onClick: () => this.model.open(),
        tooltip: 'Open in the Main Area'
      })
    );

    const factory = new ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });
    this.editor = factory.createNewEditor({
      code: '',
      mimeType: '',
      path: ''
    });
    this.editor.hide();

    this.model.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this.model.currentSource = null;
        this.editor.hide();
        return;
      }

      this.editor.show();
      void this.showSource(frame);
    });

    this.addWidget(header);
    this.addWidget(this.editor);
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
    const editorMimeType =
      mimeType || this.mimeTypeService.getMimeTypeByFilePath(path);

    this.editor.model.value.text = content;
    this.editor.model.mimeType = editorMimeType;

    this.editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
      editor: this.editor.editor
    });

    this.model.currentSource = {
      path,
      code: content,
      mimeType: editorMimeType
    };

    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(this.editor.editor, frame.line);
    });
  }

  private debuggerService: IDebugger;
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
 * A namespace for `Sources` statics.
 */
export namespace Sources {
  /**
   * The options used to create a Sources.
   */
  export interface IOptions {
    service: IDebugger;
    model: Sources.Model;
    editorServices: IEditorServices;
  }

  /**
   * An interface for a read only source.
   */
  export interface ISource {
    path: string;
    code: string;
    mimeType: string;
  }

  export class Model {
    constructor(options: Sources.Model.IOptions) {
      this.currentFrameChanged = options.currentFrameChanged;
    }

    currentFrameChanged: ISignal<Callstack.Model, Callstack.IFrame>;

    get currentSourceOpened(): ISignal<Sources.Model, Sources.ISource> {
      return this._currentSourceOpened;
    }

    get currentSource() {
      return this._currentSource;
    }

    set currentSource(source: ISource | null) {
      this._currentSource = source;
    }

    open() {
      this._currentSourceOpened.emit(this._currentSource);
    }

    private _currentSource: ISource | null;
    private _currentSourceOpened = new Signal<Sources.Model, Sources.ISource>(
      this
    );
  }

  export namespace Model {
    export interface IOptions {
      currentFrameChanged: ISignal<Callstack.Model, Callstack.IFrame>;
    }
  }
}

/**
 * A widget factory for read only editors.
 */
export class ReadOnlyEditorFactory {
  /**
   * Construct a new editor widget factory.
   */
  constructor(options: ReadOnlyEditorFactory.IOptions) {
    this._services = options.editorServices;
  }

  /**
   * Create a new CodeEditorWrapper given a Source.
   */
  createNewEditor(source: Sources.ISource): CodeEditorWrapper {
    const factory = this._services.factoryService.newInlineEditor;
    const editor = new CodeEditorWrapper({
      model: new CodeEditor.Model({
        value: source.code,
        mimeType: source.mimeType
      }),
      factory,
      config: {
        readOnly: true,
        lineNumbers: true
      }
    });
    editor.node.setAttribute('data-jp-debugger', 'true');
    return editor;
  }

  private _services: IEditorServices;
}

/**
 * The namespace for `ReadOnlyEditorFactory` class statics.
 */
export namespace ReadOnlyEditorFactory {
  /**
   * The options used to create a read only editor widget factory.
   */
  export interface IOptions {
    /**
     * The editor services used by the factory.
     */
    editorServices: IEditorServices;
  }
}
