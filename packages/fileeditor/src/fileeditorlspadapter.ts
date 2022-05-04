import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import {
  IAdapterOptions,
  IVirtualPosition,
  VirtualDocument,
  WidgetAdapter
} from '@jupyterlab/lsp';
import * as nbformat from '@jupyterlab/nbformat';
import { FileEditor } from './widget';

export class FileEditorAdapter extends WidgetAdapter<
  IDocumentWidget<FileEditor>
> {
  editor: FileEditor;

  get documentPath(): string {
    return this.widget.context.path;
  }
  get mimeType(): string {
    const codeMirrorMimeType = this.editor.model.mimeType;
    const contentsModel = this.editor.context.contentsModel;

    // when MIME type is not known it defaults to 'text/plain',
    // so if it is different we can accept it as it is
    if (codeMirrorMimeType != 'text/plain') {
      return codeMirrorMimeType;
    } else if (contentsModel) {
      // a script that does not have a MIME type known by the editor
      // (no syntax highlight mode), can still be known by the document
      // registry (and this is arguably easier to extend), so let's check it
      // just in case; this is also how the "Klingon" language for testing
      // gets registered, so we need it for tests too.
      let fileType = this.options.app.docRegistry.getFileTypeForModel(
        contentsModel
      );
      return fileType.mimeTypes[0];
    } else {
      // "text/plain" this is
      return codeMirrorMimeType;
    }
  }

  get languageFileExtension(): string {
    let parts = this.documentPath.split('.');
    return parts[parts.length - 1];
  }

  get ceEditor(): CodeMirrorEditor {
    return this.editor.editor as CodeMirrorEditor;
  }

  get activeEditor(): CodeEditor.IEditor {
    return this.editor.editor;
  }

  constructor(
    options: IAdapterOptions,
    editorWidget: IDocumentWidget<FileEditor>
  ) {
    super(options, editorWidget);
    this.editor = editorWidget.content;
    this.initialized = new Promise<void>((resolve, reject) => {
      this.initOnceReady().then(resolve).catch(reject);
    });
  }

  get wrapperElement(): HTMLElement {
    return this.widget.node;
  }

  get path(): string {
    return this.widget.context.path;
  }

  protected async initOnceReady(): Promise<void> {
    console.log('waiting for', this.documentPath, 'to fully load');
    if (!this.editor.context.isReady) {
      await this.editor.context.ready;
    }

    this.initVirtual();

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    this.connectDocument(this.virtualDocument, false).catch(console.warn);

    this.editor.model.mimeTypeChanged.connect(this.reloadConnection, this);
  }

  get editors(): { ceEditor: CodeEditor.IEditor; type: nbformat.CellType }[] {
    return [{ ceEditor: this.editor.editor, type: 'code' }];
  }

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

  getEditorIndexAt(position: IVirtualPosition): number {
    return 0;
  }

  getEditorIndex(ceEditor: CodeEditor.IEditor): number {
    return 0;
  }

  getEditorWrapper(ceEditor: CodeEditor.IEditor): HTMLElement {
    return this.wrapperElement;
  }
}
