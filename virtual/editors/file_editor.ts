import { VirtualCodeMirrorEditor } from '../editor';
import * as CodeMirror from 'codemirror';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../../positioning';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';

export class VirtualCodeMirrorFileEditor extends VirtualCodeMirrorEditor {
  protected cm_editor: CodeMirror.Editor;
  has_cells = false;

  find_ce_editor(cm_editor: CodeMirror.Editor): CodeEditor.IEditor {
    return this.ce_editor;
  }

  constructor(
    language: () => string,
    file_extension: () => string,
    path: () => string,
    protected ce_editor: CodeEditor.IEditor
  ) {
    // TODO: for now the magics and extractors are not used in FileEditor,
    //  although it would make sense to pass extractors (e.g. for CSS in HTML,
    //  or SQL in Python files) in the future.
    super(language, file_extension, path, {}, {}, true);
    let cm_editor = (ce_editor as CodeMirrorEditor).editor;
    this.cm_editor = cm_editor;

    let handler = {
      get: function (
        target: VirtualCodeMirrorFileEditor,
        prop: keyof CodeMirror.Editor,
        receiver: any
      ) {
        if (prop in cm_editor && !(prop in target)) {
          return cm_editor[prop];
        } else {
          return Reflect.get(target, prop, receiver);
        }
      }
    };
    return new Proxy(this, handler);
  }

  transform_virtual_to_editor(position: IVirtualPosition): IEditorPosition {
    return (position as unknown) as IEditorPosition;
  }

  public _transform_editor_to_root(
    cm_editor: CodeMirror.Editor,
    position: IEditorPosition
  ): IRootPosition {
    return (position as unknown) as IRootPosition;
  }

  public get_editor_index(position: CodeMirror.Position): number {
    return 0;
  }

  get_cm_editor(position: IRootPosition): CodeMirror.Editor {
    return this.cm_editor;
  }

  protected perform_documents_update(): void {
    if (this.isDisposed) {
      return;
    }
    // it is sufficient to update the root document, all nested documents will follow (be re-generated)
    this.virtual_document.clear();
    this.virtual_document.append_code_block(
      this.cm_editor.getValue(),
      this.cm_editor
    );
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.cm_editor.getWrapperElement().addEventListener(type, listener);
  }

  forEveryBlockEditor(callback: (cm_editor: CodeMirror.Editor) => void): void {
    callback(this.cm_editor);
  }
}
