import { VirtualEditor } from '../editor';
import * as CodeMirror from 'codemirror';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../../positioning';

export class VirtualFileEditor extends VirtualEditor {
  protected cm_editor: CodeMirror.Editor;
  has_cells = false;

  constructor(
    language: () => string,
    file_extension: () => string,
    path: () => string,
    cm_editor: CodeMirror.Editor
  ) {
    // TODO: for now the magics and extractors are not used in FileEditor,
    //  although it would make sense to pass extractors (e.g. for CSS in HTML,
    //  or SQL in Python files) in the future.
    super(language, file_extension, path, {}, {}, true);
    this.cm_editor = cm_editor;
    let handler = {
      get: function (
        target: VirtualFileEditor,
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

  public transform_editor_to_root(
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
