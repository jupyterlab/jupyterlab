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

/**
 * A Panel that shows a preview of the source code while debugging.
 */
export class Sources extends Panel {
  /**
   * Instantiate a new Sources preview Panel.
   * @param options The Sources instantiation options.
   */
  constructor(options: Sources.IOptions) {
    super();
    this.model = options.model;
    this._debuggerService = options.service;
    this._mimeTypeService = options.editorServices.mimeTypeService;

    const header = new SourcesHeader(this.model);
    header.toolbar.addItem(
      'open',
      new ToolbarButton({
        iconClassName: 'jp-ViewBreakpointIcon',
        onClick: () => this.model.open(),
        tooltip: 'Open in the Main Area'
      })
    );

    const factory = new ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });

    this._editor = factory.createNewEditor({
      content: '',
      mimeType: '',
      path: ''
    });
    this._editor.hide();

    this.model.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this._clearEditor();
        return;
      }

      void this._showSource(frame);
    });

    this.addWidget(header);
    this.addWidget(this._editor);
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
    this._editorHandler.dispose();
    Signal.clearData(this);
  }

  /**
   * Clear the content of the source read-only editor.
   */
  private _clearEditor() {
    this.model.currentSource = null;
    this._editor.hide();
  }

  /**
   * Show the content of the source for the given frame.
   * @param frame The current frame.
   */
  private async _showSource(frame: Callstack.IFrame) {
    const path = frame.source.path;
    const source = await this._debuggerService.getSource({
      sourceReference: 0,
      path
    });

    if (!source?.content) {
      this._clearEditor();
      return;
    }

    if (this._editorHandler) {
      this._editorHandler.dispose();
    }

    const { content, mimeType } = source;
    const editorMimeType =
      mimeType || this._mimeTypeService.getMimeTypeByFilePath(path);

    this._editor.model.value.text = content;
    this._editor.model.mimeType = editorMimeType;

    this._editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editor: this._editor.editor,
      path
    });

    this.model.currentSource = {
      content,
      mimeType: editorMimeType,
      path
    };

    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(this._editor.editor, frame.line);
    });

    this._editor.show();
  }

  private _debuggerService: IDebugger;
  private _mimeTypeService: IEditorMimeTypeService;
  private _editor: CodeEditorWrapper;
  private _editorHandler: EditorHandler;
}

/**
 * The header for a Source Panel.
 */
class SourcesHeader extends Widget {
  /**
   * Instantiate a new SourcesHeader.
   * @param model The model for the Sources.
   */
  constructor(model: Sources.Model) {
    super({ node: document.createElement('header') });
    this.addClass('jp-DebuggerSources');

    const layout = new PanelLayout();
    this.layout = layout;

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = 'Source';

    const sourcePath = new Widget({ node: document.createElement('span') });
    model.currentSourceChanged.connect((_, source) => {
      const path = source?.path ?? '';
      sourcePath.node.textContent = path;
      sourcePath.node.title = path;
    });

    layout.addWidget(title);
    layout.addWidget(this.toolbar);
    layout.addWidget(sourcePath);
  }

  /**
   * The toolbar for the sources header.
   */
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
    /**
     * The debugger service.
     */
    service: IDebugger;

    /**
     * The model for the sources.
     */
    model: Sources.Model;

    /**
     * The editor services used to create new read-only editors.
     */
    editorServices: IEditorServices;
  }

  /**
   * The model to keep track of the current source being displayed.
   */
  export class Model {
    /**
     * Instantiate a new Sources.Model
     * @param options The Sources.Model instantiation options.
     */
    constructor(options: Sources.Model.IOptions) {
      this.currentFrameChanged = options.currentFrameChanged;
    }

    /**
     * Signal emitted when the current frame changes.
     */
    currentFrameChanged: ISignal<Callstack.Model, Callstack.IFrame>;

    /**
     * Signal emitted when a source should be open in the main area.
     */
    get currentSourceOpened(): ISignal<Sources.Model, IDebugger.ISource> {
      return this._currentSourceOpened;
    }

    /**
     * Signal emitted when the current source changes.
     */
    get currentSourceChanged(): ISignal<Sources.Model, IDebugger.ISource> {
      return this._currentSourceChanged;
    }

    /**
     * Return the current source.
     */
    get currentSource() {
      return this._currentSource;
    }

    /**
     * Set the current source.
     * @param source The source to set as the current source.
     */
    set currentSource(source: IDebugger.ISource | null) {
      this._currentSource = source;
      this._currentSourceChanged.emit(source);
    }

    /**
     * Open a source in the main area.
     */
    open() {
      this._currentSourceOpened.emit(this._currentSource);
    }

    private _currentSource: IDebugger.ISource | null;
    private _currentSourceOpened = new Signal<Sources.Model, IDebugger.ISource>(
      this
    );
    private _currentSourceChanged = new Signal<
      Sources.Model,
      IDebugger.ISource
    >(this);
  }

  /**
   * A namespace for the Model `statics`.
   */
  export namespace Model {
    /**
     * The options used to initialize a Sources.Model object.
     */
    export interface IOptions {
      /**
       * Signal emitted when the current frame changes.
       */
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
   * @param options The instantiation options for a ReadOnlyEditorFactory.
   */
  constructor(options: ReadOnlyEditorFactory.IOptions) {
    this._services = options.editorServices;
  }

  /**
   * Create a new CodeEditorWrapper given a Source.
   * @param source The source to create a new editor for.
   */
  createNewEditor(source: IDebugger.ISource): CodeEditorWrapper {
    const { content, mimeType, path } = source;
    const factory = this._services.factoryService.newInlineEditor;
    const mimeTypeService = this._services.mimeTypeService;
    const editor = new CodeEditorWrapper({
      model: new CodeEditor.Model({
        value: content,
        mimeType: mimeType || mimeTypeService.getMimeTypeByFilePath(path)
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
