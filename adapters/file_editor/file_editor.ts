import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor } from '@jupyterlab/fileeditor';

import { ICommandContext } from '../../command_manager';
import { PositionConverter } from '../../converter';
import { LSPExtension } from '../../index';
import { IRootPosition, IVirtualPosition } from '../../positioning';
import { VirtualDocument } from '../../virtual/document';
import { IVirtualEditor } from '../../virtual/editor';
import { WidgetAdapter } from '../adapter';

import IEditor = CodeEditor.IEditor;

export class FileEditorAdapter extends WidgetAdapter<
  IDocumentWidget<FileEditor>
> {
  editor: FileEditor;
  virtual_editor: IVirtualEditor<IEditor>;

  get document_path() {
    return this.widget.context.path;
  }

  get mime_type() {
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
      let fileType = this.extension.app.docRegistry.getFileTypeForModel(
        this.editor.context.contentsModel
      );
      return fileType.mimeTypes[0];
    } else {
      // "text/plain" this is
      return codeMirrorMimeType;
    }
  }

  get language_file_extension(): string {
    let parts = this.document_path.split('.');
    return parts[parts.length - 1];
  }

  get ce_editor(): CodeMirrorEditor {
    return this.editor.editor as CodeMirrorEditor;
  }

  get activeEditor(): CodeEditor.IEditor {
    return this.editor.editor;
  }

  constructor(
    extension: LSPExtension,
    editor_widget: IDocumentWidget<FileEditor>
  ) {
    super(extension, editor_widget);
    this.editor = editor_widget.content;

    this.initialized = new Promise<void>((resolve, reject) => {
      this.init_once_ready().then(resolve).catch(reject);
    });
  }

  protected async init_once_ready() {
    if (!this.editor.context.isReady) {
      await this.editor.context.ready;
    }
    this.init_virtual();

    this.console.log('file ready for connection:', this.path);

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    this.connect_document(this.virtual_editor.virtual_document, false).catch(
      this.console.warn
    );

    this.editor.model.mimeTypeChanged.connect(this.reload_connection, this);
  }

  get_editor_index(ce_editor: CodeEditor.IEditor): number {
    return 0;
  }

  get_editor_wrapper(ce_editor: CodeEditor.IEditor): HTMLElement {
    return this.wrapper_element;
  }

  get wrapper_element(): HTMLElement {
    return this.widget.node;
  }

  get path() {
    return this.widget.context.path;
  }

  context_from_active_document(): ICommandContext {
    let editor = this.widget.content.editor;
    let ce_cursor = editor.getCursorPosition();
    let root_position = PositionConverter.ce_to_cm(ce_cursor) as IRootPosition;
    return this?.get_context(root_position);
  }

  get_editor_index_at(position: IVirtualPosition): number {
    return 0;
  }

  get editors(): CodeEditor.IEditor[] {
    return [this.editor.editor];
  }

  create_virtual_document(): VirtualDocument {
    // TODO: for now the magics and extractors are not used in FileEditor,
    //  although it would make sense to pass extractors (e.g. for CSS in HTML,
    //  or SQL in Python files) in the future. However, these would need to be
    //  a different registry (as we would not want to extract kernel-specific
    //  constructs like magics)
    return new VirtualDocument({
      language: this.language,
      file_extension: this.language_file_extension,
      path: this.document_path,
      overrides_registry: {},
      foreign_code_extractors: {},
      standalone: true,
      has_lsp_supported_file: true,
      console: this.console
    });
  }
}
