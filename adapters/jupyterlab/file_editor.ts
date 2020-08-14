import { WidgetAdapter } from './jl_adapter';
import { FileEditor } from '@jupyterlab/fileeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { VirtualCodeMirrorFileEditor } from '../../virtual/editors/file_editor';
import { LSPExtension } from '../../index';

export class FileEditorAdapter extends WidgetAdapter<
  IDocumentWidget<FileEditor>
> {
  editor: FileEditor;
  virtual_editor: VirtualCodeMirrorFileEditor;

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

    // TODO editor-agnostic mechanism
    this.virtual_editor = new VirtualCodeMirrorFileEditor(
      () => this.language,
      () => this.language_file_extension,
      () => this.document_path,
      this.ce_editor
    );
    this.connect_contentChanged_signal();

    console.log('LSP: file ready for connection:', this.path);

    // connect the document, but do not open it as the adapter will handle this
    // after registering all features
    this.connect_document(this.virtual_editor.virtual_document, false).catch(
      console.warn
    );

    this.editor.model.mimeTypeChanged.connect(this.reload_connection, this);
  }

  get path() {
    return this.widget.context.path;
  }
}
