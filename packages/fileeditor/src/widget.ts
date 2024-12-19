// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorMimeTypeService,
  IEditorServices
} from '@jupyterlab/codeeditor';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { textEditorIcon } from '@jupyterlab/ui-components';
import { PromiseDelegate } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { StackedLayout, Widget } from '@lumino/widgets';

/**
 * The data attribute added to a widget that can run code.
 */
const CODE_RUNNER = 'jpCodeRunner';

/**
 * The data attribute added to a widget that can undo.
 */
const UNDOER = 'jpUndoer';

/**
 * A widget for editors.
 */
export class FileEditor extends Widget {
  /**
   * Construct a new editor widget.
   */
  constructor(options: FileEditor.IOptions) {
    super();
    this.addClass('jp-FileEditor');

    const context = (this._context = options.context);
    this._mimeTypeService = options.mimeTypeService;

    const editorWidget = (this._editorWidget = new CodeEditorWrapper({
      factory: options.factory,
      model: context.model,
      editorOptions: {
        config: FileEditor.defaultEditorConfig
      }
    }));
    this._editorWidget.addClass('jp-FileEditorCodeWrapper');
    this._editorWidget.node.dataset[CODE_RUNNER] = 'true';
    this._editorWidget.node.dataset[UNDOER] = 'true';

    this.editor = editorWidget.editor;
    this.model = editorWidget.model;

    void context.ready.then(() => {
      this._onContextReady();
    });

    // Listen for changes to the path.
    this._onPathChanged();
    context.pathChanged.connect(this._onPathChanged, this);

    const layout = (this.layout = new StackedLayout());
    layout.addWidget(editorWidget);
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * A promise that resolves when the file editor is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the widget's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (!this.model) {
      return;
    }
    switch (event.type) {
      case 'mousedown':
        this._ensureFocus();
        break;
      default:
        break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    const node = this.node;
    node.addEventListener('mousedown', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('mousedown', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._ensureFocus();
  }

  /**
   * Ensure that the widget has focus.
   */
  private _ensureFocus(): void {
    if (!this.editor.hasFocus()) {
      this.editor.focus();
    }
  }

  /**
   * Handle actions that should be taken when the context is ready.
   */
  private _onContextReady(): void {
    if (this.isDisposed) {
      return;
    }

    // Prevent the initial loading from disk from being in the editor history.
    this.editor.clearHistory();
    // Resolve the ready promise.
    this._ready.resolve(undefined);
  }

  /**
   * Handle a change to the path.
   */
  private _onPathChanged(): void {
    const editor = this.editor;
    const localPath = this._context.localPath;

    editor.model.mimeType =
      this._mimeTypeService.getMimeTypeByFilePath(localPath);
  }

  model: CodeEditor.IModel;
  editor: CodeEditor.IEditor;
  private _context: DocumentRegistry.Context;
  private _editorWidget: CodeEditorWrapper;
  private _mimeTypeService: IEditorMimeTypeService;
  private _ready = new PromiseDelegate<void>();
}

/**
 * The namespace for editor widget statics.
 */
export namespace FileEditor {
  /**
   * The options used to create an editor widget.
   */
  export interface IOptions {
    /**
     * A code editor factory.
     */
    factory: CodeEditor.Factory;

    /**
     * The mime type service for the editor.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The document context associated with the editor.
     */
    context: DocumentRegistry.CodeContext;
  }

  /**
   * File editor default configuration.
   */
  export const defaultEditorConfig: Record<string, any> = {
    lineNumbers: true,
    scrollPastEnd: true
  };
}

/**
 * A document widget for file editor widgets.
 */
export class FileEditorWidget extends DocumentWidget<FileEditor> {
  /**
   * Set URI fragment identifier for text files
   */
  async setFragment(fragment: string): Promise<void> {
    const parsedFragments = fragment.split('=');

    // TODO: expand to allow more schemes of Fragment Identification Syntax
    // reference: https://datatracker.ietf.org/doc/html/rfc5147#section-3
    if (parsedFragments[0] !== '#line') {
      return;
    }

    const positionOrRange = parsedFragments[1];
    let firstLine: string;
    if (positionOrRange.includes(',')) {
      // Only respect range start for now.
      firstLine = positionOrRange.split(',')[0] || '0';
    } else {
      firstLine = positionOrRange;
    }

    // Reveal the line
    return this.context.ready.then(() => {
      const position = {
        line: parseInt(firstLine, 10),
        column: 0
      };
      this.content.editor.setCursorPosition(position);
      this.content.editor.revealPosition(position);
    });
  }
}

/**
 * A widget factory for editors.
 */
export class FileEditorFactory extends ABCWidgetFactory<
  IDocumentWidget<FileEditor>,
  DocumentRegistry.ICodeModel
> {
  /**
   * Construct a new editor widget factory.
   */
  constructor(options: FileEditorFactory.IOptions) {
    super(options.factoryOptions);
    this._services = options.editorServices;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.CodeContext
  ): IDocumentWidget<FileEditor> {
    const func = this._services.factoryService.newDocumentEditor;
    const factory: CodeEditor.Factory = options => {
      // Use same id as document factory
      return func(options);
    };
    const content = new FileEditor({
      factory,
      context,
      mimeTypeService: this._services.mimeTypeService
    });

    content.title.icon = textEditorIcon;
    const widget = new FileEditorWidget({ content, context });
    return widget;
  }

  private _services: IEditorServices;
}

/**
 * The namespace for `FileEditorFactory` class statics.
 */
export namespace FileEditorFactory {
  /**
   * The options used to create an editor widget factory.
   */
  export interface IOptions {
    /**
     * The editor services used by the factory.
     */
    editorServices: IEditorServices;

    /**
     * The factory options associated with the factory.
     */
    factoryOptions: DocumentRegistry.IWidgetFactoryOptions<
      IDocumentWidget<FileEditor>
    >;
  }

  /**
   * The interface for a file editor widget factory.
   */
  export interface IFactory
    extends DocumentRegistry.IWidgetFactory<
      IDocumentWidget<FileEditor>,
      DocumentRegistry.ICodeModel
    > {
    // no extra options.
  }
}
