// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import {
  Document,
  IAdapterOptions,
  IVirtualPosition,
  VirtualDocument,
  WidgetLSPAdapter
} from '@jupyterlab/lsp';
import { PromiseDelegate } from '@lumino/coreutils';

import { FileEditor } from './widget';

export interface IFileEditorAdapterOptions extends IAdapterOptions {
  /**
   * The document registry instance.
   */
  docRegistry: DocumentRegistry;
}

export class FileEditorAdapter extends WidgetLSPAdapter<
  IDocumentWidget<FileEditor>
> {
  constructor(
    editorWidget: IDocumentWidget<FileEditor>,
    options: IFileEditorAdapterOptions
  ) {
    const { docRegistry, ...others } = options;
    super(editorWidget, others);
    this.editor = editorWidget.content;
    this._docRegistry = docRegistry;

    // Ensure editor uniqueness
    this._virtualEditor = Object.freeze({
      getEditor: () => this.editor.editor,
      ready: () => Promise.resolve(this.editor.editor),
      reveal: () => Promise.resolve(this.editor.editor)
    });

    Promise.all([this.editor.context.ready, this.connectionManager.ready])
      .then(async () => {
        await this.initOnceReady();
        this._readyDelegate.resolve();
        this._editorAdded.emit({
          editor: this._virtualEditor
        });
      })
      .catch(console.error);
  }

  /**
   * The wrapped `FileEditor` widget.
   */
  readonly editor: FileEditor;

  /**
   * Promise that resolves once the adapter is initialized
   */
  get ready(): Promise<void> {
    return this._readyDelegate.promise;
  }

  /**
   * Get current path of the document.
   */
  get documentPath(): string {
    return this.widget.context.path;
  }

  /**
   * Get the mime type of the document.
   */
  get mimeType(): string {
    const mimeTypeFromModel = this.editor.model.mimeType;
    const codeMirrorMimeType: string = Array.isArray(mimeTypeFromModel)
      ? mimeTypeFromModel[0] ?? IEditorMimeTypeService.defaultMimeType
      : mimeTypeFromModel;
    const contentsModel = this.editor.context.contentsModel;

    // when MIME type is not known it defaults to 'text/plain',
    // so if it is different we can accept it as it is
    if (codeMirrorMimeType != IEditorMimeTypeService.defaultMimeType) {
      return codeMirrorMimeType;
    } else if (contentsModel) {
      // a script that does not have a MIME type known by the editor
      // (no syntax highlight mode), can still be known by the document
      // registry (and this is arguably easier to extend).
      let fileType = this._docRegistry.getFileTypeForModel(contentsModel);
      return fileType.mimeTypes[0];
    } else {
      // "text/plain" this is
      return codeMirrorMimeType;
    }
  }

  /**
   * Get the file extension of the document.
   */
  get languageFileExtension(): string {
    let parts = this.documentPath.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Get the CM editor
   */
  get ceEditor(): CodeMirrorEditor {
    return this.editor.editor as CodeMirrorEditor;
  }

  /**
   * Get the activated CM editor.
   */
  get activeEditor(): Document.IEditor {
    return this._virtualEditor;
  }

  /**
   * Get the inner HTMLElement of the document widget.
   */
  get wrapperElement(): HTMLElement {
    return this.widget.node;
  }

  /**
   * Get current path of the document.
   */
  get path(): string {
    return this.widget.context.path;
  }

  /**
   *  Get the list of CM editors in the document, there is only one editor
   * in the case of file editor.
   */
  get editors(): Document.ICodeBlockOptions[] {
    return [
      {
        ceEditor: this._virtualEditor,
        type: 'code',
        value: this.editor?.model.sharedModel.getSource() ?? ''
      }
    ];
  }

  /**
   * Dispose the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._editorRemoved.emit({
      editor: this._virtualEditor
    });
    this.editor.model.mimeTypeChanged.disconnect(this.reloadConnection);
    super.dispose();
  }

  /**
   * Generate the virtual document associated with the document.
   */
  createVirtualDocument(): VirtualDocument {
    return new VirtualDocument({
      language: this.language,
      foreignCodeExtractors: this.options.foreignCodeExtractorsManager,
      path: this.documentPath,
      fileExtension: this.languageFileExtension,
      // notebooks are continuous, each cell is dependent on the previous one
      standalone: true,
      // notebooks are not supported by LSP servers
      hasLspSupportedFile: true
    });
  }

  /**
   * Get the index of editor from the cursor position in the virtual
   * document. Since there is only one editor, this method always return
   * 0
   * @deprecated This is error-prone and will be removed in JupyterLab 5.0, use `getEditorIndex()` with `virtualDocument.getEditorAtVirtualLine(position)` instead.
   *
   * @param position - the position of cursor in the virtual document.
   * @return  {number} - index of the virtual editor
   */
  getEditorIndexAt(position: IVirtualPosition): number {
    return 0;
  }

  /**
   * Get the index of input editor
   *
   * @param ceEditor - instance of the code editor
   */
  getEditorIndex(ceEditor: Document.IEditor): number {
    return 0;
  }

  /**
   * Get the wrapper of input editor.
   *
   * @param ceEditor
   * @return  {HTMLElement}
   */
  getEditorWrapper(ceEditor: Document.IEditor): HTMLElement {
    return this.wrapperElement;
  }

  /**
   * Initialization function called once the editor and the LSP connection
   * manager is ready. This function will create the virtual document and
   * connect various signals.
   */
  protected async initOnceReady(): Promise<void> {
    this.initVirtual();

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    await this.connectDocument(this.virtualDocument!, false);

    this.editor.model.mimeTypeChanged.connect(this.reloadConnection, this);
  }

  /**
   * The document registry instance.
   */
  private readonly _docRegistry: DocumentRegistry;
  private readonly _virtualEditor: Document.IEditor;
  private _readyDelegate = new PromiseDelegate<void>();
}
