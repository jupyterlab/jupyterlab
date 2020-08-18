import { WidgetAdapter } from '../adapter';
import { FileEditor } from '@jupyterlab/fileeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { LSPExtension } from '../../index';
import { PositionConverter } from "../../converter";
import { IRootPosition, IVirtualPosition } from "../../positioning";
import { ICommandContext } from "../../command_manager";
import { IVirtualEditor } from "../../virtual/editor";
import IEditor = CodeEditor.IEditor;
import { VirtualDocument } from "../../virtual/document";
import { VirtualCodeMirrorEditor } from "../../virtual/codemirror_editor";

export class FileEditorAdapter extends WidgetAdapter<
  IDocumentWidget<FileEditor>
> {
  editor: FileEditor;
  virtual_editor: IVirtualEditor<IEditor>;

  get document_path() {
    return this.widget.context.path;
  }

  get mime_type() {
    return this.editor.model.mimeType;
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

    this.init_virtual();
    this.connect_contentChanged_signal();

    console.log('LSP: file ready for connection:', this.path);

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    this.connect_document(this.virtual_editor.virtual_document, false).catch(
      console.warn
    );

    this.editor.model.mimeTypeChanged.connect(this.reload_connection, this);
  }

  get_editor_index(ce_editor: CodeEditor.IEditor): number {
    return 0;
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
    return new VirtualDocument(
      {
        language: this.language,
        file_extension: this.language_file_extension,
        path: this.document_path,
        overrides_registry: {},
        foreign_code_extractors: {},
        standalone: true,
        has_lsp_supported_file: true
  }
    )
  }
}
